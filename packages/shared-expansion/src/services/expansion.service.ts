import { PrismaClient } from '@prisma/client';
import {
  GenerationParams,
  RegionFilter,
  ExpansionSuggestionData,
  ExpansionJobResult,
  ExpansionConfig,
  IExpansionService
} from '../interfaces/expansion.interface';
import { ExpansionUtils } from '../utils/expansion.utils';
import { IAIPipelineController, PipelineExecutionRequest } from '@subway/shared-ai';

/**
 * Consolidated Expansion Service
 * Combines expansion generation logic from admin and BFF applications
 */
export class ExpansionService implements IExpansionService {
  private readonly config: ExpansionConfig;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly aiPipelineController: IAIPipelineController,
    config: Partial<ExpansionConfig> = {}
  ) {
    this.config = {
      bffUrl: process.env.BFF_URL || 'http://localhost:3001',
      timeoutMs: 300000, // 5 minutes
      fallbackEnabled: true,
      ...config
    };
  }

  async generate(params: GenerationParams): Promise<ExpansionJobResult> {
    console.log('🚀 Starting AI-powered expansion generation');
    console.log('🔍 Service received params:', {
      enableAIRationale: params.enableAIRationale,
      aggression: params.aggression,
      targetCount: params.targetCount,
      region: params.region
    });

    // Validate parameters
    if (!ExpansionUtils.validateRegionFilter(params.region)) {
      throw new Error('Invalid region filter: at least one region parameter must be specified');
    }
    
    // Calculate target count based on aggression
    const targetCount = params.targetCount || ExpansionUtils.calculateTargetCount(params.aggression);
    
    console.log('📊 Target count calculation:', {
      aggression: params.aggression,
      providedTargetCount: params.targetCount,
      calculatedTargetCount: targetCount
    });
    
    // Get existing stores for the region
    const existingStores = await this.getExistingStores(params.region);
    
    // Get country bounds
    const countryBounds = ExpansionUtils.getCountryBounds(
      ExpansionUtils.normalizeCountryName(params.region.country || 'Germany')
    );

    // Feature flag: Use simple single-call approach (default) or complex pipeline
    const useSimpleApproach = process.env.USE_SIMPLE_EXPANSION !== 'false';

    if (params.enableAIRationale) {
      try {
        if (useSimpleApproach) {
          console.log('🎯 Using SIMPLE single-call expansion approach');
          return await this.generateWithSimpleAI(params, targetCount, existingStores);
        } else {
          console.log('🔧 Using COMPLEX 5-stage pipeline approach (legacy)');
          return await this.generateWithAIPipeline(params, targetCount, existingStores, countryBounds);
        }
      } catch (error) {
        console.error('❌ AI generation failed:', error);
        throw error;
      }
    }

    throw new Error('AI Rationale is not enabled. Please enable it to run the expansion pipeline.');
  }

  // Alias for backward compatibility
  async generateExpansionSuggestions(params: GenerationParams): Promise<ExpansionJobResult> {
    return this.generate(params);
  }

  /**
   * Generate suggestions using simple single-call approach
   * NOTE: This calls the BFF service via the AI pipeline controller
   */
  private async generateWithSimpleAI(
    params: GenerationParams,
    targetCount: number,
    existingStores: any[]
  ): Promise<ExpansionJobResult> {
    // Use the AI pipeline controller to call the simple expansion service
    // This avoids import issues between packages
    const simpleRequest = {
      region: ExpansionUtils.normalizeCountryName(params.region.country || 'Germany'),
      existingStores: existingStores.map(store => ({
        name: store.name || 'Unknown',
        city: store.city || 'Unknown',
        lat: store.latitude || 0,
        lng: store.longitude || 0,
        revenue: store.annualTurnover
      })),
      targetCandidates: targetCount, // BFF expects 'targetCandidates' not 'targetCount'
      useSimpleApproach: true
    };

    const result = await this.aiPipelineController.executePipeline(simpleRequest as any);

    console.log('🔍 Pipeline result:', {
      hasFinalCandidates: !!result.finalCandidates,
      finalCandidatesLength: result.finalCandidates?.length || 0,
      resultKeys: Object.keys(result),
      firstCandidate: result.finalCandidates?.[0]
    });

    // Convert to ExpansionJobResult format
    const suggestions: ExpansionSuggestionData[] = (result.finalCandidates || []).map((suggestion: any, index: number) => ({
      id: `simple-ai-${index + 1}`,
      lat: suggestion.lat,
      lng: suggestion.lng,
      region: suggestion.city,
      country: ExpansionUtils.normalizeCountryName(params.region.country || 'Germany'),
      finalScore: suggestion.confidence,
      confidence: suggestion.confidence,
      isLive: true,
      aiRecommended: true,
      demandScore: suggestion.confidence,
      competitionPenalty: 0.1,
      supplyPenalty: 0.1,
      population: 100000,
      footfallIndex: 0.7,
      incomeIndex: 0.7,
      predictedAUV: suggestion.estimatedRevenue || 450000,
      paybackPeriod: 18,
      cacheKey: ExpansionUtils.generateCacheKey({ ...params, index }),
      modelVersion: 'v4.0-simple-ai',
      dataSnapshotDate: new Date().toISOString(),
      rationaleText: suggestion.rationale,
      hasAIAnalysis: true,
      aiProcessingRank: index + 1,
      distanceToNearestStore: suggestion.distanceToNearestStore,
      // Add structured rationale for UI compatibility
      rationale: {
        population: suggestion.confidence * 0.8, // Use confidence as proxy for population score
        proximityGap: suggestion.distanceToNearestStore ? Math.min(1, suggestion.distanceToNearestStore / 2000) : 0.7,
        turnoverGap: suggestion.estimatedRevenue ? suggestion.estimatedRevenue / 2000000 : 0.7,
        notes: suggestion.rationale || 'AI-generated location'
      }
    }));

    console.log(`✅ Simple AI generated ${suggestions.length} suggestions`);

    return {
      suggestions,
      metadata: {
        generationTimeMs: result.metadata?.totalExecutionTime || 0,
        enhancedRationaleEnabled: true,
        diversificationEnabled: false,
        aiCostLimitingEnabled: false,
        aiCandidatesCount: suggestions.length,
        totalCandidatesCount: suggestions.length,
        aiPercentage: 100,
        pipelineStages: ['simple-ai-single-call'],
        aiPipelineUsed: true
      },
      statistics: {
        tokensUsed: result.metadata?.totalTokensUsed || 0,
        totalCost: result.metadata?.totalCost || 0,
        generationTimeMs: result.metadata?.totalExecutionTime || 0
      }
    };
  }

  /**
   * Generate suggestions using complex 5-stage pipeline (LEGACY - kept for fallback)
   */
  private async generateWithAIPipeline(
    params: GenerationParams,
    targetCount: number,
    existingStores: any[],
    countryBounds: any
  ): Promise<ExpansionJobResult> {
    const pipelineRequest: PipelineExecutionRequest = {
      region: ExpansionUtils.normalizeCountryName(params.region.country || 'Germany'),
      bounds: countryBounds,
      existingStores: existingStores.map(store => ({
        lat: store.latitude || 0,
        lng: store.longitude || 0,
        performance: store.annualTurnover || undefined
      })),
      targetCandidates: targetCount,
      businessObjectives: {
        riskTolerance: 'MEDIUM',
        expansionSpeed: params.aggression > 0.5 ? 'AGGRESSIVE' : 'MODERATE',
        marketPriorities: ['population_density', 'market_gaps', 'competitive_advantage']
      }
    };

    console.log('🤖 Executing Local AI Pipeline: Market Analysis → Zone Identification → Location Discovery → Strategic Scoring');
    
    try {
      // DIRECT CALL: Replacing the unreliable HTTP fetch with a direct method call
      const pipelineResult = await this.aiPipelineController.executePipeline(pipelineRequest);
      
      return this.convertPipelineResultToSuggestions(pipelineResult, params);

    } catch (error) {
      console.error('❌ Local AI Pipeline execution failed:', error);
      throw error;
    }
  }

  private convertPipelineResultToSuggestions(
    pipelineResult: any,
    params: GenerationParams
  ): ExpansionJobResult {
    const suggestions: ExpansionSuggestionData[] = [];
    const totalTokensUsed = pipelineResult.metadata?.totalTokensUsed || 0;

    for (let i = 0; i < (pipelineResult.finalCandidates || []).length; i++) {
      const candidate = pipelineResult.finalCandidates[i];
      
      suggestions.push({
        id: `ai-suggestion-${i + 1}`,
        lat: candidate.lat,
        lng: candidate.lng,
        region: candidate.name || `AI Location ${i + 1}`,
        country: ExpansionUtils.normalizeCountryName(params.region.country || 'Germany'),
        finalScore: candidate.viabilityScore || candidate.score || 0.8,
        confidence: candidate.confidence || 0.8,
        isLive: true,
        aiRecommended: true,
        demandScore: candidate.demandScore || 0.8,
        competitionPenalty: candidate.competitionPenalty || 0.2,
        supplyPenalty: candidate.supplyPenalty || 0.1,
        population: candidate.population || 100000,
        footfallIndex: candidate.footfallIndex || 0.7,
        incomeIndex: candidate.incomeIndex || 0.7,
        predictedAUV: candidate.predictedAUV || 450000,
        paybackPeriod: candidate.paybackPeriod || 18,
        cacheKey: ExpansionUtils.generateCacheKey({ ...params, index: i }),
        modelVersion: 'v3.0-ai-pipeline',
        dataSnapshotDate: new Date().toISOString(),
        rationaleText: candidate.rationale || `AI-generated location with ${((candidate.viabilityScore || 0.8) * 100).toFixed(0)}% viability score`,
        hasAIAnalysis: true,
        aiProcessingRank: i + 1,
        rationale: {
          population: candidate.populationScore || 0.8,
          proximityGap: candidate.proximityScore || 0.7,
          turnoverGap: candidate.performanceScore || 0.8,
          notes: candidate.rationale || 'AI-powered analysis'
        }
      });
    }

    console.log(`🎯 AI Pipeline complete: ${suggestions.length} AI-generated suggestions`);
    
    return {
      suggestions,
      statistics: {
        tokensUsed: totalTokensUsed,
        totalCost: pipelineResult.metadata?.totalCost || 0,
        generationTimeMs: pipelineResult.metadata?.totalExecutionTime || 0
      },
      metadata: {
        generationTimeMs: pipelineResult.metadata?.totalExecutionTime || 0,
        enhancedRationaleEnabled: true,
        diversificationEnabled: true,
        aiCostLimitingEnabled: false, // Full AI pipeline
        aiCandidatesCount: suggestions.length,
        totalCandidatesCount: suggestions.length,
        aiPercentage: 100,
        pipelineStages: pipelineResult.pipelineStages ? Object.keys(pipelineResult.pipelineStages) : [],
        aiPipelineUsed: true
      }
    };
  }

  private async generateFallbackSuggestions(targetCount: number, region: RegionFilter): Promise<ExpansionJobResult> {
    console.log('🔄 Using fallback generation method');
    
    const suggestions: ExpansionSuggestionData[] = [];
    const basicLocations = ExpansionUtils.generateBasicLocations(targetCount, region);
    
    for (let i = 0; i < basicLocations.length; i++) {
      const location = basicLocations[i];
      suggestions.push({
        id: `fallback-suggestion-${i + 1}`,
        lat: location.lat,
        lng: location.lng,
        region: location.name,
        country: ExpansionUtils.normalizeCountryName(region.country || 'Germany'),
        finalScore: location.confidence,
        confidence: location.confidence,
        isLive: true,
        aiRecommended: false,
        demandScore: location.confidence,
        competitionPenalty: 0.2,
        supplyPenalty: 0.1,
        population: 80000,
        footfallIndex: 0.6,
        incomeIndex: 0.6,
        predictedAUV: 350000,
        paybackPeriod: 24,
        cacheKey: ExpansionUtils.generateCacheKey({ ...region, index: i }),
        modelVersion: 'v1.0-fallback',
        dataSnapshotDate: new Date().toISOString(),
        rationaleText: `Fallback location analysis for ${location.name}`,
        hasAIAnalysis: false,
        rationale: {
          population: location.confidence,
          proximityGap: 0.5,
          turnoverGap: 0.5,
          notes: 'Fallback analysis'
        }
      });
    }

    return {
      suggestions,
      statistics: {
        tokensUsed: 0,
        totalCost: 0,
        generationTimeMs: 1000
      },
      metadata: {
        generationTimeMs: 1000,
        enhancedRationaleEnabled: false,
        diversificationEnabled: false,
        aiCostLimitingEnabled: false,
        aiCandidatesCount: 0,
        totalCandidatesCount: suggestions.length,
        aiPercentage: 0,
        aiPipelineUsed: false
      }
    };
  }

  private async getExistingStores(region: RegionFilter) {
    const whereClause: any = {
      status: 'Open',
      latitude: { not: null },
      longitude: { not: null }
    };

    // Add region filters
    if (region.country) {
      whereClause.country = ExpansionUtils.normalizeCountryName(region.country);
    }
    
    if (region.state) {
      whereClause.state = region.state;
    }
    
    if (region.city) {
      whereClause.city = region.city;
    }

    return await this.prisma.store.findMany({
      where: whereClause,
      select: {
        latitude: true,
        longitude: true,
        name: true,
        annualTurnover: true,
        country: true,
        city: true
      }
    });
  }
}