/**
 * Caching layer for repositories to improve performance
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheStrategy {
  get<T>(key: string): CacheEntry<T> | null;
  set<T>(key: string, data: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
}

export class MemoryCacheStrategy implements CacheStrategy {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout;
  private metricsCache = new Map<string, { hits: number; misses: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  constructor(defaultTTL = 5 * 60 * 1000, cleanupIntervalMs = 60 * 1000) {
    this.defaultTTL = defaultTTL;
    // Automatic cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.recordMiss(key);
      return null;
    }
    
    // Lazy expiration check
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.recordMiss(key);
      return null;
    }
    
    this.recordHit(key);
    return entry;
  }

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  delete(key: string): void {
    this.metricsCache.delete(key);
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.metricsCache.clear();
  }

  has(key: string): boolean {
    const entry = this.get(key);
    return entry !== null;
  }

  // Enhanced cleanup with metrics
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, now)) {
        this.cache.delete(key);
        this.metricsCache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.debug(`Cache cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  // Get cache statistics with performance metrics
  getStats(): { 
    size: number; 
    keys: string[];
    metrics: Record<string, { hits: number; misses: number; hitRate: number }>;
  } {
    const metrics: Record<string, { hits: number; misses: number; hitRate: number }> = {};
    
    for (const [key, stats] of this.metricsCache.entries()) {
      const total = stats.hits + stats.misses;
      metrics[key] = {
        ...stats,
        hitRate: total > 0 ? stats.hits / total : 0
      };
    }

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      metrics
    };
  }

  private isExpired(entry: CacheEntry<any>, now = Date.now()): boolean {
    return now - entry.timestamp > entry.ttl;
  }

  private recordHit(key: string): void {
    const stats = this.metricsCache.get(key) || { hits: 0, misses: 0 };
    stats.hits++;
    this.metricsCache.set(key, stats);
  }

  private recordMiss(key: string): void {
    const stats = this.metricsCache.get(key) || { hits: 0, misses: 0 };
    stats.misses++;
    this.metricsCache.set(key, stats);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
    this.metricsCache.clear();
  }
}

export class CachedRepository<T, Q = any> {
  private cacheStrategy: CacheStrategy;

  constructor(
    private baseRepository: any,
    cacheStrategy?: CacheStrategy
  ) {
    this.cacheStrategy = cacheStrategy || new MemoryCacheStrategy();
  }

  private generateCacheKey(method: string, ...args: any[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  async findMany(query?: Q): Promise<T[]> {
    const cacheKey = this.generateCacheKey('findMany', query);
    const cached = this.cacheStrategy.get<T[]>(cacheKey);
    
    if (cached) {
      return cached.data;
    }

    const result = await this.baseRepository.findMany(query);
    this.cacheStrategy.set(cacheKey, result, 2 * 60 * 1000); // 2 minutes for lists
    
    return result;
  }

  async findById(id: string): Promise<T | null> {
    const cacheKey = this.generateCacheKey('findById', id);
    const cached = this.cacheStrategy.get<T | null>(cacheKey);
    
    if (cached) {
      return cached.data;
    }

    const result = await this.baseRepository.findById(id);
    this.cacheStrategy.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes for single items
    
    return result;
  }

  async create(data: Partial<T>): Promise<T> {
    const result = await this.baseRepository.create(data);
    
    // Invalidate list caches when creating new items
    this.invalidateListCaches();
    
    // Cache the new item
    const cacheKey = this.generateCacheKey('findById', (result as any).id);
    this.cacheStrategy.set(cacheKey, result);
    
    return result;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const result = await this.baseRepository.update(id, data);
    
    // Update cache with new data
    const cacheKey = this.generateCacheKey('findById', id);
    this.cacheStrategy.set(cacheKey, result);
    
    // Invalidate list caches
    this.invalidateListCaches();
    
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.baseRepository.delete(id);
    
    // Remove from cache
    const cacheKey = this.generateCacheKey('findById', id);
    this.cacheStrategy.delete(cacheKey);
    
    // Invalidate list caches
    this.invalidateListCaches();
  }

  private invalidateListCaches(): void {
    // Simple approach: clear all findMany caches
    // In a more sophisticated implementation, you could be more selective
    const stats = (this.cacheStrategy as MemoryCacheStrategy).getStats?.();
    if (stats) {
      stats.keys
        .filter(key => key.startsWith('findMany:'))
        .forEach(key => this.cacheStrategy.delete(key));
    }
  }

  // Manual cache management
  invalidateCache(method?: string, ...args: any[]): void {
    if (method) {
      const cacheKey = this.generateCacheKey(method, ...args);
      this.cacheStrategy.delete(cacheKey);
    } else {
      this.cacheStrategy.clear();
    }
  }

  getCacheStats(): any {
    return (this.cacheStrategy as MemoryCacheStrategy).getStats?.() || {};
  }
}