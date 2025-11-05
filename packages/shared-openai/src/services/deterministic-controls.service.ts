/**
 * Deterministic Controls Service
 * Replaces temperature parameters with seed values for consistent outputs
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

export interface DeterministicConfig {
  enableSeeds: boolean;
  seedStrategy: 'context_based' | 'random' | 'fixed';
  fixedSeed?: number;
  seedRotationInterval?: number; // hours
}

export interface SeedInfo {
  seed: number;
  generatedAt: Date;
  context: string;
  strategy: string;
}

export class DeterministicControlsService {
  private readonly config: DeterministicConfig;
  private readonly logger: (message: string, data?: any) => void;
  private seedCache = new Map<string, SeedInfo>();

  constructor(
    config: Partial<DeterministicConfig> = {},
    logger?: (message: string, data?: any) => void
  ) {
    this.config = {
      enableSeeds: true,
      seedStrategy: 'context_based',
      seedRotationInterval: 24, // 24 hours default
      ...config
    };

    this.logger = logger || ((message: string, data?: any) => {
      console.log(`[DeterministicControls] ${message}`, data || '');
    });
  }

  /**
   * Generate seed value for API request
   * Requirement 3.1: Replace temperature parameters with seed values in API requests
   */
  generateSeed(context: string): number {
    if (!this.config.enableSeeds) {
      return this.generateRandomSeed();
    }

    switch (this.config.seedStrategy) {
      case 'fixed':
        return this.generateFixedSeed();
      case 'context_based':
        return this.generateContextBasedSeed(context);
      case 'random':
      default:
        return this.generateRandomSeed();
    }
  }

  /**
   * Get or create seed for caching purposes
   * Requirement 3.4: Store seed values alongside cached rationales for debugging
   */
  getOrCreateSeed(context: string, cacheKey: string): SeedInfo {
    const existingSeed = this.seedCache.get(cacheKey);
    
    if (existingSeed && this.isSeedValid(existingSeed)) {
      this.logger('Using existing seed from cache', {
        seed: existingSeed.seed,
        context: existingSeed.context,
        age: Date.now() - existingSeed.generatedAt.getTime()
      });
      return existingSeed;
    }

    // Generate new seed
    const seed = this.generateSeed(context);
    const seedInfo: SeedInfo = {
      seed,
      generatedAt: new Date(),
      context,
      strategy: this.config.seedStrategy
    };

    this.seedCache.set(cacheKey, seedInfo);
    
    this.logger('Generated new seed', {
      seed,
      context,
      strategy: this.config.seedStrategy
    });

    return seedInfo;
  }

  /**
   * Build API request parameters without temperature
   * Requirement 3.2: Remove temperature: 1.0 from database storage and service configurations
   */
  buildAPIParameters(
    baseParams: any,
    context: string,
    cacheKey?: string
  ): any {
    const params = { ...baseParams };
    
    // Remove temperature if present (deprecated for GPT-5)
    if ('temperature' in params) {
      delete params.temperature;
      this.logger('Removed deprecated temperature parameter');
    }

    // Add seed for deterministic output
    if (this.config.enableSeeds) {
      const seedInfo = cacheKey ? 
        this.getOrCreateSeed(context, cacheKey) : 
        { seed: this.generateSeed(context) };
      
      params.seed = seedInfo.seed;
      
      this.logger('Added seed to API parameters', {
        seed: seedInfo.seed,
        context
      });
    }

    return params;
  }

  /**
   * Validate seed-based cache invalidation
   * Requirement 3.5: Implement seed-based cache invalidation logic
   */
  shouldInvalidateCache(cacheKey: string, currentContext: string): boolean {
    const cachedSeed = this.seedCache.get(cacheKey);
    
    if (!cachedSeed) {
      return false; // No cached seed, no need to invalidate
    }

    // Check if seed has expired based on rotation interval
    if (this.isSeedExpired(cachedSeed)) {
      this.logger('Cache invalidation: seed expired', {
        seed: cachedSeed.seed,
        age: Date.now() - cachedSeed.generatedAt.getTime(),
        rotationInterval: this.config.seedRotationInterval
      });
      return true;
    }

    // Check if context has changed significantly
    if (this.hasContextChanged(cachedSeed.context, currentContext)) {
      this.logger('Cache invalidation: context changed', {
        oldContext: cachedSeed.context,
        newContext: currentContext
      });
      return true;
    }

    return false;
  }

  /**
   * Clean up expired seeds from cache
   */
  cleanupExpiredSeeds(): number {
    let cleanedCount = 0;
    
    for (const [key, seedInfo] of this.seedCache.entries()) {
      if (this.isSeedExpired(seedInfo)) {
        this.seedCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger('Cleaned up expired seeds', { count: cleanedCount });
    }

    return cleanedCount;
  }

  /**
   * Get seed statistics for monitoring
   */
  getSeedStats(): SeedStatistics {
    const now = Date.now();
    let validSeeds = 0;
    let expiredSeeds = 0;
    const strategies = new Map<string, number>();
    let oldestSeed: Date | null = null;
    let newestSeed: Date | null = null;

    for (const seedInfo of this.seedCache.values()) {
      if (this.isSeedExpired(seedInfo)) {
        expiredSeeds++;
      } else {
        validSeeds++;
      }

      // Track strategies
      const count = strategies.get(seedInfo.strategy) || 0;
      strategies.set(seedInfo.strategy, count + 1);

      // Track age
      if (!oldestSeed || seedInfo.generatedAt < oldestSeed) {
        oldestSeed = seedInfo.generatedAt;
      }
      if (!newestSeed || seedInfo.generatedAt > newestSeed) {
        newestSeed = seedInfo.generatedAt;
      }
    }

    return {
      totalSeeds: this.seedCache.size,
      validSeeds,
      expiredSeeds,
      strategyCounts: Object.fromEntries(strategies),
      oldestSeedAge: oldestSeed ? now - oldestSeed.getTime() : 0,
      newestSeedAge: newestSeed ? now - newestSeed.getTime() : 0,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  /**
   * Reset seed cache (useful for testing)
   */
  resetSeedCache(): void {
    this.seedCache.clear();
    this.logger('Seed cache reset');
  }

  /**
   * Generate context-based deterministic seed
   */
  private generateContextBasedSeed(context: string): number {
    // Create deterministic seed from context hash
    let hash = 0;
    for (let i = 0; i < context.length; i++) {
      const char = context.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Ensure positive seed value
    const seed = Math.abs(hash) % 2147483647; // Max 32-bit signed integer
    
    return seed;
  }

  /**
   * Generate fixed seed from configuration
   */
  private generateFixedSeed(): number {
    return this.config.fixedSeed || 12345;
  }

  /**
   * Generate random seed
   */
  private generateRandomSeed(): number {
    return Math.floor(Math.random() * 2147483647);
  }

  /**
   * Check if seed is still valid (not expired)
   */
  private isSeedValid(seedInfo: SeedInfo): boolean {
    return !this.isSeedExpired(seedInfo);
  }

  /**
   * Check if seed has expired based on rotation interval
   */
  private isSeedExpired(seedInfo: SeedInfo): boolean {
    if (!this.config.seedRotationInterval) {
      return false; // No expiration if rotation interval not set
    }

    const ageMs = Date.now() - seedInfo.generatedAt.getTime();
    const maxAgeMs = this.config.seedRotationInterval * 60 * 60 * 1000; // Convert hours to ms
    
    return ageMs > maxAgeMs;
  }

  /**
   * Check if context has changed significantly
   */
  private hasContextChanged(oldContext: string, newContext: string): boolean {
    // Simple comparison - in production, might want more sophisticated logic
    return oldContext !== newContext;
  }

  /**
   * Calculate cache hit rate for monitoring
   */
  private calculateCacheHitRate(): number {
    // This would need to be tracked separately in a real implementation
    // For now, return a placeholder
    return 0;
  }

  /**
   * Create seed for database storage
   * Requirement 3.4: Store seed values alongside cached rationales for debugging
   */
  createSeedForStorage(context: string, cacheKey: string): {
    seed: number;
    seedStrategy: string;
    seedGeneratedAt: Date;
    seedContext: string;
  } {
    const seedInfo = this.getOrCreateSeed(context, cacheKey);
    
    return {
      seed: seedInfo.seed,
      seedStrategy: seedInfo.strategy,
      seedGeneratedAt: seedInfo.generatedAt,
      seedContext: seedInfo.context
    };
  }

  /**
   * Validate that temperature is not used in API calls
   * Requirement 3.3: Ensure temperature is completely removed from API calls
   */
  validateAPIRequest(apiRequest: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for deprecated temperature parameter
    if ('temperature' in apiRequest) {
      errors.push('temperature parameter is deprecated for GPT-5 models');
    }

    // Check for seed parameter when deterministic mode is enabled
    if (this.config.enableSeeds && !('seed' in apiRequest)) {
      warnings.push('seed parameter missing - output may not be deterministic');
    }

    // Validate seed value if present
    if ('seed' in apiRequest) {
      const seed = apiRequest.seed;
      if (typeof seed !== 'number' || seed < 0 || seed > 2147483647) {
        errors.push('seed must be a positive integer within 32-bit range');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export interface SeedStatistics {
  totalSeeds: number;
  validSeeds: number;
  expiredSeeds: number;
  strategyCounts: Record<string, number>;
  oldestSeedAge: number;
  newestSeedAge: number;
  cacheHitRate: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}