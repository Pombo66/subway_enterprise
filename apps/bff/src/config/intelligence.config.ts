import { IntelligenceConfig } from '../types/intelligence.types';

export class IntelligenceConfigManager {
  private static instance: IntelligenceConfigManager;
  private config: IntelligenceConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  public static getInstance(): IntelligenceConfigManager {
    if (!IntelligenceConfigManager.instance) {
      IntelligenceConfigManager.instance = new IntelligenceConfigManager();
    }
    return IntelligenceConfigManager.instance;
  }

  public getConfig(): IntelligenceConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<IntelligenceConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfiguration();
  }

  private loadConfiguration(): IntelligenceConfig {
    const config: IntelligenceConfig = {
      // Feature flags
      enableDemographicInference: process.env.ENABLE_DEMOGRAPHIC_INFERENCE === 'true' || true,
      enableCompetitiveAnalysis: process.env.ENABLE_COMPETITIVE_ANALYSIS === 'true' || true,
      enableViabilityAssessment: process.env.ENABLE_VIABILITY_ASSESSMENT === 'true' || true,
      enableStrategicRationale: process.env.ENABLE_STRATEGIC_RATIONALE === 'true' || true,
      
      // Thresholds
      minCommercialViabilityScore: parseFloat(process.env.MIN_COMMERCIAL_VIABILITY_SCORE || '0.3'),
      maxDistanceToTownCenter: parseInt(process.env.MAX_DISTANCE_TO_TOWN_CENTER || '1000', 10), // 1km
      minMarketFitScore: parseFloat(process.env.MIN_MARKET_FIT_SCORE || '0.4'),
      
      // AI Configuration
      aiProvider: (process.env.AI_PROVIDER as 'openai' | 'anthropic') || 'openai',
      demographicInferenceModel: process.env.DEMOGRAPHIC_INFERENCE_MODEL || 'gpt-5-mini',
      rationaleGenerationModel: process.env.RATIONALE_GENERATION_MODEL || 'gpt-5-mini'
    };

    this.validateConfiguration(config);
    return config;
  }

  private validateConfiguration(config: IntelligenceConfig = this.config): void {
    // Validate thresholds
    if (config.minCommercialViabilityScore < 0 || config.minCommercialViabilityScore > 1) {
      throw new Error('minCommercialViabilityScore must be between 0 and 1');
    }

    if (config.maxDistanceToTownCenter < 0) {
      throw new Error('maxDistanceToTownCenter must be positive');
    }

    if (config.minMarketFitScore < 0 || config.minMarketFitScore > 1) {
      throw new Error('minMarketFitScore must be between 0 and 1');
    }

    // Validate AI provider
    if (!['openai', 'anthropic'].includes(config.aiProvider)) {
      throw new Error('aiProvider must be either "openai" or "anthropic"');
    }

    // Validate model names
    if (!config.demographicInferenceModel || config.demographicInferenceModel.trim() === '') {
      throw new Error('demographicInferenceModel cannot be empty');
    }

    if (!config.rationaleGenerationModel || config.rationaleGenerationModel.trim() === '') {
      throw new Error('rationaleGenerationModel cannot be empty');
    }
  }

  public isFeatureEnabled(feature: keyof Pick<IntelligenceConfig, 
    'enableDemographicInference' | 
    'enableCompetitiveAnalysis' | 
    'enableViabilityAssessment' | 
    'enableStrategicRationale'
  >): boolean {
    return this.config[feature];
  }

  public getThreshold(threshold: keyof Pick<IntelligenceConfig,
    'minCommercialViabilityScore' |
    'maxDistanceToTownCenter' |
    'minMarketFitScore'
  >): number {
    return this.config[threshold];
  }

  public getAIConfig(): {
    provider: string;
    demographicModel: string;
    rationaleModel: string;
  } {
    return {
      provider: this.config.aiProvider,
      demographicModel: this.config.demographicInferenceModel,
      rationaleModel: this.config.rationaleGenerationModel
    };
  }
}

// Default configuration constants
export const DEFAULT_INTELLIGENCE_CONFIG: IntelligenceConfig = {
  enableDemographicInference: true,
  enableCompetitiveAnalysis: true,
  enableViabilityAssessment: true,
  enableStrategicRationale: true,
  minCommercialViabilityScore: 0.3,
  maxDistanceToTownCenter: 1000,
  minMarketFitScore: 0.4,
  aiProvider: 'openai',
  demographicInferenceModel: 'gpt-5-mini',
  rationaleGenerationModel: 'gpt-5-mini'
};

// Configuration validation utilities
export function validateIntelligenceConfig(config: Partial<IntelligenceConfig>): string[] {
  const errors: string[] = [];

  if (config.minCommercialViabilityScore !== undefined) {
    if (config.minCommercialViabilityScore < 0 || config.minCommercialViabilityScore > 1) {
      errors.push('minCommercialViabilityScore must be between 0 and 1');
    }
  }

  if (config.maxDistanceToTownCenter !== undefined) {
    if (config.maxDistanceToTownCenter < 0) {
      errors.push('maxDistanceToTownCenter must be positive');
    }
  }

  if (config.minMarketFitScore !== undefined) {
    if (config.minMarketFitScore < 0 || config.minMarketFitScore > 1) {
      errors.push('minMarketFitScore must be between 0 and 1');
    }
  }

  if (config.aiProvider !== undefined) {
    if (!['openai', 'anthropic'].includes(config.aiProvider)) {
      errors.push('aiProvider must be either "openai" or "anthropic"');
    }
  }

  return errors;
}