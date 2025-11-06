import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ModelConfigurationManager } from './ai/model-configuration.service';

// Temporary stub types until shared packages are fixed
interface RationaleContext {
  lat: number;
  lng: number;
  demographics?: any;
  competition?: any;
  marketData?: any;
}

interface RationaleOutput {
  text: string;
  confidence: number;
  factors: string[];
}

// Re-export interfaces for backward compatibility
export { RationaleContext, RationaleOutput };

@Injectable()
export class OpenAIRationaleService {
  private readonly logger = new Logger(OpenAIRationaleService.name);
  private readonly modelConfigManager: ModelConfigurationManager;
  private cacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };

  constructor(private readonly prisma: PrismaClient) {
    this.modelConfigManager = new ModelConfigurationManager();
    this.logger.log('OpenAI Rationale Service initialized (stub implementation)');
  }

  /**
   * Generate rationale for an expansion suggestion
   */
  async generateRationale(context: RationaleContext): Promise<string> {
    try {
      this.logger.log(
        `Generating rationale for ${context.lat.toFixed(5)}, ${context.lng.toFixed(5)}`
      );
      
      this.cacheStats.totalRequests++;
      
      // Stub implementation
      const rationale = `This location at ${context.lat.toFixed(4)}, ${context.lng.toFixed(4)} shows potential for expansion based on demographic analysis and market conditions.`;
      
      this.logger.log(`Generated rationale: "${rationale.substring(0, 50)}..."`);
      
      return rationale;
    } catch (error) {
      this.logger.error(`Error generating rationale for ${context.lat}, ${context.lng}:`, error);
      throw error;
    }
  }

  /**
   * Generate structured rationale output (enhanced version)
   */
  async generateStructuredRationale(context: RationaleContext): Promise<RationaleOutput> {
    const text = await this.generateRationale(context);
    
    return {
      text,
      confidence: 0.8,
      factors: ['Demographics', 'Market conditions', 'Competition analysis']
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheStats;
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      totalRequests: 0
    };
  }
}