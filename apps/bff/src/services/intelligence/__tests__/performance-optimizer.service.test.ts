import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceOptimizerService } from '../performance/performance-optimizer.service';
import { CacheManagerService } from '../cache/cache-manager.service';
import { DemographicProfile } from '../../../types/intelligence.types';

describe('PerformanceOptimizerService', () => {
  let service: PerformanceOptimizerService;
  let cacheManager: jest.Mocked<CacheManagerService>;

  const mockDemographicProfile: DemographicProfile = {
    population: { total: 50000, density: 1000, growthRate: 0.02, urbanDensityIndex: 0.8 },
    ageDistribution: { under18: 0.2, age18to34: 0.3, age35to54: 0.3, age55plus: 0.2 },
    incomeDistribution: { medianHouseholdIncome: 75000, averageDisposableIncome: 45000, incomeIndex: 0.7, purchasingPower: 0.8 },
    lifestyleSegments: ['urban_professionals'],
    consumerBehavior: { fastFoodFrequency: 0.6, healthConsciousness: 0.7, pricesensitivity: 0.5, brandLoyalty: 0.6, digitalEngagement: 0.8 },
    marketFitScore: 0.75,
    dataSource: 'external_api',
    confidence: 0.8
  };

  beforeEach(async () => {
    const mockCacheManager = {
      getDemographicProfile: jest.fn(),
      setDemographicProfile: jest.fn(),
      getLocationIntelligence: jest.fn(),
      setLocationIntelligence: jest.fn(),
      getViabilityAssessment: jest.fn(),
      setViabilityAssessment: jest.fn(),
      getCompetitiveAnalysis: jest.fn(),
      setCompetitiveAnalysis: jest.fn(),
      getLocationAnalysis: jest.fn(),
      setLocationAnalysis: jest.fn(),
      getMultipleDemographicProfiles: jest.fn(),
      setMultipleDemographicProfiles: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceOptimizerService,
        { provide: CacheManagerService, useValue: mockCacheManager }
      ],
    }).compile();

    service = module.get<PerformanceOptimizerService>(PerformanceOptimizerService);
    cacheManager = module.get(CacheManagerService);
  });

  describe('Parallel Processing', () => {
    it('should process locations in parallel with controlled batching', async () => {
      const locations = [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.7589, lng: -73.9851 },
        { lat: 40.6892, lng: -74.0445 },
        { lat: 40.7831, lng: -73.9712 },
        { lat: 40.7505, lng: -73.9934 }
      ];

      const mockProcessor = jest.fn().mockImplementation(async (lat: number, lng: number) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        return { lat, lng, processed: true };
      });

      const startTime = Date.now();
      const results = await service.processLocationsInParallel(
        locations,
        mockProcessor,
        {
          batchSize: 2,
          concurrency: 2,
          delayBetweenBatches: 50,
          enableCaching: false,
          prioritizeByScore: false
        }
      );
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      expect(mockProcessor).toHaveBeenCalledTimes(5);
      
      // Should complete faster than sequential processing
      expect(endTime - startTime).toBeLessThan(5 * 100); // Less than sequential time
      
      // All results should be successful
      results.forEach(result => {
        expect(result.result).toBeDefined();
        expect(result.error).toBeUndefined();
      });
    });

    it('should handle processing errors gracefully', async () => {
      const locations = [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.7589, lng: -73.9851 }
      ];

      const mockProcessor = jest.fn()
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Processing failed'));

      const results = await service.processLocationsInParallel(
        locations,
        mockProcessor,
        { batchSize: 2, concurrency: 2 }
      );

      expect(results).toHaveLength(2);
      expect(results[0].result).toEqual({ success: true });
      expect(results[0].error).toBeUndefined();
      expect(results[1].result).toBeNull();
      expect(results[1].error).toBe('Processing failed');
    });

    it('should prioritize locations by score when enabled', async () => {
      const locations = [
        { lat: 40.7128, lng: -74.0060, priority: 0.5 },
        { lat: 40.7589, lng: -73.9851, priority: 0.9 },
        { lat: 40.6892, lng: -74.0445, priority: 0.3 }
      ];

      const processOrder: number[] = [];
      const mockProcessor = jest.fn().mockImplementation(async (lat: number, lng: number) => {
        const location = locations.find(l => l.lat === lat && l.lng === lng);
        processOrder.push(location?.priority || 0);
        return { lat, lng };
      });

      await service.processLocationsInParallel(
        locations,
        mockProcessor,
        {
          batchSize: 1,
          concurrency: 1,
          prioritizeByScore: true
        }
      );

      // Should process in descending priority order
      expect(processOrder).toEqual([0.9, 0.5, 0.3]);
    });
  });

  describe('Batch Demographic Processing', () => {
    it('should efficiently batch process demographic profiles with caching', async () => {
      const locations = [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.7589, lng: -73.9851 },
        { lat: 40.6892, lng: -74.0445 }
      ];

      // Mock cache returns for first two locations
      const cachedProfiles = new Map([
        ['40.7128,-74.0060', mockDemographicProfile],
        ['40.7589,-73.9851', mockDemographicProfile]
      ]);

      cacheManager.getMultipleDemographicProfiles.mockResolvedValue(cachedProfiles);
      cacheManager.setMultipleDemographicProfiles.mockResolvedValue();

      const mockProcessor = jest.fn().mockResolvedValue(mockDemographicProfile);

      const results = await service.batchProcessDemographicProfiles(
        locations,
        mockProcessor,
        { enableCaching: true }
      );

      expect(results.size).toBe(3);
      expect(results.get('40.7128,-74.0060')).toEqual(mockDemographicProfile);
      expect(results.get('40.7589,-73.9851')).toEqual(mockDemographicProfile);
      expect(results.get('40.6892,-74.0445')).toEqual(mockDemographicProfile);

      // Should only process uncached location
      expect(mockProcessor).toHaveBeenCalledTimes(1);
      expect(mockProcessor).toHaveBeenCalledWith(40.6892, -74.0445);

      // Should cache the new result
      expect(cacheManager.setMultipleDemographicProfiles).toHaveBeenCalledWith([
        { lat: 40.6892, lng: -74.0445, profile: mockDemographicProfile }
      ]);
    });

    it('should handle all cached results efficiently', async () => {
      const locations = [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.7589, lng: -73.9851 }
      ];

      const cachedProfiles = new Map([
        ['40.7128,-74.0060', mockDemographicProfile],
        ['40.7589,-73.9851', mockDemographicProfile]
      ]);

      cacheManager.getMultipleDemographicProfiles.mockResolvedValue(cachedProfiles);

      const mockProcessor = jest.fn();

      const results = await service.batchProcessDemographicProfiles(
        locations,
        mockProcessor,
        { enableCaching: true }
      );

      expect(results.size).toBe(2);
      expect(mockProcessor).not.toHaveBeenCalled(); // No processing needed
    });
  });

  describe('External API Request Batching', () => {
    it('should batch external API requests with rate limiting', async () => {
      const requests = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      
      const mockApiCall = jest.fn().mockImplementation(async (batch) => {
        // Simulate API processing time
        await new Promise(resolve => setTimeout(resolve, 50));
        return batch.map(req => ({ ...req, processed: true }));
      });

      const startTime = Date.now();
      const results = await service.batchExternalAPIRequests(
        requests,
        mockApiCall,
        10, // batch size
        100 // delay between batches
      );
      const endTime = Date.now();

      expect(results).toHaveLength(25);
      expect(mockApiCall).toHaveBeenCalledTimes(3); // 25 requests / 10 batch size = 3 batches
      
      // Should include delays between batches
      expect(endTime - startTime).toBeGreaterThan(200); // At least 2 delays of 100ms each
      
      results.forEach(result => {
        expect(result.processed).toBe(true);
      });
    });

    it('should handle API batch failures gracefully', async () => {
      const requests = [{ id: 1 }, { id: 2 }, { id: 3 }];
      
      const mockApiCall = jest.fn()
        .mockResolvedValueOnce([{ id: 1, processed: true }])
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce([{ id: 3, processed: true }]);

      const results = await service.batchExternalAPIRequests(
        requests,
        mockApiCall,
        1 // batch size of 1 to test individual failures
      );

      // Should continue processing despite one batch failure
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 1, processed: true });
      expect(results[1]).toEqual({ id: 3, processed: true });
    });
  });

  describe('Intelligent Caching Strategy', () => {
    it('should optimize processing with intelligent caching', async () => {
      const locations = [
        { lat: 40.7128, lng: -74.0060, priority: 100 },
        { lat: 40.7589, lng: -73.9851, priority: 50 },
        { lat: 40.6892, lng: -74.0445, priority: 75 }
      ];

      // Mock cache check method
      const originalCheckCache = (service as any).checkCache;
      (service as any).checkCache = jest.fn()
        .mockResolvedValueOnce(mockDemographicProfile) // First location cached
        .mockResolvedValueOnce(null) // Second location not cached
        .mockResolvedValueOnce(null); // Third location not cached

      const mockProcessor = jest.fn().mockResolvedValue(mockDemographicProfile);

      const results = await service.optimizeWithIntelligentCaching(
        locations,
        mockProcessor,
        'getDemographicProfile'
      );

      expect(results).toHaveLength(3);
      
      // Should process in priority order (100, 75, 50)
      const processedOrder = results.map(r => r.location.priority).slice(0, 3);
      expect(processedOrder).toEqual([100, 75, 50]);

      // Should only process uncached locations (2 out of 3)
      expect(mockProcessor).toHaveBeenCalledTimes(2);

      // Restore original method
      (service as any).checkCache = originalCheckCache;
    });
  });

  describe('Performance Metrics', () => {
    it('should track and return performance metrics', async () => {
      const locations = [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.7589, lng: -73.9851 }
      ];

      const mockProcessor = jest.fn().mockResolvedValue({ success: true });

      await service.processLocationsInParallel(
        locations,
        mockProcessor,
        { batchSize: 2, concurrency: 2 }
      );

      const metrics = service.getPerformanceMetrics();

      expect(metrics.locationsProcessed).toBe(2);
      expect(metrics.batchesProcessed).toBe(1);
      expect(metrics.totalProcessingTime).toBeGreaterThan(0);
      expect(metrics.averageTimePerLocation).toBeGreaterThan(0);
      expect(metrics.errorsEncountered).toBe(0);
    });

    it('should reset metrics correctly', () => {
      service.resetMetrics();

      const metrics = service.getPerformanceMetrics();

      expect(metrics.locationsProcessed).toBe(0);
      expect(metrics.batchesProcessed).toBe(0);
      expect(metrics.totalProcessingTime).toBe(0);
      expect(metrics.averageTimePerLocation).toBe(0);
      expect(metrics.errorsEncountered).toBe(0);
    });
  });

  describe('Adaptive Batch Sizing', () => {
    it('should calculate optimal batch size based on performance', () => {
      const optimalSize = service.calculateOptimalBatchSize(
        100, // total locations
        1000, // average processing time (1 second)
        10000 // target latency (10 seconds)
      );

      expect(optimalSize).toBeGreaterThan(0);
      expect(optimalSize).toBeLessThanOrEqual(10);
    });

    it('should ensure batch size is within reasonable bounds', () => {
      // Test with very fast processing
      const fastOptimal = service.calculateOptimalBatchSize(100, 10, 10000);
      expect(fastOptimal).toBeLessThanOrEqual(10);

      // Test with very slow processing
      const slowOptimal = service.calculateOptimalBatchSize(100, 5000, 10000);
      expect(slowOptimal).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Memory Optimization', () => {
    it('should process with memory usage awareness', async () => {
      const locations = Array.from({ length: 20 }, (_, i) => ({
        lat: 40.7128 + (i * 0.01),
        lng: -74.0060 + (i * 0.01)
      }));

      const mockProcessor = jest.fn().mockResolvedValue({ data: 'test' });

      const results = await service.processWithMemoryOptimization(
        locations,
        mockProcessor,
        50 * 1024 * 1024 // 50MB limit
      );

      expect(results).toHaveLength(20);
      expect(mockProcessor).toHaveBeenCalledTimes(20);
      
      // All results should be successful
      results.forEach(result => {
        expect(result.result).toBeDefined();
      });
    });

    it('should handle memory pressure gracefully', async () => {
      const locations = Array.from({ length: 5 }, (_, i) => ({
        lat: 40.7128 + (i * 0.01),
        lng: -74.0060 + (i * 0.01)
      }));

      const mockProcessor = jest.fn().mockResolvedValue({ data: 'test' });

      // Set very low memory limit to trigger memory-aware batching
      const results = await service.processWithMemoryOptimization(
        locations,
        mockProcessor,
        1024 // 1KB limit (very low)
      );

      expect(results).toHaveLength(5);
      expect(mockProcessor).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle processor failures in parallel processing', async () => {
      const locations = [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.7589, lng: -73.9851 }
      ];

      const mockProcessor = jest.fn()
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Processing failed'));

      const results = await service.processLocationsInParallel(
        locations,
        mockProcessor
      );

      expect(results).toHaveLength(2);
      expect(results[0].result).toEqual({ success: true });
      expect(results[1].result).toBeNull();
      expect(results[1].error).toBe('Processing failed');

      const metrics = service.getPerformanceMetrics();
      expect(metrics.errorsEncountered).toBe(1);
    });

    it('should handle cache failures gracefully', async () => {
      const locations = [{ lat: 40.7128, lng: -74.0060 }];

      cacheManager.getMultipleDemographicProfiles.mockRejectedValue(new Error('Cache error'));

      const mockProcessor = jest.fn().mockResolvedValue(mockDemographicProfile);

      const results = await service.batchProcessDemographicProfiles(
        locations,
        mockProcessor,
        { enableCaching: true }
      );

      // Should still process successfully despite cache error
      expect(results.size).toBe(1);
      expect(mockProcessor).toHaveBeenCalledTimes(1);
    });
  });

  describe('Concurrency Control', () => {
    it('should respect concurrency limits', async () => {
      const locations = Array.from({ length: 10 }, (_, i) => ({
        lat: 40.7128 + (i * 0.01),
        lng: -74.0060 + (i * 0.01)
      }));

      let concurrentCount = 0;
      let maxConcurrent = 0;

      const mockProcessor = jest.fn().mockImplementation(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        concurrentCount--;
        return { success: true };
      });

      await service.processLocationsInParallel(
        locations,
        mockProcessor,
        {
          batchSize: 5,
          concurrency: 3
        }
      );

      // Should not exceed concurrency limit
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });
  });
});