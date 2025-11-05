/**
 * Configuration Cleanup Service
 * Removes deprecated temperature configurations and optimizes reasoning controls
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 15.1, 15.2, 15.3, 15.4, 15.5
 */

export interface LegacyConfig {
  temperature?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  [key: string]: any;
}

export interface OptimizedConfig {
  reasoning: {
    effort: 'low' | 'medium' | 'high';
  };
  text: {
    verbosity: 'low' | 'medium' | 'high';
  };
  max_output_tokens: number;
  seed?: number;
  [key: string]: any;
}

export interface ConfigurationMigration {
  originalConfig: LegacyConfig;
  migratedConfig: OptimizedConfig;
  removedParameters: string[];
  addedParameters: string[];
  warnings: string[];
  recommendations: string[];
}

export interface ReasoningQualityConfig {
  lowEffortThreshold: number; // Quality threshold for low effort
  mediumEffortThreshold: number; // Quality threshold for medium effort
  escalationEnabled: boolean;
  qualityMetrics: {
    minConfidence: number;
    minCompleteness: number;
    maxRetries: number;
  };
}

export class ConfigurationCleanupService {
  private readonly logger: (message: string, data?: any) => void;
  private readonly qualityConfig: ReasoningQualityConfig;

  constructor(
    qualityConfig: Partial<ReasoningQualityConfig> = {},
    logger?: (message: string, data?: any) => void
  ) {
    this.qualityConfig = {
      lowEffortThreshold: 0.7, // 70% quality threshold for low effort
      mediumEffortThreshold: 0.85, // 85% quality threshold for medium effort
      escalationEnabled: true,
      qualityMetrics: {
        minConfidence: 0.6,
        minCompleteness: 0.8,
        maxRetries: 2
      },
      ...qualityConfig
    };

    this.logger = logger || ((message: string, data?: any) => {
      console.log(`[ConfigurationCleanup] ${message}`, data || '');
    });
  }

  /**
   * Remove deprecated temperature configurations and migrate to reasoning controls
   * Requirements: 15.1, 15.2, 15.3, 15.5
   */
  migrateConfiguration(legacyConfig: LegacyConfig, operationType: 'rationale' | 'market_analysis' = 'rationale'): ConfigurationMigration {
    const migration: ConfigurationMigration = {
      originalConfig: { ...legacyConfig },
      migratedConfig: {} as OptimizedConfig,
      removedParameters: [],
      addedParameters: [],
      warnings: [],
      recommendations: []
    };

    // Start with base configuration
    const migratedConfig: OptimizedConfig = {
      reasoning: { effort: 'low' },
      text: { verbosity: 'low' },
      max_output_tokens: operationType === 'rationale' ? 200 : 3500
    };

    // Remove deprecated temperature parameter (Requirement 15.1)
    if ('temperature' in legacyConfig) {
      migration.removedParameters.push('temperature');
      migration.warnings.push('temperature parameter is deprecated for GPT-5 models');
      
      // Convert temperature to reasoning effort (legacy mapping)
      const temp = legacyConfig.temperature!;
      if (temp <= 0.3) {
        migratedConfig.reasoning.effort = 'low';
        migratedConfig.text.verbosity = 'low';
      } else if (temp <= 0.7) {
        migratedConfig.reasoning.effort = 'medium';
        migratedConfig.text.verbosity = 'medium';
      } else {
        migratedConfig.reasoning.effort = 'high';
        migratedConfig.text.verbosity = 'high';
      }
      
      migration.recommendations.push(`Converted temperature ${temp} to reasoning.effort: ${migratedConfig.reasoning.effort}`);
    }

    // Remove other deprecated parameters (Requirement 15.2)
    const deprecatedParams = ['top_p', 'presence_penalty', 'frequency_penalty'];
    for (const param of deprecatedParams) {
      if (param in legacyConfig) {
        migration.removedParameters.push(param);
        migration.warnings.push(`${param} parameter is not supported in GPT-5 reasoning models`);
      }
    }

    // Set optimal reasoning controls based on operation type (Requirement 9.1, 9.2)
    if (operationType === 'rationale') {
      // Requirement 9.1: Use reasoning.effort: 'low' for rationale generation
      migratedConfig.reasoning.effort = 'low';
      migratedConfig.text.verbosity = 'low'; // Requirement 9.2: Use text.verbosity: 'low' for concise rationale outputs
      migration.addedParameters.push('reasoning.effort', 'text.verbosity');
    } else if (operationType === 'market_analysis') {
      // Use medium effort for market analysis for balanced performance
      migratedConfig.reasoning.effort = 'medium';
      migratedConfig.text.verbosity = 'medium';
      migration.addedParameters.push('reasoning.effort', 'text.verbosity');
    }

    // Copy over valid parameters
    for (const [key, value] of Object.entries(legacyConfig)) {
      if (!deprecatedParams.includes(key) && key !== 'temperature') {
        (migratedConfig as any)[key] = value;
      }
    }

    migration.migratedConfig = migratedConfig;

    // Add recommendations (Requirement 15.5)
    migration.recommendations.push(
      'Use reasoning.effort and text.verbosity as primary controls for GPT-5',
      'Temperature is advisory only for GPT-5 models and should not be relied upon',
      'Consider using seed parameter for deterministic outputs'
    );

    this.logger('Configuration migration completed', {
      operationType,
      removedParams: migration.removedParameters.length,
      addedParams: migration.addedParameters.length,
      warningCount: migration.warnings.length
    });

    return migration;
  }

  /**
   * Optimize reasoning controls for quality and performance
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
   */
  optimizeReasoningControls(
    baseConfig: OptimizedConfig,
    qualityRequirements?: {
      minConfidence?: number;
      minCompleteness?: number;
      prioritizeSpeed?: boolean;
    }
  ): OptimizedConfig {
    const optimized = { ...baseConfig };
    const requirements = {
      minConfidence: 0.7,
      minCompleteness: 0.8,
      prioritizeSpeed: true,
      ...qualityRequirements
    };

    // Requirement 9.1, 9.2: Optimize for rationale generation
    if (optimized.max_output_tokens <= 250) { // Rationale generation
      optimized.reasoning.effort = 'low'; // Requirement 9.1
      optimized.text.verbosity = 'low'; // Requirement 9.2
      
      this.logger('Optimized for rationale generation', {
        reasoning: optimized.reasoning.effort,
        verbosity: optimized.text.verbosity,
        tokens: optimized.max_output_tokens
      });
    } else { // Market analysis or longer content
      if (requirements.prioritizeSpeed) {
        optimized.reasoning.effort = 'medium';
        optimized.text.verbosity = 'medium';
      } else {
        optimized.reasoning.effort = 'high';
        optimized.text.verbosity = 'high';
      }
    }

    return optimized;
  }

  /**
   * Validate reasoning quality and escalate if needed
   * Requirements: 9.3, 9.4, 9.5
   */
  validateAndEscalateQuality(
    result: {
      confidence?: number;
      dataCompleteness?: number;
      text?: string;
    },
    currentConfig: OptimizedConfig,
    attempt: number = 1
  ): {
    isAcceptable: boolean;
    shouldEscalate: boolean;
    recommendedConfig?: OptimizedConfig;
    qualityScore: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let qualityScore = 0;

    // Calculate quality score
    const confidence = result.confidence || 0;
    const completeness = result.dataCompleteness || 0;
    const textLength = result.text?.length || 0;

    // Weighted quality calculation
    qualityScore = (confidence * 0.4) + (completeness * 0.4) + (Math.min(textLength / 100, 1) * 0.2);

    // Check against quality thresholds
    if (confidence < this.qualityConfig.qualityMetrics.minConfidence) {
      issues.push(`Low confidence: ${confidence.toFixed(2)} < ${this.qualityConfig.qualityMetrics.minConfidence}`);
    }

    if (completeness < this.qualityConfig.qualityMetrics.minCompleteness) {
      issues.push(`Low completeness: ${completeness.toFixed(2)} < ${this.qualityConfig.qualityMetrics.minCompleteness}`);
    }

    if (textLength < 20) {
      issues.push('Response too short for meaningful analysis');
    }

    // Determine if quality is acceptable
    const currentEffort = currentConfig.reasoning.effort;
    let isAcceptable = false;
    let shouldEscalate = false;

    if (currentEffort === 'low') {
      isAcceptable = qualityScore >= this.qualityConfig.lowEffortThreshold;
      shouldEscalate = !isAcceptable && this.qualityConfig.escalationEnabled && attempt <= this.qualityConfig.qualityMetrics.maxRetries;
    } else if (currentEffort === 'medium') {
      isAcceptable = qualityScore >= this.qualityConfig.mediumEffortThreshold;
      shouldEscalate = !isAcceptable && this.qualityConfig.escalationEnabled && attempt <= this.qualityConfig.qualityMetrics.maxRetries;
    } else { // high effort
      isAcceptable = qualityScore >= 0.9; // High standard for high effort
      shouldEscalate = false; // No escalation from high effort
    }

    // Create escalated configuration if needed (Requirement 9.4)
    let recommendedConfig: OptimizedConfig | undefined;
    if (shouldEscalate) {
      recommendedConfig = { ...currentConfig };
      
      if (currentEffort === 'low') {
        recommendedConfig.reasoning.effort = 'medium';
        recommendedConfig.text.verbosity = 'medium';
      } else if (currentEffort === 'medium') {
        recommendedConfig.reasoning.effort = 'high';
        recommendedConfig.text.verbosity = 'high';
        // Increase token limit for high effort
        recommendedConfig.max_output_tokens = Math.min(recommendedConfig.max_output_tokens * 1.5, 5000);
      }
    }

    const validation = {
      isAcceptable,
      shouldEscalate,
      recommendedConfig,
      qualityScore,
      issues
    };

    this.logger('Quality validation completed', {
      qualityScore: qualityScore.toFixed(3),
      isAcceptable,
      shouldEscalate,
      currentEffort,
      attempt,
      issueCount: issues.length
    });

    return validation;
  }

  /**
   * Clean up configuration interfaces to remove deprecated parameters
   * Requirement 15.3: Clean up configuration interfaces to remove deprecated parameters
   */
  cleanupConfigurationInterface(configInterface: any): {
    cleanedInterface: any;
    removedFields: string[];
    recommendations: string[];
  } {
    const cleanedInterface = { ...configInterface };
    const removedFields: string[] = [];
    const recommendations: string[] = [];

    // Remove deprecated temperature-related fields
    const deprecatedFields = [
      'temperature',
      'top_p',
      'presence_penalty',
      'frequency_penalty',
      'best_of',
      'logit_bias'
    ];

    for (const field of deprecatedFields) {
      if (field in cleanedInterface) {
        delete cleanedInterface[field];
        removedFields.push(field);
      }
    }

    // Add modern reasoning controls if not present
    if (!cleanedInterface.reasoning) {
      cleanedInterface.reasoning = {
        effort: { type: 'string', enum: ['low', 'medium', 'high'], default: 'low' }
      };
      recommendations.push('Added reasoning.effort control for GPT-5 compatibility');
    }

    if (!cleanedInterface.text) {
      cleanedInterface.text = {
        verbosity: { type: 'string', enum: ['low', 'medium', 'high'], default: 'low' }
      };
      recommendations.push('Added text.verbosity control for output optimization');
    }

    // Add seed parameter for deterministic outputs
    if (!cleanedInterface.seed) {
      cleanedInterface.seed = {
        type: 'number',
        minimum: 0,
        maximum: 2147483647,
        description: 'Seed for deterministic outputs'
      };
      recommendations.push('Added seed parameter for deterministic output control');
    }

    this.logger('Configuration interface cleaned', {
      removedFields: removedFields.length,
      recommendations: recommendations.length
    });

    return {
      cleanedInterface,
      removedFields,
      recommendations
    };
  }

  /**
   * Generate configuration migration report
   */
  generateMigrationReport(migrations: ConfigurationMigration[]): {
    summary: {
      totalConfigurations: number;
      successfulMigrations: number;
      totalWarnings: number;
      mostCommonIssues: Array<{ issue: string; count: number }>;
    };
    recommendations: string[];
    migrationSteps: string[];
  } {
    const summary = {
      totalConfigurations: migrations.length,
      successfulMigrations: migrations.filter(m => m.removedParameters.length > 0 || m.addedParameters.length > 0).length,
      totalWarnings: migrations.reduce((sum, m) => sum + m.warnings.length, 0),
      mostCommonIssues: [] as Array<{ issue: string; count: number }>
    };

    // Analyze common issues
    const issueCount = new Map<string, number>();
    for (const migration of migrations) {
      for (const warning of migration.warnings) {
        issueCount.set(warning, (issueCount.get(warning) || 0) + 1);
      }
    }

    summary.mostCommonIssues = Array.from(issueCount.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Generate recommendations
    const recommendations = [
      'Update all service configurations to use reasoning.effort and text.verbosity',
      'Remove temperature constants from service files',
      'Implement seed-based deterministic controls where needed',
      'Test quality thresholds with new reasoning controls',
      'Monitor performance improvements after migration'
    ];

    // Generate migration steps
    const migrationSteps = [
      '1. Audit all configuration files for deprecated parameters',
      '2. Replace temperature with appropriate reasoning.effort settings',
      '3. Add text.verbosity controls for output optimization',
      '4. Implement seed parameters for deterministic outputs',
      '5. Update configuration interfaces and type definitions',
      '6. Test quality and performance with new configurations',
      '7. Remove deprecated constants and helper functions'
    ];

    this.logger('Migration report generated', {
      totalConfigurations: summary.totalConfigurations,
      successfulMigrations: summary.successfulMigrations,
      totalWarnings: summary.totalWarnings
    });

    return {
      summary,
      recommendations,
      migrationSteps
    };
  }

  /**
   * Get quality configuration statistics
   */
  getQualityStats(): {
    config: ReasoningQualityConfig;
    thresholds: {
      low: number;
      medium: number;
      high: number;
    };
  } {
    return {
      config: { ...this.qualityConfig },
      thresholds: {
        low: this.qualityConfig.lowEffortThreshold,
        medium: this.qualityConfig.mediumEffortThreshold,
        high: 0.9
      }
    };
  }
}