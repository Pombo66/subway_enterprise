/**
 * Shared interfaces for Market Analysis services
 */

export interface MarketAnalysisRequest {
  region: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  existingStores: Array<{
    lat: number;
    lng: number;
    id: string;
  }>;
  competitors: Array<{
    lat: number;
    lng: number;
    brand: string;
  }>;
  demographics?: {
    population: number;
    medianIncome: number;
    ageDistribution: Record<string, number>;
  };
}

export interface MarketAnalysisResult {
  analysis: MarketAnalysis;
  strategicZones: StrategicZone[];
  executionTime: number;
  tokensUsed: number;
  cached: boolean;
}

export interface MarketAnalysis {
  region: string;
  saturation: MarketSaturation;
  opportunities: GrowthOpportunity[];
  competitiveGaps: CompetitiveGap[];
  demographicInsights: DemographicInsight[];
  recommendations: string[];
  confidence: number;
  analysisDate: Date;
  tokensUsed?: number;
}

export interface MarketSaturation {
  level: 'low' | 'medium' | 'high' | 'oversaturated';
  score: number; // 0-1
  storeCount: number;
  populationPerStore: number;
  competitorDensity: number;
}

export interface GrowthOpportunity {
  type: 'demographic' | 'geographic' | 'competitive' | 'infrastructure';
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: number; // 0-1
  location?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

export interface CompetitiveGap {
  area: string;
  competitors: string[];
  gapSize: number; // 0-1
  opportunity: string;
  estimatedRevenue: number;
}

export interface DemographicInsight {
  category: 'age' | 'income' | 'lifestyle' | 'behavior';
  insight: string;
  relevance: number; // 0-1
  actionable: boolean;
}

export interface StrategicZone {
  id: string;
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  radius: number;
  priority: number; // 0-1
  characteristics: string[];
  estimatedStores: number;
  confidence: number;
}

export interface MarketAnalysisConfig {
  maxTokens: number;
  cacheTtlDays: number;
  reasoningEffort: 'minimal' | 'low' | 'medium' | 'high';
  textVerbosity: 'low' | 'medium' | 'high';
  timeoutSeconds: number;
}

export interface IMarketAnalysisService {
  analyzeMarket(request: MarketAnalysisRequest): Promise<MarketAnalysisResult>;
  identifyStrategicZones(analysis: MarketAnalysis): Promise<StrategicZone[]>;
  getCachedAnalysis(region: string): Promise<MarketAnalysis | null>;
  getServiceStats(): ServiceStats;
  resetStats(): void;
}

export interface ServiceStats {
  analysesPerformed: number;
  totalTokensUsed: number;
  averageAnalysisTime: number;
  cacheHitRate: number;
}