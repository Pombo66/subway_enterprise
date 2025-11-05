import { AIOperationType, ModelConfig, ModelPricing, ModelValidationResult } from '../services/ai/model-configuration.service';

/**
 * Interface for the Model Configuration Manager service
 */
export interface IModelConfigurationManager {
  /**
   * Get the appropriate model for a specific AI operation type
   */
  getModelForOperation(operation: AIOperationType): string;

  /**
   * Validate the current model configuration
   */
  validateModelConfiguration(): ModelValidationResult;

  /**
   * Update the model configuration
   */
  updateModelConfiguration(config: Partial<ModelConfig>): void;

  /**
   * Get pricing information for a specific model
   */
  getModelPricing(model: string): ModelPricing;

  /**
   * Get the current configuration
   */
  getConfiguration(): ModelConfig;

  /**
   * Get all supported models
   */
  getSupportedModels(): string[];

  /**
   * Check if a model is supported
   */
  isModelSupported(model: string): boolean;
}

// Re-export types for convenience
export type { AIOperationType, ModelConfig, ModelPricing, ModelValidationResult };