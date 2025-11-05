import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ModelConfigurationManager, AIOperationType } from './ai/model-configuration.service';
import { 
  OpenAIRationaleService as SharedRationaleService,
  RationaleContext,
  RationaleOutput,
  OpenAIRationaleConfig
} from '@subway/shared-openai';

// Re-export interfaces for backward compatibility
export { RationaleContext, RationaleOutput };

@Injectable()
export class OpenAIRationaleService {
  private readonly logger = new Logger(OpenAIRationaleService.name);
  private readonly sharedService: SharedRationaleService;
  private readonly modelConfigManager: ModelConfigurationManager;

  constructor(private readonly prisma: PrismaClient) {
    this.modelConfigManager = new ModelConfigurationManager();
    
    const config: OpenAIRationaleConfig = {
      maxTokens: 250, // Optimized from 1000 to 250
      cacheTtlDays: 90,
      reasoningEffort: 'low',
      textVerbosity: 'low',
      enableFallback: true // BFF version uses fallback
    };

    this.sharedService = new SharedRationaleService(
      this.prisma,
      this.modelConfigManager,
      config
    );

    this.logger.log('OpenAI Rationale Service initialized (using shared implementation)');
  }

  /**
   * Generate rationale for an expansion suggestion
   */
  async generateRationale(context: RationaleContext): Promise<string> {
    try {
      const output = await this.sharedService.generateRationale(context);
      
      this.logger.log(
        `Generated rationale for ${context.lat.toFixed(5)}, ${context.lng.toFixed(5)}: ` +
        `"${output.text.substring(0, 50)}..."`
      );
      
      return output.text;
    } catch (error) {
      this.logger.error(`OpenAI API error for ${context.lat}, ${context.lng}:`, error);
      throw error;
    }
  }

  /**
   * Generate structured rationale output (enhanced version)
   */
  async generateStructuredRationale(context: RationaleContext): Promise<RationaleOutput> {
    return this.sharedService.generateRationale(context);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.sharedService.getCacheStats();
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats() {
    this.sharedService.resetCacheStats();
  }
}
