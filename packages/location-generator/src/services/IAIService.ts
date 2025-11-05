import { 
  ScoreWeights, 
  LocationCandidate 
} from '../types/core';
import { 
  PolicyAdjustmentRequest, 
  RationaleRequest, 
  RationaleResponse, 
  PortfolioNarrativeRequest, 
  PortfolioNarrativeResponse,
  LearningLoopSuggestion,
  AIBudget,
  CacheKey,
  CachedResult
} from '../types/ai';

/**
 * Interface for AI-powered services with cost controls
 */
export interface IAIService {
  /**
   * Adjust weights based on scenario mode
   */
  adjustWeights(request: PolicyAdjustmentRequest): Promise<ScoreWeights>;

  /**
   * Generate rationales for finalist candidates
   */
  generateRationales(requests: RationaleRequest[]): Promise<RationaleResponse[]>;

  /**
   * Generate portfolio narrative and analysis
   */
  generatePortfolioNarrative(request: PortfolioNarrativeRequest): Promise<PortfolioNarrativeResponse>;

  /**
   * Generate learning loop suggestions (offline)
   */
  generateLearningLoopSuggestions(
    historicalData: any[], 
    currentWeights: ScoreWeights
  ): Promise<LearningLoopSuggestion>;

  /**
   * Check current token budget and usage
   */
  getBudgetStatus(): AIBudget;

  /**
   * Cache management
   */
  getCachedResult(key: CacheKey): Promise<CachedResult | null>;
  setCachedResult(key: CacheKey, result: CachedResult): Promise<void>;
  clearExpiredCache(): Promise<void>;

  /**
   * Generate cache key for request
   */
  generateCacheKey(
    countryCode: string, 
    features: any, 
    mode: string, 
    version: string
  ): CacheKey;

  /**
   * Validate AI service availability and configuration
   */
  validateService(): Promise<boolean>;

  /**
   * Get fallback weights for scenario mode (deterministic)
   */
  getFallbackWeights(mode: 'Defend' | 'Balanced' | 'Blitz', baseWeights: ScoreWeights): ScoreWeights;

  /**
   * Generate template rationale (deterministic fallback)
   */
  generateTemplateRationale(candidate: LocationCandidate, mode: string): string;
}