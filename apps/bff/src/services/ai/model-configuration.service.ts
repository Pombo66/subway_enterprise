import { Injectable, Logger } from '@nestjs/common';
import { getValidatedEnvironmentModel } from '../../utils/model-validation.util';

export enum AIOperationType {
  MARKET_ANALYSIS = 'market_analysis',
  LOCATION_DISCOVERY = 'location_discovery',
  STRATEGIC_SCORING = 'strategic_scoring',
  RATIONALE_GENERATION = 'rationale_generation'
}

export interface ModelConfig {
  marketAnalysisModel: string;
  locationDiscoveryModel: string;
  strategicScoringModel: string;
  rationaleGenerationModel: string;
}

export interface ModelPricing {
  inputTokensPerMillion: number;
  outputTokensPerMillion: number;
  currency: string;
}

export interface ModelValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class ModelConfigurationManager {
  private readonly logger = new Logger(ModelConfigurationManager.name);
  
  private readonly SUPPORTED_MODELS = [
    'gpt-5-nano',
    'gpt-5-mini',
    'gpt-5.1'
  ];

  private readonly MODEL_PRICING: Record<string, ModelPricing> = {
    'gpt-5-nano': {
      inputTokensPerMillion: 50, // $0.05 per 1M input tokens (actual pricing)
      outputTokensPerMillion: 400, // $0.40 per 1M output tokens (actual pricing)
      currency: 'USD'
    },
    'gpt-5-mini': {
      inputTokensPerMillion: 250, // $0.25 per 1M input tokens (actual pricing)
      outputTokensPerMillion: 2000, // $2.00 per 1M output tokens (actual pricing)
      currency: 'USD'
    },
    'gpt-5.1': {
      inputTokensPerMillion: 1250, // $1.25 per 1M input tokens (actual pricing)
      outputTokensPerMillion: 10000, // $10.00 per 1M output tokens (actual pricing)
      currency: 'USD'
    }
  };

  private readonly DEFAULT_CONFIG: ModelConfig = {
    marketAnalysisModel: 'gpt-5-mini',
    locationDiscoveryModel: 'gpt-5-nano',
    strategicScoringModel: 'gpt-5-mini',
    rationaleGenerationModel: 'gpt-5-mini'
  };

  private config: ModelConfig;

  constructor() {
    this.config = this.loadConfiguration();
    this.validateModelConfiguration();
    this.logger.log('Model Configuration Manager initialized');
    this.logger.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);
  }

  /**
   * Get the appropriate model for a specific AI operation type
   */
  getModelForOperation(operation: AIOperationType): string {
    switch (operation) {
      case AIOperationType.MARKET_ANALYSIS:
        return this.config.marketAnalysisModel;
      case AIOperationType.LOCATION_DISCOVERY:
        return this.config.locationDiscoveryModel;
      case AIOperationType.STRATEGIC_SCORING:
        return this.config.strategicScoringModel;
      case AIOperationType.RATIONALE_GENERATION:
        return this.config.rationaleGenerationModel;
      default:
        this.logger.warn(`Unknown operation type: ${operation}, falling back to default`);
        return this.DEFAULT_CONFIG.rationaleGenerationModel;
    }
  }

  /**
   * Validate the current model configuration
   */
  validateModelConfiguration(): ModelValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check each model in the configuration
    Object.entries(this.config).forEach(([operationType, model]) => {
      if (!model || typeof model !== 'string') {
        errors.push(`${operationType} model is not defined or invalid`);
        return;
      }

      // Check if model is supported
      if (!this.SUPPORTED_MODELS.includes(model)) {
        errors.push(`Unsupported model '${model}' for ${operationType}. Supported models: ${this.SUPPORTED_MODELS.join(', ')}`);
      }

      // Check for GPT-4o references (should not exist)
      if (model.includes('gpt-4o')) {
        errors.push(`Legacy GPT-4o model '${model}' detected in ${operationType}. Use GPT-5 family models only.`);
      }

      // Warn about potentially expensive configurations
      if (operationType === 'locationDiscoveryModel' && model !== 'gpt-5-nano') {
        warnings.push(`Location discovery is using '${model}' instead of cost-effective 'gpt-5-nano'`);
      }
    });

    const result: ModelValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    if (!result.isValid) {
      this.logger.error('Model configuration validation failed:', errors);
    }

    if (warnings.length > 0) {
      this.logger.warn('Model configuration warnings:', warnings);
    }

    return result;
  }

  /**
   * Update the model configuration
   */
  updateModelConfiguration(config: Partial<ModelConfig>): void {
    const newConfig = { ...this.config, ...config };
    
    // Validate the new configuration
    const tempConfig = this.config;
    this.config = newConfig;
    const validation = this.validateModelConfiguration();
    
    if (!validation.isValid) {
      // Revert to previous configuration
      this.config = tempConfig;
      throw new Error(`Invalid model configuration: ${validation.errors.join(', ')}`);
    }

    this.logger.log(`Model configuration updated: ${JSON.stringify(config, null, 2)}`);
  }

  /**
   * Get pricing information for a specific model
   */
  getModelPricing(model: string): ModelPricing {
    const pricing = this.MODEL_PRICING[model];
    if (!pricing) {
      this.logger.warn(`No pricing information available for model: ${model}`);
      // Return default pricing for unknown models
      return {
        inputTokensPerMillion: 200,
        outputTokensPerMillion: 800,
        currency: 'USD'
      };
    }
    return pricing;
  }

  /**
   * Get the current configuration
   */
  getConfiguration(): ModelConfig {
    return { ...this.config };
  }

  /**
   * Get all supported models
   */
  getSupportedModels(): string[] {
    return [...this.SUPPORTED_MODELS];
  }

  /**
   * Check if a model is supported
   */
  isModelSupported(model: string): boolean {
    return this.SUPPORTED_MODELS.includes(model);
  }

  /**
   * Load configuration from environment variables with fallbacks
   */
  private loadConfiguration(): ModelConfig {
    return {
      marketAnalysisModel: this.getEnvironmentModel('MARKET_ANALYSIS_MODEL', this.DEFAULT_CONFIG.marketAnalysisModel),
      locationDiscoveryModel: this.getEnvironmentModel('LOCATION_DISCOVERY_MODEL', this.DEFAULT_CONFIG.locationDiscoveryModel),
      strategicScoringModel: this.getEnvironmentModel('STRATEGIC_SCORING_MODEL', this.DEFAULT_CONFIG.strategicScoringModel),
      rationaleGenerationModel: this.getEnvironmentModel('RATIONALE_GENERATION_MODEL', this.DEFAULT_CONFIG.rationaleGenerationModel)
    };
  }

  /**
   * Get model from environment with validation and fallback
   */
  private getEnvironmentModel(envVar: string, fallback: string): string {
    return getValidatedEnvironmentModel(envVar, fallback);
  }
}