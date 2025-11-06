import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import {
  MarketAnalysisRequest,
  MarketAnalysisResult,
  MarketAnalysis,
  MarketSaturation,
  GrowthOpportunity,
  CompetitiveGap,
  DemographicInsight,
  StrategicZone,
  MarketAnalysisConfig,
  IMarketAnalysisService,
  ServiceStats
} from '../interfaces/market-analysis.interface';
import { MessageBuilderUtil, StructuredMessage } from '@subway/shared-openai';

/**
 * Consolidated Market Analysis Service
 * Combines the best features from both admin and BFF implementations
 */
export class MarketAnalysisService implements IMarketAnalysisService {
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly config: MarketAnalysisConfig;
  private readonly modelConfigManager: any; // Will be injected
  
  // Service statistics
  private analysesPerformed = 0;
  private totalTokensUsed = 0;
  private totalAnalysisTime = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(
    private readonly prisma: PrismaClient,
    modelConfigManager: any,
    config: Partial<MarketAnalysisConfig> = {}
  ) {
    this.modelConfigManager = modelConfigManager;
    this.config = {
      maxTokens: 4000, // Optimized from 16000 to 4000
      cacheTtlDays: 7,
      reasoningEffort: 'medium', // Balanced from high to medium
      textVerbosity: 'medium',
      timeoutSeconds: 90,
      ...config
    };

    console.log('🏢 Market Analysis Service initialized (shared implementation)');
  }

  async analyzeMarket(request: MarketAnalysisRequest): Promise<MarketAnalysisResult> {
    const startTime = Date.now();
    console.log(`Starting market analysis for region: ${request.region}`);

    try {
      // Check cache first
      const cached = await this.getCachedAnalysis(request.region);
      if (cached) {
        this.cacheHits++;
        console.log(`Using cached analysis for region: ${request.region}`);
        return {
          analysis: cached,
          strategicZones: await this.identifyStrategicZones(cached),
          executionTime: Date.now() - startTime,
          tokensUsed: 0,
          cached: true
        };
      }

      this.cacheMisses++;

      // Validate API key
      if (!this.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured - cannot perform market analysis');
      }

      // Perform analysis
      const analysis = await this.performAnalysis(request);
      const strategicZones = await this.identifyStrategicZones(analysis);

      // Cache the result
      await this.cacheAnalysis(analysis);

      const executionTime = Date.now() - startTime;
      this.analysesPerformed++;
      this.totalAnalysisTime += executionTime;

      console.log(`Market analysis completed for ${request.region} in ${executionTime}ms`);

      return {
        analysis,
        strategicZones,
        executionTime,
        tokensUsed: analysis.tokensUsed || 0,
        cached: false
      };

    } catch (error) {
      console.error(`Market analysis failed for ${request.region}:`, error);
      throw error;
    }
  }

  async identifyStrategicZones(analysis: MarketAnalysis): Promise<StrategicZone[]> {
    // Extract strategic zones from opportunities and competitive gaps
    const zones: StrategicZone[] = [];

    // Convert growth opportunities to strategic zones
    analysis.opportunities.forEach((opportunity, index) => {
      if (opportunity.location && opportunity.priority === 'high') {
        zones.push({
          id: `opportunity-${index}`,
          name: `${opportunity.type} Opportunity Zone`,
          center: {
            lat: opportunity.location.lat,
            lng: opportunity.location.lng
          },
          radius: opportunity.location.radius,
          priority: opportunity.estimatedImpact,
          characteristics: [opportunity.description],
          estimatedStores: this.estimateStoreCapacity(opportunity),
          confidence: analysis.confidence
        });
      }
    });

    // Convert competitive gaps to strategic zones
    analysis.competitiveGaps.forEach((gap, index) => {
      if (gap.gapSize > 0.6) { // High gap threshold
        zones.push({
          id: `gap-${index}`,
          name: `${gap.area} Gap Zone`,
          center: this.estimateGapCenter(gap),
          radius: this.estimateGapRadius(gap),
          priority: gap.gapSize,
          characteristics: [`Low ${gap.competitors.join(', ')} presence`, gap.opportunity],
          estimatedStores: Math.ceil(gap.estimatedRevenue / 500000), // Rough estimate
          confidence: analysis.confidence * 0.8 // Slightly lower confidence for gaps
        });
      }
    });

    return zones.sort((a, b) => b.priority - a.priority);
  }

  async getCachedAnalysis(region: string): Promise<MarketAnalysis | null> {
    try {
      const hash = this.hashRegion(region);
      const cached = await this.prisma.marketAnalysisCache.findUnique({
        where: { regionHash: hash }
      });

      if (!cached) {
        return null;
      }

      // Check if expired
      if (cached.expiresAt < new Date()) {
        await this.prisma.marketAnalysisCache.delete({
          where: { id: cached.id }
        });
        return null;
      }

      // Parse cached analysis
      return JSON.parse(cached.analysisData);
    } catch (error) {
      console.error('Cache lookup error:', error);
      return null;
    }
  }

  getServiceStats(): ServiceStats {
    const total = this.cacheHits + this.cacheMisses;
    const cacheHitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
    const averageAnalysisTime = this.analysesPerformed > 0 ? 
      this.totalAnalysisTime / this.analysesPerformed : 0;

    return {
      analysesPerformed: this.analysesPerformed,
      totalTokensUsed: this.totalTokensUsed,
      averageAnalysisTime,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100
    };
  }

  resetStats(): void {
    this.analysesPerformed = 0;
    this.totalTokensUsed = 0;
    this.totalAnalysisTime = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  private async performAnalysis(request: MarketAnalysisRequest): Promise<MarketAnalysis> {
    const prompt = this.buildAnalysisPrompt(request);
    const model = this.modelConfigManager.getModelForOperation('MARKET_ANALYSIS');

    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutSeconds * 1000);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          input: this.buildStructuredMessages(prompt),
          max_output_tokens: this.config.maxTokens,
          reasoning: { effort: this.config.reasoningEffort },
          text: { verbosity: this.config.textVerbosity },
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'market_analysis',
              strict: true,
              schema: this.getAnalysisSchema()
            }
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Extract and parse response
      const messageOutput = data.output.find((item: any) => item.type === 'message');
      if (!messageOutput || !messageOutput.content || !messageOutput.content[0]) {
        throw new Error('No message content in OpenAI response');
      }

      const analysisText = messageOutput.content[0].text.trim();
      const tokensUsed = data.usage?.total_tokens || 0;
      this.totalTokensUsed += tokensUsed;

      // Parse JSON response
      const analysisData = JSON.parse(analysisText);
      
      return {
        ...analysisData,
        region: request.region,
        analysisDate: new Date(),
        tokensUsed
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Market analysis timed out after ${this.config.timeoutSeconds} seconds`);
      }
      
      throw error;
    }
  }

  private buildAnalysisPrompt(request: MarketAnalysisRequest): string {
    const parts = [
      `Perform comprehensive market analysis for restaurant expansion in ${request.region}.`,
      ``,
      `REGION BOUNDS:`,
      `North: ${request.bounds.north}, South: ${request.bounds.south}`,
      `East: ${request.bounds.east}, West: ${request.bounds.west}`,
      ``,
      `EXISTING STORES: ${request.existingStores.length} locations`,
      this.formatStoreData(request.existingStores),
      ``,
      `COMPETITORS: ${request.competitors.length} locations`,
      this.formatCompetitorData(request.competitors),
      ``
    ];

    if (request.demographics) {
      parts.push(`DEMOGRAPHICS:`);
      parts.push(`Population: ${request.demographics.population.toLocaleString()}`);
      parts.push(`Median Income: $${request.demographics.medianIncome.toLocaleString()}`);
      parts.push(`Age Distribution: ${Object.entries(request.demographics.ageDistribution)
        .map(([age, pct]) => `${age}: ${pct}%`).join(', ')}`);
      parts.push(``);
    }

    parts.push(`Provide structured analysis including:`);
    parts.push(`1. Market saturation assessment`);
    parts.push(`2. Growth opportunities with specific locations`);
    parts.push(`3. Competitive gaps and revenue estimates`);
    parts.push(`4. Demographic insights and recommendations`);
    parts.push(`5. Overall confidence score and strategic recommendations`);

    return parts.join('\n');
  }

  private formatStoreData(stores: Array<{lat: number; lng: number; id: string}>): string {
    if (stores.length === 0) return 'No existing stores in region';
    
    // Show first 5 stores and summary
    const sample = stores.slice(0, 5);
    const formatted = sample.map(store => 
      `${store.id}: ${store.lat.toFixed(4)}, ${store.lng.toFixed(4)}`
    ).join('\n');
    
    return stores.length > 5 ? 
      `${formatted}\n... and ${stores.length - 5} more stores` : 
      formatted;
  }

  private formatCompetitorData(competitors: Array<{lat: number; lng: number; brand: string}>): string {
    if (competitors.length === 0) return 'No competitors identified in region';
    
    // Group by brand and show summary
    const brandCounts = competitors.reduce((acc, comp) => {
      acc[comp.brand] = (acc[comp.brand] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(brandCounts)
      .map(([brand, count]) => `${brand}: ${count} locations`)
      .join(', ');
  }

  private getAnalysisSchema(): any {
    return {
      type: 'object',
      properties: {
        saturation: {
          type: 'object',
          properties: {
            level: { type: 'string', enum: ['low', 'medium', 'high', 'oversaturated'] },
            score: { type: 'number', minimum: 0, maximum: 1 },
            storeCount: { type: 'number' },
            populationPerStore: { type: 'number' },
            competitorDensity: { type: 'number' }
          },
          required: ['level', 'score', 'storeCount', 'populationPerStore', 'competitorDensity']
        },
        opportunities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['demographic', 'geographic', 'competitive', 'infrastructure'] },
              description: { type: 'string' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              estimatedImpact: { type: 'number', minimum: 0, maximum: 1 },
              location: {
                type: 'object',
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                  radius: { type: 'number' }
                },
                required: ['lat', 'lng', 'radius']
              }
            },
            required: ['type', 'description', 'priority', 'estimatedImpact']
          }
        },
        competitiveGaps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              area: { type: 'string' },
              competitors: { type: 'array', items: { type: 'string' } },
              gapSize: { type: 'number', minimum: 0, maximum: 1 },
              opportunity: { type: 'string' },
              estimatedRevenue: { type: 'number' }
            },
            required: ['area', 'competitors', 'gapSize', 'opportunity', 'estimatedRevenue']
          }
        },
        demographicInsights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', enum: ['age', 'income', 'lifestyle', 'behavior'] },
              insight: { type: 'string' },
              relevance: { type: 'number', minimum: 0, maximum: 1 },
              actionable: { type: 'boolean' }
            },
            required: ['category', 'insight', 'relevance', 'actionable']
          }
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' }
        },
        confidence: { type: 'number', minimum: 0, maximum: 1 }
      },
      required: ['saturation', 'opportunities', 'competitiveGaps', 'demographicInsights', 'recommendations', 'confidence']
    };
  }

  private estimateStoreCapacity(opportunity: GrowthOpportunity): number {
    // Simple estimation based on impact and type
    const baseCapacity = opportunity.estimatedImpact * 5;
    
    switch (opportunity.type) {
      case 'demographic': return Math.ceil(baseCapacity * 1.2);
      case 'geographic': return Math.ceil(baseCapacity * 1.0);
      case 'competitive': return Math.ceil(baseCapacity * 0.8);
      case 'infrastructure': return Math.ceil(baseCapacity * 1.1);
      default: return Math.ceil(baseCapacity);
    }
  }

  private estimateGapCenter(gap: CompetitiveGap): { lat: number; lng: number } {
    // This would need actual geographic data in a real implementation
    // For now, return a placeholder
    return { lat: 0, lng: 0 };
  }

  private estimateGapRadius(gap: CompetitiveGap): number {
    // Estimate radius based on gap size and revenue potential
    return gap.gapSize * 5000; // 5km max radius
  }

  private async cacheAnalysis(analysis: MarketAnalysis): Promise<void> {
    try {
      const hash = this.hashRegion(analysis.region);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.config.cacheTtlDays);

      await this.prisma.marketAnalysisCache.create({
        data: {
          regionHash: hash,
          region: analysis.region,
          analysisData: JSON.stringify(analysis),
          tokensUsed: analysis.tokensUsed || 0,
          expiresAt
        }
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Build structured message arrays with separate system and user roles
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  private buildStructuredMessages(userPrompt: string): StructuredMessage[] {
    const systemPrompt = 'You are a market analysis expert specializing in restaurant location strategy. Provide comprehensive market analysis with structured data and actionable insights.';
    
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

  private hashRegion(region: string): string {
    return crypto.createHash('md5').update(region).digest('hex');
  }
}