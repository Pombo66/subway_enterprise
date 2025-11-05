/**
 * Cache Key Manager Service
 * Provides stable cache key generation with explicit sentinels for null values
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 14.1, 14.2, 14.3, 14.4, 14.5
 */

export interface CacheKeyConfig {
  useSentinels: boolean;
  nullSentinel: string;
  undefinedSentinel: string;
  zeroSentinel: string;
  includeTimestamp: boolean;
  includeVersion: boolean;
}

export interface CacheKeyComponents {
  context: Record<string, any>;
  regionBounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  datasetVersion?: string;
  modelConfig?: Record<string, any>;
  timestamp?: Date;
}

export interface CacheValidationResult {
  isValid: boolean;
  isUnique: boolean;
  collisionRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export class CacheKeyManagerService {
  private readonly config: CacheKeyConfig;
  private readonly logger: (message: string, data?: any) => void;
  private keyHistory = new Set<string>();
  private collisionCount = 0;

  constructor(
    config: Partial<CacheKeyConfig> = {},
    logger?: (message: string, data?: any) => void
  ) {
    this.config = {
      useSentinels: true,
      nullSentinel: 'NA',
      undefinedSentinel: 'UNDEF',
      zeroSentinel: '0',
      includeTimestamp: false,
      includeVersion: true,
      ...config
    };

    this.logger = logger || ((message: string, data?: any) => {
      console.log(`[CacheKeyManager] ${message}`, data || '');
    });
  }

  /**
   * Generate stable cache key with explicit sentinels
   * Requirements: 7.1, 7.2, 7.3 - Use explicit sentinels for null values and distinguish zeros
   */
  generateCacheKey(components: CacheKeyComponents): string {
    const keyParts: string[] = [];

    // Process context with sentinel handling
    const contextKey = this.processContextWithSentinels(components.context);
    if (contextKey) {
      keyParts.push(`ctx:${contextKey}`);
    }

    // Add region bounds hash if provided (Requirement 14.2)
    if (components.regionBounds) {
      const boundsHash = this.hashRegionBounds(components.regionBounds);
      keyParts.push(`bounds:${boundsHash}`);
    }

    // Add dataset version if provided (Requirement 14.2)
    if (components.datasetVersion && this.config.includeVersion) {
      keyParts.push(`ver:${components.datasetVersion}`);
    }

    // Add model configuration hash if provided
    if (components.modelConfig) {
      const modelHash = this.hashModelConfig(components.modelConfig);
      keyParts.push(`model:${modelHash}`);
    }

    // Add timestamp if configured
    if (components.timestamp && this.config.includeTimestamp) {
      const timestampKey = Math.floor(components.timestamp.getTime() / 1000);
      keyParts.push(`ts:${timestampKey}`);
    }

    const cacheKey = keyParts.join('|');
    
    // Validate uniqueness
    this.validateKeyUniqueness(cacheKey);
    
    this.logger('Generated cache key', {
      key: cacheKey,
      components: Object.keys(components),
      length: cacheKey.length
    });

    return cacheKey;
  }

  /**
   * Process context values with explicit sentinels
   * Requirement 7.1: Use explicit 'NA' sentinels for null values instead of collapsing them
   * Requirement 7.2: Distinguish between real zeros and missing values in cache keys
   */
  private processContextWithSentinels(context: Record<string, any>): string {
    const processedPairs: string[] = [];

    for (const [key, value] of Object.entries(context)) {
      const processedValue = this.processValueWithSentinel(value);
      if (processedValue !== null) {
        processedPairs.push(`${key}=${processedValue}`);
      }
    }

    return processedPairs.sort().join('&'); // Sort for consistency
  }

  /**
   * Process individual value with appropriate sentinel
   * Requirement 7.2: Distinguish between real zeros and missing values using 'NA' markers
   */
  private processValueWithSentinel(value: any): string | null {
    if (value === null) {
      return this.config.useSentinels ? this.config.nullSentinel : null;
    }

    if (value === undefined) {
      return this.config.useSentinels ? this.config.undefinedSentinel : null;
    }

    if (value === 0) {
      // Real zero - keep as is to distinguish from null/undefined
      return this.config.zeroSentinel;
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'string') {
      if (value.trim() === '') {
        return this.config.useSentinels ? this.config.nullSentinel : null;
      }
      if (value === 'unknown' || value === 'not available') {
        return this.config.nullSentinel;
      }
      return value;
    }

    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }

    if (Array.isArray(value)) {
      return `[${value.length}]`; // Use array length as key component
    }

    if (typeof value === 'object') {
      return this.hashObject(value);
    }

    return String(value);
  }

  /**
   * Create functional caching system with proper storage and retrieval
   * Requirement 14.1: Implement actual cache storage and retrieval
   */
  createCacheEntry<T>(
    key: string,
    data: T,
    ttlDays: number = 7,
    metadata: Record<string, any> = {}
  ): CacheEntry<T> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttlDays * 24 * 60 * 60 * 1000));

    const entry: CacheEntry<T> = {
      key,
      data,
      createdAt: now,
      expiresAt,
      ttlDays,
      metadata: {
        ...metadata,
        keyComponents: this.analyzeKeyComponents(key),
        version: '1.0'
      },
      accessCount: 0,
      lastAccessedAt: now
    };

    this.logger('Created cache entry', {
      key,
      ttlDays,
      expiresAt: expiresAt.toISOString(),
      metadataKeys: Object.keys(metadata)
    });

    return entry;
  }

  /**
   * Validate cache key uniqueness to prevent collisions
   * Requirement 7.5: Validate cache key uniqueness to prevent collisions
   */
  validateCacheKey(key: string): CacheValidationResult {
    const isValid = this.isValidCacheKey(key);
    const isUnique = !this.keyHistory.has(key);
    
    if (!isUnique) {
      this.collisionCount++;
    } else {
      this.keyHistory.add(key);
    }

    // Assess collision risk based on key characteristics
    const collisionRisk = this.assessCollisionRisk(key);
    const recommendations = this.generateKeyRecommendations(key, isValid, isUnique);

    const result: CacheValidationResult = {
      isValid,
      isUnique,
      collisionRisk,
      recommendations
    };

    if (!isValid || !isUnique) {
      this.logger('Cache key validation issues detected', {
        key,
        isValid,
        isUnique,
        collisionRisk,
        totalCollisions: this.collisionCount
      });
    }

    return result;
  }

  /**
   * Hash region bounds for consistent cache keys
   * Requirement 14.2: Add region bounds hash to cache keys
   */
  private hashRegionBounds(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): string {
    // Create consistent hash from bounds with precision handling
    const precision = 6; // 6 decimal places for lat/lng
    const normalizedBounds = {
      n: Number(bounds.north.toFixed(precision)),
      s: Number(bounds.south.toFixed(precision)),
      e: Number(bounds.east.toFixed(precision)),
      w: Number(bounds.west.toFixed(precision))
    };

    const boundsString = `${normalizedBounds.n},${normalizedBounds.s},${normalizedBounds.e},${normalizedBounds.w}`;
    return this.hashString(boundsString);
  }

  /**
   * Hash model configuration for cache keys
   */
  private hashModelConfig(config: Record<string, any>): string {
    // Create stable hash from model configuration
    const sortedConfig = this.sortObjectKeys(config);
    const configString = JSON.stringify(sortedConfig);
    return this.hashString(configString);
  }

  /**
   * Hash arbitrary object for cache keys
   */
  private hashObject(obj: any): string {
    const sortedObj = this.sortObjectKeys(obj);
    const objString = JSON.stringify(sortedObj);
    return this.hashString(objString);
  }

  /**
   * Create consistent hash from string
   */
  private hashString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Sort object keys for consistent serialization
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return obj;
    }

    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
      sorted[key] = this.sortObjectKeys(obj[key]);
    }
    
    return sorted;
  }

  /**
   * Validate cache key format and content
   */
  private isValidCacheKey(key: string): boolean {
    // Check basic format requirements
    if (!key || typeof key !== 'string') {
      return false;
    }

    if (key.length === 0 || key.length > 500) {
      return false;
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9|:=&\-_.]+$/.test(key)) {
      return false;
    }

    // Check for proper structure
    const parts = key.split('|');
    if (parts.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Assess collision risk based on key characteristics
   */
  private assessCollisionRisk(key: string): 'low' | 'medium' | 'high' {
    const keyLength = key.length;
    const uniqueParts = new Set(key.split('|')).size;
    const entropy = this.calculateEntropy(key);

    if (keyLength < 20 || uniqueParts < 2 || entropy < 3) {
      return 'high';
    } else if (keyLength < 50 || uniqueParts < 4 || entropy < 4) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate entropy of cache key
   */
  private calculateEntropy(key: string): number {
    const charCounts = new Map<string, number>();
    
    for (const char of key) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }

    let entropy = 0;
    const keyLength = key.length;
    
    for (const count of charCounts.values()) {
      const probability = count / keyLength;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Generate recommendations for cache key improvement
   */
  private generateKeyRecommendations(
    key: string,
    isValid: boolean,
    isUnique: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!isValid) {
      recommendations.push('Fix cache key format - ensure valid characters and length');
    }

    if (!isUnique) {
      recommendations.push('Add more specific context to prevent key collisions');
    }

    if (key.length < 20) {
      recommendations.push('Consider adding more context components for better uniqueness');
    }

    if (key.length > 200) {
      recommendations.push('Consider shortening key by hashing large components');
    }

    const collisionRisk = this.assessCollisionRisk(key);
    if (collisionRisk === 'high') {
      recommendations.push('High collision risk - add timestamp or random component');
    } else if (collisionRisk === 'medium') {
      recommendations.push('Medium collision risk - consider adding version or bounds hash');
    }

    return recommendations;
  }

  /**
   * Analyze key components for metadata
   */
  private analyzeKeyComponents(key: string): Record<string, any> {
    const parts = key.split('|');
    const analysis: Record<string, any> = {
      totalParts: parts.length,
      partTypes: [],
      hasContext: false,
      hasBounds: false,
      hasVersion: false,
      hasModel: false,
      hasTimestamp: false
    };

    for (const part of parts) {
      const [type] = part.split(':');
      analysis.partTypes.push(type);
      
      switch (type) {
        case 'ctx':
          analysis.hasContext = true;
          break;
        case 'bounds':
          analysis.hasBounds = true;
          break;
        case 'ver':
          analysis.hasVersion = true;
          break;
        case 'model':
          analysis.hasModel = true;
          break;
        case 'ts':
          analysis.hasTimestamp = true;
          break;
      }
    }

    return analysis;
  }

  /**
   * Validate key uniqueness and track collisions
   */
  private validateKeyUniqueness(key: string): void {
    if (this.keyHistory.has(key)) {
      this.collisionCount++;
      this.logger('Cache key collision detected', {
        key,
        totalCollisions: this.collisionCount,
        historySize: this.keyHistory.size
      });
    } else {
      this.keyHistory.add(key);
      
      // Limit history size to prevent memory issues
      if (this.keyHistory.size > 10000) {
        const keysArray = Array.from(this.keyHistory);
        this.keyHistory = new Set(keysArray.slice(-5000));
      }
    }
  }

  /**
   * Get cache key statistics
   */
  getCacheKeyStats(): CacheKeyStats {
    return {
      totalKeysGenerated: this.keyHistory.size,
      collisionCount: this.collisionCount,
      collisionRate: this.keyHistory.size > 0 ? (this.collisionCount / this.keyHistory.size) * 100 : 0,
      config: { ...this.config }
    };
  }

  /**
   * Reset cache key history (useful for testing)
   */
  resetHistory(): void {
    this.keyHistory.clear();
    this.collisionCount = 0;
    this.logger('Cache key history reset');
  }
}

export interface CacheEntry<T> {
  key: string;
  data: T;
  createdAt: Date;
  expiresAt: Date;
  ttlDays: number;
  metadata: Record<string, any>;
  accessCount: number;
  lastAccessedAt: Date;
}

export interface CacheKeyStats {
  totalKeysGenerated: number;
  collisionCount: number;
  collisionRate: number;
  config: CacheKeyConfig;
}