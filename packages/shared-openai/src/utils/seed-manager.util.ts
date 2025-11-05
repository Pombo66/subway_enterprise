/**
 * Seed Manager Utility
 * Provides seed-based deterministic controls for OpenAI API calls
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import * as crypto from 'crypto';

export interface SeedConfig {
  useDeterministicSeeds: boolean;
  baseSeed?: number;
  contextBasedSeeds: boolean;
  seedRotationEnabled: boolean;
  seedRotationInterval: number; // in hours
}

export interface SeedResult {
  seed: number;
  seedSource: 'generated' | 'context-based' | 'rotated' | 'fixed';
  seedMetadata: {
    generatedAt: Date;
    contextHash?: string;
    rotationPeriod?: number;
  };
}

export class SeedManagerUtil {
  private static readonly DEFAULT_SEED_RANGE = { min: 1, max: 2147483647 }; // 32-bit signed integer range
  private static seedCache = new Map<string, SeedResult>();

  /**
   * Generate deterministic seed for API requests
   * Requirement 3.1: Replace temperature parameters with seed values in API requests
   */
  static generateSeed(context?: any, config: Partial<SeedConfig> = {}): SeedResult {
    const seedConfig: SeedConfig = {
      useDeterministicSeeds: true,
      contextBasedSeeds: true,
      seedRotationEnabled: false,
      seedRotationInterval: 24, // 24 hours default
      ...config
    };

    if (!seedConfig.useDeterministicSeeds) {
      return this.generateRandomSeed();
    }

    // Use fixed base seed if provided
    if (seedConfig.baseSeed) {
      return {
        seed: seedConfig.baseSeed,
        seedSource: 'fixed',
        seedMetadata: {
          generatedAt: new Date()
        }
      };
    }

    // Generate context-based seed
    if (seedConfig.contextBasedSeeds && context) {
      return this.generateContextBasedSeed(context);
    }

    // Generate rotated seed
    if (seedConfig.seedRotationEnabled) {
      return this.generateRotatedSeed(seedConfig.seedRotationInterval);
    }

    // Default: generate random seed
    return this.generateRandomSeed();
  }

  /**
   * Generate seed based on context for reproducible outputs
   * Requirement 3.2: Include seed parameters in API requests for reproducible outputs
   */
  static generateContextBasedSeed(context: any): SeedResult {
    const contextString = this.normalizeContext(context);
    const contextHash = crypto.createHash('md5').update(contextString).digest('hex');
    
    // Check cache first
    const cacheKey = `context-${contextHash}`;
    if (this.seedCache.has(cacheKey)) {
      return this.seedCache.get(cacheKey)!;
    }

    // Generate deterministic seed from context hash
    const seed = this.hashToSeed(contextHash);
    
    const result: SeedResult = {
      seed,
      seedSource: 'context-based',
      seedMetadata: {
        generatedAt: new Date(),
        contextHash
      }
    };

    // Cache the result
    this.seedCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Generate time-based rotated seed
   */
  static generateRotatedSeed(intervalHours: number): SeedResult {
    const now = new Date();
    const rotationPeriod = Math.floor(now.getTime() / (1000 * 60 * 60 * intervalHours));
    
    const cacheKey = `rotated-${rotationPeriod}`;
    if (this.seedCache.has(cacheKey)) {
      return this.seedCache.get(cacheKey)!;
    }

    // Generate seed based on rotation period
    const seedString = `rotation-${rotationPeriod}`;
    const seed = this.hashToSeed(crypto.createHash('md5').update(seedString).digest('hex'));
    
    const result: SeedResult = {
      seed,
      seedSource: 'rotated',
      seedMetadata: {
        generatedAt: now,
        rotationPeriod
      }
    };

    this.seedCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Generate random seed
   */
  static generateRandomSeed(): SeedResult {
    const seed = Math.floor(
      Math.random() * (this.DEFAULT_SEED_RANGE.max - this.DEFAULT_SEED_RANGE.min + 1)
    ) + this.DEFAULT_SEED_RANGE.min;

    return {
      seed,
      seedSource: 'generated',
      seedMetadata: {
        generatedAt: new Date()
      }
    };
  }

  /**
   * Create cache key that includes seed values
   * Requirement 3.4: Include seed values in cache keys for proper cache invalidation
   */
  static createCacheKeyWithSeed(baseKey: string, seedResult: SeedResult): string {
    const seedPart = `seed-${seedResult.seed}`;
    const sourcePart = `src-${seedResult.seedSource}`;
    
    // Include context hash if available for additional uniqueness
    const contextPart = seedResult.seedMetadata.contextHash 
      ? `ctx-${seedResult.seedMetadata.contextHash.substring(0, 8)}`
      : '';

    const parts = [baseKey, seedPart, sourcePart, contextPart].filter(Boolean);
    return parts.join('|');
  }

  /**
   * Extract seed information from cache key
   */
  static extractSeedFromCacheKey(cacheKey: string): { seed: number; source: string } | null {
    const parts = cacheKey.split('|');
    
    const seedPart = parts.find(part => part.startsWith('seed-'));
    const sourcePart = parts.find(part => part.startsWith('src-'));
    
    if (!seedPart || !sourcePart) {
      return null;
    }

    const seed = parseInt(seedPart.replace('seed-', ''), 10);
    const source = sourcePart.replace('src-', '');
    
    if (isNaN(seed)) {
      return null;
    }

    return { seed, source };
  }

  /**
   * Validate seed value
   */
  static validateSeed(seed: number): boolean {
    return Number.isInteger(seed) && 
           seed >= this.DEFAULT_SEED_RANGE.min && 
           seed <= this.DEFAULT_SEED_RANGE.max;
  }

  /**
   * Create seed metadata for storage
   * Requirement 3.5: Store seed values alongside cached rationales for debugging
   */
  static createSeedMetadata(seedResult: SeedResult, additionalData?: any): SeedMetadata {
    return {
      seed: seedResult.seed,
      seedSource: seedResult.seedSource,
      generatedAt: seedResult.seedMetadata.generatedAt,
      contextHash: seedResult.seedMetadata.contextHash,
      rotationPeriod: seedResult.seedMetadata.rotationPeriod,
      additionalData
    };
  }

  /**
   * Parse seed metadata from stored data
   */
  static parseSeedMetadata(metadata: any): SeedMetadata | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    return {
      seed: metadata.seed,
      seedSource: metadata.seedSource || 'unknown',
      generatedAt: metadata.generatedAt ? new Date(metadata.generatedAt) : new Date(),
      contextHash: metadata.contextHash,
      rotationPeriod: metadata.rotationPeriod,
      additionalData: metadata.additionalData
    };
  }

  /**
   * Clear seed cache (useful for testing or memory management)
   */
  static clearSeedCache(): void {
    this.seedCache.clear();
  }

  /**
   * Get seed cache statistics
   */
  static getSeedCacheStats(): {
    totalEntries: number;
    contextBasedSeeds: number;
    rotatedSeeds: number;
    cacheHitRate: number;
  } {
    const entries = Array.from(this.seedCache.values());
    
    return {
      totalEntries: entries.length,
      contextBasedSeeds: entries.filter(e => e.seedSource === 'context-based').length,
      rotatedSeeds: entries.filter(e => e.seedSource === 'rotated').length,
      cacheHitRate: 0 // Would need to track hits/misses to calculate
    };
  }

  /**
   * Normalize context object for consistent hashing
   */
  private static normalizeContext(context: any): string {
    if (typeof context === 'string') {
      return context;
    }

    if (typeof context === 'number') {
      return context.toString();
    }

    if (typeof context === 'object' && context !== null) {
      // Sort keys for consistent hashing
      const sortedKeys = Object.keys(context).sort();
      const normalizedObj: any = {};
      
      for (const key of sortedKeys) {
        const value = context[key];
        
        // Handle different value types
        if (typeof value === 'number') {
          // Round numbers to avoid floating point precision issues
          normalizedObj[key] = typeof value === 'number' && value % 1 !== 0 
            ? value.toFixed(6) 
            : value;
        } else if (value === null || value === undefined) {
          normalizedObj[key] = 'null';
        } else {
          normalizedObj[key] = value;
        }
      }
      
      return JSON.stringify(normalizedObj);
    }

    return String(context);
  }

  /**
   * Convert hash to valid seed value
   */
  private static hashToSeed(hash: string): number {
    // Take first 8 characters of hash and convert to integer
    const hashSubstring = hash.substring(0, 8);
    const hashInt = parseInt(hashSubstring, 16);
    
    // Ensure it's within valid seed range
    return (hashInt % (this.DEFAULT_SEED_RANGE.max - this.DEFAULT_SEED_RANGE.min + 1)) + this.DEFAULT_SEED_RANGE.min;
  }

  /**
   * Remove temperature-related parameters from API request
   * Requirement 3.3: Remove temperature: 1.0 from database storage and service configurations
   */
  static cleanupTemperatureParameters(apiRequest: any): any {
    const cleaned = { ...apiRequest };
    
    // Remove temperature parameter
    delete cleaned.temperature;
    
    // Remove any temperature-related configurations
    if (cleaned.parameters) {
      delete cleaned.parameters.temperature;
    }

    return cleaned;
  }

  /**
   * Migrate from temperature-based to seed-based configuration
   */
  static migrateFromTemperature(oldConfig: any): any {
    const newConfig = { ...oldConfig };
    
    // Remove temperature settings
    delete newConfig.temperature;
    delete newConfig.TEMPERATURE;
    
    // Add seed-based settings
    newConfig.seedConfig = {
      useDeterministicSeeds: true,
      contextBasedSeeds: true,
      seedRotationEnabled: false
    };

    return newConfig;
  }
}

export interface SeedMetadata {
  seed: number;
  seedSource: string;
  generatedAt: Date;
  contextHash?: string;
  rotationPeriod?: number;
  additionalData?: any;
}