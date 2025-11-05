export interface MarketAnalysis {
  id: string;
  region: string;
  analysisDate: Date;
  marketSaturation: MarketSaturation;
  growthOpportunities: GrowthOpportunity[];
  competitiveGaps: CompetitiveGap[];
  demographicInsights: DemographicInsight[];
  strategicZones: StrategicZone[];
  confidence: number;
  aiModel: string;
  tokensUsed: number;
}

export interface MarketSaturation {
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'OVERSATURATED';
  score: number; // 0-1
  storeCount: number;
  populationPerStore: number;
  marketPenetration: number;
  reasoning: string;
}

export interface GrowthOpportunity {
  id: string;
  type: 'DEMOGRAPHIC_GROWTH' | 'COMPETITIVE_GAP' | 'INFRASTRUCTURE_DEVELOPMENT' | 'ECONOMIC_EXPANSION';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  potentialRevenue: number;
  timeframe: string;
  confidence: number;
  location?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

export interface CompetitiveGap {
  id: string;
  location: {
    lat: number;
    lng: number;
    radius: number;
  };
  gapType: 'GEOGRAPHIC' | 'DEMOGRAPHIC' | 'SERVICE_TYPE' | 'PRICE_POINT';
  severity: number; // 0-1, higher = bigger gap
  estimatedDemand: number;
  nearestCompetitor: {
    distance: number;
    type: string;
  };
  reasoning: string;
}

export interface DemographicInsight {
  id: string;
  category: 'AGE_DISTRIBUTION' | 'INCOME_LEVEL' | 'LIFESTYLE' | 'EMPLOYMENT' | 'EDUCATION';
  insight: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  strength: number; // 0-1
  affectedAreas: {
    lat: number;
    lng: number;
    radius: number;
  }[];
}

export interface StrategicZone {
  id: string;
  name: string;
  boundary: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  priority: number; // 1-10, higher = more important
  opportunityType: 'HIGH_GROWTH' | 'UNDERSERVED' | 'COMPETITIVE_ADVANTAGE' | 'DEMOGRAPHIC_MATCH';
  expectedStores: number;
  revenueProjection: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning: string;
  keyFactors: string[];
}

export interface MarketAnalysisRequest {
  region: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  existingStores: {
    lat: number;
    lng: number;
    performance?: number;
  }[];
  competitorData?: {
    lat: number;
    lng: number;
    type: string;
    size?: string;
  }[];
  demographicData?: any;
  analysisDepth: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
}

export interface MarketAnalysisResult {
  analysis: MarketAnalysis;
  recommendations: string[];
  nextSteps: string[];
  costBreakdown: {
    tokensUsed: number;
    estimatedCost: number;
    model: string;
  };
}