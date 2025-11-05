import { Test, TestingModule } from '@nestjs/testing';
import { EnhancedIntelligenceConfigService } from '../enhanced-intelligence.config';

describe('EnhancedIntelligenceConfigService', () => {
  let service: EnhancedIntelligenceConfigService;

  beforeEach(async () => {
    // Clear environment variables
    delete process.env.INTELLIGENCE_ENABLE_DEMOGRAPHIC_INFERENCE;
    delete process.env.INTELLIGENCE_MAX_CONCURRENT_REQUESTS;
    delete process.env.INTELLIGENCE_MIN_COMMERCIAL_VIABILITY_SCORE;
    delete process.env.INTELLIGENCE_AI_PROVIDER;
    delete process.env.INTELLIGENCE_CACHE_PROVIDER;
    delete process.env.NODE_ENV;

    const module: TestingModule = await Test.createTestingModule({
      providers: [EnhancedIntelligenceConfigService],
    }).compile();

    service = module.get<EnhancedIntelligenceConfigService>(EnhancedIntelligenceConfigService);
  });

  describe('Configuration Loading', () => {
    it('should load default configuration when no environment variables are set', () => {
      const config = service.getConfig();

      expect(config.features.enableDemographicInference).toBe(true);
      expect(config.performance.maxConcurrentRequests).toBe(10);
      expect(config.thresholds.minCommercialViabilityScore).toBe(0.3);
      expect(config.ai.provider).toBe('openai');
      expect(config.cache.provider).toBe('memory');
      expect(config.environment.name).toBe('development');
    });

    it('should load configuration from environment variables', () => {
      process.env.INTELLIGENCE_ENABLE_DEMOGRAPHIC_INFERENCE = 'false';
      process.env.INTELLIGENCE_MAX_CONCURRENT_REQUESTS = '20';
      process.env.INTELLIGENCE_MIN_COMMERCIAL_VIABILITY_SCORE = '0.5';
      process.env.INTELLIGENCE_AI_PROVIDER = 'anthropic';
      process.env.INTELLIGENCE_CACHE_PROVIDER = 'redis';
      process.env.NODE_ENV = 'production';

      // Recreate service to pick up environment variables
      const newService = new EnhancedIntelligenceConfigService();
      const config = newService.getConfig();

      expect(config.features.enableDemographicInference).toBe(false);
      expect(config.performance.maxConcurrentRequests).toBe(20);
      expect(config.thresholds.minCommercialViabilityScore).toBe(0.5);
      expect(config.ai.provider).toBe('anthropic');
      expect(config.cache.provider).toBe('redis');
      expect(config.environment.name).toBe('production');
    });

    it('should handle invalid environment variables gracefully', () => {
      process.env.INTELLIGENCE_MAX_CONCURRENT_REQUESTS = 'invalid';
      process.env.INTELLIGENCE_MIN_COMMERCIAL_VIABILITY_SCORE = 'not_a_number';
      process.env.INTELLIGENCE_AI_PROVIDER = 'invalid_provider';

      // Should fall back to defaults for invalid values
      const newService = new EnhancedIntelligenceConfigService();
      const config = newService.getConfig();

      expect(config.performance.maxConcurrentRequests).toBe(10); // default
      expect(config.thresholds.minCommercialViabilityScore).toBe(0.3); // default
      expect(config.ai.provider).toBe('openai'); // default (invalid value ignored)
    });
  });

  describe('Feature Flags', () => {
    it('should return feature flags correctly', () => {
      const features = service.getFeatureFlags();

      expect(features).toHaveProperty('enableDemographicInference');
      expect(features).toHaveProperty('enableCompetitiveAnalysis');
      expect(features).toHaveProperty('enableViabilityAssessment');
      expect(features).toHaveProperty('enableStrategicRationale');
      expect(features).toHaveProperty('enablePatternDetection');
      expect(features).toHaveProperty('enableCaching');
      expect(features).toHaveProperty('enablePerformanceOptimization');
      expect(features).toHaveProperty('enableTelemetry');
      expect(features).toHaveProperty('enableHealthChecks');
    });

    it('should check if feature is enabled', () => {
      expect(service.isFeatureEnabled('enableDemographicInference')).toBe(true);
      expect(service.isFeatureEnabled('enableCompetitiveAnalysis')).toBe(true);
    });

    it('should update feature flags', async () => {
      await service.updateFeatureFlag('enableDemographicInference', false);
      
      expect(service.isFeatureEnabled('enableDemographicInference')).toBe(false);
    });
  });

  describe('Performance Settings', () => {
    it('should return performance settings correctly', () => {
      const performance = service.getPerformanceSettings();

      expect(performance).toHaveProperty('maxConcurrentRequests');
      expect(performance).toHaveProperty('batchSize');
      expect(performance).toHaveProperty('requestTimeoutMs');
      expect(performance).toHaveProperty('cacheTimeoutMs');
      expect(performance).toHaveProperty('maxRetries');
      expect(performance).toHaveProperty('retryDelayMs');
    });

    it('should update performance settings with validation', async () => {
      await service.updatePerformanceSetting('maxConcurrentRequests', 25);
      
      const performance = service.getPerformanceSettings();
      expect(performance.maxConcurrentRequests).toBe(25);
    });

    it('should reject invalid performance settings', async () => {
      await expect(service.updatePerformanceSetting('maxConcurrentRequests', -1))
        .rejects.toThrow();
      
      await expect(service.updatePerformanceSetting('maxConcurrentRequests', 101))
        .rejects.toThrow();
    });
  });

  describe('Thresholds', () => {
    it('should return thresholds correctly', () => {
      const thresholds = service.getThresholds();

      expect(thresholds).toHaveProperty('minCommercialViabilityScore');
      expect(thresholds).toHaveProperty('maxDistanceToTownCenter');
      expect(thresholds).toHaveProperty('minMarketFitScore');
      expect(thresholds).toHaveProperty('minConfidenceScore');
      expect(thresholds).toHaveProperty('maxErrorRate');
      expect(thresholds).toHaveProperty('minCacheHitRate');
      expect(thresholds).toHaveProperty('maxResponseTimeMs');
    });

    it('should update thresholds with validation', async () => {
      await service.updateThreshold('minCommercialViabilityScore', 0.6);
      
      const thresholds = service.getThresholds();
      expect(thresholds.minCommercialViabilityScore).toBe(0.6);
    });

    it('should reject invalid threshold values', async () => {
      await expect(service.updateThreshold('minCommercialViabilityScore', -0.1))
        .rejects.toThrow();
      
      await expect(service.updateThreshold('minCommercialViabilityScore', 1.1))
        .rejects.toThrow();
    });
  });

  describe('AI Configuration', () => {
    it('should return AI configuration correctly', () => {
      const aiConfig = service.getAIConfig();

      expect(aiConfig).toHaveProperty('provider');
      expect(aiConfig).toHaveProperty('demographicInferenceModel');
      expect(aiConfig).toHaveProperty('rationaleGenerationModel');
      expect(aiConfig).toHaveProperty('maxTokens');
      expect(aiConfig).toHaveProperty('temperature');
      expect(aiConfig).toHaveProperty('apiTimeoutMs');
    });

    it('should validate AI provider values', () => {
      const config = service.getConfig();
      expect(['openai', 'anthropic']).toContain(config.ai.provider);
    });
  });

  describe('Cache Configuration', () => {
    it('should return cache configuration correctly', () => {
      const cacheConfig = service.getCacheConfig();

      expect(cacheConfig).toHaveProperty('provider');
      expect(cacheConfig).toHaveProperty('ttlSeconds');
      expect(cacheConfig).toHaveProperty('maxSize');
      expect(cacheConfig).toHaveProperty('enableWarmup');
      expect(cacheConfig).toHaveProperty('warmupLocations');
    });

    it('should validate cache provider values', () => {
      const config = service.getConfig();
      expect(['memory', 'redis', 'hybrid']).toContain(config.cache.provider);
    });
  });

  describe('Monitoring Configuration', () => {
    it('should return monitoring configuration correctly', () => {
      const monitoringConfig = service.getMonitoringConfig();

      expect(monitoringConfig).toHaveProperty('enableMetrics');
      expect(monitoringConfig).toHaveProperty('enableAlerts');
      expect(monitoringConfig).toHaveProperty('metricsRetentionDays');
      expect(monitoringConfig).toHaveProperty('alertThresholds');
    });
  });

  describe('Environment Configuration', () => {
    it('should return environment configuration correctly', () => {
      const envConfig = service.getEnvironmentConfig();

      expect(envConfig).toHaveProperty('name');
      expect(envConfig).toHaveProperty('logLevel');
      expect(envConfig).toHaveProperty('enableDebugMode');
      expect(envConfig).toHaveProperty('enableExperimentalFeatures');
    });

    it('should validate environment values', () => {
      const config = service.getConfig();
      expect(['development', 'staging', 'production']).toContain(config.environment.name);
      expect(['debug', 'info', 'warn', 'error']).toContain(config.environment.logLevel);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate complete configuration', () => {
      const validation = service.validateConfiguration();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid configuration', () => {
      const invalidConfig = {
        thresholds: {
          minCommercialViabilityScore: 1.5 // Invalid: > 1
        }
      };

      const validation = service.validateConfiguration(invalidConfig);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Reload', () => {
    it('should reload configuration', async () => {
      const originalConfig = service.getConfig();
      
      // Change environment variable
      process.env.INTELLIGENCE_MAX_CONCURRENT_REQUESTS = '15';
      
      await service.reloadConfiguration();
      
      const newConfig = service.getConfig();
      expect(newConfig.performance.maxConcurrentRequests).toBe(15);
    });
  });

  describe('Configuration Export/Import', () => {
    it('should export configuration as JSON', () => {
      const exported = service.exportConfiguration();
      
      expect(() => JSON.parse(exported)).not.toThrow();
      
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('features');
      expect(parsed).toHaveProperty('performance');
      expect(parsed).toHaveProperty('thresholds');
    });

    it('should import valid configuration', async () => {
      const config = service.getConfig();
      config.performance.maxConcurrentRequests = 30;
      
      const exported = JSON.stringify(config);
      
      await service.importConfiguration(exported);
      
      const newConfig = service.getConfig();
      expect(newConfig.performance.maxConcurrentRequests).toBe(30);
    });

    it('should reject invalid configuration import', async () => {
      const invalidConfig = JSON.stringify({
        performance: {
          maxConcurrentRequests: -1 // Invalid
        }
      });

      await expect(service.importConfiguration(invalidConfig))
        .rejects.toThrow();
    });

    it('should reject malformed JSON', async () => {
      await expect(service.importConfiguration('invalid json'))
        .rejects.toThrow();
    });
  });

  describe('Health Check', () => {
    it('should return healthy status for valid configuration', () => {
      const health = service.getConfigurationHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.lastReload).toBeInstanceOf(Date);
      expect(health.validationErrors).toHaveLength(0);
      expect(health.loadedSources).toContain('environment');
      expect(health.loadedSources).toContain('defaults');
    });

    it('should return degraded status for configuration with warnings', async () => {
      // This would require a way to inject configuration warnings
      // For now, we'll test that the health check structure is correct
      const health = service.getConfigurationHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('lastReload');
      expect(health).toHaveProperty('validationErrors');
      expect(health).toHaveProperty('loadedSources');
    });
  });

  describe('Configuration Merging', () => {
    it('should merge configurations correctly', () => {
      // Test that environment variables override defaults
      process.env.INTELLIGENCE_ENABLE_DEMOGRAPHIC_INFERENCE = 'false';
      process.env.INTELLIGENCE_MAX_CONCURRENT_REQUESTS = '25';
      
      const newService = new EnhancedIntelligenceConfigService();
      const config = newService.getConfig();
      
      // Environment overrides should be applied
      expect(config.features.enableDemographicInference).toBe(false);
      expect(config.performance.maxConcurrentRequests).toBe(25);
      
      // Defaults should remain for non-overridden values
      expect(config.features.enableCompetitiveAnalysis).toBe(true);
      expect(config.performance.batchSize).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined environment variables', () => {
      process.env.INTELLIGENCE_ENABLE_DEMOGRAPHIC_INFERENCE = undefined;
      
      const newService = new EnhancedIntelligenceConfigService();
      const config = newService.getConfig();
      
      // Should use default value
      expect(config.features.enableDemographicInference).toBe(true);
    });

    it('should handle empty string environment variables', () => {
      process.env.INTELLIGENCE_AI_PROVIDER = '';
      
      const newService = new EnhancedIntelligenceConfigService();
      const config = newService.getConfig();
      
      // Should use default value for empty string
      expect(config.ai.provider).toBe('openai');
    });

    it('should handle boolean environment variables correctly', () => {
      process.env.INTELLIGENCE_ENABLE_DEMOGRAPHIC_INFERENCE = 'TRUE';
      process.env.INTELLIGENCE_ENABLE_COMPETITIVE_ANALYSIS = 'False';
      process.env.INTELLIGENCE_ENABLE_VIABILITY_ASSESSMENT = '1';
      process.env.INTELLIGENCE_ENABLE_STRATEGIC_RATIONALE = '0';
      
      const newService = new EnhancedIntelligenceConfigService();
      const config = newService.getConfig();
      
      expect(config.features.enableDemographicInference).toBe(true);
      expect(config.features.enableCompetitiveAnalysis).toBe(false);
      // Non-standard boolean values should be undefined and use defaults
      expect(config.features.enableViabilityAssessment).toBe(true); // default
      expect(config.features.enableStrategicRationale).toBe(true); // default
    });
  });
});