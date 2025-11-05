import { Logger } from '@nestjs/common';

const logger = new Logger('ModelValidation');

/**
 * Validates that environment variables don't contain legacy GPT-4o models
 */
export function validateEnvironmentModels(): void {
  const modelEnvVars = [
    'MARKET_ANALYSIS_MODEL',
    'LOCATION_DISCOVERY_MODEL', 
    'STRATEGIC_SCORING_MODEL',
    'RATIONALE_GENERATION_MODEL',
    'DEMOGRAPHIC_INFERENCE_MODEL',
    'EXPANSION_OPENAI_MODEL'
  ];

  const errors: string[] = [];
  const warnings: string[] = [];

  modelEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    
    if (value && value.includes('gpt-4o')) {
      errors.push(`Environment variable ${envVar} contains legacy GPT-4o model '${value}'. Use GPT-5 family models only.`);
    }
    
    if (value && !['gpt-5-nano', 'gpt-5-mini'].includes(value)) {
      warnings.push(`Environment variable ${envVar} contains unsupported model '${value}'. Supported models: gpt-5-nano, gpt-5-mini`);
    }
  });

  if (errors.length > 0) {
    logger.error('Model validation failed:', errors);
    throw new Error(`Invalid model configuration: ${errors.join(', ')}`);
  }

  if (warnings.length > 0) {
    logger.warn('Model validation warnings:', warnings);
  }

  logger.log('Model configuration validation passed');
}

/**
 * Get environment-based model override with validation
 */
export function getValidatedEnvironmentModel(envVar: string, fallback: string): string {
  const value = process.env[envVar];
  
  if (!value) {
    return fallback;
  }

  // Reject GPT-4o models
  if (value.includes('gpt-4o')) {
    logger.warn(`Environment variable ${envVar} contains legacy GPT-4o model '${value}'. Using fallback: ${fallback}`);
    return fallback;
  }

  return value;
}