import { PrismaClient } from '@prisma/client';
import {
  ExpansionService as SharedExpansionService,
  GenerationParams,
  RegionFilter,
  ExpansionSuggestionData,
  ExpansionJobResult,
  ExpansionConfig
} from '@subway/shared-expansion';

// Re-export interfaces for backward compatibility
export {
  GenerationParams,
  RegionFilter,
  ExpansionSuggestionData,
  ExpansionJobResult
};

export class ExpansionGenerationService {
  private readonly sharedService: SharedExpansionService;

  constructor(private readonly prisma: PrismaClient) {
    const config: ExpansionConfig = {
      bffUrl: process.env.BFF_URL || 'http://localhost:3001',
      timeoutMs: 300000, // 5 minutes
      fallbackEnabled: true
    };

    this.sharedService = new SharedExpansionService(this.prisma, config);
    console.log('🏢 Expansion Generation Service initialized (using shared implementation)');
  }

  async generate(params: GenerationParams): Promise<ExpansionJobResult> {
    return this.sharedService.generate(params);
  }

  // Alias for backward compatibility
  async generateExpansionSuggestions(params: GenerationParams): Promise<ExpansionJobResult> {
    return this.sharedService.generateExpansionSuggestions(params);
  }
}