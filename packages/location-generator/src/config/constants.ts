import { ScoreWeights, AnchorType } from '../types/core';
import { WeightBounds, AIServiceConfig, AIUsageLevel } from '../types/ai';

/**
 * System constants and default configurations
 */

// Grid and spatial constants
export const GRID_CONSTANTS = {
  DEFAULT_RESOLUTION: 8, // H3 resolution
  REFINEMENT_RESOLUTION: 9,
  CELL_SIZE_KM2: 0.7, // Approximate for resolution 8
  WINDOW_SIZE_KM: 37.5, // Average of 25-50km
  BUFFER_SIZE_KM: 7.5, // Average of 5-10km
} as const;

// Default scoring weights
export const DEFAULT_WEIGHTS: ScoreWeights = {
  population: 0.25,
  gap: 0.35,
  anchor: 0.20,
  performance: 0.20,
  saturation: 0.15,
} as const;

// Weight bounds for AI adjustments (±20%)
export const WEIGHT_BOUNDS: WeightBounds = {
  population: { min: 0.20, max: 0.30 },
  gap: { min: 0.28, max: 0.42 },
  anchor: { min: 0.16, max: 0.24 },
  performance: { min: 0.16, max: 0.24 },
  saturation: { min: 0.12, max: 0.18 },
} as const;

// Anchor deduplication merge radii (meters)
export const MERGE_RADII: Record<AnchorType, number> = {
  [AnchorType.MALL_TENANT]: 120,
  [AnchorType.STATION_SHOPS]: 100,
  [AnchorType.GROCER]: 60,
  [AnchorType.RETAIL]: 60,
} as const;

// Constraint defaults
export const CONSTRAINT_DEFAULTS = {
  MIN_SPACING_M: 800,
  MAX_REGION_SHARE: 0.4,
  MIN_COMPLETENESS: 0.5,
  MIN_ACCEPTANCE_RATE: 0.15,
  MAX_ANCHORS_PER_SITE: 25,
} as const;

// Performance limits
export const PERFORMANCE_LIMITS = {
  MAX_PROCESSING_TIME_MINUTES: 10,
  MAX_MEMORY_GB: 4,
  MAX_CACHE_SIZE_GB: 1,
  MAX_CONCURRENT_REQUESTS: 5,
} as const;

// AI service configuration
export const AI_DEFAULTS: AIServiceConfig = {
  enabled: false,
  level: AIUsageLevel.OFF,
  model: 'gpt-4o-mini',
  temperature: 0,
  maxTokens: 20000,
  cacheTTL: 24, // hours
} as const;

// AI token allocation
export const AI_TOKEN_ALLOCATION = {
  MAX_TOKENS_PER_RUN: 20000,
  RESERVED_FOR_WEIGHTS: 1000,
  RESERVED_FOR_RATIONALES: 19000,
  TOKENS_PER_RATIONALE: 150, // Estimated
} as const;

// Shortlisting parameters
export const SHORTLIST_PARAMS = {
  NATIONAL_TOP_PERCENT: 0.015, // 1.5%
  REGIONAL_TOP_PERCENT: 0.02, // 2%
  MIN_CANDIDATES_MULTIPLIER: 5, // At least 5x target K
} as const;

// Data quality thresholds
export const DATA_QUALITY = {
  ESTIMATED_DATA_WEIGHT_REDUCTION: 0.5, // 50% reduction
  CONFIDENCE_THRESHOLD_HIGH: 0.8,
  CONFIDENCE_THRESHOLD_MEDIUM: 0.6,
  CONFIDENCE_THRESHOLD_LOW: 0.4,
} as const;

// Scenario mode multipliers
export const SCENARIO_MULTIPLIERS = {
  Defend: {
    population: 0.9,
    gap: 1.0,
    anchor: 1.1,
    performance: 1.2,
    saturation: 1.3,
  },
  Balanced: {
    population: 1.0,
    gap: 1.0,
    anchor: 1.0,
    performance: 1.0,
    saturation: 1.0,
  },
  Blitz: {
    population: 1.2,
    gap: 1.1,
    anchor: 0.9,
    performance: 0.8,
    saturation: 0.7,
  },
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  TTL_HOURS: 24,
  MAX_ENTRIES: 1000,
  CLEANUP_INTERVAL_MINUTES: 60,
} as const;