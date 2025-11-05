import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagsService, FeatureFlag, FeatureFlagCondition } from '../feature-flags.service';
import { EnhancedIntelligenceConfigService } from '../enhanced-intelligence.config';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let configService: jest.Mocked<EnhancedIntelligenceConfigService>;

  const mockConfig = {
    features: {
      enableDemographicInference: true,
      enableCompetitiveAnalysis: true,
      enableViabilityAssessment: false,
      enableStrategicRationale: true,
      enablePatternDetection: true,
      enableCaching: true,
      enablePerformanceOptimization: true,
      enableTelemetry: true,
      enableHealthChecks: true
    },
    environment: {
      name: 'development' as const,
      logLevel: 'info' as const,
      enableDebugMode: true,
      enableExperimentalFeatures: false
    }
  };

  beforeEach(async () => {
    const mockConfigService = {
      getConfig: jest.fn().mockReturnValue(mockConfig)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        { provide: EnhancedIntelligenceConfigService, useValue: mockConfigService }
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
    configService = module.get(EnhancedIntelligenceConfigService);
  });

  describe('Flag Initialization', () => {
    it('should initialize flags from configuration', () => {
      const flags = service.getAllFlags();
      
      expect(flags.length).toBeGreaterThan(0);
      
      const demographicFlag = flags.find(f => f.name === 'demographic_inference');
      expect(demographicFlag).toBeDefined();
      expect(demographicFlag?.enabled).toBe(true);
      expect(demographicFlag?.category).toBe('intelligence');
      
      const viabilityFlag = flags.find(f => f.name === 'viability_assessment');
      expect(viabilityFlag).toBeDefined();
      expect(viabilityFlag?.enabled).toBe(false);
    });

    it('should categorize flags correctly', () => {
      const intelligenceFlags = service.getFlagsByCategory('intelligence');
      const performanceFlags = service.getFlagsByCategory('performance');
      const monitoringFlags = service.getFlagsByCategory('monitoring');
      const experimentalFlags = service.getFlagsByCategory('experimental');
      
      expect(intelligenceFlags.length).toBeGreaterThan(0);
      expect(performanceFlags.length).toBeGreaterThan(0);
      expect(monitoringFlags.length).toBeGreaterThan(0);
      expect(experimentalFlags.length).toBeGreaterThan(0);
      
      intelligenceFlags.forEach(flag => {
        expect(flag.category).toBe('intelligence');
      });
    });
  });

  describe('Flag Evaluation', () => {
    it('should evaluate enabled flags correctly', async () => {
      const evaluation = await service.evaluateFlag('demographic_inference');
      
      expect(evaluation.flagName).toBe('demographic_inference');
      expect(evaluation.enabled).toBe(true);
      expect(evaluation.reason).toBe('All conditions passed');
      expect(evaluation.evaluatedAt).toBeInstanceOf(Date);
    });

    it('should evaluate disabled flags correctly', async () => {
      const evaluation = await service.evaluateFlag('viability_assessment');
      
      expect(evaluation.flagName).toBe('viability_assessment');
      expect(evaluation.enabled).toBe(false);
      expect(evaluation.reason).toBe('Flag is disabled');
    });

    it('should handle non-existent flags', async () => {
      const evaluation = await service.evaluateFlag('non_existent_flag');
      
      expect(evaluation.flagName).toBe('non_existent_flag');
      expect(evaluation.enabled).toBe(false);
      expect(evaluation.reason).toBe('Flag not found');
    });

    it('should use context in evaluation', async () => {
      const context = { userId: 'user123', region: 'US' };
      const evaluation = await service.evaluateFlag('demographic_inference', context);
      
      expect(evaluation.context).toEqual(context);
    });
  });

  describe('Rollout Percentage', () => {
    it('should respect rollout percentage', async () => {
      const flag: FeatureFlag = {
        name: 'test_rollout',
        enabled: true,
        description: 'Test rollout flag',
        category: 'experimental',
        rolloutPercentage: 50
      };

      await service.createFlag(flag);

      // Test with different user IDs to check rollout
      const results = await Promise.all([
        service.isEnabled('test_rollout', { userId: 'user1' }),
        service.isEnabled('test_rollout', { userId: 'user2' }),
        service.isEnabled('test_rollout', { userId: 'user3' }),
        service.isEnabled('test_rollout', { userId: 'user4' }),
        service.isEnabled('test_rollout', { userId: 'user5' })
      ]);

      // With 50% rollout, we should have some enabled and some disabled
      const enabledCount = results.filter(r => r).length;
      expect(enabledCount).toBeGreaterThan(0);
      expect(enabledCount).toBeLessThan(5);
    });

    it('should be consistent for the same user', async () => {
      const flag: FeatureFlag = {
        name: 'test_consistency',
        enabled: true,
        description: 'Test consistency flag',
        category: 'experimental',
        rolloutPercentage: 30
      };

      await service.createFlag(flag);

      const context = { userId: 'consistent_user' };
      
      // Multiple evaluations should return the same result
      const results = await Promise.all([
        service.isEnabled('test_consistency', context),
        service.isEnabled('test_consistency', context),
        service.isEnabled('test_consistency', context)
      ]);

      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });
  });

  describe('Conditions', () => {
    it('should evaluate environment conditions', async () => {
      const flag: FeatureFlag = {
        name: 'test_env_condition',
        enabled: true,
        description: 'Test environment condition',
        category: 'experimental',
        conditions: [
          {
            type: 'environment',
            operator: 'equals',
            value: 'development'
          }
        ]
      };

      await service.createFlag(flag);

      const evaluation = await service.evaluateFlag('test_env_condition');
      expect(evaluation.enabled).toBe(true);
      expect(evaluation.reason).toBe('All conditions passed');
    });

    it('should fail when environment condition is not met', async () => {
      const flag: FeatureFlag = {
        name: 'test_env_fail',
        enabled: true,
        description: 'Test environment fail',
        category: 'experimental',
        conditions: [
          {
            type: 'environment',
            operator: 'equals',
            value: 'production'
          }
        ]
      };

      await service.createFlag(flag);

      const evaluation = await service.evaluateFlag('test_env_fail');
      expect(evaluation.enabled).toBe(false);
      expect(evaluation.reason).toContain('Condition failed');
    });

    it('should evaluate user_id conditions', async () => {
      const flag: FeatureFlag = {
        name: 'test_user_condition',
        enabled: true,
        description: 'Test user condition',
        category: 'experimental',
        conditions: [
          {
            type: 'user_id',
            operator: 'equals',
            value: 'admin_user'
          }
        ]
      };

      await service.createFlag(flag);

      const enabledEvaluation = await service.evaluateFlag('test_user_condition', { userId: 'admin_user' });
      expect(enabledEvaluation.enabled).toBe(true);

      const disabledEvaluation = await service.evaluateFlag('test_user_condition', { userId: 'regular_user' });
      expect(disabledEvaluation.enabled).toBe(false);
    });

    it('should evaluate region conditions with "in" operator', async () => {
      const flag: FeatureFlag = {
        name: 'test_region_condition',
        enabled: true,
        description: 'Test region condition',
        category: 'experimental',
        conditions: [
          {
            type: 'region',
            operator: 'in',
            value: ['US', 'CA', 'GB']
          }
        ]
      };

      await service.createFlag(flag);

      const usEvaluation = await service.evaluateFlag('test_region_condition', { region: 'US' });
      expect(usEvaluation.enabled).toBe(true);

      const frEvaluation = await service.evaluateFlag('test_region_condition', { region: 'FR' });
      expect(frEvaluation.enabled).toBe(false);
    });

    it('should evaluate multiple conditions (AND logic)', async () => {
      const flag: FeatureFlag = {
        name: 'test_multiple_conditions',
        enabled: true,
        description: 'Test multiple conditions',
        category: 'experimental',
        conditions: [
          {
            type: 'environment',
            operator: 'equals',
            value: 'development'
          },
          {
            type: 'user_id',
            operator: 'equals',
            value: 'test_user'
          }
        ]
      };

      await service.createFlag(flag);

      // Both conditions met
      const bothMetEvaluation = await service.evaluateFlag('test_multiple_conditions', { userId: 'test_user' });
      expect(bothMetEvaluation.enabled).toBe(true);

      // Only one condition met
      const oneMetEvaluation = await service.evaluateFlag('test_multiple_conditions', { userId: 'other_user' });
      expect(oneMetEvaluation.enabled).toBe(false);
    });

    it('should handle time_window conditions', async () => {
      const flag: FeatureFlag = {
        name: 'test_time_condition',
        enabled: true,
        description: 'Test time condition',
        category: 'experimental',
        conditions: [
          {
            type: 'time_window',
            operator: 'greater_than',
            value: 0 // Always true (hour > 0)
          }
        ]
      };

      await service.createFlag(flag);

      const evaluation = await service.evaluateFlag('test_time_condition');
      expect(evaluation.enabled).toBe(true);
    });
  });

  describe('Flag Management', () => {
    it('should create new flags', async () => {
      const flag: FeatureFlag = {
        name: 'new_test_flag',
        enabled: true,
        description: 'A new test flag',
        category: 'experimental'
      };

      await service.createFlag(flag);

      const flags = service.getAllFlags();
      const createdFlag = flags.find(f => f.name === 'new_test_flag');
      
      expect(createdFlag).toBeDefined();
      expect(createdFlag?.description).toBe('A new test flag');
    });

    it('should prevent creating duplicate flags', async () => {
      const flag: FeatureFlag = {
        name: 'demographic_inference', // Already exists
        enabled: false,
        description: 'Duplicate flag',
        category: 'experimental'
      };

      await expect(service.createFlag(flag)).rejects.toThrow('already exists');
    });

    it('should update existing flags', async () => {
      await service.updateFlag('demographic_inference', {
        enabled: false,
        description: 'Updated description'
      });

      const flags = service.getAllFlags();
      const updatedFlag = flags.find(f => f.name === 'demographic_inference');
      
      expect(updatedFlag?.enabled).toBe(false);
      expect(updatedFlag?.description).toBe('Updated description');
    });

    it('should prevent updating non-existent flags', async () => {
      await expect(service.updateFlag('non_existent', { enabled: false }))
        .rejects.toThrow('not found');
    });

    it('should delete flags', async () => {
      // First create a flag to delete
      const flag: FeatureFlag = {
        name: 'flag_to_delete',
        enabled: true,
        description: 'Will be deleted',
        category: 'experimental'
      };

      await service.createFlag(flag);
      
      // Verify it exists
      let flags = service.getAllFlags();
      expect(flags.find(f => f.name === 'flag_to_delete')).toBeDefined();

      // Delete it
      await service.deleteFlag('flag_to_delete');

      // Verify it's gone
      flags = service.getAllFlags();
      expect(flags.find(f => f.name === 'flag_to_delete')).toBeUndefined();
    });

    it('should prevent deleting non-existent flags', async () => {
      await expect(service.deleteFlag('non_existent'))
        .rejects.toThrow('not found');
    });
  });

  describe('Caching', () => {
    it('should cache flag evaluations', async () => {
      const evaluation1 = await service.evaluateFlag('demographic_inference', { userId: 'test' });
      const evaluation2 = await service.evaluateFlag('demographic_inference', { userId: 'test' });

      // Should return the same object (cached)
      expect(evaluation1.evaluatedAt).toEqual(evaluation2.evaluatedAt);
    });

    it('should cache different contexts separately', async () => {
      const evaluation1 = await service.evaluateFlag('demographic_inference', { userId: 'user1' });
      const evaluation2 = await service.evaluateFlag('demographic_inference', { userId: 'user2' });

      // Different contexts should have different cache entries
      expect(evaluation1.context?.userId).toBe('user1');
      expect(evaluation2.context?.userId).toBe('user2');
    });

    it('should clear cache when flags are updated', async () => {
      // Get initial evaluation
      const evaluation1 = await service.evaluateFlag('demographic_inference');
      expect(evaluation1.enabled).toBe(true);

      // Update the flag
      await service.updateFlag('demographic_inference', { enabled: false });

      // Get new evaluation (should reflect the update)
      const evaluation2 = await service.evaluateFlag('demographic_inference');
      expect(evaluation2.enabled).toBe(false);
    });

    it('should clear all cache', () => {
      service.clearAllCache();
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalEvaluations');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });

    it('should provide usage statistics', async () => {
      // Generate some usage
      await service.isEnabled('demographic_inference');
      await service.isEnabled('competitive_analysis');
      await service.isEnabled('demographic_inference');

      const usageStats = service.getUsageStats();
      
      expect(Array.isArray(usageStats)).toBe(true);
      
      const demographicStats = usageStats.find(s => s.flagName === 'demographic_inference');
      if (demographicStats) {
        expect(demographicStats.evaluations).toBeGreaterThan(0);
        expect(demographicStats.enabledPercentage).toBeGreaterThanOrEqual(0);
        expect(demographicStats.enabledPercentage).toBeLessThanOrEqual(100);
      }
    });

    it('should provide health check', () => {
      const health = service.healthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('flagCount');
      expect(health).toHaveProperty('cacheSize');
      expect(health).toHaveProperty('details');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.flagCount).toBeGreaterThan(0);
    });
  });

  describe('Convenience Methods', () => {
    it('should provide isEnabled shortcut', async () => {
      const enabled = await service.isEnabled('demographic_inference');
      expect(typeof enabled).toBe('boolean');
      expect(enabled).toBe(true);
    });

    it('should provide getEvaluation method', async () => {
      const evaluation = await service.getEvaluation('demographic_inference');
      
      expect(evaluation).toHaveProperty('flagName');
      expect(evaluation).toHaveProperty('enabled');
      expect(evaluation).toHaveProperty('reason');
      expect(evaluation).toHaveProperty('evaluatedAt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown condition types', async () => {
      const flag: FeatureFlag = {
        name: 'test_unknown_condition',
        enabled: true,
        description: 'Test unknown condition',
        category: 'experimental',
        conditions: [
          {
            type: 'unknown_type' as any,
            operator: 'equals',
            value: 'test'
          }
        ]
      };

      await service.createFlag(flag);

      const evaluation = await service.evaluateFlag('test_unknown_condition');
      expect(evaluation.enabled).toBe(false);
      expect(evaluation.reason).toContain('Unknown condition type');
    });

    it('should handle unknown operators', async () => {
      const flag: FeatureFlag = {
        name: 'test_unknown_operator',
        enabled: true,
        description: 'Test unknown operator',
        category: 'experimental',
        conditions: [
          {
            type: 'user_id',
            operator: 'unknown_operator' as any,
            value: 'test'
          }
        ]
      };

      await service.createFlag(flag);

      const evaluation = await service.evaluateFlag('test_unknown_operator', { userId: 'test' });
      expect(evaluation.enabled).toBe(false);
    });

    it('should handle missing context values', async () => {
      const flag: FeatureFlag = {
        name: 'test_missing_context',
        enabled: true,
        description: 'Test missing context',
        category: 'experimental',
        conditions: [
          {
            type: 'user_id',
            operator: 'equals',
            value: 'test_user'
          }
        ]
      };

      await service.createFlag(flag);

      // Evaluate without providing userId in context
      const evaluation = await service.evaluateFlag('test_missing_context', {});
      expect(evaluation.enabled).toBe(false);
    });

    it('should handle rollout percentage edge cases', async () => {
      const flag100: FeatureFlag = {
        name: 'test_100_percent',
        enabled: true,
        description: 'Test 100% rollout',
        category: 'experimental',
        rolloutPercentage: 100
      };

      const flag0: FeatureFlag = {
        name: 'test_0_percent',
        enabled: true,
        description: 'Test 0% rollout',
        category: 'experimental',
        rolloutPercentage: 0
      };

      await service.createFlag(flag100);
      await service.createFlag(flag0);

      // 100% rollout should always be enabled
      const evaluation100 = await service.evaluateFlag('test_100_percent', { userId: 'any_user' });
      expect(evaluation100.enabled).toBe(true);

      // 0% rollout should always be disabled
      const evaluation0 = await service.evaluateFlag('test_0_percent', { userId: 'any_user' });
      expect(evaluation0.enabled).toBe(false);
    });
  });
});