import { Injectable, Logger } from '@nestjs/common';
import { 
  DemographicProfile, 
  LocationIntelligence, 
  ViabilityAssessment, 
  CompetitiveAnalysis,
  LocationAnalysis 
} from '../../../types/intelligence.types';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
  memoryUsage: number;
}

@Injectable()
export class IntelligenceCacheService {
  private readonly logger = new Logger(IntelligenceCacheService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };

  // Cache TTL configurations (in milliseconds)
  private readonly cacheTTL = {
    demographic: 24 * 60 * 60 * 1000, // 24 hours
    viability: 12 * 60 * 60 * 1000,   // 12 hours
    competitive: 6 * 60 * 60 * 1000,  // 6 hours
    locationAnalysis: 8 * 60 * 60 * 1000, // 8 hours
    locationIntelligence: 12 * 60 * 60 * 1000 // 12 hours
  };

  private readonly maxCacheSize = 10000; // Maximum number of cache entries
  private readonly cacheVersion = 'v1.0';

  // Demographic data caching
  async getDemographicProfile(lat: number, lng: number): Promise<DemographicProfile | null> {
    const key = this.generateDemographicKey(lat, lng);
    return this.get<DemographicProfile>(key);
  }

  async setDemographicProfile(lat: number, lng: number, profile: DemographicProfile): Promise<void> {
    const key = this.generateDemographicKey(lat, lng);
    await this.set(key, profile, this.cacheTTL.demographic);
  }

  // Location intelligence caching
  async getLocationIntelligence(lat: number, lng: number): Promise<LocationIntelligence | null> {
    const key = this.generateLocationIntelligenceKey(lat, lng);
    return this.get<LocationIntelligence>(key);
  }

  async setLocationIntelligence(lat: number, lng: number, intelligence: LocationIntelligence): Promise<void> {
    const key = this.generateLocationIntelligenceKey(lat, lng);
    await this.set(key, intelligence, this.cacheTTL.locationIntelligence);
  }

  // Viability assessment caching
  async getViabilityAssessment(lat: number, lng: number): Promise<ViabilityAssessment | null> {
    const key = this.generateViabilityKey(lat, lng);
    return this.get<ViabilityAssessment>(key);
  }

  async setViabilityAssessment(lat: number, lng: number, assessment: ViabilityAssessment): Promise<void> {
    const key = this.generateViabilityKey(lat, lng);
    await this.set(key, assessment, this.cacheTTL.viability);
  }

  // Competitive analysis caching
  async getCompetitiveAnalysis(lat: number, lng: number): Promise<CompetitiveAnalysis | null> {
    const key = this.generateCompetitiveKey(lat, lng);
    return this.get<CompetitiveAnalysis>(key);
  }

  async setCompetitiveAnalysis(lat: number, lng: number, analysis: CompetitiveAnalysis): Promise<void> {
    const key = this.generateCompetitiveKey(lat, lng);
    await this.set(key, analysis, this.cacheTTL.competitive);
  }

  // Full location analysis caching
  async getLocationAnalysis(lat: number, lng: number): Promise<LocationAnalysis | null> {
    const key = this.generateLocationAnalysisKey(lat, lng);
    return this.get<LocationAnalysis>(key);
  }

  async setLocationAnalysis(lat: number, lng: number, analysis: LocationAnalysis): Promise<void> {
    const key = this.generateLocationAnalysisKey(lat, lng);
    await this.set(key, analysis, this.cacheTTL.locationAnalysis);
  }

  // Batch operations for performance
  async getMultipleDemographicProfiles(coordinates: Array<{ lat: number; lng: number }>): Promise<Map<string, DemographicProfile>> {
    const results = new Map<string, DemographicProfile>();
    
    for (const coord of coordinates) {
      const profile = await this.getDemographicProfile(coord.lat, coord.lng);
      if (profile) {
        const key = `${coord.lat},${coord.lng}`;
        results.set(key, profile);
      }
    }
    
    return results;
  }

  async setMultipleDemographicProfiles(profiles: Array<{ lat: number; lng: number; profile: DemographicProfile }>): Promise<void> {
    const promises = profiles.map(({ lat, lng, profile }) => 
      this.setDemographicProfile(lat, lng, profile)
    );
    
    await Promise.all(promises);
  }

  // Cache warming for frequently accessed locations
  async warmCache(hotspots: Array<{ lat: number; lng: number; priority: number }>): Promise<void> {
    this.logger.log(`Warming cache for ${hotspots.length} hotspot locations`);
    
    // Sort by priority (higher priority first)
    const sortedHotspots = hotspots.sort((a, b) => b.priority - a.priority);
    
    // Warm cache in batches to avoid overwhelming external APIs
    const batchSize = 5;
    for (let i = 0; i < sortedHotspots.length; i += batchSize) {
      const batch = sortedHotspots.slice(i, i + batchSize);
      
      const warmingPromises = batch.map(async (hotspot) => {
        try {
          // Check if data is already cached
          const [demographic, viability, competitive] = await Promise.all([
            this.getDemographicProfile(hotspot.lat, hotspot.lng),
            this.getViabilityAssessment(hotspot.lat, hotspot.lng),
            this.getCompetitiveAnalysis(hotspot.lat, hotspot.lng)
          ]);
          
          // Log cache status for monitoring
          const cacheStatus = {
            demographic: !!demographic,
            viability: !!viability,
            competitive: !!competitive
          };
          
          this.logger.debug(`Cache status for ${hotspot.lat},${hotspot.lng}:`, cacheStatus);
        } catch (error) {
          this.logger.warn(`Failed to warm cache for ${hotspot.lat},${hotspot.lng}:`, error);
        }
      });
      
      await Promise.all(warmingPromises);
      
      // Small delay between batches to be respectful to external APIs
      if (i + batchSize < sortedHotspots.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    this.logger.log(`Cache warming completed for ${hotspots.length} locations`);
  }

  // Cache invalidation strategies
  async invalidateLocation(lat: number, lng: number): Promise<void> {
    const keys = [
      this.generateDemographicKey(lat, lng),
      this.generateLocationIntelligenceKey(lat, lng),
      this.generateViabilityKey(lat, lng),
      this.generateCompetitiveKey(lat, lng),
      this.generateLocationAnalysisKey(lat, lng)
    ];
    
    for (const key of keys) {
      this.cache.delete(key);
    }
    
    this.logger.debug(`Invalidated cache for location ${lat},${lng}`);
  }

  async invalidateRegion(bounds: { north: number; south: number; east: number; west: number }): Promise<void> {
    let invalidatedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      const coords = this.extractCoordinatesFromKey(key);
      if (coords && this.isWithinBounds(coords, bounds)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }
    
    this.logger.log(`Invalidated ${invalidatedCount} cache entries in region`);
  }

  async invalidateExpired(): Promise<void> {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.logger.debug(`Cleaned up ${expiredCount} expired cache entries`);
    }
  }

  // Cache statistics and monitoring
  getCacheStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    // Estimate memory usage
    let memoryUsage = 0;
    for (const [key, entry] of this.cache.entries()) {
      memoryUsage += this.estimateEntrySize(key, entry);
    }
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Number(hitRate.toFixed(3)),
      totalRequests,
      cacheSize: this.cache.size,
      memoryUsage
    };
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.totalRequests = 0;
    this.logger.log('Cache cleared');
  }

  // Health check for cache service
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
    try {
      const stats = this.getCacheStats();
      const testKey = 'health_check_test';
      const testData = { test: true, timestamp: Date.now() };
      
      // Test write operation
      await this.set(testKey, testData, 1000);
      
      // Test read operation
      const retrieved = await this.get(testKey);
      
      // Clean up test data
      this.cache.delete(testKey);
      
      const isHealthy = retrieved !== null && (retrieved as any)?.test === true;
      
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          cacheSize: stats.cacheSize,
          hitRate: stats.hitRate,
          memoryUsage: stats.memoryUsage,
          testPassed: isHealthy
        }
      };
    } catch (error) {
      this.logger.error('Cache health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // Private helper methods
  private async get<T>(key: string): Promise<T | null> {
    this.stats.totalRequests++;
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Check version compatibility
    if (entry.version !== this.cacheVersion) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.data as T;
  }

  private async set<T>(key: string, data: T, ttl: number): Promise<void> {
    // Implement cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      await this.evictLeastRecentlyUsed();
    }
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version: this.cacheVersion
    };
    
    this.cache.set(key, entry);
  }

  private async evictLeastRecentlyUsed(): Promise<void> {
    // Simple LRU implementation - remove oldest entries
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 10% of entries
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    this.logger.debug(`Evicted ${toRemove} cache entries due to size limit`);
  }

  private generateDemographicKey(lat: number, lng: number): string {
    const roundedLat = Math.round(lat * 1000) / 1000; // 3 decimal places
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `demo:${roundedLat},${roundedLng}`;
  }

  private generateLocationIntelligenceKey(lat: number, lng: number): string {
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `intel:${roundedLat},${roundedLng}`;
  }

  private generateViabilityKey(lat: number, lng: number): string {
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `viab:${roundedLat},${roundedLng}`;
  }

  private generateCompetitiveKey(lat: number, lng: number): string {
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `comp:${roundedLat},${roundedLng}`;
  }

  private generateLocationAnalysisKey(lat: number, lng: number): string {
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `analysis:${roundedLat},${roundedLng}`;
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

  private estimateEntrySize(key: string, entry: CacheEntry<any>): number {
    // Rough estimation of memory usage
    const keySize = key.length * 2; // UTF-16 characters
    const dataSize = JSON.stringify(entry.data).length * 2;
    const metadataSize = 64; // Approximate size of timestamp, ttl, version
    
    return keySize + dataSize + metadataSize;
  }

  // Periodic maintenance
  async performMaintenance(): Promise<void> {
    this.logger.debug('Performing cache maintenance');
    
    await this.invalidateExpired();
    
    const stats = this.getCacheStats();
    
    // Log cache statistics
    this.logger.debug('Cache statistics:', {
      size: stats.cacheSize,
      hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
      memoryUsage: `${Math.round(stats.memoryUsage / 1024)}KB`
    });
    
    // If cache is getting too large, perform more aggressive cleanup
    if (stats.cacheSize > this.maxCacheSize * 0.9) {
      await this.evictLeastRecentlyUsed();
    }
  }
}