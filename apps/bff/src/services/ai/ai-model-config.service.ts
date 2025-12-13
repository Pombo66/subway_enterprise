import { Injectable, Logger } from '@nestjs/common';

/**
 * AI Model Configuration Service
 * Centralized model selection and configuration
 * Makes it easy to upgrade models or switch between them
 */

export type AIModel = 'gpt-5.2' | 'gpt-5-mini' | 'gpt-5-nano' | 'o1' | 'o1-mini';

export interface ModelConfig {
  model: AIModel;
  maxTokens: number;
  temperature: number;
  reasoning?: {
    effort: 'low' | 'medium' | 'high';
  };
}

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

@Injectable()
export class AIModelConfigService {
  private readonly logger = new Logger(AIModelConfigService.name);

  // Model pricing (USD per 1M tokens)
  private readonly PRICING: Record<AIModel, ModelPricing> = {
    'gpt-5.2': {
      inputPerMillion: 2.50,
      outputPerMillion: 10.00
    },
    'gpt-5-mini': {
      inputPerMillion: 0.25,
      outputPerMillion: 2.00
    },
    'gpt-5-nano': {
      inputPerMillion: 0.05,
      outputPerMillion: 0.40
    },
    'o1': {
      inputPerMillion: 15.00,
      outputPerMillion: 60.00
    },
    'o1-mini': {
      inputPerMillion: 3.00,
      outputPerMillion: 12.00
    }
  };

  /**
   * Get model for store analysis
   * Can be overridden by environment variable or premium flag
   */
  getStoreAnalysisModel(premium: boolean = false): ModelConfig {
    if (premium) {
      const premiumModel = (process.env.AI_PREMIUM_ANALYSIS_MODEL || 'gpt-5.2') as AIModel;
      return this.getModelConfig(premiumModel, 'store_analysis');
    }

    const defaultModel = (process.env.AI_STORE_ANALYSIS_MODEL || 'gpt-5-mini') as AIModel;
    return this.getModelConfig(defaultModel, 'store_analysis');
  }

  /**
   * Get model for network analysis
   */
  getNetworkAnalysisModel(premium: boolean = false): ModelConfig {
    if (premium) {
      const premiumModel = (process.env.AI_PREMIUM_ANALYSIS_MODEL || 'gpt-5.2') as AIModel;
      return this.getModelConfig(premiumModel, 'network_analysis');
    }

    const defaultModel = (process.env.AI_NETWORK_ANALYSIS_MODEL || 'gpt-5-mini') as AIModel;
    return this.getModelConfig(defaultModel, 'network_analysis');
  }

  /**
   * Get model for continuous intelligence
   */
  getContinuousIntelligenceModel(): ModelConfig {
    const model = (process.env.AI_CONTINUOUS_INTELLIGENCE_MODEL || 'gpt-5-mini') as AIModel;
    return this.getModelConfig(model, 'continuous_intelligence');
  }

  /**
   * Get model for SubMind assistant
   */
  getSubMindModel(): ModelConfig {
    const model = (process.env.SUBMIND_MODEL || 'gpt-5-mini') as AIModel;
    return this.getModelConfig(model, 'submind');
  }

  /**
   * Get model configuration based on model and use case
   */
  private getModelConfig(model: AIModel, useCase: string): ModelConfig {
    const baseConfig: Record<AIModel, Omit<ModelConfig, 'model'>> = {
      'gpt-5.2': {
        maxTokens: 16000,
        temperature: 0.3,
        reasoning: { effort: 'medium' }
      },
      'gpt-5-mini': {
        maxTokens: 16000,
        temperature: 0.3,
        reasoning: { effort: 'low' }
      },
      'gpt-5-nano': {
        maxTokens: 8000,
        temperature: 0.2,
        reasoning: { effort: 'low' }
      },
      'o1': {
        maxTokens: 32000,
        temperature: 1.0, // o1 uses fixed temperature
        reasoning: { effort: 'high' }
      },
      'o1-mini': {
        maxTokens: 16000,
        temperature: 1.0,
        reasoning: { effort: 'medium' }
      }
    };

    // Adjust based on use case
    const config = { ...baseConfig[model], model };

    if (useCase === 'continuous_intelligence') {
      // Optimize for cost and speed
      config.maxTokens = Math.min(config.maxTokens, 8000);
      if (config.reasoning) {
        config.reasoning.effort = 'low';
      }
    }

    if (useCase === 'network_analysis') {
      // Allow more tokens for comprehensive analysis
      config.maxTokens = Math.min(config.maxTokens * 2, 32000);
    }

    return config;
  }

  /**
   * Calculate cost for a given token usage
   */
  calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
    const pricing = this.PRICING[model];
    
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
    
    return inputCost + outputCost;
  }

  /**
   * Estimate cost before making API call
   */
  estimateCost(model: AIModel, estimatedInputTokens: number, estimatedOutputTokens: number): {
    estimatedCost: number;
    costBreakdown: {
      input: number;
      output: number;
    };
  } {
    const pricing = this.PRICING[model];
    
    const inputCost = (estimatedInputTokens / 1_000_000) * pricing.inputPerMillion;
    const outputCost = (estimatedOutputTokens / 1_000_000) * pricing.outputPerMillion;
    
    return {
      estimatedCost: inputCost + outputCost,
      costBreakdown: {
        input: inputCost,
        output: outputCost
      }
    };
  }

  /**
   * Get model comparison for decision making
   */
  compareModels(inputTokens: number, outputTokens: number): Array<{
    model: AIModel;
    cost: number;
    quality: 'premium' | 'excellent' | 'good';
    speed: 'fast' | 'medium' | 'slow';
    recommended: boolean;
  }> {
    const models = [
      {
        model: 'gpt-5.2' as AIModel,
        cost: this.calculateCost('gpt-5.2', inputTokens, outputTokens),
        quality: 'premium' as const,
        speed: 'medium' as const,
        recommended: false
      },
      {
        model: 'gpt-5-mini' as AIModel,
        cost: this.calculateCost('gpt-5-mini', inputTokens, outputTokens),
        quality: 'excellent' as const,
        speed: 'fast' as const,
        recommended: true // Default recommendation
      },
      {
        model: 'gpt-5-nano' as AIModel,
        cost: this.calculateCost('gpt-5-nano', inputTokens, outputTokens),
        quality: 'good' as const,
        speed: 'fast' as const,
        recommended: false
      },
      {
        model: 'o1' as AIModel,
        cost: this.calculateCost('o1', inputTokens, outputTokens),
        quality: 'premium' as const,
        speed: 'slow' as const,
        recommended: false
      },
      {
        model: 'o1-mini' as AIModel,
        cost: this.calculateCost('o1-mini', inputTokens, outputTokens),
        quality: 'premium' as const,
        speed: 'medium' as const,
        recommended: false
      }
    ];
    
    return (models as Array<{
      model: AIModel;
      cost: number;
      quality: 'premium' | 'excellent' | 'good';
      speed: 'fast' | 'medium' | 'slow';
      recommended: boolean;
    }>).sort((a, b) => a.cost - b.cost);
  }

  /**
   * Log model usage for monitoring
   */
  logModelUsage(
    model: AIModel,
    useCase: string,
    inputTokens: number,
    outputTokens: number,
    duration: number
  ): void {
    const cost = this.calculateCost(model, inputTokens, outputTokens);
    
    this.logger.log({
      event: 'model_usage',
      model,
      useCase,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens
      },
      cost: cost.toFixed(6),
      duration,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get recommended model based on requirements
   */
  getRecommendedModel(requirements: {
    quality: 'premium' | 'excellent' | 'good';
    budget: 'unlimited' | 'moderate' | 'minimal';
    speed: 'critical' | 'important' | 'flexible';
    reasoning: 'deep' | 'standard' | 'simple';
  }): AIModel {
    // Premium quality requirements
    if (requirements.quality === 'premium') {
      if (requirements.reasoning === 'deep') return 'o1';
      if (requirements.budget === 'unlimited') return 'gpt-5.2';
      return 'o1-mini';
    }

    // Budget constraints
    if (requirements.budget === 'minimal') {
      return 'gpt-5-nano';
    }

    // Default to gpt-5-mini for most cases
    return 'gpt-5-mini';
  }
}
