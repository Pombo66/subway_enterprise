import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { 
  DemographicProfile, 
  LocationIntelligence, 
  ViabilityAssessment, 
  CompetitiveAnalysis,
  LocationAnalysis 
} from '../../../types/intelligence.types';

// Redis client interface (to be implemented with actual Redis client)
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<void>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  flushall(): Promise<void>;
  ping(): Promise<string>;
  info(section?: string): Promise<string>;
}

export interface RedisCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  redisMemoryUsage: number;
  connectedClients: number;
  keyspaceHits: number;
  keyspaceMisses: number;
}

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private redisClient: RedisClient | null = null;
  private isConnected = false;
  
  private readonly stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };

  // Cache TTL configurations (in seconds for Redis)
  private readonly cacheTTL = {
    demographic: 24 * 60 * 60,     // 24 hours
    viability: 12 * 60 * 60,       // 12 hours
    competitive: 6 * 60 * 60,      // 6 hours
    locationAnalysis: 8 * 60 * 60, // 8 hours
    locationIntelligence: 12 * 60 * 60 // 12 hours
  };

  private readonly keyPrefix = 'subway:intelligence:';
  private readonly cacheVersion = 'v1.0';

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      // In a real implementation, you would initialize Redis client here
      // For now, we'll use a mock implementation
      this.redisClient = this.createMockRedisClient();
      this.isConnected = true;
      this.logger.log('Connected to Redis cache');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  private async disconnect(): Promise<void> {
    if (this.redisClient && this.isConnected) {
      try {
        // In real implementation: await this.redisClient.quit();
        this.isConnected = false;
        this.logger.log('Disconnected from Redis cache');
      } catch (error) {
        this.logger.error('Error disconnecting from Redis:', error);
      }
    }
  }

  // Demographic data caching
  async getDemographicProfile(lat: number, lng: number): Promise<DemographicProfile | null> {
    const key = this.generateKey('demographic', lat, lng);
    return this.get<DemographicProfile>(key);
  }

  async setDemographicProfile(lat: number, lng: number, profile: DemographicProfile): Promise<void> {
    const key = this.generateKey('demographic', lat, lng);
    await this.set(key, profile, this.cacheTTL.demographic);
  }

  // Location intelligence caching
  async getLocationIntelligence(lat: number, lng: number): Promise<LocationIntelligence | null> {
    const key = this.generateKey('intelligence', lat, lng);
    return this.get<LocationIntelligence>(key);
  }

  async setLocationIntelligence(lat: number, lng: number, intelligence: LocationIntelligence): Promise<void> {
    const key = this.generateKey('intelligence', lat, lng);
    await this.set(key, intelligence, this.cacheTTL.locationIntelligence);
  }

  // Viability assessment caching
  async getViabilityAssessment(lat: number, lng: number): Promise<ViabilityAssessment | null> {
    const key = this.generateKey('viability', lat, lng);
    return this.get<ViabilityAssessment>(key);
  }

  async setViabilityAssessment(lat: number, lng: number, assessment: ViabilityAssessment): Promise<void> {
    const key = this.generateKey('viability', lat, lng);
    await this.set(key, assessment, this.cacheTTL.viability);
  }

  // Competitive analysis caching
  async getCompetitiveAnalysis(lat: number, lng: number): Promise<CompetitiveAnalysis | null> {
    const key = this.generateKey('competitive', lat, lng);
    return this.get<CompetitiveAnalysis>(key);
  }

  async setCompetitiveAnalysis(lat: number, lng: number, analysis: CompetitiveAnalysis): Promise<void> {
    const key = this.generateKey('competitive', lat, lng);
    await this.set(key, analysis, this.cacheTTL.competitive);
  }

  // Full location analysis caching
  async getLocationAnalysis(lat: number, lng: number): Promise<LocationAnalysis | null> {
    const key = this.generateKey('analysis', lat, lng);
    return this.get<LocationAnalysis>(key);
  }

  async setLocationAnalysis(lat: number, lng: number, analysis: LocationAnalysis): Promise<void> {
    const key = this.generateKey('analysis', lat, lng);
    await this.set(key, analysis, this.cacheTTL.locationAnalysis);
  }

  // Batch operations for performance
  async getMultipleDemographicProfiles(coordinates: Array<{ lat: number; lng: number }>): Promise<Map<string, DemographicProfile>> {
    const results = new Map<string, DemographicProfile>();
    
    // Use Redis pipeline for batch operations in real implementation
    const promises = coordinates.map(async (coord) => {
      const profile = await this.getDemographicProfile(coord.lat, coord.lng);
      if (profile) {
        const key = `${coord.lat},${coord.lng}`;
        results.set(key, profile);
      }
    });
    
    await Promise.all(promises);
    return results;
  }

  async setMultipleDemographicProfiles(profiles: Array<{ lat: number; lng: number; profile: DemographicProfile }>): Promise<void> {
    // Use Redis pipeline for batch operations in real implementation
    const promises = profiles.map(({ lat, lng, profile }) => 
      this.setDemographicProfile(lat, lng, profile)
    );
    
    await Promise.all(promises);
  }

  // Cache warming for frequently accessed locations
  async warmCache(hotspots: Array<{ lat: number; lng: number; priority: number }>): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Cannot warm cache: Redis not connected');
      return;
    }

    this.logger.log(`Warming Redis cache for ${hotspots.length} hotspot locations`);
    
    // Sort by priority (higher priority first)
    const sortedHotspots = hotspots.sort((a, b) => b.priority - a.priority);
    
    // Check which locations are already cached
    const cacheCheckPromises = sortedHotspots.map(async (hotspot) => {
      const keys = [
        this.generateKey('demographic', hotspot.lat, hotspot.lng),
        this.generateKey('viability', hotspot.lat, hotspot.lng),
        this.generateKey('competitive', hotspot.lat, hotspot.lng)
      ];
      
      const existsResults = await Promise.all(
        keys.map(key => this.redisClient!.exists(key))
      );
      
      return {
        location: hotspot,
        cached: {
          demographic: existsResults[0] > 0,
          viability: existsResults[1] > 0,
          competitive: existsResults[2] > 0
        }
      };
    });
    
    const cacheStatus = await Promise.all(cacheCheckPromises);
    
    // Log cache warming status
    const alreadyCached = cacheStatus.filter(status => 
      status.cached.demographic && status.cached.viability && status.cached.competitive
    ).length;
    
    this.logger.log(`Cache warming status: ${alreadyCached}/${hotspots.length} locations already cached`);
  }

  // Cache invalidation strategies
  async invalidateLocation(lat: number, lng: number): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Cannot invalidate cache: Redis not connected');
      return;
    }

    const keys = [
      this.generateKey('demographic', lat, lng),
      this.generateKey('intelligence', lat, lng),
      this.generateKey('viability', lat, lng),
      this.generateKey('competitive', lat, lng),
      this.generateKey('analysis', lat, lng)
    ];
    
    const deletePromises = keys.map(key => this.redisClient!.del(key));
    await Promise.all(deletePromises);
    
    this.logger.debug(`Invalidated Redis cache for location ${lat},${lng}`);
  }

  async invalidateRegion(bounds: { north: number; south: number; east: number; west: number }): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Cannot invalidate region cache: Redis not connected');
      return;
    }

    // Get all keys matching our pattern
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.redisClient!.keys(pattern);
    
    let invalidatedCount = 0;
    
    for (const key of keys) {
      const coords = this.extractCoordinatesFromKey(key);
      if (coords && this.isWithinBounds(coords, bounds)) {
        await this.redisClient!.del(key);
        invalidatedCount++;
      }
    }
    
    this.logger.log(`Invalidated ${invalidatedCount} Redis cache entries in region`);
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Cannot invalidate by pattern: Redis not connected');
      return;
    }

    const fullPattern = `${this.keyPrefix}${pattern}`;
    const keys = await this.redisClient!.keys(fullPattern);
    
    if (keys.length > 0) {
      const deletePromises = keys.map(key => this.redisClient!.del(key));
      await Promise.all(deletePromises);
      this.logger.log(`Invalidated ${keys.length} Redis cache entries matching pattern: ${pattern}`);
    }
  }

  // Cache statistics and monitoring
  async getCacheStats(): Promise<RedisCacheStats> {
    if (!this.isConnected) {
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        totalRequests: this.stats.totalRequests,
        redisMemoryUsage: 0,
        connectedClients: 0,
        keyspaceHits: 0,
        keyspaceMisses: 0
      };
    }

    try {
      const info = await this.redisClient!.info('stats');
      const memoryInfo = await this.redisClient!.info('memory');
      const clientsInfo = await this.redisClient!.info('clients');
      
      // Parse Redis info response (simplified)
      const keyspaceHits = this.parseInfoValue(info, 'keyspace_hits') || 0;
      const keyspaceMisses = this.parseInfoValue(info, 'keyspace_misses') || 0;
      const memoryUsage = this.parseInfoValue(memoryInfo, 'used_memory') || 0;
      const connectedClients = this.parseInfoValue(clientsInfo, 'connected_clients') || 0;
      
      const totalRequests = this.stats.hits + this.stats.misses;
      const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
      
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: Number(hitRate.toFixed(3)),
        totalRequests,
        redisMemoryUsage: memoryUsage,
        connectedClients,
        keyspaceHits,
        keyspaceMisses
      };
    } catch (error) {
      this.logger.error('Failed to get Redis cache stats:', error);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        totalRequests: this.stats.totalRequests,
        redisMemoryUsage: 0,
        connectedClients: 0,
        keyspaceHits: 0,
        keyspaceMisses: 0
      };
    }
  }

  async clearCache(): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Cannot clear cache: Redis not connected');
      return;
    }

    await this.redisClient!.flushall();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.totalRequests = 0;
    this.logger.log('Redis cache cleared');
  }

  // Health check for Redis cache service
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
    try {
      if (!this.isConnected || !this.redisClient) {
        return {
          status: 'unhealthy',
          details: {
            connected: false,
            error: 'Redis client not connected'
          }
        };
      }

      // Test Redis connection
      const pong = await this.redisClient.ping();
      
      if (pong !== 'PONG') {
        return {
          status: 'degraded',
          details: {
            connected: true,
            pingResponse: pong,
            error: 'Unexpected ping response'
          }
        };
      }

      // Test write/read operations
      const testKey = `${this.keyPrefix}health_check_test`;
      const testData = { test: true, timestamp: Date.now() };
      
      await this.set(testKey, testData, 60); // 1 minute TTL
      const retrieved = await this.get(testKey);
      await this.redisClient.del(testKey);
      
      const isHealthy = retrieved !== null && (retrieved as any)?.test === true;
      const stats = await this.getCacheStats();
      
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          connected: true,
          pingResponse: pong,
          testPassed: isHealthy,
          memoryUsage: stats.redisMemoryUsage,
          connectedClients: stats.connectedClients,
          hitRate: stats.hitRate
        }
      };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // Private helper methods
  private async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.redisClient) {
      this.stats.misses++;
      this.stats.totalRequests++;
      return null;
    }

    try {
      this.stats.totalRequests++;
      
      const value = await this.redisClient.get(key);
      
      if (!value) {
        this.stats.misses++;
        return null;
      }
      
      const parsed = JSON.parse(value);
      
      // Check version compatibility
      if (parsed.version !== this.cacheVersion) {
        await this.redisClient.del(key);
        this.stats.misses++;
        return null;
      }
      
      this.stats.hits++;
      return parsed.data as T;
    } catch (error) {
      this.logger.error(`Failed to get from Redis cache (key: ${key}):`, error);
      this.stats.misses++;
      return null;
    }
  }

  private async set<T>(key: string, data: T, ttl: number): Promise<void> {
    if (!this.isConnected || !this.redisClient) {
      this.logger.warn('Cannot set cache: Redis not connected');
      return;
    }

    try {
      const cacheEntry = {
        data,
        version: this.cacheVersion,
        timestamp: Date.now()
      };
      
      const value = JSON.stringify(cacheEntry);
      await this.redisClient.set(key, value, { EX: ttl });
    } catch (error) {
      this.logger.error(`Failed to set Redis cache (key: ${key}):`, error);
    }
  }

  private generateKey(type: string, lat: number, lng: number): string {
    const roundedLat = Math.round(lat * 1000) / 1000; // 3 decimal places
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `${this.keyPrefix}${type}:${roundedLat},${roundedLng}`;
  }

  private extractCoordinatesFromKey(key: string): { lat: number; lng: number } | null {
    const match = key.match(/:(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }
    return null;
  }

  private isWithinBounds(coords: { lat: number; lng: number }, bounds: { north: number; south: number; east: number; west: number }): boolean {
    return coords.lat >= bounds.south && 
           coords.lat <= bounds.north && 
           coords.lng >= bounds.west && 
           coords.lng <= bounds.east;
  }

  private parseInfoValue(info: string, key: string): number | null {
    const match = info.match(new RegExp(`${key}:(\\d+)`));
    return match ? parseInt(match[1], 10) : null;
  }

  // Mock Redis client for development/testing
  private createMockRedisClient(): RedisClient {
    const mockStorage = new Map<string, { value: string; expiry?: number }>();
    
    return {
      async get(key: string): Promise<string | null> {
        const entry = mockStorage.get(key);
        if (!entry) return null;
        
        if (entry.expiry && Date.now() > entry.expiry) {
          mockStorage.delete(key);
          return null;
        }
        
        return entry.value;
      },
      
      async set(key: string, value: string, options?: { EX?: number }): Promise<void> {
        const expiry = options?.EX ? Date.now() + (options.EX * 1000) : undefined;
        mockStorage.set(key, { value, expiry });
      },
      
      async del(key: string): Promise<number> {
        return mockStorage.delete(key) ? 1 : 0;
      },
      
      async exists(key: string): Promise<number> {
        const entry = mockStorage.get(key);
        if (!entry) return 0;
        
        if (entry.expiry && Date.now() > entry.expiry) {
          mockStorage.delete(key);
          return 0;
        }
        
        return 1;
      },
      
      async keys(pattern: string): Promise<string[]> {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Array.from(mockStorage.keys()).filter(key => regex.test(key));
      },
      
      async flushall(): Promise<void> {
        mockStorage.clear();
      },
      
      async ping(): Promise<string> {
        return 'PONG';
      },
      
      async info(section?: string): Promise<string> {
        // Mock Redis info response
        return `keyspace_hits:${Math.floor(Math.random() * 1000)}\nkeyspace_misses:${Math.floor(Math.random() * 100)}\nused_memory:${Math.floor(Math.random() * 1000000)}\nconnected_clients:${Math.floor(Math.random() * 10) + 1}`;
      }
    };
  }
}