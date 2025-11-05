import { Test, TestingModule } from '@nestjs/testing';
import { CacheManagerService } from '../cache/cache-manager.service';
import { IntelligenceCacheService } from '../cache/intelligence-cache.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { DemographicProfile, LocationIntelligence, ViabilityAssessment, CompetitiveAnalysis } from '../../../types/intelligence.types';

describe('CacheManagerService', () => {
  let service: CacheManagerService;
  let memoryCacheService: jest.Mocked<IntelligenceCacheService>;
  let redisCacheService: jest.Mocked<RedisCacheService>;

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

  const mockLocationIntelligence: LocationIntelligence = {
    isCommercialArea: true,
    distanceToTownCenter: 500,
    nearbyCommercialFeatures: ['shopping_center', 'restaurant'],
    landUseType: 'commercial',
    developmentPotential: 0.8
  };

  beforeEach(async () => {
    const mockMemoryCache = {
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
      setMultipleDemographicProfiles: jest.fn(),
      warmCache: jest.fn(),
      invalidateLocation: jest.fn(),
      invalidateRegion: jest.fn(),
      getCacheStats: jest.fn(),
      clearCache: jest.fn(),
      healthCheck: jest.fn(),
      performMaintenance: jest.fn()
    };

    const mockRedisCache = {
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
      setMultipleDemographicProfiles: jest.fn(),
      warmCache: jest.fn(),
      invalidateLocation: jest.fn(),
      invalidateRegion: jest.fn(),
      getCacheStats: jest.fn(),
      clearCache: jest.fn(),
      healthCheck: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheManagerService,
        { provide: IntelligenceCacheService, useValue: mockMemoryCache },
        { provide: RedisCacheService, useValue: mockRedisCache }
      ],
    }).compile();

    service = module.get<CacheManagerService>(CacheManagerService);
    memoryCacheService = module.get(IntelligenceCacheService);
    redisCacheService = module.get(RedisCacheService);
  });

  describe('Memory Cache Provider', () => {
    beforeEach(() => {
      // Set environment to use memory cache
      process.env.CACHE_PROVIDER = 'memory';
    });

    it('should get demographic profile from memory cache', async () => {
      memoryCacheService.getDemographicProfile.mockResolvedValue(mockDemographicProfile);

      const result = await service.getDemographicProfile(40.7128, -74.0060);

      expect(result).toEqual(mockDemographicProfile);
      expect(memoryCacheService.getDemographicProfile).toHaveBeenCalledWith(40.7128, -74.0060);
      expect(redisCacheService.getDemographicProfile).not.toHaveBeenCalled();
    });

    it('should set demographic profile in memory cache', async () => {
      await service.setDemographicProfile(40.7128, -74.0060, mockDemographicProfile);

      expect(memoryCacheService.setDemographicProfile).toHaveBeenCalledWith(40.7128, -74.0060, mockDemographicProfile);
      expect(redisCacheService.setDemographicProfile).not.toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      memoryCacheService.getDemographicProfile.mockRejectedValue(new Error('Cache error'));

      const result = await service.getDemographicProfile(40.7128, -74.0060);

      expect(result).toBeNull();
    });
  });

  describe('Redis Cache Provider', () => {
    beforeEach(() => {
      process.env.CACHE_PROVIDER = 'redis';
    });

    it('should get demographic profile from Redis cache', async () => {
      redisCacheService.getDemographicProfile.mockResolvedValue(mockDemographicProfile);

      const result = await service.getDemographicProfile(40.7128, -74.0060);

      expect(result).toEqual(mockDemographicProfile);
      expect(redisCacheService.getDemographicProfile).toHaveBeenCalledWith(40.7128, -74.0060);
      expect(memoryCacheService.getDemographicProfile).not.toHaveBeenCalled();
    });

    it('should set demographic profile in Redis cache', async () => {
      await service.setDemographicProfile(40.7128, -74.0060, mockDemographicProfile);

      expect(redisCacheService.setDemographicProfile).toHaveBeenCalledWith(40.7128, -74.0060, mockDemographicProfile);
      expect(memoryCacheService.setDemographicProfile).not.toHaveBeenCalled();
    });
  });

  describe('Hybrid Cache Provider', () => {
    beforeEach(() => {
      process.env.CACHE_PROVIDER = 'hybrid';
    });

    it('should try memory cache first, then Redis', async () => {
      memoryCacheService.getDemographicProfile.mockResolvedValue(null);
      redisCacheService.getDemographicProfile.mockResolvedValue(mockDemographicProfile);

      const result = await service.getDemographicProfile(40.7128, -74.0060);

      expect(result).toEqual(mockDemographicProfile);
      expect(memoryCacheService.getDemographicProfile).toHaveBeenCalledWith(40.7128, -74.0060);
      expect(redisCacheService.getDemographicProfile).toHaveBeenCalledWith(40.7128, -74.0060);
    });

    it('should return memory cache result if available', async () => {
      memoryCacheService.getDemographicProfile.mockResolvedValue(mockDemographicProfile);

      const result = await service.getDemographicProfile(40.7128, -74.0060);

      expect(result).toEqual(mockDemographicProfile);
      expect(memoryCacheService.getDemographicProfile).toHaveBeenCalledWith(40.7128, -74.0060);
      expect(redisCacheService.getDemographicProfile).not.toHaveBeenCalled();
    });

    it('should set data in both caches', async () => {
      await service.setDemographicProfile(40.7128, -74.0060, mockDemographicProfile);

      expect(memoryCacheService.setDemographicProfile).toHaveBeenCalledWith(40.7128, -74.0060, mockDemographicProfile);
      expect(redisCacheService.setDemographicProfile).toHaveBeenCalledWith(40.7128, -74.0060, mockDemographicProfile);
    });
  });

  describe('Batch Operations', () => {
    it('should handle multiple demographic profiles efficiently', async () => {
      const coordinates = [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.7589, lng: -73.9851 }
      ];

      const expectedResults = new Map([
        ['40.7128,-74.0060', mockDemographicProfile],
        ['40.7589,-73.9851', mockDemographicProfile]
      ]);

      memoryCacheService.getMultipleDemographicProfiles.mockResolvedValue(expectedResults);

      const results = await service.getMultipleDemographicProfiles(coordinates);

      expect(results).toEqual(expectedResults);
      expect(memoryCacheService.getMultipleDemographicProfiles).toHaveBeenCalledWith(coordinates);
    });

    it('should handle hybrid batch operations with cache misses', async () => {
      process.env.CACHE_PROVIDER = 'hybrid';
      
      const coordinates = [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.7589, lng: -73.9851 }
      ];

      const memoryResults = new Map([['40.7128,-74.0060', mockDemographicProfile]]);
      const redisResults = new Map([['40.7589,-73.9851', mockDemographicProfile]]);

      memoryCacheService.getMultipleDemographicProfiles.mockResolvedValue(memoryResults);
      redisCacheService.getMultipleDemographicProfiles.mockResolvedValue(redisResults);

      const results = await service.getMultipleDemographicProfiles(coordinates);

      expect(results.size).toBe(2);
      expect(results.get('40.7128,-74.0060')).toEqual(mockDemographicProfile);
      expect(results.get('40.7589,-73.9851')).toEqual(mockDemographicProfile);
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with hotspots', async () => {
      const hotspots = [
        { lat: 40.7128, lng: -74.0060, priority: 100 },
        { lat: 40.7589, lng: -73.9851, priority: 90 }
      ];

      await service.warmCache(hotspots);

      expect(memoryCacheService.warmCache).toHaveBeenCalledWith(hotspots);
    });

    it('should warm cache with detected hotspots when none provided', async () => {
      // Mock some cache access tracking
      await service.getDemographicProfile(40.7128, -74.0060);
      await service.getDemographicProfile(40.7128, -74.0060);
      
      await service.warmCache();

      expect(memoryCacheService.warmCache).toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate location in all caches for hybrid provider', async () => {
      process.env.CACHE_PROVIDER = 'hybrid';

      await service.invalidateLocation(40.7128, -74.0060);

      expect(memoryCacheService.invalidateLocation).toHaveBeenCalledWith(40.7128, -74.0060);
      expect(redisCacheService.invalidateLocation).toHaveBeenCalledWith(40.7128, -74.0060);
    });

    it('should invalidate region in all caches', async () => {
      const bounds = { north: 41, south: 40, east: -73, west: -75 };

      await service.invalidateRegion(bounds);

      expect(memoryCacheService.invalidateRegion).toHaveBeenCalledWith(bounds);
    });
  });

  describe('Cache Statistics', () => {
    it('should return combined cache statistics', async () => {
      const memoryStats = {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        totalRequests: 120,
        cacheSize: 50,
        memoryUsage: 1024000
      };

      const redisStats = {
        hits: 200,
        misses: 30,
        hitRate: 0.87,
        totalRequests: 230,
        redisMemoryUsage: 2048000,
        connectedClients: 5,
        keyspaceHits: 250,
        keyspaceMisses: 40
      };

      memoryCacheService.getCacheStats.mockReturnValue(memoryStats);
      redisCacheService.getCacheStats.mockResolvedValue(redisStats);

      const stats = await service.getCacheStats();

      expect(stats.memory).toEqual(memoryStats);
      expect(stats.redis).toEqual(redisStats);
      expect(stats.provider).toBeDefined();
      expect(stats.hotspots).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when all caches are healthy', async () => {
      memoryCacheService.healthCheck.mockResolvedValue({
        status: 'healthy',
        details: { test: 'passed' }
      });

      redisCacheService.healthCheck.mockResolvedValue({
        status: 'healthy',
        details: { test: 'passed' }
      });

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.memory).toBeDefined();
      expect(health.details.redis).toBeDefined();
    });

    it('should return degraded status when one cache is unhealthy', async () => {
      process.env.CACHE_PROVIDER = 'hybrid';

      memoryCacheService.healthCheck.mockResolvedValue({
        status: 'healthy',
        details: { test: 'passed' }
      });

      redisCacheService.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        details: { error: 'connection failed' }
      });

      const health = await service.healthCheck();

      expect(health.status).toBe('degraded');
    });

    it('should return unhealthy status when Redis is primary and unhealthy', async () => {
      process.env.CACHE_PROVIDER = 'redis';

      redisCacheService.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        details: { error: 'connection failed' }
      });

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
    });
  });

  describe('Cache Clearing', () => {
    it('should clear all caches and reset statistics', async () => {
      await service.clearCache();

      expect(memoryCacheService.clearCache).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle cache service failures gracefully', async () => {
      memoryCacheService.getDemographicProfile.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.getDemographicProfile(40.7128, -74.0060);

      expect(result).toBeNull();
    });

    it('should continue operation when cache warming fails', async () => {
      memoryCacheService.warmCache.mockRejectedValue(new Error('Warming failed'));

      await expect(service.warmCache([{ lat: 40.7128, lng: -74.0060, priority: 100 }]))
        .resolves.not.toThrow();
    });

    it('should handle invalidation failures gracefully', async () => {
      memoryCacheService.invalidateLocation.mockRejectedValue(new Error('Invalidation failed'));

      await expect(service.invalidateLocation(40.7128, -74.0060))
        .resolves.not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    it('should load configuration from environment variables', async () => {
      process.env.CACHE_PROVIDER = 'redis';
      process.env.CACHE_ENABLE_FALLBACK = 'true';
      process.env.CACHE_WARMUP_ON_START = 'true';

      // Reinitialize service to pick up new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheManagerService,
          { provide: IntelligenceCacheService, useValue: memoryCacheService },
          { provide: RedisCacheService, useValue: redisCacheService }
        ],
      }).compile();

      const newService = module.get<CacheManagerService>(CacheManagerService);
      
      // Test that Redis is being used
      await newService.getDemographicProfile(40.7128, -74.0060);
      
      expect(redisCacheService.getDemographicProfile).toHaveBeenCalled();
    });
  });
});