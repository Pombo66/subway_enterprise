import { PrismaClient } from '@prisma/client';
import { ModelConfigurationManager, AIOperationType } from './model-configuration.service';
import { 
  MarketAnalysisService as SharedMarketAnalysisService,
  MarketAnalysisRequest,
  MarketAnalysisResult,
  MarketAnalysis,
  MarketSaturation,
  GrowthOpportunity,
  CompetitiveGap,
  DemographicInsight,
  StrategicZone,
  MarketAnalysisConfig
} from '@subway/shared-ai';

// Re-export types for backward compatibility
export {
  MarketAnalysisRequest,
  MarketAnalysisResult,
  MarketAnalysis,
  MarketSaturation,
  GrowthOpportunity,
  CompetitiveGap,
  DemographicInsight,
  StrategicZone
};

export class MarketAnalysisService {
  private readonly sharedService: SharedMarketAnalysisService;
  private readonly modelConfigManager: ModelConfigurationManager;

  constructor(private readonly prisma: PrismaClient) {
    this.modelConfigManager = ModelConfigurationManager.getInstance();
    
    const config: MarketAnalysisConfig = {
      maxTokens: 4000, // Optimized from 16000
      cacheTtlDays: 7,
      reasoningEffort: 'medium', // Optimized from high
      textVerbosity: 'medium',
      timeoutSeconds: 90
    };

    this.sharedService = new SharedMarketAnalysisService(
      this.prisma,
      this.modelConfigManager,
      config
    );

    console.log('🏢 Market Analysis Service initialized (using shared implementation)');
  }

  /**
   * Perform comprehensive market analysis for a region
   */
  async analyzeMarket(request: MarketAnalysisRequest): Promise<MarketAnalysisResult> {
    return this.sharedService.analyzeMarket(request);
  }

  /**
   * Identify strategic zones within a market
   */
  async identifyStrategicZones(analysis: MarketAnalysis): Promise<StrategicZone[]> {
    return this.sharedService.identifyStrategicZones(analysis);
  }

  /**
   * Get cached analysis if available
   */
  async getCachedAnalysis(region: string): Promise<MarketAnalysis | null> {
    return this.sharedService.getCachedAnalysis(region);
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return this.sharedService.getServiceStats();
  }

  /**
   * Reset service statistics
   */
  resetStats() {
    this.sharedService.resetStats();
  }
}