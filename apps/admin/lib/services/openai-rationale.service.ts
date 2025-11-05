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

export class OpenAIRationaleService {
  private readonly sharedService: SharedRationaleService;
  private readonly modelConfigManager: ModelConfigurationManager;

  constructor(private readonly prisma: PrismaClient) {
    this.modelConfigManager = ModelConfigurationManager.getInstance();
    
    const config: OpenAIRationaleConfig = {
      maxTokens: 250, // Optimized from 1000 to 250
      cacheTtlDays: 90,
      reasoningEffort: 'low',
      textVerbosity: 'low',
      enableFallback: false // Admin version doesn't use fallback
    };

    this.sharedService = new SharedRationaleService(
      this.prisma,
      this.modelConfigManager,
      config
    );

    const model = this.modelConfigManager.getModelForOperation(AIOperationType.RATIONALE_GENERATION);
    console.log(`🤖 OpenAI Rationale Service initialized with ${model} (using shared implementation)`);
  }

  async generateRationale(context: RationaleContext): Promise<RationaleOutput> {
    return this.sharedService.generateRationale(context);
  }

  getCacheStats() {
    return this.sharedService.getCacheStats();
  }

  resetCacheStats() {
    this.sharedService.resetCacheStats();
  }


}
