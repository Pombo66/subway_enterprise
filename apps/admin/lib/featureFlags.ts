/**
 * Feature flag utilities for the admin application
 */

// Feature flag keys
export const FEATURE_FLAGS = {
  SUBMIND: 'NEXT_PUBLIC_FEATURE_SUBMIND',
  EXPANSION_PREDICTOR: 'NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR',
} as const;

// Feature flag checker utility
export class FeatureFlags {
  /**
   * Check if SubMind feature is enabled
   */
  static isSubMindEnabled(): boolean {
    return process.env.NEXT_PUBLIC_FEATURE_SUBMIND === 'true';
  }

  /**
   * Check if Expansion Predictor feature is enabled
   */
  static isExpansionPredictorEnabled(): boolean {
    return process.env.NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR === 'true';
  }

  /**
   * Check if a specific feature flag is enabled
   */
  static isEnabled(flagKey: string): boolean {
    return process.env[flagKey] === 'true';
  }

  /**
   * Get all feature flag states for debugging
   */
  static getAllFlags(): Record<string, boolean> {
    return {
      subMind: FeatureFlags.isSubMindEnabled(),
      expansionPredictor: FeatureFlags.isExpansionPredictorEnabled(),
    };
  }

  /**
   * Log feature flag states (for debugging)
   */
  static logFlags(): void {
    if (process.env.NODE_ENV === 'development') {
      console.info('🚩 Feature Flags:', FeatureFlags.getAllFlags());
    }
  }
}

// Default feature flag values for development
export const DEFAULT_FEATURE_FLAGS = {
  [FEATURE_FLAGS.SUBMIND]: true,
  [FEATURE_FLAGS.EXPANSION_PREDICTOR]: true,
} as const;