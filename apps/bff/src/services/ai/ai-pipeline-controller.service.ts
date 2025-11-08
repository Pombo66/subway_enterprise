import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MarketAnalysisService } from './market-analysis.service';
import { StrategicZoneIdentificationService } from './strategic-zone-identification.service';
import { LocationDiscoveryService } from './location-discovery.service';
import { StrategicZoneGuidedGenerationService } from './strategic-zone-guided-generation.service';
import { ViabilityScoringValidationService } from './viability-scoring-validation.service';
import { StrategicScoringService } from './strategic-scoring.service';
import { ModelConfigurationManager } from './model-configuration.service';
import { 
  PipelineExecutionRequest, 
  PipelineExecutionResult,
  IAIPipelineController 
} from '@subway/shared-ai';

// Re-export types for backward compatibility
export type { PipelineExecutionRequest, PipelineExecutionResult };

@Injectable()
export class AIPipelineController implements IAIPipelineController {
  private readonly logger = new Logger(AIPipelineController.name);
  private readonly modelConfigManager: ModelConfigurationManager;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly marketAnalysisService: MarketAnalysisService,
    private readonly zoneIdentificationService: StrategicZoneIdentificationService,
    private readonly locationDiscoveryService: LocationDiscoveryService,
    private readonly zoneGuidedGenerationService: StrategicZoneGuidedGenerationService,
    private readonly viabilityValidationService: ViabilityScoringValidationService,
    private readonly strategicScoringService: StrategicScoringService
  ) {
    this.modelConfigManager = new ModelConfigurationManager();
    this.logger.log('AI Pipeline Controller initialized');
  }

  /**
   * Execute the complete AI-driven expansion pipeline
   */
  async executePipeline(request: PipelineExecutionRequest): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    this.logger.log(`Starting AI pipeline execution for region: ${request.region}`);

    const pipelineStages: any = {};
    const stagesExecuted: string[] = [];
    let totalTokensUsed = 0;
    let totalCost = 0;
    let successfulStages = 0;
    let failedStages = 0;

    const config = request.pipelineConfig || this.getDefaultPipelineConfig();

    try {
      // Stage 1: Market Analysis
      if (config.enableMarketAnalysis) {
        try {
          this.logger.log('Executing Stage 1: Market Analysis');
          const marketAnalysisResult = await this.executeMarketAnalysisStage(request);
          pipelineStages.marketAnalysis = marketAnalysisResult.analysis;
          totalTokensUsed += marketAnalysisResult.costBreakdown.tokensUsed;
          totalCost += marketAnalysisResult.costBreakdown.estimatedCost;
          stagesExecuted.push('Market Analysis');
          successfulStages++;
        } catch (error) {
          this.logger.error('Market Analysis stage failed:', error instanceof Error ? error.stack : error);
          failedStages++;
        }
      }

      // Stage 2: Strategic Zone Identification
      if (config.enableZoneIdentification && pipelineStages.marketAnalysis) {
        try {
          this.logger.log('Executing Stage 2: Strategic Zone Identification');
          const strategicZones = await this.executeZoneIdentificationStage(
            pipelineStages.marketAnalysis,
            request
          );
          pipelineStages.strategicZones = strategicZones;
          stagesExecuted.push('Strategic Zone Identification');
          successfulStages++;
        } catch (error) {
          this.logger.error('Strategic Zone Identification stage failed:', error instanceof Error ? error.stack : error);
          failedStages++;
        }
      }

      // Stage 3: Location Discovery
      if (config.enableLocationDiscovery) {
        try {
          this.logger.log('Executing Stage 3: Location Discovery');
          const locationResult = await this.executeLocationDiscoveryStage(
            pipelineStages.strategicZones || [],
            request
          );
          pipelineStages.locationCandidates = 'candidates' in locationResult ? locationResult.candidates : locationResult.totalCandidates;
          totalTokensUsed += locationResult.metadata.totalTokensUsed;
          totalCost += locationResult.metadata.totalCost;
          stagesExecuted.push('Location Discovery');
          successfulStages++;
        } catch (error) {
          this.logger.error('Location Discovery stage failed:', error instanceof Error ? error.stack : error);
          failedStages++;
        }
      }

      // Stage 4: Viability Validation
      if (config.enableViabilityValidation && pipelineStages.locationCandidates) {
        try {
          this.logger.log('Executing Stage 4: Viability Validation');
          const validationResult = await this.executeViabilityValidationStage(
            pipelineStages.locationCandidates,
            request,
            config.qualityThreshold
          );
          pipelineStages.validatedCandidates = validationResult.assessedCandidates;
          totalTokensUsed += validationResult.metadata.tokensUsed;
          totalCost += validationResult.metadata.cost;
          stagesExecuted.push('Viability Validation');
          successfulStages++;
        } catch (error) {
          this.logger.error('Viability Validation stage failed:', error instanceof Error ? error.stack : error);
          failedStages++;
        }
      }

      // Stage 5: Strategic Scoring
      if (config.enableStrategicScoring && pipelineStages.validatedCandidates && pipelineStages.marketAnalysis) {
        try {
          this.logger.log('Executing Stage 5: Strategic Scoring');
          const scoringResult = await this.executeStrategicScoringStage(
            pipelineStages.validatedCandidates,
            pipelineStages.marketAnalysis,
            request
          );
          pipelineStages.scoredCandidates = scoringResult.scoredCandidates;
          totalTokensUsed += scoringResult.metadata.tokensUsed;
          totalCost += scoringResult.metadata.cost;
          stagesExecuted.push('Strategic Scoring');
          successfulStages++;
        } catch (error) {
          this.logger.error('Strategic Scoring stage failed:', error instanceof Error ? error.stack : error);
          failedStages++;
        }
      }

      // Determine final candidates
      const finalCandidates = this.selectFinalCandidates(pipelineStages, request.targetCandidates);

      const totalExecutionTime = Date.now() - startTime;
      const qualityMetrics = this.calculateQualityMetrics(pipelineStages, totalExecutionTime, totalCost);

      this.logger.log(`AI pipeline execution completed in ${totalExecutionTime}ms with ${successfulStages} successful stages`);

      return {
        finalCandidates,
        pipelineStages,
        metadata: {
          totalExecutionTime,
          stagesExecuted,
          totalTokensUsed,
          totalCost,
          successfulStages,
          failedStages
        },
        qualityMetrics
      };

    } catch (error) {
      this.logger.error('AI pipeline execution failed:', error);
      throw new Error(`Pipeline execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute Market Analysis stage
   */
  private async executeMarketAnalysisStage(request: PipelineExecutionRequest) {
    const marketAnalysisRequest = {
      region: request.region,
      bounds: request.bounds,
      existingStores: request.existingStores,
      competitorData: [], // Would be populated with actual competitor data
      analysisDepth: 'DETAILED' as const
    };

    return await this.marketAnalysisService.analyzeMarket(marketAnalysisRequest);
  }

  /**
   * Execute Strategic Zone Identification stage
   */
  private async executeZoneIdentificationStage(marketAnalysis: any, request: PipelineExecutionRequest) {
    const zoneRequest = {
      marketAnalysis,
      maxZones: 10,
      minPriority: 5
    };

    return await this.zoneIdentificationService.identifyStrategicZones(zoneRequest);
  }

  /**
   * Execute Location Discovery stage
   */
  private async executeLocationDiscoveryStage(strategicZones: any[], request: PipelineExecutionRequest) {
    if (strategicZones.length === 0) {
      // Fallback to basic location discovery without strategic zones
      const discoveryRequest = {
        strategicZones: [{
          id: 'default-zone',
          boundary: {
            type: 'Polygon' as const,
            coordinates: [[
              [request.bounds.west, request.bounds.south],
              [request.bounds.east, request.bounds.south],
              [request.bounds.east, request.bounds.north],
              [request.bounds.west, request.bounds.north],
              [request.bounds.west, request.bounds.south]
            ]]
          },
          priority: 5,
          expectedStores: request.targetCandidates
        }],
        targetCount: request.targetCandidates,
        bounds: request.bounds,
        existingStores: request.existingStores,
        qualityThreshold: 0.3
      };

      return await this.locationDiscoveryService.discoverLocations(discoveryRequest);
    }

    // Use zone-guided generation
    const zoneGuidedRequest = {
      strategicZones,
      totalTargetCandidates: request.targetCandidates,
      bounds: request.bounds,
      existingStores: request.existingStores,
      distributionStrategy: 'PRIORITY_WEIGHTED' as const
    };

    return await this.zoneGuidedGenerationService.generateZoneGuidedCandidates(zoneGuidedRequest);
  }

  /**
   * Execute Viability Validation stage
   */
  private async executeViabilityValidationStage(
    candidates: any[],
    request: PipelineExecutionRequest,
    qualityThreshold: number
  ) {
    const validationRequest = {
      candidates,
      existingStores: request.existingStores,
      constraints: {
        minDistanceFromExisting: 500, // 500m minimum between stores
        maxDistanceFromRoad: 1000, // Placeholder (not enforced - trusting GPT)
        minPopulationDensity: 1000 // Placeholder (not enforced - trusting GPT)
      },
      escalationThreshold: 0.6,
      qualityThreshold
    };

    return await this.viabilityValidationService.assessViability(validationRequest);
  }

  /**
   * Execute Strategic Scoring stage
   */
  private async executeStrategicScoringStage(
    candidates: any[],
    marketAnalysis: any,
    request: PipelineExecutionRequest
  ) {
    const scoringRequest = {
      candidates,
      marketAnalysis,
      existingStores: request.existingStores,
      scoringCriteria: {
        marketContextWeight: 0.3,
        competitivePositionWeight: 0.25,
        demographicAlignmentWeight: 0.2,
        viabilityWeight: 0.2,
        riskWeight: 0.05
      },
      businessObjectives: request.businessObjectives
    };

    return await this.strategicScoringService.scoreStrategically(scoringRequest);
  }

  /**
   * Select final candidates from pipeline stages
   */
  private selectFinalCandidates(pipelineStages: any, targetCount: number): any[] {
    // Priority order: scored > validated > location candidates
    if (pipelineStages.scoredCandidates) {
      return pipelineStages.scoredCandidates.slice(0, targetCount);
    }
    
    if (pipelineStages.validatedCandidates) {
      return pipelineStages.validatedCandidates.slice(0, targetCount);
    }
    
    if (pipelineStages.locationCandidates) {
      return pipelineStages.locationCandidates.slice(0, targetCount);
    }

    return [];
  }

  /**
   * Calculate quality metrics for pipeline execution
   */
  private calculateQualityMetrics(pipelineStages: any, executionTime: number, totalCost: number) {
    const finalCandidates = pipelineStages.scoredCandidates || pipelineStages.validatedCandidates || pipelineStages.locationCandidates || [];
    
    const candidateQuality = finalCandidates.length > 0
      ? finalCandidates.reduce((sum: number, candidate: any) => 
          sum + (candidate.strategicScore || candidate.viabilityScore || 0.5), 0) / finalCandidates.length
      : 0;

    const pipelineEfficiency = executionTime > 0 ? Math.min(1, 300000 / executionTime) : 0; // Target: 5 minutes
    const costEffectiveness = totalCost > 0 ? Math.min(1, 10 / totalCost) : 1; // Target: £10 max

    return {
      candidateQuality,
      pipelineEfficiency,
      costEffectiveness
    };
  }

  /**
   * Get default pipeline configuration
   */
  private getDefaultPipelineConfig() {
    return {
      enableMarketAnalysis: true,
      enableZoneIdentification: true,
      enableLocationDiscovery: true,
      enableViabilityValidation: true,
      enableStrategicScoring: true,
      qualityThreshold: 0.25 // Lower threshold to allow more candidates through
    };
  }

  /**
   * Get pipeline status and progress
   */
  async getPipelineStatus(pipelineId: string): Promise<{
    status: 'RUNNING' | 'COMPLETED' | 'FAILED';
    currentStage: string;
    progress: number;
    estimatedTimeRemaining: number;
  }> {
    // Simplified implementation - in reality would track actual pipeline state
    return {
      status: 'COMPLETED',
      currentStage: 'Strategic Scoring',
      progress: 100,
      estimatedTimeRemaining: 0
    };
  }

  /**
   * Cancel pipeline execution
   */
  async cancelPipeline(pipelineId: string): Promise<boolean> {
    // Implementation would cancel ongoing pipeline execution
    this.logger.log(`Pipeline ${pipelineId} cancellation requested`);
    return true;
  }
}