import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IntelligenceCacheService, CacheStats } from './intelligence-cache.service';
import { RedisCacheService, RedisCacheStats } from './redis-cache.service';
import { 
  DemographicProfile, 
  LocationIntelligence, 
  ViabilityAssessment, 
  CompetitiveAnalysis,
  LocationAnalysis 
} from '../../../types/intelligence.types';

export type CacheProvider = 'memory' | 'redis' | 'hybrid';

export interface CacheConfiguration {
  provider: CacheProvider;
  enableFallback: boolean;
  warmupOnStart: boolean;
  maintenanceInterval: number; // in milliseconds
  hotspotThreshold: number; // minimum requests to consider a location a hotspot
}

export interface CombinedCacheStats {
  provider: CacheProvider;
  memory?: CacheStats;
  redis?: RedisCacheStats;
  hotspots: number;
  maintenanceRuns: number;
  fallbackEvents: number;
}

@Injectable()
export class CacheManagerService implements OnModuleInit {
  private readonly logger = new Logger(CacheManagerService.name);
  
  private config: CacheConfiguration = {
    provider: 'memory', // Default to memory cache
    enableFallback: true,
    warmupOnStart: false,
    maintenanceInterval: 5 * 60 * 1000, // 5 minutes
    hotspotThreshold: 10
  };

  private maintenanceTimer?: NodeJS.Timeout;
  private hotspots = new Map<string, { count: number; lastAccess: number }>();
  private stats = {
    maintenanceRuns: 0,
    fallbackEvents: 0
  };

  constructor(
    private readonly memoryCacheService: IntelligenceCacheService,
    private readonly redisCacheService: RedisCacheService
  ) {}

  async onModuleInit() {
    await this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load configuration from environment or config service
    this.loadConfiguration();
    
    this.logger.log(`Initializing cache manager with provider: ${this.config.provider}`);
    
    // Start maintenance timer
    if (this.config.maintenanceInterval > 0) {
      this.startMaintenanceTimer();
    }
    
    // Perform cache warmup if enabled
    if (this.config.warmupOnStart) {
      await this.performWarmup();
    }
    
    this.logger.log('Cache manager initialized successfully');
  }

  private loadConfiguration(): void {
    // In a real implementation, load from environment variables or config service
    const provider = process.env.CACHE_PROVIDER as CacheProvider || 'memory';
    const enableFallback = process.env.CACHE_ENABLE_FALLBACK !== 'false';
    const warmupOnStart = process.env.CACHE_WARMUP_ON_START === 'true';
    const maintenanceInterval = parseInt(process.env.CACHE_MAINTENANCE_INTERVAL || '300000', 10);
    const hotspotThreshold = parseInt(process.env.CACHE_HOTSPOT_THRESHOLD || '10', 10);

    this.config = {
      provider,
      enableFallback,
      warmupOnStart,
      maintenanceInterval,
      hotspotThreshold
    };

    this.logger.log('Cache configuration loaded:', this.config);
  }

  // Demographic data caching
  async getDemographicProfile(lat: number, lng: number): Promise<DemographicProfile | null> {
    this.trackAccess(lat, lng);
    
    try {
      switch (this.config.provider) {
        case 'redis':
          return await this.redisCacheService.getDemographicProfile(lat, lng);
        case 'hybrid':
          return await this.getWithHybridStrategy(
            () => this.memoryCacheService.getDemographicProfile(lat, lng),
            () => this.redisCacheService.getDemographicProfile(lat, lng)
          );
        case 'memory':
        default:
          return await this.memoryCacheService.getDemographicProfile(lat, lng);
      }
    } catch (error) {
      return await this.handleCacheError('getDemographicProfile', error, lat, lng);
    }
  }

  async setDemographicProfile(lat: number, lng: number, profile: DemographicProfile): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'redis':
          await this.redisCacheService.setDemographicProfile(lat, lng, profile);
          break;
        case 'hybrid':
          await Promise.all([
            this.memoryCacheService.setDemographicProfile(lat, lng, profile),
            this.redisCacheService.setDemographicProfile(lat, lng, profile)
          ]);
          break;
        case 'memory':
        default:
          await this.memoryCacheService.setDemographicProfile(lat, lng, profile);
          break;
      }
    } catch (error) {
      await this.handleCacheError('setDemographicProfile', error, lat, lng);
    }
  }

  // Location intelligence caching
  async getLocationIntelligence(lat: number, lng: number): Promise<LocationIntelligence | null> {
    this.trackAccess(lat, lng);
    
    try {
      switch (this.config.provider) {
        case 'redis':
          return await this.redisCacheService.getLocationIntelligence(lat, lng);
        case 'hybrid':
          return await this.getWithHybridStrategy(
            () => this.memoryCacheService.getLocationIntelligence(lat, lng),
            () => this.redisCacheService.getLocationIntelligence(lat, lng)
          );
        case 'memory':
        default:
          return await this.memoryCacheService.getLocationIntelligence(lat, lng);
      }
    } catch (error) {
      return await this.handleCacheError('getLocationIntelligence', error, lat, lng);
    }
  }

  async setLocationIntelligence(lat: number, lng: number, intelligence: LocationIntelligence): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'redis':
          await this.redisCacheService.setLocationIntelligence(lat, lng, intelligence);
          break;
        case 'hybrid':
          await Promise.all([
            this.memoryCacheService.setLocationIntelligence(lat, lng, intelligence),
            this.redisCacheService.setLocationIntelligence(lat, lng, intelligence)
          ]);
          break;
        case 'memory':
        default:
          await this.memoryCacheService.setLocationIntelligence(lat, lng, intelligence);
          break;
      }
    } catch (error) {
      await this.handleCacheError('setLocationIntelligence', error, lat, lng);
    }
  }

  // Viability assessment caching
  async getViabilityAssessment(lat: number, lng: number): Promise<ViabilityAssessment | null> {
    this.trackAccess(lat, lng);
    
    try {
      switch (this.config.provider) {
        case 'redis':
          return await this.redisCacheService.getViabilityAssessment(lat, lng);
        case 'hybrid':
          return await this.getWithHybridStrategy(
            () => this.memoryCacheService.getViabilityAssessment(lat, lng),
            () => this.redisCacheService.getViabilityAssessment(lat, lng)
          );
        case 'memory':
        default:
          return await this.memoryCacheService.getViabilityAssessment(lat, lng);
      }
    } catch (error) {
      return await this.handleCacheError('getViabilityAssessment', error, lat, lng);
    }
  }

  async setViabilityAssessment(lat: number, lng: number, assessment: ViabilityAssessment): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'redis':
          await this.redisCacheService.setViabilityAssessment(lat, lng, assessment);
          break;
        case 'hybrid':
          await Promise.all([
            this.memoryCacheService.setViabilityAssessment(lat, lng, assessment),
            this.redisCacheService.setViabilityAssessment(lat, lng, assessment)
          ]);
          break;
        case 'memory':
        default:
          await this.memoryCacheService.setViabilityAssessment(lat, lng, assessment);
          break;
      }
    } catch (error) {
      await this.handleCacheError('setViabilityAssessment', error, lat, lng);
    }
  }

  // Competitive analysis caching
  async getCompetitiveAnalysis(lat: number, lng: number): Promise<CompetitiveAnalysis | null> {
    this.trackAccess(lat, lng);
    
    try {
      switch (this.config.provider) {
        case 'redis':
          return await this.redisCacheService.getCompetitiveAnalysis(lat, lng);
        case 'hybrid':
          return await this.getWithHybridStrategy(
            () => this.memoryCacheService.getCompetitiveAnalysis(lat, lng),
            () => this.redisCacheService.getCompetitiveAnalysis(lat, lng)
          );
        case 'memory':
        default:
          return await this.memoryCacheService.getCompetitiveAnalysis(lat, lng);
      }
    } catch (error) {
      return await this.handleCacheError('getCompetitiveAnalysis', error, lat, lng);
    }
  }

  async setCompetitiveAnalysis(lat: number, lng: number, analysis: CompetitiveAnalysis): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'redis':
          await this.redisCacheService.setCompetitiveAnalysis(lat, lng, analysis);
          break;
        case 'hybrid':
          await Promise.all([
            this.memoryCacheService.setCompetitiveAnalysis(lat, lng, analysis),
            this.redisCacheService.setCompetitiveAnalysis(lat, lng, analysis)
          ]);
          break;
        case 'memory':
        default:
          await this.memoryCacheService.setCompetitiveAnalysis(lat, lng, analysis);
          break;
      }
    } catch (error) {
      await this.handleCacheError('setCompetitiveAnalysis', error, lat, lng);
    }
  }

  // Full location analysis caching
  async getLocationAnalysis(lat: number, lng: number): Promise<LocationAnalysis | null> {
    this.trackAccess(lat, lng);
    
    try {
      switch (this.config.provider) {
        case 'redis':
          return await this.redisCacheService.getLocationAnalysis(lat, lng);
        case 'hybrid':
          return await this.getWithHybridStrategy(
            () => this.memoryCacheService.getLocationAnalysis(lat, lng),
            () => this.redisCacheService.getLocationAnalysis(lat, lng)
          );
        case 'memory':
        default:
          return await this.memoryCacheService.getLocationAnalysis(lat, lng);
      }
    } catch (error) {
      return await this.handleCacheError('getLocationAnalysis', error, lat, lng);
    }
  }

  async setLocationAnalysis(lat: number, lng: number, analysis: LocationAnalysis): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'redis':
          await this.redisCacheService.setLocationAnalysis(lat, lng, analysis);
          break;
        case 'hybrid':
          await Promise.all([
            this.memoryCacheService.setLocationAnalysis(lat, lng, analysis),
            this.redisCacheService.setLocationAnalysis(lat, lng, analysis)
          ]);
          break;
        case 'memory':
        default:
          await this.memoryCacheService.setLocationAnalysis(lat, lng, analysis);
          break;
      }
    } catch (error) {
      await this.handleCacheError('setLocationAnalysis', error, lat, lng);
    }
  }

  // Batch operations
  async getMultipleDemographicProfiles(coordinates: Array<{ lat: number; lng: number }>): Promise<Map<string, DemographicProfile>> {
    coordinates.forEach(coord => this.trackAccess(coord.lat, coord.lng));
    
    try {
      switch (this.config.provider) {
        case 'redis':
          return await this.redisCacheService.getMultipleDemographicProfiles(coordinates);
        case 'hybrid':
          // For hybrid, try memory first, then Redis for misses
          const memoryResults = await this.memoryCacheService.getMultipleDemographicProfiles(coordinates);
          const missingCoords = coordinates.filter(coord => 
            !memoryResults.has(`${coord.lat},${coord.lng}`)
          );
          
          if (missingCoords.length > 0) {
            const redisResults = await this.redisCacheService.getMultipleDemographicProfiles(missingCoords);
            // Merge results
            for (const [key, value] of redisResults.entries()) {
              memoryResults.set(key, value);
            }
          }
          
          return memoryResults;
        case 'memory':
        default:
          return await this.memoryCacheService.getMultipleDemographicProfiles(coordinates);
      }
    } catch (error) {
      this.logger.error('Failed to get multiple demographic profiles:', error);
      return new Map();
    }
  }

  async setMultipleDemographicProfiles(profiles: Array<{ lat: number; lng: number; profile: DemographicProfile }>): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'redis':
          await this.redisCacheService.setMultipleDemographicProfiles(profiles);
          break;
        case 'hybrid':
          await Promise.all([
            this.memoryCacheService.setMultipleDemographicProfiles(profiles),
            this.redisCacheService.setMultipleDemographicProfiles(profiles)
          ]);
          break;
        case 'memory':
        default:
          await this.memoryCacheService.setMultipleDemographicProfiles(profiles);
          break;
      }
    } catch (error) {
      this.logger.error('Failed to set multiple demographic profiles:', error);
    }
  }

  // Cache warming
  async warmCache(hotspots?: Array<{ lat: number; lng: number; priority: number }>): Promise<void> {
    const hotspotsToWarm = hotspots || this.getDetectedHotspots();
    
    if (hotspotsToWarm.length === 0) {
      this.logger.log('No hotspots to warm');
      return;
    }

    this.logger.log(`Warming cache for ${hotspotsToWarm.length} locations`);
    
    try {
      switch (this.config.provider) {
        case 'redis':
          await this.redisCacheService.warmCache(hotspotsToWarm);
          break;
        case 'hybrid':
          await Promise.all([
            this.memoryCacheService.warmCache(hotspotsToWarm),
            this.redisCacheService.warmCache(hotspotsToWarm)
          ]);
          break;
        case 'memory':
        default:
          await this.memoryCacheService.warmCache(hotspotsToWarm);
          break;
      }
    } catch (error) {
      this.logger.error('Cache warming failed:', error);
    }
  }

  // Cache invalidation
  async invalidateLocation(lat: number, lng: number): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'redis':
          await this.redisCacheService.invalidateLocation(lat, lng);
          break;
        case 'hybrid':
          await Promise.all([
            this.memoryCacheService.invalidateLocation(lat, lng),
            this.redisCacheService.invalidateLocation(lat, lng)
          ]);
          break;
        case 'memory':
        default:
          await this.memoryCacheService.invalidateLocation(lat, lng);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate location ${lat},${lng}:`, error);
    }
  }

  async invalidateRegion(bounds: { north: number; south: number; east: number; west: number }): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'redis':
          await this.redisCacheService.invalidateRegion(bounds);
          break;
        case 'hybrid':
          await Promise.all([
            this.memoryCacheService.invalidateRegion(bounds),
            this.redisCacheService.invalidateRegion(bounds)
          ]);
          break;
        case 'memory':
        default:
          await this.memoryCacheService.invalidateRegion(bounds);
          break;
      }
    } catch (error) {
      this.logger.error('Failed to invalidate region:', error);
    }
  }

  // Statistics and monitoring
  async getCacheStats(): Promise<CombinedCacheStats> {
    const stats: CombinedCacheStats = {
      provider: this.config.provider,
      hotspots: this.hotspots.size,
      maintenanceRuns: this.stats.maintenanceRuns,
      fallbackEvents: this.stats.fallbackEvents
    };

    try {
      if (this.config.provider === 'memory' || this.config.provider === 'hybrid') {
        stats.memory = this.memoryCacheService.getCacheStats();
      }
      
      if (this.config.provider === 'redis' || this.config.provider === 'hybrid') {
        stats.redis = await this.redisCacheService.getCacheStats();
      }
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
    }

    return stats;
  }

  async clearCache(): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'redis':
          await this.redisCacheService.clearCache();
          break;
        case 'hybrid':
          await Promise.all([
            this.memoryCacheService.clearCache(),
            this.redisCacheService.clearCache()
          ]);
          break;
        case 'memory':
        default:
          await this.memoryCacheService.clearCache();
          break;
      }
      
      this.hotspots.clear();
      this.stats.maintenanceRuns = 0;
      this.stats.fallbackEvents = 0;
      
      this.logger.log('All caches cleared');
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
    const results: any = {
      provider: this.config.provider,
      memory: null,
      redis: null
    };

    try {
      if (this.config.provider === 'memory' || this.config.provider === 'hybrid') {
        results.memory = await this.memoryCacheService.healthCheck();
      }
      
      if (this.config.provider === 'redis' || this.config.provider === 'hybrid') {
        results.redis = await this.redisCacheService.healthCheck();
      }

      // Determine overall health
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (this.config.provider === 'redis' && results.redis?.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (this.config.provider === 'hybrid') {
        if (results.memory?.status === 'unhealthy' && results.redis?.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (results.memory?.status !== 'healthy' || results.redis?.status !== 'healthy') {
          overallStatus = 'degraded';
        }
      } else if (results.memory?.status !== 'healthy') {
        overallStatus = 'degraded';
      }

      return {
        status: overallStatus,
        details: results
      };
    } catch (error) {
      this.logger.error('Cache health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
          provider: this.config.provider
        }
      };
    }
  }

  // Private helper methods
  private async getWithHybridStrategy<T>(
    memoryGetter: () => Promise<T | null>,
    redisGetter: () => Promise<T | null>
  ): Promise<T | null> {
    // Try memory cache first (faster)
    const memoryResult = await memoryGetter();
    if (memoryResult !== null) {
      return memoryResult;
    }

    // Fallback to Redis
    const redisResult = await redisGetter();
    if (redisResult !== null) {
      // Optionally populate memory cache with Redis result
      // This would require knowing the specific setter method
      return redisResult;
    }

    return null;
  }

  private async handleCacheError(operation: string, error: any, lat?: number, lng?: number): Promise<any> {
    this.logger.error(`Cache operation ${operation} failed:`, error);
    this.stats.fallbackEvents++;

    if (this.config.enableFallback) {
      // Try fallback cache provider
      if (this.config.provider === 'redis') {
        this.logger.warn('Falling back to memory cache');
        // Implement fallback logic here
      }
    }

    return null; // Return null for get operations, void for set operations
  }

  private trackAccess(lat: number, lng: number): void {
    const key = `${Math.round(lat * 1000) / 1000},${Math.round(lng * 1000) / 1000}`;
    const existing = this.hotspots.get(key);
    
    if (existing) {
      existing.count++;
      existing.lastAccess = Date.now();
    } else {
      this.hotspots.set(key, { count: 1, lastAccess: Date.now() });
    }
  }

  private getDetectedHotspots(): Array<{ lat: number; lng: number; priority: number }> {
    const hotspots: Array<{ lat: number; lng: number; priority: number }> = [];
    
    for (const [key, data] of this.hotspots.entries()) {
      if (data.count >= this.config.hotspotThreshold) {
        const [latStr, lngStr] = key.split(',');
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          hotspots.push({
            lat,
            lng,
            priority: data.count
          });
        }
      }
    }
    
    return hotspots.sort((a, b) => b.priority - a.priority);
  }

  private startMaintenanceTimer(): void {
    this.maintenanceTimer = setInterval(async () => {
      await this.performMaintenance();
    }, this.config.maintenanceInterval);
    
    this.logger.debug(`Started cache maintenance timer (${this.config.maintenanceInterval}ms interval)`);
  }

  private async performMaintenance(): Promise<void> {
    this.logger.debug('Performing cache maintenance');
    this.stats.maintenanceRuns++;

    try {
      // Clean up expired hotspot tracking
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const [key, data] of this.hotspots.entries()) {
        if (now - data.lastAccess > maxAge) {
          this.hotspots.delete(key);
        }
      }

      // Perform cache-specific maintenance
      if (this.config.provider === 'memory' || this.config.provider === 'hybrid') {
        await this.memoryCacheService.performMaintenance();
      }

      // Warm cache for detected hotspots
      const hotspots = this.getDetectedHotspots();
      if (hotspots.length > 0) {
        await this.warmCache(hotspots.slice(0, 20)); // Warm top 20 hotspots
      }
    } catch (error) {
      this.logger.error('Cache maintenance failed:', error);
    }
  }

  private async performWarmup(): Promise<void> {
    this.logger.log('Performing cache warmup');
    
    // In a real implementation, you might load common locations from database
    // or configuration. For now, we'll use some example locations.
    const commonLocations = [
      { lat: 40.7128, lng: -74.0060, priority: 100 }, // NYC
      { lat: 34.0522, lng: -118.2437, priority: 90 }, // LA
      { lat: 41.8781, lng: -87.6298, priority: 80 },  // Chicago
      { lat: 29.7604, lng: -95.3698, priority: 70 },  // Houston
      { lat: 33.4484, lng: -112.0740, priority: 60 }  // Phoenix
    ];
    
    await this.warmCache(commonLocations);
  }
}