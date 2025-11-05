import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { DemographicAnalysisService } from '../demographic-analysis.service';
import { AIDemographicInferenceService } from '../ai-demographic-inference.service';
import {
  LocationContext,
  RegionalDemographics,
  CustomerProfile,
  DemographicProfile,
  InferredDemographics
} from '../../../types/intelligence.types';

// Mock PrismaClient
const mockPrismaClient = {
  intelligenceDemographicCache: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
  },
};

// Mock AIDemographicInferenceService
const mockAIService = {
  inferDemographicsWithAI: jest.fn(),
};

describe('DemographicAnalysisService', () => {
  let service: DemographicAnalysisService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemographicAnalysisService,
        {
          provide: PrismaClient,
          useValue: mockPrismaClient,
        },
      ],
    }).compile();

    service = module.get<DemographicAnalysisService>(DemographicAnalysisService);
    prisma = module.get(PrismaClient);

    // Replace the AI service with mock
    (service as any).aiInferenceService = mockAIService;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('analyzeDemographics', () => {
    const testLat = 40.7128;
    const testLng = -74.0060;
    const testRadius = 1000;

    it('should return cached demographics when available', async () => {
      const cachedDemographics: DemographicProfile = {
        population: { total: 50000, density: 1200, growthRate: 2.1, urbanDensityIndex: 0.7 },
        ageDistribution: { under18: 22, age18to34: 28, age35to54: 32, age55plus: 18 },
        incomeDistribution: { 
          medianHouseholdIncome: 65000, 
          averageDisposableIncome: 45000, 
          incomeIndex: 0.8, 
          purchasingPower: 0.75 
        },
        lifestyleSegments: [{
          name: 'Urban Professionals',
          percentage: 35,
          description: 'Working professionals',
          subwayAffinity: 0.8
        }],
        consumerBehavior: {
          fastFoodFrequency: 4.2,
          healthConsciousness: 0.6,
          pricesensitivity: 0.5,
          brandLoyalty: 0.7,
          digitalEngagement: 0.8
        },
        marketFitScore: 0.75,
        dataSource: 'census',
        confidence: 0.9
      };

      // Set up in-memory cache
      const cacheKey = (service as any).generateCacheKey(testLat, testLng, testRadius);
      (service as any).cache.set(cacheKey, {
        data: cachedDemographics,
        timestamp: Date.now()
      });

      const result = await service.analyzeDemographics(testLat, testLng, testRadius);

      expect(result).toEqual(cachedDemographics);
      expect(prisma.intelligenceDemographicCache.findFirst).not.toHaveBeenCalled();
    });

    it('should fetch from database when cache is empty', async () => {
      const dbDemographics = {
        demographicData: JSON.stringify({
          population: { total: 45000, density: 1100, growthRate: 1.8, urbanDensityIndex: 0.6 },
          ageDistribution: { under18: 20, age18to34: 30, age35to54: 30, age55plus: 20 },
          incomeDistribution: { 
            medianHouseholdIncome: 60000, 
            averageDisposableIncome: 40000, 
            incomeIndex: 0.75, 
            purchasingPower: 0.7 
          },
          lifestyleSegments: [],
          consumerBehavior: {
            fastFoodFrequency: 4.0,
            healthConsciousness: 0.65,
            pricesensitivity: 0.55,
            brandLoyalty: 0.65,
            digitalEngagement: 0.75
          },
          marketFitScore: 0.7,
          dataSource: 'commercial',
          confidence: 0.8
        })
      };

      prisma.intelligenceDemographicCache.findFirst.mockResolvedValue(dbDemographics as any);

      const result = await service.analyzeDemographics(testLat, testLng, testRadius);

      expect(prisma.intelligenceDemographicCache.findFirst).toHaveBeenCalledWith({
        where: {
          lat: { gte: testLat - 0.01, lte: testLat + 0.01 },
          lng: { gte: testLng - 0.01, lte: testLng + 0.01 },
          radius: { gte: testRadius * 0.8, lte: testRadius * 1.2 },
          expiresAt: { gt: expect.any(Date) }
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(result.dataSource).toBe('commercial');
      expect(result.confidence).toBe(0.8);
    });

    it('should generate basic demographics when no data is available', async () => {
      prisma.intelligenceDemographicCache.findFirst.mockResolvedValue(null);

      const result = await service.analyzeDemographics(testLat, testLng, testRadius);

      expect(result).toBeDefined();
      expect(result.dataSource).toBe('ai_inferred');
      expect(result.confidence).toBe(0.6);
      expect(result.population.total).toBeGreaterThan(0);
      const totalAge = result.ageDistribution.under18 + result.ageDistribution.age18to34 + 
                       result.ageDistribution.age35to54 + result.ageDistribution.age55plus;
      expect(totalAge).toBeGreaterThanOrEqual(95);
      expect(totalAge).toBeLessThanOrEqual(105);
    });

    it('should persist demographics to database', async () => {
      prisma.intelligenceDemographicCache.findFirst.mockResolvedValue(null);
      prisma.intelligenceDemographicCache.create.mockResolvedValue({} as any);

      await service.analyzeDemographics(testLat, testLng, testRadius);

      expect(prisma.intelligenceDemographicCache.create).toHaveBeenCalledWith({
        data: {
          lat: testLat,
          lng: testLng,
          radius: testRadius,
          demographicData: expect.any(String),
          dataSource: 'ai_inferred',
          confidence: expect.any(Number),
          expiresAt: expect.any(Date)
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      prisma.intelligenceDemographicCache.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await service.analyzeDemographics(testLat, testLng, testRadius);

      expect(result).toBeDefined();
      expect(result.dataSource).toBe('ai_inferred');
    });
  });

  describe('inferDemographicsWithAI', () => {
    const testLocation: LocationContext = {
      lat: 40.7128,
      lng: -74.0060,
      country: 'US',
      region: 'NY',
      nearbyFeatures: ['shopping_center', 'transit_hub'],
      populationDensity: 1500
    };

    const testRegionalPatterns: RegionalDemographics = {
      country: 'US',
      region: 'NY',
      typicalAgeDistribution: { under18: 20, age18to34: 30, age35to54: 30, age55plus: 20 },
      typicalIncomeDistribution: { 
        medianHouseholdIncome: 70000, 
        averageDisposableIncome: 50000, 
        incomeIndex: 0.85, 
        purchasingPower: 0.8 
      },
      commonLifestyleSegments: [{
        name: 'Urban Professionals',
        percentage: 40,
        description: 'City workers',
        subwayAffinity: 0.85
      }]
    };

    it('should use AI service when enabled', async () => {
      const mockInferredDemographics: InferredDemographics = {
        population: { total: 55000, density: 1500, growthRate: 2.5, urbanDensityIndex: 0.8 },
        ageDistribution: { under18: 18, age18to34: 35, age35to54: 30, age55plus: 17 },
        incomeDistribution: { 
          medianHouseholdIncome: 75000, 
          averageDisposableIncome: 55000, 
          incomeIndex: 0.9, 
          purchasingPower: 0.85 
        },
        lifestyleSegments: testRegionalPatterns.commonLifestyleSegments,
        consumerBehavior: {
          fastFoodFrequency: 5.0,
          healthConsciousness: 0.7,
          pricesensitivity: 0.4,
          brandLoyalty: 0.8,
          digitalEngagement: 0.9
        },
        marketFitScore: 0.85,
        dataSource: 'ai_inferred',
        confidence: 0.8,
        inferenceMethod: 'openai_gpt_analysis',
        inferenceConfidence: 0.8,
        basedOnSimilarAreas: ['US_NY', 'urban_commercial']
      };

      mockAIService.inferDemographicsWithAI.mockResolvedValue(mockInferredDemographics);

      const result = await service.inferDemographicsWithAI(testLocation, testRegionalPatterns);

      expect(mockAIService.inferDemographicsWithAI).toHaveBeenCalledWith(testLocation, testRegionalPatterns);
      expect(result).toEqual(mockInferredDemographics);
      expect(result.inferenceMethod).toBe('openai_gpt_analysis');
    });

    it('should fallback to pattern-based inference when AI fails', async () => {
      mockAIService.inferDemographicsWithAI.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.inferDemographicsWithAI(testLocation, testRegionalPatterns);

      expect(result).toBeDefined();
      expect(result.inferenceMethod).toBe('regional_pattern_fallback');
      expect(result.inferenceConfidence).toBe(0.6);
      expect(result.dataSource).toBe('ai_inferred');
    });

    it('should use pattern-based inference when AI is disabled', async () => {
      // Mock config to disable AI
      const mockConfig = { enableDemographicInference: false };
      jest.spyOn((service as any).configManager, 'getConfig').mockReturnValue(mockConfig);

      const result = await service.inferDemographicsWithAI(testLocation, testRegionalPatterns);

      expect(mockAIService.inferDemographicsWithAI).not.toHaveBeenCalled();
      expect(result.inferenceMethod).toBe('regional_pattern_matching');
      expect(result.inferenceConfidence).toBe(0.7);
    });
  });

  describe('assessMarketFit', () => {
    const testDemographics: DemographicProfile = {
      population: { total: 50000, density: 1200, growthRate: 2.1, urbanDensityIndex: 0.7 },
      ageDistribution: { under18: 15, age18to34: 40, age35to54: 30, age55plus: 15 },
      incomeDistribution: { 
        medianHouseholdIncome: 70000, 
        averageDisposableIncome: 50000, 
        incomeIndex: 0.9, 
        purchasingPower: 0.85 
      },
      lifestyleSegments: [{
        name: 'Urban Professionals',
        percentage: 60,
        description: 'Working professionals',
        subwayAffinity: 0.9
      }],
      consumerBehavior: {
        fastFoodFrequency: 6.0,
        healthConsciousness: 0.6,
        pricesensitivity: 0.4,
        brandLoyalty: 0.8,
        digitalEngagement: 0.9
      },
      marketFitScore: 0.8,
      dataSource: 'census',
      confidence: 0.9
    };

    const testTargetProfile: CustomerProfile = {
      targetAgeRange: [18, 54],
      targetIncomeRange: [40000, 100000],
      preferredLifestyleSegments: ['Urban Professionals', 'Students'],
      behaviorPreferences: {
        fastFoodFrequency: 4.0,
        digitalEngagement: 0.7,
        brandLoyalty: 0.6
      }
    };

    it('should calculate high market fit for aligned demographics', async () => {
      const result = await service.assessMarketFit(testDemographics, testTargetProfile);

      expect(result.score).toBeGreaterThan(0.7);
      expect(result.factors.ageAlignment).toBeGreaterThan(0.6);
      expect(result.factors.incomeAlignment).toBeGreaterThan(0.8);
      expect(result.factors.lifestyleAlignment).toBeGreaterThan(0.5);
      expect(result.factors.behaviorAlignment).toBeGreaterThan(0.7);
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    it('should calculate low market fit for misaligned demographics', async () => {
      const poorFitDemographics: DemographicProfile = {
        ...testDemographics,
        ageDistribution: { under18: 10, age18to34: 10, age35to54: 20, age55plus: 60 },
        incomeDistribution: { 
          medianHouseholdIncome: 25000, 
          averageDisposableIncome: 15000, 
          incomeIndex: 0.3, 
          purchasingPower: 0.2 
        },
        lifestyleSegments: [{
          name: 'Retirees',
          percentage: 80,
          description: 'Retired individuals',
          subwayAffinity: 0.2
        }]
      };

      const result = await service.assessMarketFit(poorFitDemographics, testTargetProfile);

      expect(result.score).toBeLessThan(0.5);
      expect(result.concerns.length).toBeGreaterThan(0);
    });

    it('should handle edge cases in market fit calculation', async () => {
      const edgeCaseDemographics: DemographicProfile = {
        ...testDemographics,
        ageDistribution: { under18: 0, age18to34: 0, age35to54: 0, age55plus: 100 },
        lifestyleSegments: []
      };

      const result = await service.assessMarketFit(edgeCaseDemographics, testTargetProfile);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.factors.ageAlignment).toBeGreaterThanOrEqual(0);
      expect(result.factors.lifestyleAlignment).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cache management', () => {
    it('should respect cache TTL', async () => {
      const testLat = 40.7128;
      const testLng = -74.0060;
      const testRadius = 1000;

      // Set up expired cache entry
      const cacheKey = (service as any).generateCacheKey(testLat, testLng, testRadius);
      (service as any).cache.set(cacheKey, {
        data: {} as DemographicProfile,
        timestamp: Date.now() - (31 * 60 * 1000) // 31 minutes ago (expired)
      });

      prisma.intelligenceDemographicCache.findFirst.mockResolvedValue(null);

      await service.analyzeDemographics(testLat, testLng, testRadius);

      // Should not use expired cache, should query database
      expect(prisma.intelligenceDemographicCache.findFirst).toHaveBeenCalled();
    });

    it('should generate consistent cache keys', () => {
      const lat = 40.7128;
      const lng = -74.0060;
      const radius = 1000;

      const key1 = (service as any).generateCacheKey(lat, lng, radius);
      const key2 = (service as any).generateCacheKey(lat, lng, radius);

      expect(key1).toBe(key2);
      expect(key1).toContain('demo_');
    });
  });

  describe('error handling', () => {
    it('should handle AI service errors gracefully', async () => {
      const testLocation: LocationContext = {
        lat: 40.7128,
        lng: -74.0060,
        country: 'US',
        nearbyFeatures: [],
      };

      const testRegionalPatterns: RegionalDemographics = {
        country: 'US',
        typicalAgeDistribution: { under18: 20, age18to34: 30, age35to54: 30, age55plus: 20 },
        typicalIncomeDistribution: { 
          medianHouseholdIncome: 60000, 
          averageDisposableIncome: 40000, 
          incomeIndex: 0.8, 
          purchasingPower: 0.7 
        },
        commonLifestyleSegments: []
      };

      // Mock config to enable AI
      const mockConfig = { enableDemographicInference: true };
      jest.spyOn((service as any).configManager, 'getConfig').mockReturnValue(mockConfig);

      mockAIService.inferDemographicsWithAI.mockRejectedValue(new Error('Network error'));

      const result = await service.inferDemographicsWithAI(testLocation, testRegionalPatterns);

      expect(result).toBeDefined();
      expect(result.inferenceMethod).toBe('regional_pattern_fallback');
    });

    it('should handle market fit assessment errors', async () => {
      const invalidDemographics = {} as DemographicProfile;
      const validTargetProfile: CustomerProfile = {
        targetAgeRange: [18, 54],
        targetIncomeRange: [40000, 100000],
        preferredLifestyleSegments: [],
        behaviorPreferences: {}
      };

      await expect(service.assessMarketFit(invalidDemographics, validTargetProfile))
        .rejects.toThrow();
    });
  });
});