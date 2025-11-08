import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import {
  RationaleContext,
  RationaleOutput,
  RationaleCache,
  CacheStats,
  OpenAIRationaleConfig,
  IRationaleService
} from '../interfaces/rationale.interface';
import { OutputTextParserService } from './output-text-parser.service';
import { OpenAIResponse } from '../interfaces/output-parser.interface';
import { MessageBuilderUtil, StructuredMessage } from '../utils/message-builder.util';
import { APIComplianceValidatorService } from './api-compliance-validator.service';
import { SeedManagerUtil, SeedResult, SeedConfig } from '../utils/seed-manager.util';
import process = require('process');

/**
 * Consolidated OpenAI Rationale Service
 * Combines the best features from both admin and BFF implementations
 */
export class OpenAIRationaleService implements IRationaleService {
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly config: OpenAIRationaleConfig;
  private readonly modelConfigManager: any; // Will be injected
  private readonly outputParser: OutputTextParserService;
  private readonly apiValidator: APIComplianceValidatorService;
  
  private cacheHits = 0;
  private cacheMisses = 0;
  private apiCalls = 0;
  private totalTokensUsed = 0;

  constructor(
    private readonly prisma: PrismaClient,
    modelConfigManager: any,
    config: Partial<OpenAIRationaleConfig> = {}
  ) {
    this.modelConfigManager = modelConfigManager;
    this.config = {
      maxTokens: 250, // Optimized from 1000 to 250 for 2-3 sentence rationales
      cacheTtlDays: 90,
      reasoningEffort: 'low',
      textVerbosity: 'low',
      enableFallback: false, // Admin version doesn't use fallback
      seedConfig: {
        useDeterministicSeeds: true,
        contextBasedSeeds: true,
        seedRotationEnabled: false,
        seedRotationInterval: 24
      },
      ...config
    };

    // Initialize output text parser with logging
    this.outputParser = new OutputTextParserService((message: string, data?: any) => {
      console.log(`[RationaleService] ${message}`, data || '');
    });

    // Initialize API compliance validator
    this.apiValidator = new APIComplianceValidatorService((level: string, message: string, data?: any) => {
      console.log(`[RationaleService] [${level.toUpperCase()}] ${message}`, data || '');
    });
  }

  async generateRationale(context: RationaleContext): Promise<RationaleOutput> {
    // Generate seed first for cache key consistency
    const seedResult = SeedManagerUtil.generateSeed(context, this.config.seedConfig);
    const hash = this.hashContext(context, seedResult);
    
    // Try to get from cache, but don't fail if cache lookup fails
    try {
      const cached = await this.getFromCache(hash);
      if (cached) {
        this.cacheHits++;
        return cached;
      }
    } catch (error) {
      console.warn('Cache lookup failed, proceeding without cache:', (error as Error).message);
    }

    this.cacheMisses++;
    
    // Validate API key
    if (!this.OPENAI_API_KEY) {
      const message = 'OPENAI_API_KEY not configured - cannot generate rationale';
      if (this.config.enableFallback) {
        console.warn(message + ', using fallback');
        return this.generateFallbackRationale(context);
      }
      throw new Error(message);
    }
    
    try {
      const output = await this.callOpenAI(context, seedResult);
      this.apiCalls++;
      
      // Try to cache, but don't fail if caching fails
      try {
        await this.cacheRationale(hash, context, output, seedResult);
      } catch (cacheError) {
        console.warn('Cache write failed, continuing without caching:', (cacheError as Error).message);
      }
      
      return output;
    } catch (error) {
      console.error(`OpenAI API error for ${context.lat}, ${context.lng}:`, error);
      
      if (this.config.enableFallback) {
        return this.generateFallbackRationale(context);
      }
      
      // No fallback - reject the candidate
      throw error;
    }
  }

  private async callOpenAI(context: RationaleContext, seedResult: SeedResult): Promise<RationaleOutput> {
    const prompt = this.buildPrompt(context);
    const model = this.modelConfigManager.getModelForOperation('RATIONALE_GENERATION');

    // Build and validate API request with seed instead of temperature
    // Requirements: 3.1, 3.2, 3.3
    const apiRequest = SeedManagerUtil.cleanupTemperatureParameters({
      model: model,
      input: this.buildStructuredMessages(prompt),
      max_output_tokens: this.config.maxTokens,
      reasoning: { effort: this.config.reasoningEffort },
      text: { verbosity: this.config.textVerbosity },
      seed: seedResult.seed // Use seed for deterministic outputs instead of temperature
    });

    // Validate API request compliance (Requirement 2.4, 2.5)
    const validation = this.apiValidator.validateAPIRequest(apiRequest);
    if (!validation.isValid) {
      throw new Error(`API request validation failed: ${validation.errors.join(', ')}`);
    }

    // Log validation warnings
    if (validation.warnings.length > 0) {
      console.warn('API request warnings:', validation.warnings);
    }

    // Use safety wrapper if available (admin version feature)
    let makeCall = async (fn: () => Promise<any>) => fn();
    
    try {
      // Try to import safety wrapper (may not exist in all environments)
      const { OpenAISafetyWrapper } = await import('../utils/openai-safety-wrapper');
      makeCall = (fn) => OpenAISafetyWrapper.makeCall(fn, 'rationale-generation', `${context.lat}-${context.lng}`);
    } catch {
      // Safety wrapper not available, use direct call
    }

    const result = await makeCall(async () => {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data;
    });

    // Use the robust output text parser
    const rationaleText = await this.outputParser.extractText(result as OpenAIResponse);
    const tokensUsed = result.usage?.total_tokens || 0;
    this.totalTokensUsed += tokensUsed;

    // Debug logging with parser diagnostics and seed information
    const diagnostics = this.outputParser.getDiagnostics(result as OpenAIResponse);
    console.log(`🔍 GPT-5 Response for ${context.lat.toFixed(4)}, ${context.lng.toFixed(4)}:`, {
      contentLength: rationaleText.length,
      contentPreview: rationaleText.substring(0, 80),
      tokensUsed,
      extractionMethod: diagnostics.extractionMethod,
      responseStatus: diagnostics.responseStatus,
      seed: seedResult.seed,
      seedSource: seedResult.seedSource
    });

    // Parse response into structured output
    return this.parseResponse(rationaleText, context);
  }

  private buildPrompt(context: RationaleContext): string {
    const parts = [
      `Generate a concise 2-3 sentence rationale for why this location is suitable for a Subway restaurant.`,
      `Provide factor-based analysis covering population, proximity, and sales potential.`,
      ``,
      `Location: ${context.lat.toFixed(4)}, ${context.lng.toFixed(4)}`,
      ``,
      `SCORES:`,
      `Population Score: ${(context.populationScore * 100).toFixed(0)}%`,
      `Proximity Gap: ${(context.proximityScore * 100).toFixed(0)}%`,
      `Sales Potential: ${(context.turnoverScore * 100).toFixed(0)}%`,
      ``
    ];

    // Add detailed metrics with "unknown" flags (enhanced feature from admin)
    if (this.hasEnhancedContext(context)) {
      parts.push(`DETAILED METRICS:`);
      
      if (context.nearestStoreKm === 'unknown') {
        parts.push(`Nearest Store Distance: unknown (data not available)`);
      } else if (context.nearestStoreKm !== undefined) {
        parts.push(`Nearest Store Distance: ${context.nearestStoreKm.toFixed(1)} km`);
      }
      
      if (context.tradeAreaPopulation === 'unknown') {
        parts.push(`Trade Area Population: unknown (data not available)`);
      } else if (context.tradeAreaPopulation !== undefined) {
        parts.push(`Trade Area Population: ${context.tradeAreaPopulation.toLocaleString()}`);
      }
      
      if (context.proximityGapPercentile === 'unknown') {
        parts.push(`Proximity Gap Percentile: unknown (data not available)`);
      } else if (context.proximityGapPercentile !== undefined) {
        parts.push(`Proximity Gap Percentile: ${context.proximityGapPercentile.toFixed(0)}th`);
      }
      
      if (context.turnoverPercentile === 'unknown') {
        parts.push(`Turnover Percentile: unknown (data not available)`);
      } else if (context.turnoverPercentile !== undefined) {
        parts.push(`Turnover Percentile: ${context.turnoverPercentile.toFixed(0)}th`);
      }
    }

    // Add basic context data
    if (context.urbanDensity !== null) {
      parts.push(`Urban Density Index: ${context.urbanDensity.toFixed(2)}`);
    }

    if (context.roadDistance !== null) {
      parts.push(`Road Access: ${context.roadDistance}m from road`);
    }

    if (context.buildingDistance !== null) {
      parts.push(`Building Proximity: ${context.buildingDistance}m from buildings`);
    }

    parts.push(``);
    parts.push(`Provide a concise, factor-based rationale. Focus on business value and location advantages. Be specific and actionable.`);
    
    if (this.hasEnhancedContext(context)) {
      parts.push(`Acknowledge any "unknown" data but focus on available metrics.`);
    }

    return parts.join('\n');
  }

  private hasEnhancedContext(context: RationaleContext): boolean {
    return context.nearestStoreKm !== undefined ||
           context.tradeAreaPopulation !== undefined ||
           context.proximityGapPercentile !== undefined ||
           context.turnoverPercentile !== undefined;
  }

  private parseResponse(rationaleText: string, context: RationaleContext): RationaleOutput {
    // Generate factor descriptions based on scores
    const factors = {
      population: this.describePopulationFactor(context.populationScore, context.tradeAreaPopulation),
      proximity: this.describeProximityFactor(context.proximityScore, context.nearestStoreKm),
      turnover: this.describeTurnoverFactor(context.turnoverScore, context.turnoverPercentile)
    };
    
    // Calculate data completeness
    const dataCompleteness = this.calculateDataCompleteness(context);
    
    // Calculate confidence based on scores and data completeness
    const avgScore = (context.populationScore + context.proximityScore + context.turnoverScore) / 3;
    const confidence = avgScore * dataCompleteness;
    
    return {
      text: rationaleText,
      factors,
      confidence,
      dataCompleteness
    };
  }
  
  private describePopulationFactor(score: number, population?: number | 'unknown'): string {
    if (population === 'unknown') {
      return `Population data unavailable (score: ${(score * 100).toFixed(0)}%)`;
    }
    if (score > 0.7) {
      return `High population density area${population ? ` (${population.toLocaleString()} residents)` : ''}`;
    } else if (score > 0.5) {
      return `Moderate population density${population ? ` (${population.toLocaleString()} residents)` : ''}`;
    }
    return `Lower population density${population ? ` (${population.toLocaleString()} residents)` : ''}`;
  }
  
  private describeProximityFactor(score: number, distance?: number | 'unknown'): string {
    if (distance === 'unknown') {
      return `Proximity data unavailable (score: ${(score * 100).toFixed(0)}%)`;
    }
    if (score > 0.7) {
      return `Significant gap in coverage${distance ? ` (${distance.toFixed(1)}km to nearest store)` : ''}`;
    } else if (score > 0.5) {
      return `Moderate coverage gap${distance ? ` (${distance.toFixed(1)}km to nearest store)` : ''}`;
    }
    return `Close to existing stores${distance ? ` (${distance.toFixed(1)}km away)` : ''}`;
  }
  
  private describeTurnoverFactor(score: number, percentile?: number | 'unknown'): string {
    if (percentile === 'unknown') {
      return `Sales data unavailable (score: ${(score * 100).toFixed(0)}%)`;
    }
    if (score > 0.7) {
      return `Strong sales potential${percentile ? ` (${percentile.toFixed(0)}th percentile)` : ''}`;
    } else if (score > 0.5) {
      return `Good sales potential${percentile ? ` (${percentile.toFixed(0)}th percentile)` : ''}`;
    }
    return `Moderate sales potential${percentile ? ` (${percentile.toFixed(0)}th percentile)` : ''}`;
  }
  
  private calculateDataCompleteness(context: RationaleContext): number {
    let availableFields = 0;
    let totalFields = 0;
    
    // Check optional detailed metrics
    const optionalFields = [
      context.nearestStoreKm,
      context.tradeAreaPopulation,
      context.proximityGapPercentile,
      context.turnoverPercentile,
      context.urbanDensity,
      context.roadDistance,
      context.buildingDistance
    ];
    
    for (const field of optionalFields) {
      totalFields++;
      if (field !== undefined && field !== null && field !== 'unknown') {
        availableFields++;
      }
    }
    
    return totalFields > 0 ? availableFields / totalFields : 0.5;
  }

  private generateFallbackRationale(context: RationaleContext): RationaleOutput {
    const strengths: string[] = [];

    if (context.populationScore > 0.7) {
      strengths.push('high population density');
    } else if (context.populationScore > 0.5) {
      strengths.push('moderate population density');
    }

    if (context.proximityScore > 0.7) {
      strengths.push('significant gap in existing coverage');
    } else if (context.proximityScore > 0.5) {
      strengths.push('opportunity for market expansion');
    }

    if (context.turnoverScore > 0.7) {
      strengths.push('strong sales potential');
    } else if (context.turnoverScore > 0.5) {
      strengths.push('good sales potential');
    }

    if (context.urbanDensity && context.urbanDensity > 0.6) {
      strengths.push('urban location with good infrastructure');
    }

    let rationaleText: string;
    if (strengths.length === 0) {
      rationaleText = 'This location shows potential for expansion based on market analysis and demographic factors.';
    } else {
      rationaleText = `This location is recommended due to ${strengths.join(', ')}. The site offers good accessibility and aligns with expansion criteria.`;
    }

    return {
      text: rationaleText,
      factors: {
        population: this.describePopulationFactor(context.populationScore, context.tradeAreaPopulation),
        proximity: this.describeProximityFactor(context.proximityScore, context.nearestStoreKm),
        turnover: this.describeTurnoverFactor(context.turnoverScore, context.turnoverPercentile)
      },
      confidence: 0.3, // Lower confidence for fallback
      dataCompleteness: this.calculateDataCompleteness(context)
    };
  }

  /**
   * Build structured message arrays with separate system and user roles
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  private buildStructuredMessages(userPrompt: string): StructuredMessage[] {
    const systemPrompt = 'You are a business analyst specializing in restaurant site selection. Provide concise, factor-based rationales for location recommendations. When data is marked as "unknown", acknowledge the limitation but still provide analysis based on available data.';
    
    const messages = MessageBuilderUtil.buildMessages(systemPrompt, userPrompt);
    
    // Validate message structure (Requirement 2.4)
    const validation = MessageBuilderUtil.validateMessageStructure(messages);
    if (!validation.isValid) {
      throw MessageBuilderUtil.createValidationError(validation);
    }

    // Log validation warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Message structure warnings:', validation.warnings);
    }

    return messages;
  }

  private hashContext(context: RationaleContext, seedResult?: SeedResult): string {
    const baseKey = [
      context.lat.toFixed(5),
      context.lng.toFixed(5),
      context.populationScore.toFixed(2),
      context.proximityScore.toFixed(2),
      context.turnoverScore.toFixed(2),
      (context.urbanDensity || 0).toFixed(2),
      (context.roadDistance || 0).toString(),
      (context.buildingDistance || 0).toString(),
      // Include enhanced metrics for cache consistency
      context.nearestStoreKm === 'unknown' ? 'unknown' : (context.nearestStoreKm || 0).toString(),
      context.tradeAreaPopulation === 'unknown' ? 'unknown' : (context.tradeAreaPopulation || 0).toString(),
      context.proximityGapPercentile === 'unknown' ? 'unknown' : (context.proximityGapPercentile || 0).toString(),
      context.turnoverPercentile === 'unknown' ? 'unknown' : (context.turnoverPercentile || 0).toString()
    ].join(',');
    
    const baseHash = crypto.createHash('md5').update(baseKey).digest('hex');
    
    // Include seed in cache key for proper cache invalidation (Requirement 3.4)
    if (seedResult) {
      return SeedManagerUtil.createCacheKeyWithSeed(baseHash, seedResult);
    }
    
    return baseHash;
  }

  private async getFromCache(hash: string): Promise<RationaleOutput | null> {
    try {
      const cached = await this.prisma.openAIRationaleCache.findUnique({
        where: { contextHash: hash }
      });

      if (!cached) {
        return null;
      }

      if (cached.expiresAt < new Date()) {
        await this.prisma.openAIRationaleCache.delete({
          where: { id: cached.id }
        });
        return null;
      }

      // Parse factors from JSON if available
      let factors = {
        population: 'Data not available',
        proximity: 'Data not available',
        turnover: 'Data not available'
      };
      
      if (cached.factors) {
        try {
          factors = JSON.parse(cached.factors);
        } catch (e) {
          console.error('Failed to parse cached factors:', e);
        }
      }

      return {
        text: cached.rationaleText,
        factors,
        confidence: cached.confidence || 0.5,
        dataCompleteness: cached.dataCompleteness || 0.5
      };
    } catch (error) {
      console.error('Cache lookup error:', error);
      return null;
    }
  }

  private async cacheRationale(
    hash: string,
    context: RationaleContext,
    output: RationaleOutput,
    seedResult: SeedResult
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.config.cacheTtlDays);

      const estimatedTokens = Math.ceil(output.text.length / 4);
      
      await this.prisma.openAIRationaleCache.create({
        data: {
          contextHash: hash,
          lat: context.lat,
          lng: context.lng,
          rationaleText: output.text,
          factors: JSON.stringify(output.factors),
          confidence: output.confidence,
          dataCompleteness: output.dataCompleteness,
          model: this.modelConfigManager.getModelForOperation('RATIONALE_GENERATION'),
          tokensUsed: estimatedTokens,
          expiresAt
        }
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  getCacheStats(): CacheStats {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
    
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      apiCalls: this.apiCalls,
      totalTokensUsed: this.totalTokensUsed
    };
  }

  resetCacheStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.apiCalls = 0;
    this.totalTokensUsed = 0;
  }
}