import { Injectable, Logger } from '@nestjs/common';
import { EnhancedIntelligenceConfigService } from './enhanced-intelligence.config';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  category: 'intelligence' | 'performance' | 'monitoring' | 'experimental';
  rolloutPercentage?: number;
  conditions?: FeatureFlagCondition[];
  metadata?: Record<string, any>;
}

export interface FeatureFlagCondition {
  type: 'user_id' | 'region' | 'environment' | 'time_window' | 'custom';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

export interface FeatureFlagEvaluation {
  flagName: string;
  enabled: boolean;
  reason: string;
  evaluatedAt: Date;
  context?: Record<string, any>;
}

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private flags: Map<string, FeatureFlag> = new Map();
  private evaluationCache: Map<string, FeatureFlagEvaluation> = new Map();
  private readonly cacheTimeoutMs = 60000; // 1 minute

  constructor(
    private readonly configService: EnhancedIntelligenceConfigService
  ) {
    this.initializeFlags();
  }

  private initializeFlags(): void {
    const config = this.configService.getConfig();
    
    // Initialize feature flags from configuration
    const flags: FeatureFlag[] = [
      {
        name: 'demographic_inference',
        enabled: config.features.enableDemographicInference,
        description: 'Enable AI-powered demographic inference for locations',
        category: 'intelligence'
      },
      {
        name: 'competitive_analysis',
        enabled: config.features.enableCompetitiveAnalysis,
        description: 'Enable competitive landscape analysis',
        category: 'intelligence'
      },
      {
        name: 'viability_assessment',
        enabled: config.features.enableViabilityAssessment,
        description: 'Enable location viability assessment',
        category: 'intelligence'
      },
      {
        name: 'strategic_rationale',
        enabled: config.features.enableStrategicRationale,
        description: 'Enable AI-powered strategic rationale generation',
        category: 'intelligence'
      },
      {
        name: 'pattern_detection',
        enabled: config.features.enablePatternDetection,
        description: 'Enable geometric pattern detection and prevention',
        category: 'intelligence'
      },
      {
        name: 'caching',
        enabled: config.features.enableCaching,
        description: 'Enable intelligent caching for performance optimization',
        category: 'performance'
      },
      {
        name: 'performance_optimization',
        enabled: config.features.enablePerformanceOptimization,
        description: 'Enable advanced performance optimization features',
        category: 'performance'
      },
      {
        name: 'telemetry',
        enabled: config.features.enableTelemetry,
        description: 'Enable telemetry and metrics collection',
        category: 'monitoring'
      },
      {
        name: 'health_checks',
        enabled: config.features.enableHealthChecks,
        description: 'Enable comprehensive health monitoring',
        category: 'monitoring'
      },
      {
        name: 'experimental_features',
        enabled: config.environment.enableExperimentalFeatures,
        description: 'Enable experimental and beta features',
        category: 'experimental',
        conditions: [
          {
            type: 'environment',
            operator: 'in',
            value: ['development', 'staging']
          }
        ]
      },
      {
        name: 'debug_mode',
        enabled: config.environment.enableDebugMode,
        description: 'Enable debug mode with detailed logging',
        category: 'experimental',
        conditions: [
          {
            type: 'environment',
            operator: 'equals',
            value: 'development'
          }
        ]
      }
    ];

    // Store flags in map
    flags.forEach(flag => {
      this.flags.set(flag.name, flag);
    });

    this.logger.log(`Initialized ${flags.length} feature flags`);
  }

  // Evaluate a feature flag for a given context
  async evaluateFlag(
    flagName: string, 
    context: Record<string, any> = {}
  ): Promise<FeatureFlagEvaluation> {
    const cacheKey = this.generateCacheKey(flagName, context);
    
    // Check cache first
    const cached = this.evaluationCache.get(cacheKey);
    if (cached && Date.now() - cached.evaluatedAt.getTime() < this.cacheTimeoutMs) {
      return cached;
    }

    const flag = this.flags.get(flagName);
    if (!flag) {
      const evaluation: FeatureFlagEvaluation = {
        flagName,
        enabled: false,
        reason: 'Flag not found',
        evaluatedAt: new Date(),
        context
      };
      this.evaluationCache.set(cacheKey, evaluation);
      return evaluation;
    }

    // Evaluate flag conditions
    const evaluation = await this.evaluateFlagConditions(flag, context);
    
    // Cache the evaluation
    this.evaluationCache.set(cacheKey, evaluation);
    
    return evaluation;
  }

  private async evaluateFlagConditions(
    flag: FeatureFlag, 
    context: Record<string, any>
  ): Promise<FeatureFlagEvaluation> {
    const evaluation: FeatureFlagEvaluation = {
      flagName: flag.name,
      enabled: flag.enabled,
      reason: 'Default flag value',
      evaluatedAt: new Date(),
      context
    };

    // If flag is disabled by default, return early
    if (!flag.enabled) {
      evaluation.reason = 'Flag is disabled';
      return evaluation;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined) {
      const rolloutCheck = this.checkRolloutPercentage(flag.rolloutPercentage, context);
      if (!rolloutCheck.enabled) {
        evaluation.enabled = false;
        evaluation.reason = rolloutCheck.reason;
        return evaluation;
      }
    }

    // Evaluate conditions
    if (flag.conditions && flag.conditions.length > 0) {
      for (const condition of flag.conditions) {
        const conditionResult = this.evaluateCondition(condition, context);
        if (!conditionResult.enabled) {
          evaluation.enabled = false;
          evaluation.reason = conditionResult.reason;
          return evaluation;
        }
      }
    }

    evaluation.reason = 'All conditions passed';
    return evaluation;
  }

  private checkRolloutPercentage(
    percentage: number, 
    context: Record<string, any>
  ): { enabled: boolean; reason: string } {
    // Use user ID or session ID for consistent rollout
    const identifier = context.userId || context.sessionId || 'anonymous';
    const hash = this.simpleHash(identifier);
    const rolloutValue = hash % 100;
    
    if (rolloutValue < percentage) {
      return { enabled: true, reason: `Rollout percentage check passed (${rolloutValue} < ${percentage})` };
    } else {
      return { enabled: false, reason: `Rollout percentage check failed (${rolloutValue} >= ${percentage})` };
    }
  }

  private evaluateCondition(
    condition: FeatureFlagCondition, 
    context: Record<string, any>
  ): { enabled: boolean; reason: string } {
    let contextValue: any;

    switch (condition.type) {
      case 'user_id':
        contextValue = context.userId;
        break;
      case 'region':
        contextValue = context.region;
        break;
      case 'environment':
        contextValue = this.configService.getEnvironmentConfig().name;
        break;
      case 'time_window':
        contextValue = new Date().getHours();
        break;
      case 'custom':
        contextValue = context[condition.value?.key];
        break;
      default:
        return { enabled: false, reason: `Unknown condition type: ${condition.type}` };
    }

    const result = this.evaluateOperator(contextValue, condition.operator, condition.value);
    
    return {
      enabled: result,
      reason: result 
        ? `Condition passed: ${condition.type} ${condition.operator} ${condition.value}`
        : `Condition failed: ${condition.type} ${condition.operator} ${condition.value} (actual: ${contextValue})`
    };
  }

  private evaluateOperator(contextValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return contextValue === expectedValue;
      case 'not_equals':
        return contextValue !== expectedValue;
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(contextValue);
      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(contextValue);
      case 'greater_than':
        return Number(contextValue) > Number(expectedValue);
      case 'less_than':
        return Number(contextValue) < Number(expectedValue);
      default:
        return false;
    }
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private generateCacheKey(flagName: string, context: Record<string, any>): string {
    const contextKey = Object.keys(context)
      .sort()
      .map(key => `${key}:${context[key]}`)
      .join('|');
    return `${flagName}:${contextKey}`;
  }

  // Public API methods
  async isEnabled(flagName: string, context: Record<string, any> = {}): Promise<boolean> {
    const evaluation = await this.evaluateFlag(flagName, context);
    return evaluation.enabled;
  }

  async getEvaluation(flagName: string, context: Record<string, any> = {}): Promise<FeatureFlagEvaluation> {
    return this.evaluateFlag(flagName, context);
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  getFlagsByCategory(category: FeatureFlag['category']): FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => flag.category === category);
  }

  // Flag management
  async updateFlag(flagName: string, updates: Partial<FeatureFlag>): Promise<void> {
    const existingFlag = this.flags.get(flagName);
    if (!existingFlag) {
      throw new Error(`Flag '${flagName}' not found`);
    }

    const updatedFlag = { ...existingFlag, ...updates };
    this.flags.set(flagName, updatedFlag);
    
    // Clear related cache entries
    this.clearFlagCache(flagName);
    
    this.logger.log(`Feature flag updated: ${flagName}`, updates);
  }

  async createFlag(flag: FeatureFlag): Promise<void> {
    if (this.flags.has(flag.name)) {
      throw new Error(`Flag '${flag.name}' already exists`);
    }

    this.flags.set(flag.name, flag);
    this.logger.log(`Feature flag created: ${flag.name}`);
  }

  async deleteFlag(flagName: string): Promise<void> {
    if (!this.flags.has(flagName)) {
      throw new Error(`Flag '${flagName}' not found`);
    }

    this.flags.delete(flagName);
    this.clearFlagCache(flagName);
    this.logger.log(`Feature flag deleted: ${flagName}`);
  }

  // Cache management
  private clearFlagCache(flagName: string): void {
    const keysToDelete = Array.from(this.evaluationCache.keys())
      .filter(key => key.startsWith(`${flagName}:`));
    
    keysToDelete.forEach(key => this.evaluationCache.delete(key));
  }

  clearAllCache(): void {
    this.evaluationCache.clear();
    this.logger.debug('Feature flag evaluation cache cleared');
  }

  // Statistics and monitoring
  getCacheStats(): {
    size: number;
    hitRate: number;
    totalEvaluations: number;
  } {
    // This is a simplified implementation
    // In a real system, you'd track hits/misses properly
    return {
      size: this.evaluationCache.size,
      hitRate: 0.8, // Placeholder
      totalEvaluations: this.evaluationCache.size
    };
  }

  getUsageStats(): Array<{
    flagName: string;
    evaluations: number;
    enabledPercentage: number;
    lastEvaluated: Date;
  }> {
    const stats = new Map<string, { evaluations: number; enabled: number; lastEvaluated: Date }>();

    // Analyze cache for usage patterns
    for (const [key, evaluation] of this.evaluationCache.entries()) {
      const flagName = evaluation.flagName;
      const existing = stats.get(flagName) || { evaluations: 0, enabled: 0, lastEvaluated: new Date(0) };
      
      existing.evaluations++;
      if (evaluation.enabled) existing.enabled++;
      if (evaluation.evaluatedAt > existing.lastEvaluated) {
        existing.lastEvaluated = evaluation.evaluatedAt;
      }
      
      stats.set(flagName, existing);
    }

    return Array.from(stats.entries()).map(([flagName, data]) => ({
      flagName,
      evaluations: data.evaluations,
      enabledPercentage: data.evaluations > 0 ? (data.enabled / data.evaluations) * 100 : 0,
      lastEvaluated: data.lastEvaluated
    }));
  }

  // Health check
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    flagCount: number;
    cacheSize: number;
    details: any;
  } {
    const flagCount = this.flags.size;
    const cacheSize = this.evaluationCache.size;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (flagCount === 0) {
      status = 'unhealthy';
    } else if (cacheSize > 10000) {
      status = 'degraded';
    }

    return {
      status,
      flagCount,
      cacheSize,
      details: {
        flagsByCategory: {
          intelligence: this.getFlagsByCategory('intelligence').length,
          performance: this.getFlagsByCategory('performance').length,
          monitoring: this.getFlagsByCategory('monitoring').length,
          experimental: this.getFlagsByCategory('experimental').length
        },
        cacheStats: this.getCacheStats()
      }
    };
  }
}