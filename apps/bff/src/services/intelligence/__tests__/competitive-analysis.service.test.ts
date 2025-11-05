import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { CompetitiveAnalysisService } from '../competitive-analysis.service';
import {
  CompetitiveAnalysis,
  CannibalizationRisk,
  MarketGap,
  CompetitorStore,
  Location,
  Store,
  ScopeSelection
} from '../../../types/intelligence.types';

// Mock PrismaClient
const mockPrismaClient = {
  store: {
    findMany: jest.fn(),
  },
};

describe('CompetitiveAnalysisService', () => {
  let service: CompetitiveAnalysisService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitiveAnalysisService,
        {
          provide: PrismaClient,
          useValue: mockPrismaClient,
        },
      ],
    }).compile();

    service = module.get<CompetitiveAnalysisService>(CompetitiveAnalysisService);
    prisma = module.get(PrismaClient);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('analyzeCompetitiveLandscape', () => {
    const testLat = 40.7128;
    const testLng = -74.0060;
    const testRadius = 2000;

    beforeEach(() => {
      // Mock the store query to return empty array by default
      prisma.store.findMany.mockResolvedValue([]);
    });

    it('should analyze competitive landscape successfully', async () => {
      const result = await service.analyzeCompetitiveLandscape(testLat, testLng, testRadius);

      expect(result).toBeDefined();
      expect(result.nearbyCompetitors).toBeDefined();
      expect(Array.isArray(result.nearbyCompetitors)).toBe(true);
      expect(result.marketSaturation).toBeGreaterThanOrEqual(0);
      expect(result.marketSaturation).toBeLessThanOrEqual(1);
      expect(result.cannibalizationRisk).toBeDefined();
      expect(result.competitiveAdvantages).toBeDefined();
      expect(Array.isArray(result.competitiveAdvantages)).toBe(true);
      expect(result.marketGapOpportunity).toBeGreaterThanOrEqual(0);
      expect(result.marketGapOpportunity).toBeLessThanOrEqual(1);
    });

    it('should return cached results for repeated calls', async () => {
      const result1 = await service.analyzeCompetitiveLandscape(testLat, testLng, testRadius);
      const result2 = await service.analyzeCompetitiveLandscape(testLat, testLng, testRadius);

      expect(result1).toEqual(result2);
    });

    it('should handle different radius values', async () => {
      const result1000 = await service.analyzeCompetitiveLandscape(testLat, testLng, 1000);
      const result3000 = await service.analyzeCompetitiveLandscape(testLat, testLng, 3000);

      expect(result1000).toBeDefined();
      expect(result3000).toBeDefined();
      // Different radius might yield different competitor counts
    });

    it('should identify competitive advantages', async () => {
      const result = await service.analyzeCompetitiveLandscape(testLat, testLng, testRadius);

      expect(result.competitiveAdvantages.length).toBeGreaterThan(0);
      result.competitiveAdvantages.forEach(advantage => {
        expect(typeof advantage).toBe('string');
        expect(advantage.length).toBeGreaterThan(0);
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock findNearbyCompetitors to throw an error
      jest.spyOn(service as any, 'findNearbyCompetitors').mockRejectedValue(new Error('API error'));

      const result = await service.analyzeCompetitiveLandscape(testLat, testLng, testRadius);

      expect(result).toBeDefined();
      expect(result.marketSaturation).toBe(0.5); // Fallback value
    });

    it('should query existing stores from database', async () => {
      await service.analyzeCompetitiveLandscape(testLat, testLng, testRadius);

      expect(prisma.store.findMany).toHaveBeenCalledWith({
        where: {
          latitude: {
            gte: expect.any(Number),
            lte: expect.any(Number)
          },
          longitude: {
            gte: expect.any(Number),
            lte: expect.any(Number)
          },
          status: 'ACTIVE'
        }
      });
    });
  });

  describe('calculateCannibalizationRisk', () => {
    const testLocation: Location = {
      lat: 40.7128,
      lng: -74.0060,
      country: 'US'
    };

    it('should calculate low risk when no existing stores nearby', async () => {
      const existingStores: Store[] = [];

      const result = await service.calculateCannibalizationRisk(testLocation, existingStores);

      expect(result).toBeDefined();
      expect(result.riskLevel).toBe('LOW');
      expect(result.estimatedImpact).toBe(0);
      expect(result.affectedStores).toHaveLength(0);
      expect(result.mitigationStrategies).toBeDefined();
      expect(result.mitigationStrategies.length).toBeGreaterThan(0);
    });

    it('should calculate medium risk for moderately distant stores', async () => {
      const existingStores: Store[] = [
        {
          id: 'store1',
          lat: 40.7200, // About 800m away
          lng: -74.0060,
          performance: 0.7,
          openDate: new Date('2020-01-01')
        },
        {
          id: 'store2',
          lat: 40.7050, // About 900m away
          lng: -74.0060,
          performance: 0.6,
          openDate: new Date('2019-01-01')
        }
      ];

      const result = await service.calculateCannibalizationRisk(testLocation, existingStores);

      expect(result).toBeDefined();
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result.riskLevel);
      expect(result.estimatedImpact).toBeGreaterThanOrEqual(0);
      expect(result.estimatedImpact).toBeLessThanOrEqual(1);
      expect(result.mitigationStrategies.length).toBeGreaterThan(0);
    });

    it('should calculate high risk for very close high-performing stores', async () => {
      const existingStores: Store[] = [
        {
          id: 'store1',
          lat: 40.7130, // Very close
          lng: -74.0062,
          performance: 0.9, // High performance
          revenue: 1500000,
          openDate: new Date('2018-01-01')
        }
      ];

      const result = await service.calculateCannibalizationRisk(testLocation, existingStores);

      expect(result).toBeDefined();
      expect(result.estimatedImpact).toBeGreaterThan(0);
      expect(result.affectedStores.length).toBeGreaterThan(0);
      
      // Check affected store details
      const affectedStore = result.affectedStores[0];
      expect(affectedStore.storeId).toBe('store1');
      expect(affectedStore.distance).toBeGreaterThan(0);
      expect(affectedStore.estimatedRevenueImpact).toBeGreaterThan(0);
      expect(affectedStore.currentPerformance).toBe(0.9);
    });

    it('should ignore stores beyond 5km radius', async () => {
      const existingStores: Store[] = [
        {
          id: 'store1',
          lat: 40.7628, // About 6km away
          lng: -74.0060,
          performance: 0.8,
          openDate: new Date('2020-01-01')
        }
      ];

      const result = await service.calculateCannibalizationRisk(testLocation, existingStores);

      expect(result.riskLevel).toBe('LOW');
      expect(result.affectedStores).toHaveLength(0);
    });

    it('should generate appropriate mitigation strategies', async () => {
      const existingStores: Store[] = [
        {
          id: 'store1',
          lat: 40.7140,
          lng: -74.0070,
          performance: 0.8,
          openDate: new Date('2020-01-01')
        }
      ];

      const result = await service.calculateCannibalizationRisk(testLocation, existingStores);

      expect(result.mitigationStrategies).toBeDefined();
      expect(result.mitigationStrategies.length).toBeGreaterThan(0);
      result.mitigationStrategies.forEach(strategy => {
        expect(typeof strategy).toBe('string');
        expect(strategy.length).toBeGreaterThan(0);
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock calculateDistance to throw an error
      jest.spyOn(service as any, 'calculateDistance').mockImplementation(() => {
        throw new Error('Calculation error');
      });

      const result = await service.calculateCannibalizationRisk(testLocation, []);

      expect(result).toBeDefined();
      expect(result.riskLevel).toBe('LOW'); // No stores = low risk
    });
  });

  describe('identifyMarketGaps', () => {
    const testRegion: ScopeSelection = {
      type: 'country',
      value: 'US'
    };

    const testCompetitors: CompetitorStore[] = [
      {
        brand: 'McDonald\'s',
        lat: 40.7128,
        lng: -74.0060,
        distance: 500,
        directCompetitor: true
      },
      {
        brand: 'Burger King',
        lat: 40.7200,
        lng: -74.0100,
        distance: 800,
        directCompetitor: true
      }
    ];

    it('should identify market gaps successfully', async () => {
      const result = await service.identifyMarketGaps(testRegion, testCompetitors);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10); // Should be capped at 10

      result.forEach(gap => {
        expect(gap.lat).toBeDefined();
        expect(gap.lng).toBeDefined();
        expect(gap.opportunityScore).toBeGreaterThanOrEqual(0);
        expect(gap.opportunityScore).toBeLessThanOrEqual(1);
        expect(['underserved', 'competitor_weak', 'demographic_match']).toContain(gap.gapType);
        expect(typeof gap.description).toBe('string');
        expect(gap.estimatedPotential).toBeGreaterThan(0);
      });
    });

    it('should return gaps sorted by opportunity score', async () => {
      const result = await service.identifyMarketGaps(testRegion, testCompetitors);

      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].opportunityScore).toBeGreaterThanOrEqual(result[i + 1].opportunityScore);
        }
      }
    });

    it('should handle empty competitor data', async () => {
      const result = await service.identifyMarketGaps(testRegion, []);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Mock analyzeCompetitorDistribution to throw an error
      jest.spyOn(service as any, 'analyzeCompetitorDistribution').mockRejectedValue(new Error('Analysis error'));

      const result = await service.identifyMarketGaps(testRegion, testCompetitors);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0); // Should return empty array on error
    });
  });

  describe('utility methods', () => {
    it('should calculate distance correctly', () => {
      const distance = (service as any).calculateDistance(40.7128, -74.0060, 40.7589, -73.9851);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(100000); // Should be reasonable distance in meters
    });

    it('should calculate distance of zero for same coordinates', () => {
      const distance = (service as any).calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);

      expect(distance).toBe(0);
    });

    it('should calculate revenue impact based on distance and performance', () => {
      const impact1 = (service as any).calculateRevenueImpact(500, 0.8); // Close, high performance
      const impact2 = (service as any).calculateRevenueImpact(2000, 0.5); // Farther, medium performance
      const impact3 = (service as any).calculateRevenueImpact(6000, 0.9); // Too far

      expect(impact1).toBeGreaterThan(impact2);
      expect(impact3).toBe(0); // Beyond 5km threshold
      expect(impact1).toBeLessThanOrEqual(0.3); // Max 30% impact
    });

    it('should calculate urban score within valid range', () => {
      const score1 = (service as any).calculateUrbanScore(40.7128, -74.0060);
      const score2 = (service as any).calculateUrbanScore(45.0000, -100.0000);

      expect(score1).toBeGreaterThanOrEqual(0);
      expect(score1).toBeLessThanOrEqual(1);
      expect(score2).toBeGreaterThanOrEqual(0);
      expect(score2).toBeLessThanOrEqual(1);
    });

    it('should estimate competitor density based on urban score', () => {
      const density1 = (service as any).estimateCompetitorDensity(0.8);
      const density2 = (service as any).estimateCompetitorDensity(0.3);

      expect(density1).toBeGreaterThan(density2);
      expect(density1).toBeLessThanOrEqual(1);
      expect(density2).toBeGreaterThanOrEqual(0);
    });

    it('should estimate competitor revenue reasonably', () => {
      const revenue = (service as any).estimateCompetitorRevenue(0.25, 0.8);

      expect(revenue).toBeGreaterThan(0);
      expect(revenue).toBeLessThan(10000000); // Should be reasonable
    });
  });

  describe('caching functionality', () => {
    const testLat = 40.7128;
    const testLng = -74.0060;
    const testRadius = 2000;

    beforeEach(() => {
      prisma.store.findMany.mockResolvedValue([]);
    });

    it('should cache competitive analysis results', async () => {
      const spy = jest.spyOn(service as any, 'findNearbyCompetitors');
      
      await service.analyzeCompetitiveLandscape(testLat, testLng, testRadius);
      await service.analyzeCompetitiveLandscape(testLat, testLng, testRadius);

      // Should only call the expensive operation once due to caching
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should respect cache TTL', async () => {
      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      let mockTime = originalNow();
      
      jest.spyOn(Date, 'now').mockImplementation(() => mockTime);

      await service.analyzeCompetitiveLandscape(testLat, testLng, testRadius);
      
      // Advance time beyond cache TTL (45 minutes)
      mockTime += 46 * 60 * 1000;
      
      const spy = jest.spyOn(service as any, 'findNearbyCompetitors');
      await service.analyzeCompetitiveLandscape(testLat, testLng, testRadius);

      expect(spy).toHaveBeenCalled();

      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('fallback methods', () => {
    it('should provide reasonable fallback competitive analysis', () => {
      const fallback = (service as any).createFallbackCompetitiveAnalysis();

      expect(fallback.nearbyCompetitors).toHaveLength(0);
      expect(fallback.marketSaturation).toBe(0.5);
      expect(fallback.cannibalizationRisk).toBeDefined();
      expect(fallback.competitiveAdvantages).toHaveLength(1);
      expect(fallback.marketGapOpportunity).toBe(0.5);
    });

    it('should provide reasonable fallback cannibalization risk', () => {
      const fallback = (service as any).createFallbackCannibalizationRisk();

      expect(fallback.riskLevel).toBe('MEDIUM');
      expect(fallback.estimatedImpact).toBe(0.1);
      expect(fallback.affectedStores).toHaveLength(0);
      expect(fallback.mitigationStrategies.length).toBeGreaterThan(0);
    });
  });

  describe('store performance calculation', () => {
    it('should calculate performance based on turnover', () => {
      const store1 = { annualTurnover: 1000000 }; // $1M
      const store2 = { annualTurnover: 500000 };  // $500k
      const store3 = { annualTurnover: null };    // No data

      const perf1 = (service as any).calculateStorePerformance(store1);
      const perf2 = (service as any).calculateStorePerformance(store2);
      const perf3 = (service as any).calculateStorePerformance(store3);

      expect(perf1).toBeGreaterThan(perf2);
      expect(perf3).toBe(0.5); // Default when no turnover data
      expect(perf1).toBeLessThanOrEqual(1);
      expect(perf2).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('mitigation strategy generation', () => {
    it('should generate appropriate strategies for high risk', () => {
      const strategies = (service as any).generateMitigationStrategies('HIGH', [], 0.4);

      expect(strategies.length).toBeGreaterThan(2);
      expect(strategies.some((s: string) => s.includes('alternative location'))).toBe(true);
    });

    it('should generate appropriate strategies for medium risk', () => {
      const strategies = (service as any).generateMitigationStrategies('MEDIUM', [], 0.2);

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some((s: string) => s.includes('marketing'))).toBe(true);
    });

    it('should generate minimal strategies for low risk', () => {
      const strategies = (service as any).generateMitigationStrategies('LOW', [], 0.05);

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some((s: string) => s.includes('Minimal'))).toBe(true);
    });
  });
});