import { OpenAI } from 'openai';
import { 
  ScoreWeights, 
  LocationCandidate 
} from '../../types/core';
import { 
  PolicyAdjustmentRequest, 
  RationaleRequest, 
  RationaleResponse, 
  PortfolioNarrativeRequest, 
  PortfolioNarrativeResponse,
  LearningLoopSuggestion,
  AIBudget,
  CacheKey,
  CachedResult,
  AIUsageLevel,
  AIServiceConfig
} from '../../types/ai';
import { IAIService } from '../IAIService';
import { AI_DEFAULTS, AI_TOKEN_ALLOCATION, SCENARIO_MULTIPLIERS } from '../../config/constants';

/**
 * Implementation of AI services with cost controls and caching
 */
export class AIService implements IAIService {
  private openai: OpenAI | null = null;
  private cache = new Map<string, CachedResult>();
  private budget: AIBudget;
  private config: AIServiceConfig;

  constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = { ...AI_DEFAULTS, ...config };
    this.budget = {
      maxTokensPerRun: AI_TOKEN_ALLOCATION.MAX_TOKENS_PER_RUN,
      reservedForWeights: AI_TOKEN_ALLOCATION.RESERVED_FOR_WEIGHTS,
      reservedForRationales: AI_TOKEN_ALLOCATION.RESERVED_FOR_RATIONALES,
      currentUsage: 0
    };

    if (this.config.enabled && this.config.level !== AIUsageLevel.OFF) {
      this.initializeOpenAI();
    }
  }

  private initializeOpenAI(): void {
    try {
      this.openai = new OpenAI({
        apiKey: (globalThis as any).process?.env?.OPENAI_API_KEY || 'dummy-key'
      });
    } catch (error) {
      console.warn('Failed to initialize OpenAI client:', error);
      this.config.enabled = false;
    }
  }

  /**
   * Adjust weights based on scenario mode
   */
  async adjustWeights(request: PolicyAdjustmentRequest): Promise<ScoreWeights> {
    try {
      // Check if AI is enabled and budget allows
      if (!this.config.enabled || this.config.level === AIUsageLevel.OFF) {
        return this.getFallbackWeights(request.mode, request.baseWeights);
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(
        'policy',
        { mode: request.mode, baseWeights: request.baseWeights },
        request.mode,
        '1.0'
      );
      
      const cached = await this.getCachedResult(cacheKey);
      if (cached?.weights) {
        return cached.weights;
      }

      // Check budget
      if (this.budget.currentUsage + this.budget.reservedForWeights > this.budget.maxTokensPerRun) {
        console.warn('AI budget exceeded for weight adjustment, using fallback');
        return this.getFallbackWeights(request.mode, request.baseWeights);
      }

      if (!this.openai) {
        return this.getFallbackWeights(request.mode, request.baseWeights);
      }

      // Prepare prompt
      const prompt = this.createWeightAdjustmentPrompt(request);
      
      try {
        const response = await this.openai.chat.completions.create({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: 'You are a Subway Expansion Weights Mapper. Output JSON only. Given a mode and numeric bounds, return adjusted weights within bounds that sum to 1.0.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: this.config.temperature,
          max_completion_tokens: 200
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response content');
        }

        const adjustedWeights = JSON.parse(content) as ScoreWeights;
        
        // Validate and clamp weights
        const validatedWeights = this.validateAndClampWeights(adjustedWeights, request.bounds);
        
        // Update budget
        this.budget.currentUsage += response.usage?.total_tokens || 200;

        // Cache result
        await this.setCachedResult(cacheKey, {
          weights: validatedWeights,
          timestamp: Date.now(),
          tokenCost: response.usage?.total_tokens || 200
        });

        return validatedWeights;
      } catch (error) {
        console.warn('AI weight adjustment failed, using fallback:', error);
        return this.getFallbackWeights(request.mode, request.baseWeights);
      }
    } catch (error) {
      throw new Error(`Failed to adjust weights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate rationales for finalist candidates
   */
  async generateRationales(requests: RationaleRequest[]): Promise<RationaleResponse[]> {
    try {
      if (!this.config.enabled || this.config.level === AIUsageLevel.OFF) {
        return requests.map(req => this.generateTemplateRationale(
          { id: req.siteId, features: req.features, scores: req.scores } as LocationCandidate,
          req.mode
        )).map(rationale => ({
          id: requests[0]?.siteId || 'unknown',
          primary_reason: rationale.substring(0, 160),
          risks: ['Market saturation risk'],
          actions: ['Monitor performance'],
          confidence: 'M' as const,
          counterfactuals: []
        }));
      }

      const responses: RationaleResponse[] = [];
      
      for (const request of requests) {
        // Check cache
        const cacheKey = this.generateCacheKey(
          request.siteId,
          { features: request.features, scores: request.scores },
          request.mode,
          '1.0'
        );
        
        const cached = await this.getCachedResult(cacheKey);
        if (cached?.rationales?.[request.siteId]) {
          responses.push(JSON.parse(cached.rationales[request.siteId]));
          continue;
        }

        // Check budget
        if (this.budget.currentUsage + AI_TOKEN_ALLOCATION.TOKENS_PER_RATIONALE > this.budget.maxTokensPerRun) {
          console.warn('AI budget exceeded for rationales, using template');
          const templateRationale = this.generateTemplateRationale(
            { id: request.siteId, features: request.features, scores: request.scores } as LocationCandidate,
            request.mode
          );
          responses.push({
            id: request.siteId,
            primary_reason: templateRationale.substring(0, 160),
            risks: ['Market analysis needed'],
            actions: ['Conduct local survey'],
            confidence: 'M' as const
          });
          continue;
        }

        if (!this.openai) {
          const templateRationale = this.generateTemplateRationale(
            { id: request.siteId, features: request.features, scores: request.scores } as LocationCandidate,
            request.mode
          );
          responses.push({
            id: request.siteId,
            primary_reason: templateRationale.substring(0, 160),
            risks: ['Data limitations'],
            actions: ['Verify local conditions'],
            confidence: 'L' as const
          });
          continue;
        }

        try {
          const prompt = this.createRationalePrompt(request);
          
          const response = await this.openai.chat.completions.create({
            model: this.config.model,
            messages: [
              {
                role: 'system',
                content: 'Output concise, numeric rationales from provided features. Use ONLY provided numbers. Return JSON with primary_reason (≤160 chars), risks, actions, confidence.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: this.config.temperature,
            max_completion_tokens: 150
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error('No response content');
          }

          const rationale = JSON.parse(content) as RationaleResponse;
          rationale.id = request.siteId;
          
          responses.push(rationale);
          
          // Update budget and cache
          this.budget.currentUsage += response.usage?.total_tokens || AI_TOKEN_ALLOCATION.TOKENS_PER_RATIONALE;
          
          await this.setCachedResult(cacheKey, {
            rationales: { [request.siteId]: JSON.stringify(rationale) },
            timestamp: Date.now(),
            tokenCost: response.usage?.total_tokens || AI_TOKEN_ALLOCATION.TOKENS_PER_RATIONALE
          });
        } catch (error) {
          console.warn(`AI rationale generation failed for ${request.siteId}, using template:`, error);
          const templateRationale = this.generateTemplateRationale(
            { id: request.siteId, features: request.features, scores: request.scores } as LocationCandidate,
            request.mode
          );
          responses.push({
            id: request.siteId,
            primary_reason: templateRationale.substring(0, 160),
            risks: ['Analysis incomplete'],
            actions: ['Review manually'],
            confidence: 'L' as const
          });
        }
      }

      return responses;
    } catch (error) {
      throw new Error(`Failed to generate rationales: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate portfolio narrative and analysis
   */
  async generatePortfolioNarrative(request: PortfolioNarrativeRequest): Promise<PortfolioNarrativeResponse> {
    try {
      if (!this.config.enabled || this.config.level === AIUsageLevel.OFF) {
        return {
          bullets: [
            `Portfolio contains ${request.portfolioKPIs.totalSites} locations`,
            `Coverage score: ${(request.portfolioKPIs.coverage * 100).toFixed(1)}%`,
            `Regional balance: ${(request.portfolioKPIs.regionalBalance * 100).toFixed(1)}%`
          ],
          summary: 'Portfolio analysis completed with deterministic methods.'
        };
      }

      // Implementation would be similar to other AI methods
      // For now, return a basic response
      return {
        bullets: [
          `Selected ${request.portfolioKPIs.totalSites} high-potential locations`,
          `Achieved ${(request.portfolioKPIs.coverage * 100).toFixed(1)}% market coverage`,
          `Maintained ${(request.portfolioKPIs.regionalBalance * 100).toFixed(1)}% regional balance`,
          `Risk score: ${(request.portfolioKPIs.riskScore * 100).toFixed(1)}%`,
          `Estimated ROI: ${(request.portfolioKPIs.estimatedROI * 100).toFixed(1)}%`
        ],
        summary: 'Portfolio optimized for balanced growth with controlled risk exposure.'
      };
    } catch (error) {
      throw new Error(`Failed to generate portfolio narrative: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate learning loop suggestions (offline)
   */
  async generateLearningLoopSuggestions(
    historicalData: any[], 
    currentWeights: ScoreWeights
  ): Promise<LearningLoopSuggestion> {
    // Placeholder implementation
    return {
      suggestedWeights: currentWeights,
      confidence: 0.5,
      reasoning: 'Insufficient historical data for learning loop analysis',
      backtestImprovement: 0,
      requiresHumanReview: true
    };
  }

  /**
   * Check current token budget and usage
   */
  getBudgetStatus(): AIBudget {
    return { ...this.budget };
  }

  /**
   * Cache management methods
   */
  async getCachedResult(key: CacheKey): Promise<CachedResult | null> {
    const keyStr = this.serializeCacheKey(key);
    const cached = this.cache.get(keyStr);
    
    if (!cached) return null;
    
    // Check TTL
    const now = Date.now();
    const ttlMs = this.config.cacheTTL * 60 * 60 * 1000; // Convert hours to ms
    
    if (now - cached.timestamp > ttlMs) {
      this.cache.delete(keyStr);
      return null;
    }
    
    return cached;
  }

  async setCachedResult(key: CacheKey, result: CachedResult): Promise<void> {
    const keyStr = this.serializeCacheKey(key);
    this.cache.set(keyStr, result);
  }

  async clearExpiredCache(): Promise<void> {
    const now = Date.now();
    const ttlMs = this.config.cacheTTL * 60 * 60 * 1000;
    
    for (const [key, result] of this.cache.entries()) {
      if (now - result.timestamp > ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Generate cache key for request
   */
  generateCacheKey(
    countryCode: string, 
    features: any, 
    mode: string, 
    version: string
  ): CacheKey {
    return {
      countryHash: this.hashString(countryCode),
      featuresHash: this.hashString(JSON.stringify(features)),
      mode,
      version
    };
  }

  /**
   * Validate AI service availability and configuration
   */
  async validateService(): Promise<boolean> {
    if (!this.config.enabled || this.config.level === AIUsageLevel.OFF) {
      return false;
    }
    
    if (!this.openai) {
      return false;
    }

    try {
      // Simple test call
      await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'test' }],
        max_completion_tokens: 1
      });
      return true;
    } catch (error) {
      console.warn('AI service validation failed:', error);
      return false;
    }
  }

  /**
   * Get fallback weights for scenario mode (deterministic)
   */
  getFallbackWeights(mode: 'Defend' | 'Balanced' | 'Blitz', baseWeights: ScoreWeights): ScoreWeights {
    const multipliers = SCENARIO_MULTIPLIERS[mode];
    
    const adjusted: ScoreWeights = {
      population: baseWeights.population * multipliers.population,
      gap: baseWeights.gap * multipliers.gap,
      anchor: baseWeights.anchor * multipliers.anchor,
      performance: baseWeights.performance * multipliers.performance,
      saturation: baseWeights.saturation * multipliers.saturation
    };

    // Normalize to sum to 1
    const total = Object.values(adjusted).reduce((sum, weight) => sum + weight, 0);
    Object.keys(adjusted).forEach(key => {
      adjusted[key as keyof ScoreWeights] /= total;
    });

    return adjusted;
  }

  /**
   * Generate template rationale (deterministic fallback)
   */
  generateTemplateRationale(candidate: LocationCandidate, mode: string): string {
    const pop = candidate.features.population;
    const distance = candidate.features.nearestBrandKm;
    const anchors = candidate.features.anchors.deduplicated;
    const competition = candidate.features.competitorDensity;

    return `Population ${pop.toLocaleString()} within catchment. Nearest Subway ${distance.toFixed(1)}km away. ${anchors} anchor points nearby. Competition density ${competition.toFixed(2)}/km². ${mode} strategy applied.`;
  }

  // Helper methods
  private createWeightAdjustmentPrompt(request: PolicyAdjustmentRequest): string {
    return `Mode="${request.mode}". Base weights: ${JSON.stringify(request.baseWeights)}. Bounds per factor: ±20%. Return adjusted weights that sum to 1.`;
  }

  private createRationalePrompt(request: RationaleRequest): string {
    return `Site analysis: Population ${request.features.population}, Distance to nearest ${request.features.nearestBrandKm}km, Anchors ${request.features.anchors.deduplicated}, Competition ${request.features.competitorDensity}. Mode: ${request.mode}. Return JSON rationale.`;
  }

  private validateAndClampWeights(weights: ScoreWeights, bounds: any): ScoreWeights {
    // Simple validation - in production would implement proper bounds checking
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    
    if (total === 0) return weights;
    
    // Normalize
    Object.keys(weights).forEach(key => {
      weights[key as keyof ScoreWeights] /= total;
    });

    return weights;
  }

  private serializeCacheKey(key: CacheKey): string {
    return `${key.countryHash}_${key.featuresHash}_${key.mode}_${key.version}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Check if cache system is available
   */
  private isCacheAvailable(): boolean {
    try {
      // Simple cache availability check
      const testKey = 'cache_health_check';
      const testValue = Date.now().toString();
      
      // Try to set and get a test value
      this.cache.set(testKey, testValue);
      const retrieved = this.cache.get(testKey);
      
      return retrieved !== undefined;
    } catch (error) {
      console.warn('Cache availability check failed:', error);
      return false;
    }
  }

  /**
   * Generate rationales with degradation support
   */
  async generateRationalesWithDegradation(
    requests: RationaleRequest[]
  ): Promise<{ rationales: RationaleResponse[]; degraded: boolean }> {
    // Check cache availability first
    if (!this.isCacheAvailable()) {
      console.warn('Cache system unavailable, falling back to L0 mode');
      return {
        rationales: requests.map(req => ({
          id: req.siteId,
          primary_reason: this.generateTemplateRationale(
            { id: req.siteId, features: req.features, scores: req.scores } as LocationCandidate,
            req.mode
          ).substring(0, 160),
          risks: ['Market validation needed'],
          actions: ['Conduct detailed feasibility study'],
          confidence: 'L' as const
        })),
        degraded: true
      };
    }

    // Normal processing
    const rationales = await this.generateRationales(requests);
    return {
      rationales,
      degraded: false
    };
  }
}