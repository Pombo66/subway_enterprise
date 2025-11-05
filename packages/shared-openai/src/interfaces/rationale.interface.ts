/**
 * Shared interfaces for OpenAI rationale generation
 */

export interface RationaleContext {
  lat: number;
  lng: number;
  populationScore: number;
  proximityScore: number;
  turnoverScore: number;
  urbanDensity: number | null;
  roadDistance: number | null;
  buildingDistance: number | null;
  // Enhanced fields for detailed analysis
  nearestStoreKm?: number | 'unknown';
  tradeAreaPopulation?: number | 'unknown';
  proximityGapPercentile?: number | 'unknown';
  turnoverPercentile?: number | 'unknown';
}

export interface RationaleOutput {
  text: string;
  factors: {
    population: string;
    proximity: string;
    turnover: string;
  };
  confidence: number;
  dataCompleteness: number;
}

export interface RationaleCache {
  contextHash: string;
  lat: number;
  lng: number;
  rationaleText: string;
  factors?: string; // JSON string
  confidence?: number;
  dataCompleteness?: number;
  model: string;
  tokensUsed: number;
  expiresAt: Date;
}

export interface CacheStats {
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  apiCalls: number;
  totalTokensUsed: number;
}

export interface OpenAIRationaleConfig {
  maxTokens: number;
  cacheTtlDays: number;
  reasoningEffort: 'minimal' | 'low' | 'medium' | 'high';
  textVerbosity: 'low' | 'medium' | 'high';
  enableFallback: boolean;
  seedConfig?: {
    useDeterministicSeeds: boolean;
    contextBasedSeeds: boolean;
    seedRotationEnabled: boolean;
    seedRotationInterval: number;
  };
}

export interface IRationaleService {
  generateRationale(context: RationaleContext): Promise<RationaleOutput>;
  getCacheStats(): CacheStats;
  resetCacheStats(): void;
}