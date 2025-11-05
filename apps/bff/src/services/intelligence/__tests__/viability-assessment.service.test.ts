import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { ViabilityAssessmentService } from '../viability-assessment.service';
import {
  Location,
  LocationAnalysis,
  CommercialViabilityScore,
  AccessibilityAssessment,
  UrbanContextAnalysis,
  StrategicRationale
} from '../../../types/intelligence.types';

// Mock PrismaClient
const mockPrismaClient = {
  // Add any database operations if needed
};

describe('ViabilityAssessmentService', () => {
  let service: ViabilityAssessmentService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViabilityAssessmentService,
        {
          provide: PrismaClient,
          useValue: mockPrismaClient,
        },
      ],
    }).compile();

    service = module.get<ViabilityAssessmentService>(ViabilityAssessmentService);
    prisma = module.get(PrismaClient);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('assessCommercialViability', () => {
    const testLat = 40.7128;
    const testLng = -74.0060;

    it('should assess commercial viability successfully', async () => {
      const result = await service.assessCommercialViability(testLat, testLng);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.factors).toBeDefined();
      expect(result.factors.zoning).toBeGreaterThanOrEqual(0);
      expect(result.factors.zoning).toBeLessThanOrEqual(1);
      expect(result.factors.landAvailability).toBeGreaterThanOrEqual(0);
      expect(result.factors.landAvailability).toBeLessThanOrEqual(1);
      expect(result.factors.constructionFeasibility).toBeGreaterThanOrEqual(0);
      expect(result.factors.constructionFeasibility).toBeLessThanOrEqual(1);
      expect(result.factors.permitComplexity).toBeGreaterThanOrEqual(0);
      expect(result.factors.permitComplexity).toBeLessThanOrEqual(1);
      expect(result.estimatedDevelopmentCost).toBeGreaterThan(0);
      expect(result.timeToOpen).toBeGreaterThan(0);
    });

    it('should return cached results for repeated calls', async () => {
      const result1 = await service.assessCommercialViability(testLat, testLng);
      const result2 = await service.assessCommercialViability(testLat, testLng);

      expect(result1).toEqual(result2);
    });

    it('should handle errors gracefully', async () => {
      // Mock a method to throw an error
      jest.spyOn(service as any, 'analyzeZoning').mockRejectedValue(new Error('API error'));

      const result = await service.assessCommercialViability(testLat, testLng);

      expect(result).toBeDefined();
      expect(result.score).toBe(0.5); // Fallback score
    });

    it('should calculate realistic development costs', async () => {
      const result = await service.assessCommercialViability(testLat, testLng);

      expect(result.estimatedDevelopmentCost).toBeGreaterThan(200000);
      expect(result.estimatedDevelopmentCost).toBeLessThan(1000000);
    });

    it('should estimate reasonable time to open', async () => {
      const result = await service.assessCommercialViability(testLat, testLng);

      expect(result.timeToOpen).toBeGreaterThan(3);
      expect(result.timeToOpen).toBeLessThan(24);
    });
  });

  describe('validateLocationAccessibility', () => {
    const testLocation: Location = {
      lat: 40.7128,
      lng: -74.0060,
      country: 'US',
      region: 'NY'
    };

    it('should validate location accessibility successfully', async () => {
      const result = await service.validateLocationAccessibility(testLocation);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.factors).toBeDefined();
      expect(result.factors.vehicleAccess).toBeGreaterThanOrEqual(0);
      expect(result.factors.vehicleAccess).toBeLessThanOrEqual(1);
      expect(result.factors.publicTransit).toBeGreaterThanOrEqual(0);
      expect(result.factors.publicTransit).toBeLessThanOrEqual(1);
      expect(result.factors.walkability).toBeGreaterThanOrEqual(0);
      expect(result.factors.walkability).toBeLessThanOrEqual(1);
      expect(result.factors.parking).toBeGreaterThanOrEqual(0);
      expect(result.factors.parking).toBeLessThanOrEqual(1);
      expect(result.nearestTransitDistance).toBeGreaterThan(0);
      expect(result.walkingTrafficScore).toBeGreaterThanOrEqual(0);
      expect(result.walkingTrafficScore).toBeLessThanOrEqual(1);
    });

    it('should return cached results for repeated calls', async () => {
      const result1 = await service.validateLocationAccessibility(testLocation);
      const result2 = await service.validateLocationAccessibility(testLocation);

      expect(result1).toEqual(result2);
    });

    it('should handle errors gracefully', async () => {
      // Mock a method to throw an error
      jest.spyOn(service as any, 'assessVehicleAccess').mockRejectedValue(new Error('Network error'));

      const result = await service.validateLocationAccessibility(testLocation);

      expect(result).toBeDefined();
      expect(result.score).toBe(0.5); // Fallback score
    });

    it('should calculate reasonable transit distances', async () => {
      const result = await service.validateLocationAccessibility(testLocation);

      expect(result.nearestTransitDistance).toBeGreaterThan(0);
      expect(result.nearestTransitDistance).toBeLessThan(5000); // Within 5km
    });
  });

  describe('analyzeUrbanContext', () => {
    const testLat = 40.7128;
    const testLng = -74.0060;
    const testRadius = 1000;

    it('should analyze urban context successfully', async () => {
      const result = await service.analyzeUrbanContext(testLat, testLng, testRadius);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.factors).toBeDefined();
      expect(result.factors.populationDensity).toBeGreaterThanOrEqual(0);
      expect(result.factors.populationDensity).toBeLessThanOrEqual(1);
      expect(result.factors.commercialActivity).toBeGreaterThanOrEqual(0);
      expect(result.factors.commercialActivity).toBeLessThanOrEqual(1);
      expect(result.factors.residentialProximity).toBeGreaterThanOrEqual(0);
      expect(result.factors.residentialProximity).toBeLessThanOrEqual(1);
      expect(result.factors.employmentCenters).toBeGreaterThanOrEqual(0);
      expect(result.factors.employmentCenters).toBeLessThanOrEqual(1);
      expect(result.landUsePattern).toBeDefined();
      expect(result.developmentTrend).toMatch(/^(growing|stable|declining)$/);
    });

    it('should return cached results for repeated calls', async () => {
      const result1 = await service.analyzeUrbanContext(testLat, testLng, testRadius);
      const result2 = await service.analyzeUrbanContext(testLat, testLng, testRadius);

      expect(result1).toEqual(result2);
    });

    it('should handle different radius values', async () => {
      const result500 = await service.analyzeUrbanContext(testLat, testLng, 500);
      const result2000 = await service.analyzeUrbanContext(testLat, testLng, 2000);

      expect(result500).toBeDefined();
      expect(result2000).toBeDefined();
      // Results might be different due to different analysis radius
    });

    it('should handle errors gracefully', async () => {
      // Mock a method to throw an error
      jest.spyOn(service as any, 'analyzePopulationDensity').mockRejectedValue(new Error('Data error'));

      const result = await service.analyzeUrbanContext(testLat, testLng, testRadius);

      expect(result).toBeDefined();
      expect(result.score).toBe(0.5); // Fallback score
    });

    it('should provide valid land use patterns', async () => {
      const result = await service.analyzeUrbanContext(testLat, testLng, testRadius);

      const validPatterns = [
        'dense urban mixed-use',
        'urban commercial/residential',
        'suburban mixed-use',
        'low-density residential'
      ];
      
      expect(validPatterns).toContain(result.landUsePattern);
    });
  });

  describe('generateStrategicRationale', () => {
    const testLocation: Location = {
      lat: 40.7128,
      lng: -74.0060,
      country: 'US',
      region: 'NY'
    };

    const mockAnalysis: LocationAnalysis = {
      location: testLocation,
      demographics: {
        population: { total: 50000, density: 1200, growthRate: 2.1, urbanDensityIndex: 0.7 },
        ageDistribution: { under18: 22, age18to34: 28, age35to54: 32, age55plus: 18 },
        incomeDistribution: { 
          medianHouseholdIncome: 65000, 
          averageDisposableIncome: 45000, 
          incomeIndex: 0.8, 
          purchasingPower: 0.75 
        },
        lifestyleSegments: [],
        consumerBehavior: {
          fastFoodFrequency: 4.2,
          healthConsciousness: 0.6,
          pricesensitivity: 0.5,
          brandLoyalty: 0.7,
          digitalEngagement: 0.8
        },
        marketFitScore: 0.8,
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
        competitiveAdvantages: [],
        marketGapOpportunity: 0.7
      },
      viability: {
        commercialViability: {
          score: 0.8,
          factors: { zoning: 0.8, landAvailability: 0.7, constructionFeasibility: 0.8, permitComplexity: 0.9 },
          estimatedDevelopmentCost: 450000,
          timeToOpen: 7
        },
        accessibility: {
          score: 0.9,
          factors: { vehicleAccess: 0.9, publicTransit: 0.8, walkability: 0.9, parking: 0.8 },
          nearestTransitDistance: 200,
          walkingTrafficScore: 0.8
        },
        urbanContext: {
          score: 0.8,
          factors: { populationDensity: 0.8, commercialActivity: 0.8, residentialProximity: 0.7, employmentCenters: 0.8 },
          landUsePattern: 'urban commercial/residential',
          developmentTrend: 'growing'
        },
        overallScore: 0.8,
        concerns: [],
        strengths: []
      },
      intelligence: {
        isCommercialArea: true,
        distanceToTownCenter: 500,
        nearbyCommercialFeatures: [],
        landUseType: 'commercial',
        developmentPotential: 0.8
      }
    };

    it('should generate strategic rationale successfully', async () => {
      const result = await service.generateStrategicRationale(testLocation, mockAnalysis);

      expect(result).toBeDefined();
      expect(result.primaryReasons).toBeDefined();
      expect(result.primaryReasons.length).toBeGreaterThan(0);
      expect(result.addressedConcerns).toBeDefined();
      expect(result.confidenceFactors).toBeDefined();
      expect(result.confidenceFactors.length).toBeGreaterThan(0);
      expect(result.riskMitigations).toBeDefined();
      expect(result.riskMitigations.length).toBeGreaterThan(0);
    });

    it('should identify primary reasons based on analysis', async () => {
      const result = await service.generateStrategicRationale(testLocation, mockAnalysis);

      expect(result.primaryReasons.some(reason => 
        reason.toLowerCase().includes('commercial viability')
      )).toBe(true);
      expect(result.primaryReasons.some(reason => 
        reason.toLowerCase().includes('accessibility')
      )).toBe(true);
    });

    it('should identify confidence factors', async () => {
      const result = await service.generateStrategicRationale(testLocation, mockAnalysis);

      expect(result.confidenceFactors.some(factor => 
        factor.toLowerCase().includes('commercial')
      )).toBe(true);
    });

    it('should provide risk mitigations', async () => {
      const result = await service.generateStrategicRationale(testLocation, mockAnalysis);

      expect(result.riskMitigations.some(mitigation => 
        mitigation.toLowerCase().includes('market analysis')
      )).toBe(true);
      expect(result.riskMitigations.some(mitigation => 
        mitigation.toLowerCase().includes('lease terms')
      )).toBe(true);
    });

    it('should handle low-quality analysis gracefully', async () => {
      const lowQualityAnalysis = {
        ...mockAnalysis,
        demographics: {
          ...mockAnalysis.demographics,
          marketFitScore: 0.3,
          confidence: 0.4
        },
        viability: {
          ...mockAnalysis.viability,
          commercialViability: {
            ...mockAnalysis.viability.commercialViability,
            score: 0.3
          }
        }
      };

      const result = await service.generateStrategicRationale(testLocation, lowQualityAnalysis);

      expect(result).toBeDefined();
      expect(result.primaryReasons.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      // Mock a method to throw an error
      jest.spyOn(service as any, 'identifyPrimaryReasons').mockImplementation(() => {
        throw new Error('Analysis error');
      });

      const result = await service.generateStrategicRationale(testLocation, mockAnalysis);

      expect(result).toBeDefined();
      expect(result.primaryReasons).toContain('Location meets basic development criteria');
    });
  });

  describe('caching functionality', () => {
    const testLat = 40.7128;
    const testLng = -74.0060;

    it('should cache commercial viability results', async () => {
      const spy = jest.spyOn(service as any, 'analyzeZoning');
      
      await service.assessCommercialViability(testLat, testLng);
      await service.assessCommercialViability(testLat, testLng);

      // Should only call the expensive operation once due to caching
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should respect cache TTL', async () => {
      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      let mockTime = originalNow();
      
      jest.spyOn(Date, 'now').mockImplementation(() => mockTime);

      await service.assessCommercialViability(testLat, testLng);
      
      // Advance time beyond cache TTL (1 hour)
      mockTime += 61 * 60 * 1000;
      
      const spy = jest.spyOn(service as any, 'analyzeZoning');
      await service.assessCommercialViability(testLat, testLng);

      expect(spy).toHaveBeenCalled();

      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('utility methods', () => {
    it('should calculate urban score within valid range', () => {
      const score1 = (service as any).calculateUrbanScore(40.7128, -74.0060);
      const score2 = (service as any).calculateUrbanScore(45.0000, -100.0000);

      expect(score1).toBeGreaterThanOrEqual(0);
      expect(score1).toBeLessThanOrEqual(1);
      expect(score2).toBeGreaterThanOrEqual(0);
      expect(score2).toBeLessThanOrEqual(1);
    });

    it('should estimate development costs reasonably', () => {
      const cost = (service as any).estimateDevelopmentCost(0.8, 0.7, 40.7128, -74.0060);

      expect(cost).toBeGreaterThan(200000);
      expect(cost).toBeLessThan(1000000);
    });

    it('should estimate time to open reasonably', () => {
      const time = (service as any).estimateTimeToOpen(0.8, 0.7);

      expect(time).toBeGreaterThan(3);
      expect(time).toBeLessThan(20);
    });
  });

  describe('fallback methods', () => {
    it('should provide reasonable fallback commercial viability', () => {
      const fallback = (service as any).createFallbackCommercialViability();

      expect(fallback.score).toBe(0.5);
      expect(fallback.factors.zoning).toBe(0.5);
      expect(fallback.estimatedDevelopmentCost).toBeGreaterThan(0);
      expect(fallback.timeToOpen).toBeGreaterThan(0);
    });

    it('should provide reasonable fallback accessibility', () => {
      const fallback = (service as any).createFallbackAccessibility();

      expect(fallback.score).toBe(0.5);
      expect(fallback.factors.vehicleAccess).toBe(0.5);
      expect(fallback.nearestTransitDistance).toBeGreaterThan(0);
    });

    it('should provide reasonable fallback urban context', () => {
      const fallback = (service as any).createFallbackUrbanContext();

      expect(fallback.score).toBe(0.5);
      expect(fallback.landUsePattern).toBe('mixed-use');
      expect(fallback.developmentTrend).toBe('stable');
    });

    it('should provide reasonable fallback rationale', () => {
      const fallback = (service as any).createFallbackRationale();

      expect(fallback.primaryReasons.length).toBeGreaterThan(0);
      expect(fallback.riskMitigations.length).toBeGreaterThan(0);
    });
  });
});