import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

// Configuration schema for validation
const IntelligenceConfigSchema = z.object({
  // Feature flags
  features: z.object({
    enableDemographicInference: z.boolean().default(true),
    enableCompetitiveAnalysis: z.boolean().default(true),
    enableViabilityAssessment: z.boolean().default(true),
    enableStrategicRationale: z.boolean().default(true),
    enablePatternDetection: z.boolean().default(true),
    enableCaching: z.boolean().default(true),
    enablePerformanceOptimization: z.boolean().default(true),
    enableTelemetry: z.boolean().default(true),
    enableHealthChecks: z.boolean().default(true)
  }),

  // Performance settings
  performance: z.object({
    maxConcurrentRequests: z.number().min(1).max(100).default(10),
    batchSize: z.number().min(1).max(50).default(5),
    requestTimeoutMs: z.number().min(1000).max(60000).default(30000),
    cacheTimeoutMs: z.number().min(60000).max(86400000).default(3600000), // 1 hour
    maxRetries: z.number().min(0).max(5).default(3),
    retryDelayMs: z.number().min(100).max(10000).default(1000)
  }),

  // Quality thresholds
  thresholds: z.object({
    minCommercialViabilityScore: z.number().min(0).max(1).default(0.3),
    maxDistanceToTownCenter: z.number().min(0).max(10000).default(1000),
    minMarketFitScore: z.number().min(0).max(1).default(0.4),
    minConfidenceScore: z.number().min(0).max(1).default(0.5),
    maxErrorRate: z.number().min(0).max(1).default(0.1),
    minCacheHitRate: z.number().min(0).max(1).default(0.7),
    maxResponseTimeMs: z.number().min(100).max(30000).default(5000)
  }),

  // AI provider configuration
  ai: z.object({
    provider: z.enum(['openai', 'anthropic']).default('openai'),
    demographicInferenceModel: z.string().min(1).default('gpt-5-mini'),
    rationaleGenerationModel: z.string().min(1).default('gpt-5-mini'),
    maxTokens: z.number().min(100).max(4000).default(1000),
    temperature: z.number().min(0).max(2).default(0.7),
    apiTimeoutMs: z.number().min(5000).max(60000).default(30000)
  }),

  // Cache configuration
  cache: z.object({
    provider: z.enum(['memory', 'redis', 'hybrid']).default('memory'),
    ttlSeconds: z.number().min(300).max(86400).default(3600), // 1 hour
    maxSize: z.number().min(100).max(100000).default(10000),
    enableWarmup: z.boolean().default(false),
    warmupLocations: z.array(z.object({
      lat: z.number(),
      lng: z.number(),
      priority: z.number().min(0).max(100).default(50)
    })).default([])
  }),

  // Monitoring and telemetry
  monitoring: z.object({
    enableMetrics: z.boolean().default(true),
    enableAlerts: z.boolean().default(true),
    metricsRetentionDays: z.number().min(1).max(90).default(7),
    alertThresholds: z.object({
      errorRate: z.number().min(0).max(1).default(0.05),
      responseTime: z.number().min(1000).max(30000).default(5000),
      memoryUsage: z.number().min(100).max(2000).default(512), // MB
      cacheHitRate: z.number().min(0).max(1).default(0.7)
    })
  }),

  // Environment-specific settings
  environment: z.object({
    name: z.enum(['development', 'staging', 'production']).default('development'),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    enableDebugMode: z.boolean().default(false),
    enableExperimentalFeatures: z.boolean().default(false)
  })
});

export type EnhancedIntelligenceConfig = z.infer<typeof IntelligenceConfigSchema>;

export interface ConfigurationSource {
  name: string;
  priority: number;
  load(): Promise<Partial<EnhancedIntelligenceConfig>>;
}

@Injectable()
export class EnhancedIntelligenceConfigService {
  private readonly logger = new Logger(EnhancedIntelligenceConfigService.name);
  private config: EnhancedIntelligenceConfig;
  private configSources: ConfigurationSource[] = [];
  private lastReloadTime: Date = new Date();

  constructor() {
    this.initializeConfigSources();
    this.loadConfiguration();
  }

  private initializeConfigSources(): void {
    // Environment variables source (highest priority)
    this.configSources.push({
      name: 'environment',
      priority: 100,
      load: async () => this.loadFromEnvironment()
    });

    // Configuration file source (medium priority)
    this.configSources.push({
      name: 'file',
      priority: 50,
      load: async () => this.loadFromFile()
    });

    // Default configuration (lowest priority)
    this.configSources.push({
      name: 'defaults',
      priority: 1,
      load: async () => this.getDefaultConfiguration()
    });

    // Sort by priority (highest first)
    this.configSources.sort((a, b) => b.priority - a.priority);
  }

  private async loadConfiguration(): Promise<void> {
    try {
      let mergedConfig: Partial<EnhancedIntelligenceConfig> = {};

      // Load from all sources in priority order
      for (const source of this.configSources) {
        try {
          const sourceConfig = await source.load();
          mergedConfig = this.mergeConfigurations(mergedConfig, sourceConfig);
          this.logger.debug(`Loaded configuration from source: ${source.name}`);
        } catch (error) {
          this.logger.warn(`Failed to load configuration from ${source.name}:`, error);
        }
      }

      // Validate and parse the merged configuration
      const validationResult = IntelligenceConfigSchema.safeParse(mergedConfig);
      
      if (!validationResult.success) {
        this.logger.error('Configuration validation failed:', validationResult.error.errors);
        throw new Error(`Invalid configuration: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
      }

      this.config = validationResult.data;
      this.lastReloadTime = new Date();
      
      this.logger.log('Intelligence configuration loaded successfully', {
        environment: this.config.environment.name,
        features: Object.entries(this.config.features).filter(([_, enabled]) => enabled).map(([name]) => name),
        cacheProvider: this.config.cache.provider,
        aiProvider: this.config.ai.provider
      });

    } catch (error) {
      this.logger.error('Failed to load intelligence configuration:', error);
      // Fall back to default configuration
      this.config = IntelligenceConfigSchema.parse({});
    }
  }

  private loadFromEnvironment(): Partial<EnhancedIntelligenceConfig> {
    const config: Partial<EnhancedIntelligenceConfig> = {};
    
    // Only include values that are actually set in environment
    const features: Partial<EnhancedIntelligenceConfig['features']> = {};
    const performance: Partial<EnhancedIntelligenceConfig['performance']> = {};
    const thresholds: Partial<EnhancedIntelligenceConfig['thresholds']> = {};
    const ai: Partial<EnhancedIntelligenceConfig['ai']> = {};
    const cache: Partial<EnhancedIntelligenceConfig['cache']> = {};
    const monitoring: Partial<EnhancedIntelligenceConfig['monitoring']> = {};
    const environment: Partial<EnhancedIntelligenceConfig['environment']> = {};

    // Features
    const enableDemographicInference = this.parseBooleanEnv('INTELLIGENCE_ENABLE_DEMOGRAPHIC_INFERENCE');
    if (enableDemographicInference !== undefined) features.enableDemographicInference = enableDemographicInference;
    
    const enableCompetitiveAnalysis = this.parseBooleanEnv('INTELLIGENCE_ENABLE_COMPETITIVE_ANALYSIS');
    if (enableCompetitiveAnalysis !== undefined) features.enableCompetitiveAnalysis = enableCompetitiveAnalysis;
    
    const enableViabilityAssessment = this.parseBooleanEnv('INTELLIGENCE_ENABLE_VIABILITY_ASSESSMENT');
    if (enableViabilityAssessment !== undefined) features.enableViabilityAssessment = enableViabilityAssessment;
    
    const enableStrategicRationale = this.parseBooleanEnv('INTELLIGENCE_ENABLE_STRATEGIC_RATIONALE');
    if (enableStrategicRationale !== undefined) features.enableStrategicRationale = enableStrategicRationale;
    
    const enablePatternDetection = this.parseBooleanEnv('INTELLIGENCE_ENABLE_PATTERN_DETECTION');
    if (enablePatternDetection !== undefined) features.enablePatternDetection = enablePatternDetection;
    
    const enableCaching = this.parseBooleanEnv('INTELLIGENCE_ENABLE_CACHING');
    if (enableCaching !== undefined) features.enableCaching = enableCaching;
    
    const enablePerformanceOptimization = this.parseBooleanEnv('INTELLIGENCE_ENABLE_PERFORMANCE_OPTIMIZATION');
    if (enablePerformanceOptimization !== undefined) features.enablePerformanceOptimization = enablePerformanceOptimization;
    
    const enableTelemetry = this.parseBooleanEnv('INTELLIGENCE_ENABLE_TELEMETRY');
    if (enableTelemetry !== undefined) features.enableTelemetry = enableTelemetry;
    
    const enableHealthChecks = this.parseBooleanEnv('INTELLIGENCE_ENABLE_HEALTH_CHECKS');
    if (enableHealthChecks !== undefined) features.enableHealthChecks = enableHealthChecks;

    // Performance
    const maxConcurrentRequests = this.parseNumberEnv('INTELLIGENCE_MAX_CONCURRENT_REQUESTS');
    if (maxConcurrentRequests !== undefined) performance.maxConcurrentRequests = maxConcurrentRequests;
    
    const batchSize = this.parseNumberEnv('INTELLIGENCE_BATCH_SIZE');
    if (batchSize !== undefined) performance.batchSize = batchSize;
    
    const requestTimeoutMs = this.parseNumberEnv('INTELLIGENCE_REQUEST_TIMEOUT_MS');
    if (requestTimeoutMs !== undefined) performance.requestTimeoutMs = requestTimeoutMs;
    
    const cacheTimeoutMs = this.parseNumberEnv('INTELLIGENCE_CACHE_TIMEOUT_MS');
    if (cacheTimeoutMs !== undefined) performance.cacheTimeoutMs = cacheTimeoutMs;
    
    const maxRetries = this.parseNumberEnv('INTELLIGENCE_MAX_RETRIES');
    if (maxRetries !== undefined) performance.maxRetries = maxRetries;
    
    const retryDelayMs = this.parseNumberEnv('INTELLIGENCE_RETRY_DELAY_MS');
    if (retryDelayMs !== undefined) performance.retryDelayMs = retryDelayMs;

    // AI
    if (process.env.INTELLIGENCE_AI_PROVIDER) ai.provider = process.env.INTELLIGENCE_AI_PROVIDER as 'openai' | 'anthropic';
    if (process.env.INTELLIGENCE_DEMOGRAPHIC_MODEL) ai.demographicInferenceModel = process.env.INTELLIGENCE_DEMOGRAPHIC_MODEL;
    if (process.env.INTELLIGENCE_RATIONALE_MODEL) ai.rationaleGenerationModel = process.env.INTELLIGENCE_RATIONALE_MODEL;
    
    const maxTokens = this.parseNumberEnv('INTELLIGENCE_AI_MAX_TOKENS');
    if (maxTokens !== undefined) ai.maxTokens = maxTokens;
    
    const temperature = this.parseNumberEnv('INTELLIGENCE_AI_TEMPERATURE');
    if (temperature !== undefined) ai.temperature = temperature;
    
    const apiTimeoutMs = this.parseNumberEnv('INTELLIGENCE_AI_TIMEOUT_MS');
    if (apiTimeoutMs !== undefined) ai.apiTimeoutMs = apiTimeoutMs;

    // Cache
    if (process.env.INTELLIGENCE_CACHE_PROVIDER) cache.provider = process.env.INTELLIGENCE_CACHE_PROVIDER as 'memory' | 'redis' | 'hybrid';
    
    const ttlSeconds = this.parseNumberEnv('INTELLIGENCE_CACHE_TTL_SECONDS');
    if (ttlSeconds !== undefined) cache.ttlSeconds = ttlSeconds;
    
    const maxSize = this.parseNumberEnv('INTELLIGENCE_CACHE_MAX_SIZE');
    if (maxSize !== undefined) cache.maxSize = maxSize;
    
    const enableWarmup = this.parseBooleanEnv('INTELLIGENCE_CACHE_ENABLE_WARMUP');
    if (enableWarmup !== undefined) cache.enableWarmup = enableWarmup;

    // Environment
    if (process.env.NODE_ENV) environment.name = process.env.NODE_ENV as 'development' | 'staging' | 'production';
    if (process.env.LOG_LEVEL) environment.logLevel = process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error';
    
    const enableDebugMode = this.parseBooleanEnv('INTELLIGENCE_DEBUG_MODE');
    if (enableDebugMode !== undefined) environment.enableDebugMode = enableDebugMode;
    
    const enableExperimentalFeatures = this.parseBooleanEnv('INTELLIGENCE_EXPERIMENTAL_FEATURES');
    if (enableExperimentalFeatures !== undefined) environment.enableExperimentalFeatures = enableExperimentalFeatures;

    // Only include sections that have values
    if (Object.keys(features).length > 0) config.features = features as any;
    if (Object.keys(performance).length > 0) config.performance = performance as any;
    if (Object.keys(thresholds).length > 0) config.thresholds = thresholds as any;
    if (Object.keys(ai).length > 0) config.ai = ai as any;
    if (Object.keys(cache).length > 0) config.cache = cache as any;
    if (Object.keys(monitoring).length > 0) config.monitoring = monitoring as any;
    if (Object.keys(environment).length > 0) config.environment = environment as any;

    return config;
  }

  private async loadFromFile(): Promise<Partial<EnhancedIntelligenceConfig>> {
    try {
      // In a real implementation, this would load from a configuration file
      // For now, return empty configuration
      return {};
    } catch (error) {
      this.logger.warn('No configuration file found or failed to load');
      return {};
    }
  }

  private getDefaultConfiguration(): Partial<EnhancedIntelligenceConfig> {
    // Return empty object to use schema defaults
    return {};
  }

  private mergeConfigurations(
    base: Partial<EnhancedIntelligenceConfig>,
    override: Partial<EnhancedIntelligenceConfig>
  ): Partial<EnhancedIntelligenceConfig> {
    const merged = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value) && merged[key as keyof EnhancedIntelligenceConfig]) {
          merged[key as keyof EnhancedIntelligenceConfig] = {
            ...merged[key as keyof EnhancedIntelligenceConfig] as any,
            ...value
          };
        } else {
          merged[key as keyof EnhancedIntelligenceConfig] = value as any;
        }
      }
    }

    return merged;
  }

  private parseBooleanEnv(key: string): boolean | undefined {
    const value = process.env[key];
    if (value === undefined) return undefined;
    return value.toLowerCase() === 'true';
  }

  private parseNumberEnv(key: string): number | undefined {
    const value = process.env[key];
    if (value === undefined) return undefined;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }

  // Public API methods
  getConfig(): EnhancedIntelligenceConfig {
    return { ...this.config };
  }

  getFeatureFlags(): EnhancedIntelligenceConfig['features'] {
    return { ...this.config.features };
  }

  isFeatureEnabled(feature: keyof EnhancedIntelligenceConfig['features']): boolean {
    return this.config.features[feature];
  }

  getPerformanceSettings(): EnhancedIntelligenceConfig['performance'] {
    return { ...this.config.performance };
  }

  getThresholds(): EnhancedIntelligenceConfig['thresholds'] {
    return { ...this.config.thresholds };
  }

  getAIConfig(): EnhancedIntelligenceConfig['ai'] {
    return { ...this.config.ai };
  }

  getCacheConfig(): EnhancedIntelligenceConfig['cache'] {
    return { ...this.config.cache };
  }

  getMonitoringConfig(): EnhancedIntelligenceConfig['monitoring'] {
    return { ...this.config.monitoring };
  }

  getEnvironmentConfig(): EnhancedIntelligenceConfig['environment'] {
    return { ...this.config.environment };
  }

  // Configuration updates
  async updateFeatureFlag(feature: keyof EnhancedIntelligenceConfig['features'], enabled: boolean): Promise<void> {
    this.config.features[feature] = enabled;
    this.logger.log(`Feature flag updated: ${feature} = ${enabled}`);
  }

  async updateThreshold(threshold: keyof EnhancedIntelligenceConfig['thresholds'], value: number): Promise<void> {
    const oldValue = this.config.thresholds[threshold];
    this.config.thresholds[threshold] = value;
    
    // Validate the updated configuration
    const validationResult = IntelligenceConfigSchema.safeParse(this.config);
    if (!validationResult.success) {
      // Revert the change
      this.config.thresholds[threshold] = oldValue;
      throw new Error(`Invalid threshold value: ${validationResult.error.errors[0].message}`);
    }
    
    this.logger.log(`Threshold updated: ${threshold} = ${value} (was ${oldValue})`);
  }

  async updatePerformanceSetting(
    setting: keyof EnhancedIntelligenceConfig['performance'], 
    value: number
  ): Promise<void> {
    const oldValue = this.config.performance[setting];
    this.config.performance[setting] = value;
    
    // Validate the updated configuration
    const validationResult = IntelligenceConfigSchema.safeParse(this.config);
    if (!validationResult.success) {
      // Revert the change
      this.config.performance[setting] = oldValue;
      throw new Error(`Invalid performance setting: ${validationResult.error.errors[0].message}`);
    }
    
    this.logger.log(`Performance setting updated: ${setting} = ${value} (was ${oldValue})`);
  }

  // Configuration reload
  async reloadConfiguration(): Promise<void> {
    this.logger.log('Reloading intelligence configuration...');
    await this.loadConfiguration();
  }

  // Configuration validation
  validateConfiguration(config?: Partial<EnhancedIntelligenceConfig>): { valid: boolean; errors: string[] } {
    const configToValidate = config || this.config;
    const validationResult = IntelligenceConfigSchema.safeParse(configToValidate);
    
    if (validationResult.success) {
      return { valid: true, errors: [] };
    } else {
      return {
        valid: false,
        errors: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
  }

  // Configuration export/import
  exportConfiguration(): string {
    return JSON.stringify(this.config, null, 2);
  }

  async importConfiguration(configJson: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configJson);
      const validationResult = IntelligenceConfigSchema.safeParse(importedConfig);
      
      if (!validationResult.success) {
        throw new Error(`Invalid configuration: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
      }
      
      this.config = validationResult.data;
      this.lastReloadTime = new Date();
      this.logger.log('Configuration imported successfully');
    } catch (error) {
      this.logger.error('Failed to import configuration:', error);
      throw error;
    }
  }

  // Health check
  getConfigurationHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastReload: Date;
    validationErrors: string[];
    loadedSources: string[];
  } {
    const validation = this.validateConfiguration();
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!validation.valid) {
      status = validation.errors.length > 5 ? 'unhealthy' : 'degraded';
    }
    
    return {
      status,
      lastReload: this.lastReloadTime,
      validationErrors: validation.errors,
      loadedSources: this.configSources.map(s => s.name)
    };
  }
}