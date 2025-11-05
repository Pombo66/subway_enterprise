import { PrismaClient } from '@prisma/client';
import { ModelConfigurationManager, AIOperationType } from './model-configuration.service';
import { LocationDiscoveryService } from './location-discovery.service';
import { StrategicZone } from '../../types/market-analysis.types';
import { LocationCandidate, LocationDiscoveryRequest } from '../../types/location-discovery.types';

export interface ZoneGuidedGenerationRequest {
  strategicZones: StrategicZone[];
  totalTargetCandidates: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  existingStores: {
    lat: number;
    lng: number;
    performance?: number;
  }[];
  distributionStrategy: 'PRIORITY_WEIGHTED' | 'EQUAL_DISTRIBUTION' | 'PERFORMANCE_BASED';
  densityFactors?: {
    highPriorityMultiplier: number; // e.g., 1.5
    mediumPriorityMultiplier: number; // e.g., 1.0
    lowPriorityMultiplier: number; // e.g., 0.5
  };
}

export interface ZoneGuidedGenerationResult {
  candidatesByZone: {
    zoneId: string;
    zoneName: string;
    candidates: LocationCandidate[];
    targetCount: number;
    actualCount: number;
    averageQuality: number;
    reasoning: string[];
  }[];
  totalCandidates: LocationCandidate[];
  metadata: {
    zonesProcessed: number;
    totalTokensUsed: number;
    totalCost: number;
    generationTimeMs: number;
    distributionStrategy: string;
  };
  qualityAnalysis: {
    zoneQualityComparison: {
      zoneId: string;
      averageViability: number;
      candidateCount: number;
      qualityRank: number;
    }[];
    overallQualityScore: number;
    recommendedFocusZones: string[];
  };
}

export class StrategicZoneGuidedGenerationService {
  private readonly modelConfigManager: ModelConfigurationManager;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly locationDiscoveryService: LocationDiscoveryService
  ) {
    this.modelConfigManager = ModelConfigurationManager.getInstance();
    console.log('🎯 Strategic Zone-Guided Generation Service initialized');
  }

  /**
   * Generate location candidates guided by strategic zones
   */
  async generateZoneGuidedCandidates(request: ZoneGuidedGenerationRequest): Promise<ZoneGuidedGenerationResult> {
    const startTime = Date.now();
    console.log(`Starting zone-guided generation for ${request.totalTargetCandidates} candidates across ${request.strategicZones.length} zones`);

    try {
      // Calculate candidate distribution across zones
      const zoneDistribution = this.calculateZoneDistribution(request);
      
      // Generate candidates for each zone
      const candidatesByZone = await this.generateCandidatesForZones(request, zoneDistribution);
      
      // Collect all candidates
      const totalCandidates = candidatesByZone.flatMap(zone => zone.candidates);
      
      // Perform quality analysis
      const qualityAnalysis = this.performQualityAnalysis(candidatesByZone);
      
      // Add reasoning for each zone's candidate selection
      const enhancedZoneResults = await this.addZoneReasoning(candidatesByZone, request);

      const generationTime = Date.now() - startTime;
      const totalTokensUsed = candidatesByZone.reduce((sum, zone) => 
        sum + zone.candidates.reduce((tokenSum, candidate) => 
          tokenSum + (candidate.metadata.tokensUsed || 0), 0), 0);
      
      const totalCost = this.estimateCost(totalTokensUsed);

      console.log(`Zone-guided generation completed: ${totalCandidates.length} candidates in ${generationTime}ms`);

      return {
        candidatesByZone: enhancedZoneResults,
        totalCandidates,
        metadata: {
          zonesProcessed: request.strategicZones.length,
          totalTokensUsed,
          totalCost,
          generationTimeMs: generationTime,
          distributionStrategy: request.distributionStrategy
        },
        qualityAnalysis
      };

    } catch (error) {
      console.error('Zone-guided generation failed:', error);
      throw new Error(`Zone-guided generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate how to distribute candidates across strategic zones
   */
  private calculateZoneDistribution(request: ZoneGuidedGenerationRequest): Map<string, number> {
    const distribution = new Map<string, number>();
    const { strategicZones, totalTargetCandidates, distributionStrategy } = request;

    switch (distributionStrategy) {
      case 'PRIORITY_WEIGHTED':
        return this.calculatePriorityWeightedDistribution(strategicZones, totalTargetCandidates, request.densityFactors);
      
      case 'EQUAL_DISTRIBUTION':
        return this.calculateEqualDistribution(strategicZones, totalTargetCandidates);
      
      case 'PERFORMANCE_BASED':
        return this.calculatePerformanceBasedDistribution(strategicZones, totalTargetCandidates, request.existingStores);
      
      default:
        return this.calculatePriorityWeightedDistribution(strategicZones, totalTargetCandidates);
    }
  }

  /**
   * Calculate priority-weighted distribution
   */
  private calculatePriorityWeightedDistribution(
    zones: StrategicZone[],
    totalCandidates: number,
    densityFactors?: any
  ): Map<string, number> {
    const distribution = new Map<string, number>();
    
    // Apply density multipliers based on priority
    const weightedZones = zones.map(zone => {
      let multiplier = 1;
      
      if (densityFactors) {
        if (zone.priority >= 8) multiplier = densityFactors.highPriorityMultiplier || 1.5;
        else if (zone.priority >= 5) multiplier = densityFactors.mediumPriorityMultiplier || 1.0;
        else multiplier = densityFactors.lowPriorityMultiplier || 0.5;
      }
      
      return {
        ...zone,
        weightedPriority: zone.priority * multiplier
      };
    });

    const totalWeight = weightedZones.reduce((sum, zone) => sum + zone.weightedPriority, 0);
    
    weightedZones.forEach(zone => {
      const candidateCount = Math.max(1, Math.round((zone.weightedPriority / totalWeight) * totalCandidates));
      distribution.set(zone.id, candidateCount);
    });

    return distribution;
  }

  /**
   * Calculate equal distribution across zones
   */
  private calculateEqualDistribution(zones: StrategicZone[], totalCandidates: number): Map<string, number> {
    const distribution = new Map<string, number>();
    const candidatesPerZone = Math.ceil(totalCandidates / zones.length);
    
    zones.forEach(zone => {
      distribution.set(zone.id, candidatesPerZone);
    });

    return distribution;
  }

  /**
   * Calculate performance-based distribution
   */
  private calculatePerformanceBasedDistribution(
    zones: StrategicZone[],
    totalCandidates: number,
    existingStores: any[]
  ): Map<string, number> {
    const distribution = new Map<string, number>();
    
    // Simple implementation - in reality would analyze store performance in each zone
    const zonePerformanceScores = zones.map(zone => ({
      ...zone,
      performanceScore: zone.revenueProjection / 1000000 // Normalize revenue projection
    }));

    const totalPerformanceScore = zonePerformanceScores.reduce((sum, zone) => sum + zone.performanceScore, 0);
    
    zonePerformanceScores.forEach(zone => {
      const candidateCount = Math.max(1, Math.round((zone.performanceScore / totalPerformanceScore) * totalCandidates));
      distribution.set(zone.id, candidateCount);
    });

    return distribution;
  }

  /**
   * Generate candidates for each strategic zone
   */
  private async generateCandidatesForZones(
    request: ZoneGuidedGenerationRequest,
    distribution: Map<string, number>
  ) {
    const results = [];

    for (const zone of request.strategicZones) {
      const targetCount = distribution.get(zone.id) || 0;
      
      if (targetCount === 0) continue;

      console.log(`Generating ${targetCount} candidates for zone: ${zone.name}`);

      try {
        // Create location discovery request for this zone
        const zoneRequest: LocationDiscoveryRequest = {
          strategicZones: [{
            id: zone.id,
            boundary: zone.boundary,
            priority: zone.priority,
            expectedStores: zone.expectedStores
          }],
          targetCount,
          bounds: request.bounds,
          existingStores: request.existingStores,
          constraints: {
            minDistanceFromExisting: 1000, // 1km minimum distance
            maxDistanceFromRoad: 500, // 500m max from road
          },
          batchSize: Math.min(25, targetCount), // Smaller batches for zone-specific generation
          qualityThreshold: 0.4 // Slightly higher threshold for strategic zones
        };

        const zoneResult = await this.locationDiscoveryService.discoverLocations(zoneRequest);
        
        results.push({
          zoneId: zone.id,
          zoneName: zone.name,
          candidates: zoneResult.candidates,
          targetCount,
          actualCount: zoneResult.candidates.length,
          averageQuality: zoneResult.metadata.averageViabilityScore,
          reasoning: [] // Will be populated later
        });

      } catch (error) {
        console.error(`Failed to generate candidates for zone ${zone.name}:`, error);
        
        // Add empty result to maintain structure
        results.push({
          zoneId: zone.id,
          zoneName: zone.name,
          candidates: [],
          targetCount,
          actualCount: 0,
          averageQuality: 0,
          reasoning: [`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    }

    return results;
  }

  /**
   * Perform quality analysis across zones
   */
  private performQualityAnalysis(candidatesByZone: any[]): any {
    const zoneQualityComparison = candidatesByZone
      .map(zone => ({
        zoneId: zone.zoneId,
        averageViability: zone.averageQuality,
        candidateCount: zone.actualCount,
        qualityRank: 0 // Will be calculated below
      }))
      .sort((a, b) => b.averageViability - a.averageViability)
      .map((zone, index) => ({ ...zone, qualityRank: index + 1 }));

    const overallQualityScore = zoneQualityComparison.length > 0
      ? zoneQualityComparison.reduce((sum, zone) => sum + zone.averageViability, 0) / zoneQualityComparison.length
      : 0;

    // Recommend top 3 zones for focus
    const recommendedFocusZones = zoneQualityComparison
      .slice(0, 3)
      .map(zone => zone.zoneId);

    return {
      zoneQualityComparison,
      overallQualityScore,
      recommendedFocusZones
    };
  }

  /**
   * Add reasoning for each zone's candidate selection
   */
  private async addZoneReasoning(candidatesByZone: any[], request: ZoneGuidedGenerationRequest) {
    return candidatesByZone.map(zoneResult => {
      const zone = request.strategicZones.find(z => z.id === zoneResult.zoneId);
      const reasoning: string[] = [];

      // Distribution strategy reasoning
      reasoning.push(`Used ${request.distributionStrategy.toLowerCase().replace('_', ' ')} strategy for candidate allocation`);

      // Zone-specific reasoning
      if (zone) {
        reasoning.push(`Zone priority: ${zone.priority}/10 (${zone.opportunityType.toLowerCase().replace('_', ' ')})`);
        reasoning.push(`Expected revenue potential: $${zone.revenueProjection.toLocaleString()}`);
        
        if (zone.riskLevel === 'LOW') {
          reasoning.push('Low risk zone - suitable for aggressive expansion');
        } else if (zone.riskLevel === 'HIGH') {
          reasoning.push('High risk zone - requires careful site selection');
        }
      }

      // Performance reasoning
      if (zoneResult.actualCount < zoneResult.targetCount) {
        reasoning.push(`Generated ${zoneResult.actualCount}/${zoneResult.targetCount} candidates due to quality constraints`);
      } else if (zoneResult.actualCount > zoneResult.targetCount) {
        reasoning.push(`Generated ${zoneResult.actualCount} high-quality candidates (exceeded target of ${zoneResult.targetCount})`);
      }

      // Quality reasoning
      if (zoneResult.averageQuality > 0.7) {
        reasoning.push('High-quality candidates identified - recommend prioritizing this zone');
      } else if (zoneResult.averageQuality < 0.4) {
        reasoning.push('Lower quality candidates - may require additional market research');
      }

      return {
        ...zoneResult,
        reasoning
      };
    });
  }

  /**
   * Estimate cost based on tokens used
   */
  private estimateCost(tokens: number): number {
    const pricing = this.modelConfigManager.getModelPricing('gpt-5-nano');
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    const costUSD = (inputTokens * pricing.inputTokensPerMillion / 1000000) + 
                   (outputTokens * pricing.outputTokensPerMillion / 1000000);
    
    return costUSD * 0.8; // Convert to GBP
  }

  /**
   * Get intelligent distribution recommendations
   */
  async getDistributionRecommendations(
    zones: StrategicZone[],
    totalCandidates: number,
    existingStores: any[]
  ): Promise<{
    recommendedStrategy: string;
    reasoning: string[];
    alternativeStrategies: {
      strategy: string;
      description: string;
      suitableFor: string[];
    }[];
  }> {
    const reasoning: string[] = [];
    let recommendedStrategy = 'PRIORITY_WEIGHTED';

    // Analyze zone characteristics
    const highPriorityZones = zones.filter(z => z.priority >= 8).length;
    const lowRiskZones = zones.filter(z => z.riskLevel === 'LOW').length;
    const totalZones = zones.length;

    // Decision logic for strategy recommendation
    if (highPriorityZones / totalZones > 0.6) {
      recommendedStrategy = 'PRIORITY_WEIGHTED';
      reasoning.push('High proportion of priority zones - focus resources on best opportunities');
    } else if (totalZones <= 3) {
      recommendedStrategy = 'EQUAL_DISTRIBUTION';
      reasoning.push('Small number of zones - equal distribution ensures comprehensive coverage');
    } else if (lowRiskZones / totalZones > 0.7) {
      recommendedStrategy = 'PERFORMANCE_BASED';
      reasoning.push('Many low-risk zones - performance-based allocation maximizes ROI');
    }

    reasoning.push(`Recommended for ${totalCandidates} candidates across ${totalZones} strategic zones`);

    const alternativeStrategies = [
      {
        strategy: 'PRIORITY_WEIGHTED',
        description: 'Allocate more candidates to higher priority zones',
        suitableFor: ['High-priority zones available', 'Resource optimization', 'Risk-conscious expansion']
      },
      {
        strategy: 'EQUAL_DISTRIBUTION',
        description: 'Distribute candidates equally across all zones',
        suitableFor: ['Comprehensive market coverage', 'Small number of zones', 'Exploratory expansion']
      },
      {
        strategy: 'PERFORMANCE_BASED',
        description: 'Focus on zones with highest revenue potential',
        suitableFor: ['ROI maximization', 'Low-risk zones', 'Aggressive growth targets']
      }
    ];

    return {
      recommendedStrategy,
      reasoning,
      alternativeStrategies
    };
  }
}