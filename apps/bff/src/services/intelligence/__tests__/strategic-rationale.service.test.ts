import { Test, TestingModule } from '@nestjs/testing';
import { StrategicRationaleService } from '../strategic-rationale.service';
import {
  Location,
  LocationAnalysis,
  AlternativeLocation,
  StrategicRationale
} from '../../../types/intelligence.types';

describe('StrategicRationaleService', () => {
  let service: StrategicRationaleService;

  const mockLocation: Location = {
    lat: 40.7128,
    lng: -74.0060,
    country: 'US'
  };

  const mockLocationAnalysis: LocationAnalysis = {
    location: mockLocation,
    intelligence: {
      isCommercialArea: true,
      distanceToTownCenter: 500,
      nearbyCommercialFeatures: [
        { type: 'shopping_center', name: 'Mall', distance: 300, footTrafficScore: 0.8, relevanceScore: 0.9 }
      ],
      landUseType: 'commercial',
      developmentPotential: 0.8
    },
    demographics: {
      population: { total: 50000, density: 2000, growthRate: 0.02, urbanDensityIndex: 0.8 },
      ageDistribution: { under18: 0.05, age18to34: 0.40, age35to54: 0.40, age55plus: 0.15 },
      incomeDistribution: { 
        medianHouseholdIncome: 65000, 
        averageDisposableIncome: 45000, 
        incomeIndex: 0.8, 
        purchasingPower: 0.7 
      },
      lifestyleSegments: [],
      consumerBehavior: {
        fastFoodFrequency: 8,
        healthConsciousness: 0.7,
        pricesensitivity: 0.5,
        brandLoyalty: 0.6,
        digitalEngagement: 0.8
      },
      marketFitScore: 0.75,
      dataSource: 'census',
      confidence: 0.9
    },
    competitive: {
      nearbyCompetitors: [],
      marketSaturation: 0.4,
      cannibalizationRisk: {
        riskLevel: 'LOW',
        estimatedImpact: 0.1,
        affectedStores: [],
        mitigationStrategies: []
      },
      competitiveAdvantages: ['Strategic location', 'Market gap'],
      marketGapOpportunity: 0.7
    },
    viability: {
      commercialViability: {
        score: 0.8,
        factors: { zoning: 0.9, landAvailability: 0.8, constructionFeasibility: 0.7, permitComplexity: 0.8 },
        estimatedDevelopmentCost: 450000,
        timeToOpen: 8
      },
      accessibility: {
        score: 0.7,
        factors: { vehicleAccess: 0.8, publicTransit: 0.6, walkability: 0.7, parking: 0.7 },
        nearestTransitDistance: 400,
        walkingTrafficScore: 0.6
      },
      urbanContext: {
        score: 0.75,
        factors: { populationDensity: 0.8, commercialActivity: 0.7, residentialProximity: 0.8, employmentCenters: 0.7 },
        landUsePattern: 'mixed commercial/residential',
        developmentTrend: 'growing'
      },
      overallScore: 0.75,
      concerns: [],
      strengths: ['Good commercial viability', 'Strong accessibility']
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StrategicRationaleService],
    }).compile();

    service = module.get<StrategicRationaleService>(StrategicRationaleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateStrategicRationale', () => {
    it('should generate rationale for high-scoring location', async () => {
      const result = await service.generateStrategicRationale(mockLocation, mockLocationAnalysis);

      expect(result).toBeDefined();
      expect(result.primaryReasons).toBeInstanceOf(Array);
      expect(result.primaryReasons.length).toBeGreaterThan(0);
      expect(result.addressedConcerns).toBeInstanceOf(Array);
      expect(result.confidenceFactors).toBeInstanceOf(Array);
      expect(result.riskMitigations).toBeInstanceOf(Array);
    });

    it('should include development potential in rationale for high-potential locations', async () => {
      const result = await service.generateStrategicRationale(mockLocation, mockLocationAnalysis);

      const hasDevPotentialReason = result.primaryReasons.some(reason => 
        reason.toLowerCase().includes('development potential') || 
        reason.toLowerCase().includes('market fundamentals')
      );
      expect(hasDevPotentialReason).toBe(true);
    });

    it('should address concerns for lower-scoring locations', async () => {
      const lowScoreAnalysis = {
        ...mockLocationAnalysis,
        intelligence: {
          ...mockLocationAnalysis.intelligence,
          developmentPotential: 0.3
        },
        demographics: {
          ...mockLocationAnalysis.demographics,
          marketFitScore: 0.3
        }
      };

      const result = await service.generateStrategicRationale(mockLocation, lowScoreAnalysis);

      expect(result.addressedConcerns.length).toBeGreaterThan(0);
      expect(result.riskMitigations.length).toBeGreaterThan(0);
    });

    it('should include alternative comparison when alternatives provided', async () => {
      const alternatives: AlternativeLocation[] = [{
        lat: 40.7200,
        lng: -74.0100,
        distance: 1000,
        improvementScore: 0.6,
        reasons: ['Better accessibility'],
        viabilityScore: 0.7
      }];

      const result = await service.generateStrategicRationale(mockLocation, mockLocationAnalysis, alternatives);

      expect(result.alternativeComparison).toBeDefined();
      expect(result.alternativeComparison!.whyOriginalIsBetter).toBeInstanceOf(Array);
      expect(result.alternativeComparison!.tradeoffs).toBeInstanceOf(Array);
    });

    it('should handle commercial area locations appropriately', async () => {
      const result = await service.generateStrategicRationale(mockLocation, mockLocationAnalysis);

      const hasCommercialAreaFactor = result.confidenceFactors.some(factor => 
        factor.toLowerCase().includes('commercial')
      );
      expect(hasCommercialAreaFactor).toBe(true);
    });

    it('should generate fallback rationale when AI service fails', async () => {
      // Mock a scenario where AI service would fail by using very low scores
      const failureAnalysis = {
        ...mockLocationAnalysis,
        intelligence: {
          ...mockLocationAnalysis.intelligence,
          developmentPotential: 0
        },
        demographics: {
          ...mockLocationAnalysis.demographics,
          marketFitScore: 0
        }
      };

      const result = await service.generateStrategicRationale(mockLocation, failureAnalysis);

      // Should still return a valid rationale
      expect(result).toBeDefined();
      expect(result.primaryReasons.length).toBeGreaterThan(0);
    });
  });

  describe('generateAlternativeComparison', () => {
    const mockAlternative: AlternativeLocation = {
      lat: 40.7200,
      lng: -74.0100,
      distance: 1000,
      improvementScore: 0.6,
      reasons: ['Better accessibility', 'Lower competition'],
      viabilityScore: 0.7
    };

    it('should generate comparison between original and alternative location', async () => {
      const result = await service.generateAlternativeComparison(
        mockLocation,
        mockLocationAnalysis,
        mockAlternative
      );

      expect(result).toBeDefined();
      expect(result.alternativeLocation).toBeDefined();
      expect(result.alternativeLocation.lat).toBe(mockAlternative.lat);
      expect(result.alternativeLocation.lng).toBe(mockAlternative.lng);
      expect(result.whyOriginalIsBetter).toBeInstanceOf(Array);
      expect(result.whyOriginalIsBetter.length).toBeGreaterThan(0);
      expect(result.tradeoffs).toBeInstanceOf(Array);
    });

    it('should include distance information in alternative location', async () => {
      const result = await service.generateAlternativeComparison(
        mockLocation,
        mockLocationAnalysis,
        mockAlternative
      );

      expect(result.alternativeLocation.name).toContain('1000m');
    });

    it('should provide meaningful comparison reasons', async () => {
      const result = await service.generateAlternativeComparison(
        mockLocation,
        mockLocationAnalysis,
        mockAlternative
      );

      const hasStrategicReason = result.whyOriginalIsBetter.some(reason => 
        reason.toLowerCase().includes('strategic') || 
        reason.toLowerCase().includes('market') ||
        reason.toLowerCase().includes('feasibility')
      );
      expect(hasStrategicReason).toBe(true);
    });
  });

  describe('rationale quality', () => {
    it('should generate coherent primary reasons', async () => {
      const result = await service.generateStrategicRationale(mockLocation, mockLocationAnalysis);

      // Check that reasons are meaningful strings
      result.primaryReasons.forEach(reason => {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(10);
        expect(reason).not.toMatch(/^undefined|null|NaN/);
      });
    });

    it('should provide actionable risk mitigations', async () => {
      const result = await service.generateStrategicRationale(mockLocation, mockLocationAnalysis);

      if (result.riskMitigations.length > 0) {
        result.riskMitigations.forEach(mitigation => {
          expect(typeof mitigation).toBe('string');
          expect(mitigation.length).toBeGreaterThan(5);
          // Should contain actionable language
          const hasActionableLanguage = /implement|develop|create|establish|enhance|monitor|conduct/i.test(mitigation);
          expect(hasActionableLanguage).toBe(true);
        });
      }
    });

    it('should maintain consistency between concerns and mitigations', async () => {
      const lowScoreAnalysis = {
        ...mockLocationAnalysis,
        intelligence: {
          ...mockLocationAnalysis.intelligence,
          developmentPotential: 0.2
        }
      };

      const result = await service.generateStrategicRationale(mockLocation, lowScoreAnalysis);

      // If there are concerns, there should be mitigations
      if (result.addressedConcerns.length > 0) {
        expect(result.riskMitigations.length).toBeGreaterThan(0);
      }
    });

    it('should scale rationale complexity with analysis quality', async () => {
      const highQualityAnalysis = {
        ...mockLocationAnalysis,
        demographics: {
          ...mockLocationAnalysis.demographics,
          confidence: 0.95
        }
      };

      const lowQualityAnalysis = {
        ...mockLocationAnalysis,
        demographics: {
          ...mockLocationAnalysis.demographics,
          confidence: 0.3
        }
      };

      const highQualityResult = await service.generateStrategicRationale(mockLocation, highQualityAnalysis);
      const lowQualityResult = await service.generateStrategicRationale(mockLocation, lowQualityAnalysis);

      // High quality analysis should generate more confidence factors
      expect(highQualityResult.confidenceFactors.length).toBeGreaterThanOrEqual(
        lowQualityResult.confidenceFactors.length
      );
    });
  });

  describe('caching behavior', () => {
    it('should cache rationale results', async () => {
      const start1 = Date.now();
      const result1 = await service.generateStrategicRationale(mockLocation, mockLocationAnalysis);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const result2 = await service.generateStrategicRationale(mockLocation, mockLocationAnalysis);
      const time2 = Date.now() - start2;

      // Second call should be faster (cached)
      expect(time2).toBeLessThan(time1);
      expect(result1).toEqual(result2);
    });

    it('should generate different results for different locations', async () => {
      const location2: Location = {
        lat: 41.8781,
        lng: -87.6298,
        country: 'US'
      };

      const analysis2 = {
        ...mockLocationAnalysis,
        location: location2
      };

      const result1 = await service.generateStrategicRationale(mockLocation, mockLocationAnalysis);
      const result2 = await service.generateStrategicRationale(location2, analysis2);

      // Results should be different for different locations
      expect(result1).not.toEqual(result2);
    });
  });

  describe('error handling', () => {
    it('should handle invalid location data gracefully', async () => {
      const invalidLocation: Location = {
        lat: NaN,
        lng: NaN,
        country: 'US'
      };

      const result = await service.generateStrategicRationale(invalidLocation, mockLocationAnalysis);

      // Should still return a valid rationale structure
      expect(result).toBeDefined();
      expect(result.primaryReasons).toBeInstanceOf(Array);
    });

    it('should handle missing analysis data gracefully', async () => {
      const incompleteAnalysis = {
        ...mockLocationAnalysis,
        intelligence: {
          ...mockLocationAnalysis.intelligence,
          nearbyCommercialFeatures: []
        }
      };

      const result = await service.generateStrategicRationale(mockLocation, incompleteAnalysis);

      expect(result).toBeDefined();
      expect(result.primaryReasons.length).toBeGreaterThan(0);
    });
  });
});