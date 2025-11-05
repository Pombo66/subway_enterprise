import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { EnhancedIntelligenceConfigService, EnhancedIntelligenceConfig } from '../config/enhanced-intelligence.config';
import { FeatureFlagsService, FeatureFlag, FeatureFlagEvaluation } from '../config/feature-flags.service';

interface ConfigUpdateRequest {
  section: 'features' | 'performance' | 'thresholds' | 'ai' | 'cache' | 'monitoring';
  updates: Record<string, any>;
}

interface FeatureFlagRequest {
  name: string;
  enabled: boolean;
  description?: string;
  category?: 'intelligence' | 'performance' | 'monitoring' | 'experimental';
  rolloutPercentage?: number;
  conditions?: any[];
}

interface FeatureFlagEvaluationRequest {
  context?: Record<string, any>;
}

@Controller('intelligence/config')
export class IntelligenceConfigController {
  private readonly logger = new Logger(IntelligenceConfigController.name);

  constructor(
    private readonly configService: EnhancedIntelligenceConfigService,
    private readonly featureFlagsService: FeatureFlagsService
  ) {}

  // Configuration endpoints
  @Get()
  async getConfiguration(): Promise<EnhancedIntelligenceConfig> {
    try {
      return this.configService.getConfig();
    } catch (error) {
      this.logger.error('Failed to get configuration:', error);
      throw new HttpException('Failed to retrieve configuration', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('features')
  async getFeatureFlags(): Promise<EnhancedIntelligenceConfig['features']> {
    try {
      return this.configService.getFeatureFlags();
    } catch (error) {
      this.logger.error('Failed to get feature flags:', error);
      throw new HttpException('Failed to retrieve feature flags', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('performance')
  async getPerformanceSettings(): Promise<EnhancedIntelligenceConfig['performance']> {
    try {
      return this.configService.getPerformanceSettings();
    } catch (error) {
      this.logger.error('Failed to get performance settings:', error);
      throw new HttpException('Failed to retrieve performance settings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('thresholds')
  async getThresholds(): Promise<EnhancedIntelligenceConfig['thresholds']> {
    try {
      return this.configService.getThresholds();
    } catch (error) {
      this.logger.error('Failed to get thresholds:', error);
      throw new HttpException('Failed to retrieve thresholds', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('ai')
  async getAIConfig(): Promise<EnhancedIntelligenceConfig['ai']> {
    try {
      return this.configService.getAIConfig();
    } catch (error) {
      this.logger.error('Failed to get AI configuration:', error);
      throw new HttpException('Failed to retrieve AI configuration', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('cache')
  async getCacheConfig(): Promise<EnhancedIntelligenceConfig['cache']> {
    try {
      return this.configService.getCacheConfig();
    } catch (error) {
      this.logger.error('Failed to get cache configuration:', error);
      throw new HttpException('Failed to retrieve cache configuration', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('monitoring')
  async getMonitoringConfig(): Promise<EnhancedIntelligenceConfig['monitoring']> {
    try {
      return this.configService.getMonitoringConfig();
    } catch (error) {
      this.logger.error('Failed to get monitoring configuration:', error);
      throw new HttpException('Failed to retrieve monitoring configuration', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  async getConfigurationHealth(): Promise<any> {
    try {
      return this.configService.getConfigurationHealth();
    } catch (error) {
      this.logger.error('Failed to get configuration health:', error);
      throw new HttpException('Failed to retrieve configuration health', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('reload')
  async reloadConfiguration(): Promise<{ message: string; timestamp: Date }> {
    try {
      await this.configService.reloadConfiguration();
      return {
        message: 'Configuration reloaded successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to reload configuration:', error);
      throw new HttpException('Failed to reload configuration', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('update')
  async updateConfiguration(@Body() request: ConfigUpdateRequest): Promise<{ message: string }> {
    try {
      const { section, updates } = request;

      switch (section) {
        case 'features':
          for (const [key, value] of Object.entries(updates)) {
            await this.configService.updateFeatureFlag(key as any, value);
          }
          break;
        case 'performance':
          for (const [key, value] of Object.entries(updates)) {
            await this.configService.updatePerformanceSetting(key as any, value);
          }
          break;
        case 'thresholds':
          for (const [key, value] of Object.entries(updates)) {
            await this.configService.updateThreshold(key as any, value);
          }
          break;
        default:
          throw new HttpException(`Unsupported configuration section: ${section}`, HttpStatus.BAD_REQUEST);
      }

      return { message: `Configuration section '${section}' updated successfully` };
    } catch (error) {
      this.logger.error('Failed to update configuration:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to update configuration', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('export')
  async exportConfiguration(): Promise<{ configuration: string; timestamp: Date }> {
    try {
      const configuration = this.configService.exportConfiguration();
      return {
        configuration,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to export configuration:', error);
      throw new HttpException('Failed to export configuration', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('import')
  async importConfiguration(@Body() body: { configuration: string }): Promise<{ message: string }> {
    try {
      await this.configService.importConfiguration(body.configuration);
      return { message: 'Configuration imported successfully' };
    } catch (error) {
      this.logger.error('Failed to import configuration:', error);
      throw new HttpException('Failed to import configuration', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('validate')
  async validateConfiguration(@Body() config: Partial<EnhancedIntelligenceConfig>): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    try {
      return this.configService.validateConfiguration(config);
    } catch (error) {
      this.logger.error('Failed to validate configuration:', error);
      throw new HttpException('Failed to validate configuration', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Feature flag endpoints
  @Get('flags')
  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      return this.featureFlagsService.getAllFlags();
    } catch (error) {
      this.logger.error('Failed to get feature flags:', error);
      throw new HttpException('Failed to retrieve feature flags', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('flags/category/:category')
  async getFeatureFlagsByCategory(
    @Param('category') category: 'intelligence' | 'performance' | 'monitoring' | 'experimental'
  ): Promise<FeatureFlag[]> {
    try {
      return this.featureFlagsService.getFlagsByCategory(category);
    } catch (error) {
      this.logger.error('Failed to get feature flags by category:', error);
      throw new HttpException('Failed to retrieve feature flags', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('flags/:flagName')
  async evaluateFeatureFlag(
    @Param('flagName') flagName: string,
    @Query() query: FeatureFlagEvaluationRequest
  ): Promise<FeatureFlagEvaluation> {
    try {
      const context = query.context || {};
      return await this.featureFlagsService.getEvaluation(flagName, context);
    } catch (error) {
      this.logger.error('Failed to evaluate feature flag:', error);
      throw new HttpException('Failed to evaluate feature flag', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('flags/:flagName/evaluate')
  async evaluateFeatureFlagWithContext(
    @Param('flagName') flagName: string,
    @Body() body: { context?: Record<string, any> }
  ): Promise<FeatureFlagEvaluation> {
    try {
      const context = body.context || {};
      return await this.featureFlagsService.getEvaluation(flagName, context);
    } catch (error) {
      this.logger.error('Failed to evaluate feature flag with context:', error);
      throw new HttpException('Failed to evaluate feature flag', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('flags')
  async createFeatureFlag(@Body() request: FeatureFlagRequest): Promise<{ message: string }> {
    try {
      const flag: FeatureFlag = {
        name: request.name,
        enabled: request.enabled,
        description: request.description || '',
        category: request.category || 'experimental',
        rolloutPercentage: request.rolloutPercentage,
        conditions: request.conditions
      };

      await this.featureFlagsService.createFlag(flag);
      return { message: `Feature flag '${request.name}' created successfully` };
    } catch (error) {
      this.logger.error('Failed to create feature flag:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      throw new HttpException('Failed to create feature flag', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('flags/:flagName')
  async updateFeatureFlag(
    @Param('flagName') flagName: string,
    @Body() updates: Partial<FeatureFlagRequest>
  ): Promise<{ message: string }> {
    try {
      await this.featureFlagsService.updateFlag(flagName, updates);
      return { message: `Feature flag '${flagName}' updated successfully` };
    } catch (error) {
      this.logger.error('Failed to update feature flag:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Failed to update feature flag', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('flags/:flagName')
  async deleteFeatureFlag(@Param('flagName') flagName: string): Promise<{ message: string }> {
    try {
      await this.featureFlagsService.deleteFlag(flagName);
      return { message: `Feature flag '${flagName}' deleted successfully` };
    } catch (error) {
      this.logger.error('Failed to delete feature flag:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Failed to delete feature flag', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('flags/stats/usage')
  async getFeatureFlagUsageStats(): Promise<any> {
    try {
      return this.featureFlagsService.getUsageStats();
    } catch (error) {
      this.logger.error('Failed to get feature flag usage stats:', error);
      throw new HttpException('Failed to retrieve usage statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('flags/stats/cache')
  async getFeatureFlagCacheStats(): Promise<any> {
    try {
      return this.featureFlagsService.getCacheStats();
    } catch (error) {
      this.logger.error('Failed to get feature flag cache stats:', error);
      throw new HttpException('Failed to retrieve cache statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('flags/cache/clear')
  async clearFeatureFlagCache(): Promise<{ message: string }> {
    try {
      this.featureFlagsService.clearAllCache();
      return { message: 'Feature flag cache cleared successfully' };
    } catch (error) {
      this.logger.error('Failed to clear feature flag cache:', error);
      throw new HttpException('Failed to clear cache', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('flags/health')
  async getFeatureFlagHealth(): Promise<any> {
    try {
      return this.featureFlagsService.healthCheck();
    } catch (error) {
      this.logger.error('Failed to get feature flag health:', error);
      throw new HttpException('Failed to retrieve health status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Utility endpoints
  @Get('environment')
  async getEnvironmentInfo(): Promise<{
    environment: string;
    nodeEnv: string;
    configSources: string[];
    timestamp: Date;
  }> {
    try {
      const envConfig = this.configService.getEnvironmentConfig();
      const health = this.configService.getConfigurationHealth();
      
      return {
        environment: envConfig.name,
        nodeEnv: process.env.NODE_ENV || 'unknown',
        configSources: health.loadedSources,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get environment info:', error);
      throw new HttpException('Failed to retrieve environment information', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('status')
  async getOverallStatus(): Promise<{
    configuration: any;
    featureFlags: any;
    timestamp: Date;
  }> {
    try {
      const configHealth = this.configService.getConfigurationHealth();
      const flagHealth = this.featureFlagsService.healthCheck();
      
      return {
        configuration: configHealth,
        featureFlags: flagHealth,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get overall status:', error);
      throw new HttpException('Failed to retrieve status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}