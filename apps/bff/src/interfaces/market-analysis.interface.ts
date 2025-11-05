import { MarketAnalysisRequest, MarketAnalysisResult, MarketAnalysis, StrategicZone } from '../types/market-analysis.types';

/**
 * Interface for Market Analysis Service
 */
export interface IMarketAnalysisService {
  /**
   * Perform comprehensive market analysis for a region
   */
  analyzeMarket(request: MarketAnalysisRequest): Promise<MarketAnalysisResult>;

  /**
   * Identify strategic zones within a market
   */
  identifyStrategicZones(analysis: MarketAnalysis): Promise<StrategicZone[]>;

  /**
   * Assess market saturation for a specific area
   */
  assessMarketSaturation(
    bounds: { north: number; south: number; east: number; west: number },
    existingStores: { lat: number; lng: number; performance?: number }[]
  ): Promise<{ level: string; score: number; reasoning: string }>;

  /**
   * Analyze competitive landscape
   */
  analyzeCompetitiveLandscape(
    bounds: { north: number; south: number; east: number; west: number },
    existingStores: { lat: number; lng: number }[],
    competitors: { lat: number; lng: number; type: string }[]
  ): Promise<{ gaps: any[]; opportunities: any[]; threats: any[] }>;

  /**
   * Generate demographic insights
   */
  generateDemographicInsights(
    bounds: { north: number; south: number; east: number; west: number },
    demographicData: any
  ): Promise<{ insights: any[]; recommendations: string[] }>;

  /**
   * Get cached analysis if available
   */
  getCachedAnalysis(region: string): Promise<MarketAnalysis | null>;

  /**
   * Get service statistics
   */
  getServiceStats(): {
    analysesPerformed: number;
    totalTokensUsed: number;
    averageAnalysisTime: number;
    cacheHitRate: number;
  };
}