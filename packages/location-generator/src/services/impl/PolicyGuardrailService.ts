import { ScoreWeights } from '../../types/core';
import { GenerationConfig } from '../../types/config';

/**
 * Policy guardrails to enforce absolute bounds and prevent AI drift
 */
export interface PolicyBounds {
  weights: {
    population: { min: number; max: number };
    gap: { min: number; max: number };
    anchor: { min: number; max: number };
    performance: { min: number; max: number };
    saturation: { min: number; max: number };
  };
  constraints: {
    minSpacing: { min: number; max: number }; // km
    maxSites: number;
    maxRegionalShare: { min: number; max: number };
  };
  aiLimits: {
    maxWeightChange: number; // ±20%
    maxConstraintChange: number; // ±30%
  };
}

export interface GuardrailViolation {
  type: 'weight' | 'constraint' | 'ai_drift';
  field: string;
  value: number;
  bound: { min: number; max: number };
  correctedValue: number;
}

export class PolicyGuardrailService {
  private readonly defaultBounds: PolicyBounds = {
    weights: {
      population: { min: 0.1, max: 0.4 },
      gap: { min: 0.2, max: 0.5 },
      anchor: { min: 0.05, max: 0.3 },
      performance: { min: 0.05, max: 0.3 },
      saturation: { min: 0.05, max: 0.25 }
    },
    constraints: {
      minSpacing: { min: 0.5, max: 6.0 }, // 500m to 6km
      maxSites: 100,
      maxRegionalShare: { min: 0.2, max: 0.6 } // 20% to 60%
    },
    aiLimits: {
      maxWeightChange: 0.2, // ±20%
      maxConstraintChange: 0.3 // ±30%
    }
  };

  constructor(private customBounds?: Partial<PolicyBounds>) {}

  /**
   * Enforce guardrails on scenario weights
   */
  enforceWeightGuardrails(
    weights: ScoreWeights,
    baselineWeights?: ScoreWeights
  ): {
    correctedWeights: ScoreWeights;
    violations: GuardrailViolation[];
  } {
    const bounds = { ...this.defaultBounds, ...this.customBounds };
    const violations: GuardrailViolation[] = [];
    const corrected: ScoreWeights = { ...weights };

    // Enforce absolute bounds
    for (const [key, value] of Object.entries(weights)) {
      if (key in bounds.weights && typeof value === 'number') {
        const bound = bounds.weights[key as keyof typeof bounds.weights];
        if (value < bound.min || value > bound.max) {
          const correctedValue = Math.max(bound.min, Math.min(bound.max, value));
          violations.push({
            type: 'weight',
            field: key,
            value,
            bound,
            correctedValue
          });
          (corrected as any)[key] = correctedValue;
        }
      }
    }

    // Enforce AI drift limits if baseline provided
    if (baselineWeights) {
      for (const [key, value] of Object.entries(weights)) {
        if (key in baselineWeights && typeof value === 'number') {
          const baseValue = (baselineWeights as any)[key] as number;
          const maxChange = baseValue * bounds.aiLimits.maxWeightChange;
          const minAllowed = baseValue - maxChange;
          const maxAllowed = baseValue + maxChange;
          
          if (value < minAllowed || value > maxAllowed) {
            const correctedValue = Math.max(minAllowed, Math.min(maxAllowed, value));
            violations.push({
              type: 'ai_drift',
              field: key,
              value,
              bound: { min: minAllowed, max: maxAllowed },
              correctedValue
            });
            (corrected as any)[key] = correctedValue;
          }
        }
      }
    }

    // Ensure weights sum to 1.0
    const sum = Object.values(corrected).reduce((a, b) => (a as number) + (b as number), 0) as number;
    if (Math.abs(sum - 1.0) > 0.001) {
      // Normalize proportionally
      for (const key of Object.keys(corrected)) {
        (corrected as any)[key] = (corrected as any)[key] / sum;
      }
    }

    return { correctedWeights: corrected, violations };
  }

  /**
   * Enforce guardrails on generation config
   */
  enforceConfigGuardrails(
    config: GenerationConfig,
    baselineConfig?: GenerationConfig
  ): {
    correctedConfig: GenerationConfig;
    violations: GuardrailViolation[];
  } {
    const bounds = { ...this.defaultBounds, ...this.customBounds };
    const violations: GuardrailViolation[] = [];
    const corrected: GenerationConfig = { ...config };

    // Enforce spacing bounds (convert from meters to km)
    if (config.minSpacingM) {
      const spacing = config.minSpacingM / 1000; // Convert to km
      const bound = bounds.constraints.minSpacing;
      
      if (spacing < bound.min || spacing > bound.max) {
        const correctedValue = Math.max(bound.min, Math.min(bound.max, spacing));
        violations.push({
          type: 'constraint',
          field: 'minSpacing',
          value: spacing,
          bound,
          correctedValue
        });
        corrected.minSpacingM = correctedValue * 1000; // Convert back to meters
      }
    }

    // Enforce max sites
    if (config.targetK && config.targetK > bounds.constraints.maxSites) {
      violations.push({
        type: 'constraint',
        field: 'targetK',
        value: config.targetK,
        bound: { min: 1, max: bounds.constraints.maxSites },
        correctedValue: bounds.constraints.maxSites
      });
      corrected.targetK = bounds.constraints.maxSites;
    }

    // Note: maxRegionalShare is in CountryConfig, not GenerationConfig
    // This would need to be handled separately if needed

    // Enforce AI drift limits if baseline provided
    if (baselineConfig) {
      this.enforceConfigDriftLimits(corrected, baselineConfig, bounds, violations);
    }

    return { correctedConfig: corrected, violations };
  }

  /**
   * Validate if configuration is within guardrails
   */
  validateConfiguration(
    weights: ScoreWeights,
    config: GenerationConfig,
    baseline?: { weights: ScoreWeights; config: GenerationConfig }
  ): {
    isValid: boolean;
    violations: GuardrailViolation[];
    recommendations: string[];
  } {
    const weightResult = this.enforceWeightGuardrails(
      weights, 
      baseline?.weights
    );
    
    const configResult = this.enforceConfigGuardrails(
      config,
      baseline?.config
    );

    const allViolations = [...weightResult.violations, ...configResult.violations];
    const recommendations = this.generateRecommendations(allViolations);

    return {
      isValid: allViolations.length === 0,
      violations: allViolations,
      recommendations
    };
  }

  /**
   * Get current policy bounds
   */
  getPolicyBounds(): PolicyBounds {
    return { ...this.defaultBounds, ...this.customBounds };
  }

  /**
   * Generate human-readable recommendations
   */
  private generateRecommendations(violations: GuardrailViolation[]): string[] {
    const recommendations: string[] = [];
    
    const weightViolations = violations.filter(v => v.type === 'weight');
    const constraintViolations = violations.filter(v => v.type === 'constraint');
    const driftViolations = violations.filter(v => v.type === 'ai_drift');

    if (weightViolations.length > 0) {
      recommendations.push(`${weightViolations.length} weight(s) exceeded bounds - review scoring strategy`);
    }

    if (constraintViolations.length > 0) {
      recommendations.push(`${constraintViolations.length} constraint(s) outside limits - adjust operational parameters`);
    }

    if (driftViolations.length > 0) {
      recommendations.push(`AI policy drift detected in ${driftViolations.length} parameter(s) - validate AI suggestions`);
    }

    if (violations.length === 0) {
      recommendations.push('All parameters within policy guardrails');
    }

    return recommendations;
  }

  /**
   * Enforce drift limits for config parameters
   */
  private enforceConfigDriftLimits(
    config: GenerationConfig,
    baseline: GenerationConfig,
    bounds: PolicyBounds,
    violations: GuardrailViolation[]
  ): void {
    // Check spacing drift (convert from meters to km)
    if (config.minSpacingM && baseline.minSpacingM) {
      const current = config.minSpacingM / 1000; // Convert to km
      const base = baseline.minSpacingM / 1000; // Convert to km
      const maxChange = base * bounds.aiLimits.maxConstraintChange;
      const minAllowed = base - maxChange;
      const maxAllowed = base + maxChange;
      
      if (current < minAllowed || current > maxAllowed) {
        const correctedValue = Math.max(minAllowed, Math.min(maxAllowed, current));
        violations.push({
          type: 'ai_drift',
          field: 'minSpacing',
          value: current,
          bound: { min: minAllowed, max: maxAllowed },
          correctedValue
        });
        config.minSpacingM = correctedValue * 1000; // Convert back to meters
      }
    }

    // Note: Regional share constraints would be handled at the country level
  }
}