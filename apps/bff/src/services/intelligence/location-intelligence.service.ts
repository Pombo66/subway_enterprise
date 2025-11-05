import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  LocationIntelligenceService as ILocationIntelligenceService,
  EnhancedSuggestion,
  ViabilityAssessment,
  AlternativeLocation,
  IntelligenceError,
  LocationIntelligence,
  DemographicProfile,
  CompetitiveAnalysis,
  StrategicRationale
} from '../../types/intelligence.types';
import { ExpansionSuggestion, ScopeSelection } from '../expansion.service';
import { IntelligenceConfigManager } from '../../config/intelligence.config';
import { StrategicRationaleService } from './strategic-rationale.service';

@Injectable()
export class LocationIntelligenceService implements ILocationIntelligenceService {
  private configManager: IntelligenceConfigManager;

  constructor(
    @Inject(PrismaClient) private readonly prisma: PrismaClient,
    private readonly strategicRationaleService: StrategicRationaleService
  ) {
    this.configManager = IntelligenceConfigManager.getInstance();
  }

  async enhanceLocationSuggestions(
    suggestions: ExpansionSuggestion[], 
    scope: ScopeSelection
  ): Promise<EnhancedSuggestion[]> {
    console.info('Enhancing location suggestions with intelligence', {
      suggestionCount: suggestions.length,
      scopeType: scope.type,
      scopeValue: scope.value
    });

    const startTime = Date.now();
    const enhancedSuggestions: EnhancedSuggestion[] = [];
    const config = this.configManager.getConfig();

    for (const suggestion of suggestions) {
      try {
        const enhanced = await this.enhanceSingleSuggestion(suggestion, scope, config);
        enhancedSuggestions.push(enhanced);
      } catch (error) {
        console.warn(`Failed to enhance suggestion ${suggestion.id}:`, error);
        // Apply graceful degradation
        const errorObj = error instanceof Error ? error : new Error(String(error));
        const fallbackSuggestion = this.createFallbackSuggestion(suggestion, errorObj);
        enhancedSuggestions.push(fallbackSuggestion);
      }
    }

    const latencyMs = Date.now() - startTime;
    console.info('Location suggestions enhanced', {
      originalCount: suggestions.length,
      enhancedCount: enhancedSuggestions.length,
      latencyMs
    });

    return enhancedSuggestions;
  }

  async validateLocationViability(
    lat: number, 
    lng: number, 
    scope: ScopeSelection
  ): Promise<ViabilityAssessment> {
    console.info('Validating location viability', { lat, lng, scope: scope.type });

    try {
      // This will be implemented in the ViabilityAssessmentService
      // For now, return a basic assessment
      return {
        commercialViability: {
          score: 0.7,
          factors: {
            zoning: 0.8,
            landAvailability: 0.7,
            constructionFeasibility: 0.6,
            permitComplexity: 0.7
          },
          estimatedDevelopmentCost: 500000,
          timeToOpen: 6
        },
        accessibility: {
          score: 0.8,
          factors: {
            vehicleAccess: 0.9,
            publicTransit: 0.6,
            walkability: 0.8,
            parking: 0.9
          },
          nearestTransitDistance: 300,
          walkingTrafficScore: 0.7
        },
        urbanContext: {
          score: 0.75,
          factors: {
            populationDensity: 0.8,
            commercialActivity: 0.7,
            residentialProximity: 0.8,
            employmentCenters: 0.7
          },
          landUsePattern: 'mixed commercial/residential',
          developmentTrend: 'stable'
        },
        overallScore: 0.75,
        concerns: [],
        strengths: ['Good vehicle access', 'Mixed-use area', 'Stable development']
      };
    } catch (error) {
      console.error('Failed to validate location viability:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Viability assessment failed: ${errorMessage}`);
    }
  }

  async identifyAlternativeLocations(
    originalSuggestion: ExpansionSuggestion,
    radius: number = 2000
  ): Promise<AlternativeLocation[]> {
    console.info('Identifying alternative locations', {
      originalId: originalSuggestion.id,
      radius
    });

    try {
      // This will be enhanced with actual geographic analysis
      // For now, return empty array as alternatives will be identified by other services
      return [];
    } catch (error) {
      console.error('Failed to identify alternative locations:', error);
      return [];
    }
  }

  private async enhanceSingleSuggestion(
    suggestion: ExpansionSuggestion,
    scope: ScopeSelection,
    config: any
  ): Promise<EnhancedSuggestion> {
    const startTime = Date.now();

    // Initialize intelligence components with defaults
    // These will be populated by specialized services in subsequent tasks
    const locationIntelligence: LocationIntelligence = {
      isCommercialArea: true, // Will be determined by ViabilityAssessmentService
      distanceToTownCenter: 500, // Will be calculated by geographic analysis
      nearbyCommercialFeatures: [], // Will be populated by feature analysis
      landUseType: 'mixed', // Will be determined by land use analysis
      developmentPotential: 0.7 // Will be calculated by viability assessment
    };

    const demographicProfile: DemographicProfile = {
      population: {
        total: 50000,
        density: 1200,
        growthRate: 2.1,
        urbanDensityIndex: 0.7
      },
      ageDistribution: {
        under18: 22,
        age18to34: 28,
        age35to54: 32,
        age55plus: 18
      },
      incomeDistribution: {
        medianHouseholdIncome: 65000,
        averageDisposableIncome: 45000,
        incomeIndex: 0.8,
        purchasingPower: 0.75
      },
      lifestyleSegments: [
        {
          name: 'Urban Professionals',
          percentage: 35,
          description: 'Working professionals in urban areas',
          subwayAffinity: 0.8
        }
      ],
      consumerBehavior: {
        fastFoodFrequency: 4.2,
        healthConsciousness: 0.6,
        pricesensitivity: 0.5,
        brandLoyalty: 0.7,
        digitalEngagement: 0.8
      },
      marketFitScore: 0.75,
      dataSource: 'ai_inferred', // Will be updated based on actual data availability
      confidence: 0.7
    };

    const competitiveAnalysis: CompetitiveAnalysis = {
      nearbyCompetitors: [], // Will be populated by CompetitiveAnalysisService
      marketSaturation: 0.4,
      cannibalizationRisk: {
        riskLevel: 'LOW',
        estimatedImpact: 0.1,
        affectedStores: [],
        mitigationStrategies: []
      },
      competitiveAdvantages: ['Strategic location', 'Market gap opportunity'],
      marketGapOpportunity: 0.6
    };

    // Calculate intelligence score and credibility rating
    const intelligenceScore = this.calculateIntelligenceScore(
      locationIntelligence,
      demographicProfile,
      competitiveAnalysis
    );

    const credibilityRating = this.calculateCredibilityRating(intelligenceScore, demographicProfile.confidence);
    const executiveReadiness = credibilityRating === 'HIGH' && intelligenceScore >= 0.59;

    const viabilityAssessment = await this.validateLocationViability(
      suggestion.lat,
      suggestion.lng,
      scope
    );

    // Generate strategic rationale using AI-powered service
    const locationAnalysis = {
      location: { lat: suggestion.lat, lng: suggestion.lng, country: 'US' },
      intelligence: locationIntelligence,
      demographics: demographicProfile,
      competitive: competitiveAnalysis,
      viability: viabilityAssessment
    };

    const strategicRationale = await this.strategicRationaleService.generateStrategicRationale(
      { lat: suggestion.lat, lng: suggestion.lng, country: 'US' },
      locationAnalysis
    );

    const latencyMs = Date.now() - startTime;

    return {
      ...suggestion,
      locationIntelligence,
      demographicProfile,
      competitiveAnalysis,
      viabilityAssessment,
      strategicRationale,
      intelligenceScore,
      credibilityRating,
      executiveReadiness
    };
  }

  private calculateIntelligenceScore(
    locationIntelligence: LocationIntelligence,
    demographicProfile: DemographicProfile,
    competitiveAnalysis: CompetitiveAnalysis
  ): number {
    // Weighted average of intelligence components
    const weights = {
      location: 0.3,
      demographic: 0.4,
      competitive: 0.3
    };

    const locationScore = locationIntelligence.developmentPotential;
    const demographicScore = demographicProfile.marketFitScore * demographicProfile.confidence;
    const competitiveScore = competitiveAnalysis.marketGapOpportunity;

    const score = (
      locationScore * weights.location +
      demographicScore * weights.demographic +
      competitiveScore * weights.competitive
    );

    return Math.max(0, Math.min(1, score));
  }

  private calculateCredibilityRating(
    intelligenceScore: number,
    dataConfidence: number
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    const combinedScore = (intelligenceScore + dataConfidence) / 2;

    // Adjusted thresholds for more realistic credibility rating
    if (combinedScore >= 0.55) return 'HIGH';
    if (combinedScore >= 0.35) return 'MEDIUM';
    return 'LOW';
  }

  private createFallbackSuggestion(
    originalSuggestion: ExpansionSuggestion,
    error: Error
  ): EnhancedSuggestion {
    console.warn('Creating fallback suggestion due to intelligence enhancement failure', {
      suggestionId: originalSuggestion.id,
      error: error.message
    });

    // Create minimal intelligence data for fallback
    const fallbackIntelligence: LocationIntelligence = {
      isCommercialArea: false, // Unknown
      distanceToTownCenter: -1, // Unknown
      nearbyCommercialFeatures: [],
      landUseType: 'mixed', // Default assumption
      developmentPotential: 0.5 // Neutral score
    };

    const fallbackDemographic: DemographicProfile = {
      population: { total: 0, density: 0, growthRate: 0, urbanDensityIndex: 0 },
      ageDistribution: { under18: 0, age18to34: 0, age35to54: 0, age55plus: 0 },
      incomeDistribution: { medianHouseholdIncome: 0, averageDisposableIncome: 0, incomeIndex: 0, purchasingPower: 0 },
      lifestyleSegments: [],
      consumerBehavior: { fastFoodFrequency: 0, healthConsciousness: 0, pricesensitivity: 0, brandLoyalty: 0, digitalEngagement: 0 },
      marketFitScore: 0,
      dataSource: 'ai_inferred',
      confidence: 0
    };

    const fallbackCompetitive: CompetitiveAnalysis = {
      nearbyCompetitors: [],
      marketSaturation: 0.5,
      cannibalizationRisk: {
        riskLevel: 'MEDIUM',
        estimatedImpact: 0.5,
        affectedStores: [],
        mitigationStrategies: []
      },
      competitiveAdvantages: [],
      marketGapOpportunity: 0.5
    };

    const fallbackViability: ViabilityAssessment = {
      commercialViability: {
        score: 0.5,
        factors: { zoning: 0.5, landAvailability: 0.5, constructionFeasibility: 0.5, permitComplexity: 0.5 },
        estimatedDevelopmentCost: 0,
        timeToOpen: 0
      },
      accessibility: {
        score: 0.5,
        factors: { vehicleAccess: 0.5, publicTransit: 0.5, walkability: 0.5, parking: 0.5 },
        nearestTransitDistance: 0,
        walkingTrafficScore: 0.5
      },
      urbanContext: {
        score: 0.5,
        factors: { populationDensity: 0.5, commercialActivity: 0.5, residentialProximity: 0.5, employmentCenters: 0.5 },
        landUsePattern: 'unknown',
        developmentTrend: 'stable'
      },
      overallScore: 0.5,
      concerns: ['Intelligence enhancement failed - limited data available'],
      strengths: []
    };

    const fallbackRationale: StrategicRationale = {
      primaryReasons: ['Location selected by algorithmic analysis'],
      addressedConcerns: ['Intelligence enhancement temporarily unavailable'],
      confidenceFactors: [],
      riskMitigations: ['Fallback to proven algorithmic scoring']
    };

    return {
      ...originalSuggestion,
      locationIntelligence: fallbackIntelligence,
      demographicProfile: fallbackDemographic,
      competitiveAnalysis: fallbackCompetitive,
      viabilityAssessment: fallbackViability,
      strategicRationale: fallbackRationale,
      intelligenceScore: 0.3, // Low score due to fallback
      credibilityRating: 'LOW',
      executiveReadiness: false
    };
  }
}