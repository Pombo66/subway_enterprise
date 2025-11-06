/**
 * Shared Model Configuration Service
 * Consolidated model configuration management for AI operations
 */

export enum AIOperationType {
  RATIONALE_GENERATION = 'RATIONALE_GENERATION',
  MARKET_ANALYSIS = 'MARKET_ANALYSIS',
  STRATEGIC_SCORING = 'STRATEGIC_SCORING',
  LOCATION_DISCOVERY = 'LOCATION_DISCOVERY',
  COMPETITIVE_ANALYSIS = 'COMPETITIVE_ANALYSIS',
  VIABILITY_SCORING = 'VIABILITY_SCORING'
}

export interface ModelConfig {
  model: string;
  maxTokens: number;
  reasoningEffort: 'minimal' | 'low' | 'medium' | 'high';
  textVerbosity: 'low' | 'medium' | 'high';
  timeoutSeconds: number;
}

export class ModelConfigurationManager {
  private static instance: ModelConfigurationManager;
  private readonly modelConfigs: Map<AIOperationType, ModelConfig>;

  private constructor() {
    this.modelConfigs = new Map();
    this.initializeDefaultConfigs();
  }

  static getInstance(): ModelConfigurationManager {
    if (!ModelConfigurationManager.instance) {
      ModelConfigurationManager.instance = new ModelConfigurationManager();
    }
    return ModelConfigurationManager.instance;
  }

  private initializeDefaultConfigs(): void {
    // Optimized configurations based on requirements
    this.modelConfigs.set(AIOperationType.RATIONALE_GENERATION, {
      model: 'gpt-4o',
      maxTokens: 250, // Reduced from 1000 to 250
      reasoningEffort: 'low',
      textVerbosity: 'low',
      timeoutSeconds: 25
    });

    this.modelConfigs.set(AIOperationType.MARKET_ANALYSIS, {
      model: 'gpt-4o',
      maxTokens: 4000, // Reduced from 16000 to 4000
      reasoningEffort: 'medium', // Reduced from high to medium
      textVerbosity: 'medium',
      timeoutSeconds: 90
    });

    this.modelConfigs.set(AIOperationType.STRATEGIC_SCORING, {
      model: 'gpt-4o',
      maxTokens: 2000,
      reasoningEffort: 'medium',
      textVerbosity: 'medium',
      timeoutSeconds: 60
    });

    this.modelConfigs.set(AIOperationType.LOCATION_DISCOVERY, {
      model: 'gpt-4o',
      maxTokens: 1500,
      reasoningEffort: 'low',
      textVerbosity: 'low',
      timeoutSeconds: 45
    });

    this.modelConfigs.set(AIOperationType.COMPETITIVE_ANALYSIS, {
      model: 'gpt-4o',
      maxTokens: 3000,
      reasoningEffort: 'medium',
      textVerbosity: 'medium',
      timeoutSeconds: 75
    });

    this.modelConfigs.set(AIOperationType.VIABILITY_SCORING, {
      model: 'gpt-4o',
      maxTokens: 1000,
      reasoningEffort: 'low',
      textVerbosity: 'low',
      timeoutSeconds: 30
    });
  }

  getModelForOperation(operation: AIOperationType | string): string {
    const operationType = typeof operation === 'string' ? 
      AIOperationType[operation as keyof typeof AIOperationType] : 
      operation;
      
    const config = this.modelConfigs.get(operationType);
    if (!config) {
      console.warn(`No model configuration found for operation: ${operation}, using default`);
      return 'gpt-4o';
    }
    return config.model;
  }

  getConfigForOperation(operation: AIOperationType | string): ModelConfig {
    const operationType = typeof operation === 'string' ? 
      AIOperationType[operation as keyof typeof AIOperationType] : 
      operation;
      
    const config = this.modelConfigs.get(operationType);
    if (!config) {
      console.warn(`No configuration found for operation: ${operation}, using default`);
      return {
        model: 'gpt-4o',
        maxTokens: 2000,
        reasoningEffort: 'medium',
        textVerbosity: 'medium',
        timeoutSeconds: 60
      };
    }
    return { ...config }; // Return copy to prevent mutation
  }

  updateConfigForOperation(operation: AIOperationType, config: Partial<ModelConfig>): void {
    const currentConfig = this.getConfigForOperation(operation);
    const updatedConfig = { ...currentConfig, ...config };
    this.modelConfigs.set(operation, updatedConfig);
    
    console.log(`Updated configuration for ${operation}:`, updatedConfig);
  }

  getAllConfigurations(): Record<string, ModelConfig> {
    const configs: Record<string, ModelConfig> = {};
    for (const [operation, config] of this.modelConfigs.entries()) {
      configs[operation] = { ...config };
    }
    return configs;
  }

  resetToDefaults(): void {
    this.modelConfigs.clear();
    this.initializeDefaultConfigs();
    console.log('Model configurations reset to defaults');
  }

  // Utility methods for common operations
  getMaxTokensForOperation(operation: AIOperationType | string): number {
    return this.getConfigForOperation(operation).maxTokens;
  }

  getTimeoutForOperation(operation: AIOperationType | string): number {
    return this.getConfigForOperation(operation).timeoutSeconds;
  }

  getReasoningEffortForOperation(operation: AIOperationType | string): string {
    return this.getConfigForOperation(operation).reasoningEffort;
  }

  getTextVerbosityForOperation(operation: AIOperationType | string): string {
    return this.getConfigForOperation(operation).textVerbosity;
  }
}
