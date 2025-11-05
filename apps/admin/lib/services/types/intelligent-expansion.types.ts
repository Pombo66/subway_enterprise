/**
 * Core types for intelligent expansion placement system
 * Defines interfaces for AI-driven context analysis, rationale diversification, and placement intelligence
 */

// Expansion Intensity Configuration
export enum ExpansionIntensity {
  LIGHT = 50,
  MODERATE = 100,
  MEDIUM = 150,
  HIGH = 200,
  VERY_HIGH = 250,
  AGGRESSIVE = 300
}

export interface IntensityConfiguration {
  level: ExpansionIntensity;
  targetCount: number;
  prioritizationStrategy: 'highest_potential' | 'geographic_balance' | 'strategic_timing';
  geographicDistribution: {
    maxPerRegion: number;
    minRegionSpread: number;
    avoidConcentration: boolean;
  };
  aiSelectionCriteria: {
    potentialWeight: number;
    viabilityWeight: number;
    strategicWeight: number;
    riskWeight: number;
  };
}

// Location Data Types
export interface LocationData {
  lat: number;
  lng: number;
  population: number;
  nearestStoreDistance: number;
  anchorCount: number;
  urbanDensity?: number;
  roadDistance?: number;
  buildingDistance?: number;
}

export interface DemographicData {
  population: number;
  ageDistribution?: Record<string, number>;
  incomeLevel?: 'low' | 'medium' | 'high';
  employmentRate?: number;
}

export interface CompetitorData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  type: string;
}

export interface AccessibilityData {
  publicTransportScore?: number;
  walkabilityIndex?: number;
  parkingAvailability?: 'limited' | 'moderate' | 'abundant';
  roadAccess?: boolean;
}

// AI Context Analysis Types
export interface AIContextAnalysis {
  marketAssessment: string;
  competitiveAdvantages: string[];
  riskFactors: string[];
  demographicInsights: string;
  accessibilityAnalysis: string;
  uniqueSellingPoints: string[];
  confidenceScore: number;
}

export interface ContextualInsights {
  primaryStrengths: string[];
  marketOpportunities: string[];
  potentialChallenges: string[];
  recommendedPositioning: string;
  seasonalConsiderations: string[];
}

// AI Rationale Types
export interface UniqueRationale {
  text: string;
  factors: {
    population: string;
    proximity: string;
    turnover: string;
  };
  confidence: number;
  dataCompleteness: number;
  uniquenessScore: number;
  contextualElements: string[];
  differentiators: string[];
  aiGeneratedInsights: string[];
}

export interface DiversityReport {
  uniquenessScore: number;
  repetitionCount: number;
  averageLength: number;
  contextualVariety: number;
  aiRecommendations: string[];
  diversityIssues: string[];
}

export interface RationaleCandidate {
  id: string;
  lat: number;
  lng: number;
  context: LocationData;
  existingRationale?: string;
}

// AI Placement Intelligence Types
export interface AIPlacementScore {
  viabilityAssessment: string;
  competitiveAnalysis: string;
  accessibilityInsights: string;
  marketPotentialAnalysis: string;
  riskAssessment: string[];
  aiConfidenceReasoning: string;
  numericScores: {
    viability: number;
    competition: number;
    accessibility: number;
    marketPotential: number;
  };
}

export interface AIPatternAnalysis {
  patternDetection: string;
  distributionAssessment: string;
  intelligenceEvaluation: string;
  clusteringAnalysis: string;
  aiRecommendations: string[];
  geometricIssues: string[];
}

export interface PlacementConstraints {
  minDistanceM: number;
  maxPerRegion?: number;
  avoidClusters: boolean;
  geographicBalance: boolean;
}



// AI Market Potential Analysis Types
export interface AIRankedLocations {
  totalAnalyzed: number;
  highPotentialCount: number;
  rankings: LocationRanking[];
  marketInsights: string[];
  saturationWarnings: string[];
}

export interface LocationRanking {
  candidate: ExpansionCandidate;
  aiPotentialScore: number;
  aiRanking: number;
  strategicFactors: string[];
  riskFactors: string[];
  aiReasoning: string;
  geographicPriority: number;
}

export interface IntensityOptimizedSelection {
  selectedLocations: LocationRanking[];
  intensityLevel: ExpansionIntensity;
  selectionReasoning: string;
  alternativesAvailable: number;
  geographicDistribution: Record<string, number>;
  aiOptimizationInsights: string[];
}

export interface SaturationAnalysis {
  marketSaturation: number;
  cannibalizationRisk: string[];
  optimalDistribution: string;
  aiRecommendations: string[];
}

export interface MarketConditions {
  economicIndicators: Record<string, number>;
  seasonalFactors: string[];
  competitiveLandscape: string;
}

export interface RegionData {
  country: string;
  totalStores: number;
  averageStoreDistance: number;
  stateDistribution: Record<string, number>;
}

export interface GeographicConstraints {
  maxPerState?: number;
  minStateSpread?: number;
  avoidConcentration: boolean;
}

export interface PlacementConstraints {
  targetCount: number;
  regionData: RegionData;
  existingStores: Array<{ id: string; latitude: number; longitude: number; state: string }>;
  geographicConstraints?: GeographicConstraints;
  prioritizeViability?: boolean;
  balanceDistribution?: boolean;
}

export interface OptimizedPlacement {
  optimizedCandidates: ExpansionCandidate[];
  distributionAnalysis: string;
  selectionReasoning: string;
  balancingStrategy: string;
  optimizationMetrics: {
    geographicBalance: number;
    marketPotential: number;
    competitiveAdvantage: number;
    overallOptimization: number;
  };
}

// Real-World Factor Analysis Types
export interface RealWorldFactorAnalysis {
  trafficAccessibilityAnalysis: TrafficAccessibilityAnalysis;
  seasonalAnalysis: SeasonalAnalysis;
  economicAnalysis: EconomicAnalysis;
  overallRealWorldScore: number;
  strengthFactors: string[];
  challengeFactors: string[];
  seasonalRiskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  accessibilityRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  economicStability: 'STRONG' | 'MODERATE' | 'WEAK';
  realWorldRecommendation: 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'CONDITIONAL' | 'NOT_RECOMMENDED';
  keyInsights: string[];
  mitigationStrategies: string[];
}

export interface TrafficAccessibilityAnalysis {
  pedestrianAccessibility: {
    score: number;
    analysis: string;
  };
  vehicleAccessibility: {
    score: number;
    analysis: string;
  };
  publicTransport: {
    score: number;
    analysis: string;
  };
  peakHourImpact: {
    score: number;
    analysis: string;
  };
  overallAccessibility: number;
  trafficInsights: string[];
}

export interface SeasonalAnalysis {
  summerPerformance: {
    score: number;
    factors: string[];
  };
  winterPerformance: {
    score: number;
    factors: string[];
  };
  springAutumnStability: {
    score: number;
    factors: string[];
  };
  tourismSeasonality: {
    score: number;
    factors: string[];
  };
  overallSeasonalStability: number;
  seasonalInsights: string[];
  riskFactors: string[];
}

export interface EconomicAnalysis {
  localPurchasingPower: {
    score: number;
    indicators: string[];
  };
  employmentStability: {
    score: number;
    indicators: string[];
  };
  businessEnvironment: {
    score: number;
    indicators: string[];
  };
  growthPotential: {
    score: number;
    indicators: string[];
  };
  overallEconomicViability: number;
  economicInsights: string[];
  economicRisks: string[];
}

// Enhanced Expansion Candidate
export interface ExpansionCandidate {
  id: string;
  name: string;
  lat: number;
  lng: number;
  population: number;
  nearestStoreDistance: number;
  anchorCount: number;
  peerPerformanceScore: number;
  stateCode: string;
  candidateType: 'settlement' | 'h3_explore' | 'hybrid';
  confidence: number;
  totalScore: number;
}

// Enhanced Expansion Suggestion Data
export interface EnhancedExpansionSuggestion {
  // Base expansion data
  lat: number;
  lng: number;
  confidence: number;
  rationale: {
    population: number;
    proximityGap: number;
    turnoverGap: number;
    notes: string;
  };
  rationaleText: string;
  band: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  
  // Enhanced fields for intelligent placement
  locationContext?: AIContextAnalysis;
  placementScore?: AIPlacementScore;
  uniqueRationale?: UniqueRationale;
  
  // Enhanced rationale data
  contextualFactors: string[];
  competitiveAdvantages: string[];
  riskMitigations: string[];
  
  // Intelligence metrics
  intelligenceScore: number;
  diversityScore: number;
  viabilityConfidence: number;
  
  // Intensity-based selection data
  aiPotentialRanking?: number;
  intensityLevel?: ExpansionIntensity;
  selectionReasoning?: string;
  alternativesCount?: number;
  
  // Settlement-based fields
  candidateType?: 'settlement' | 'h3_explore' | 'hybrid';
  settlementName?: string;
  settlementType?: 'city' | 'town' | 'village';
  estimatedPopulation?: number;
  
  // Mapbox validation fields
  urbanDensityIndex?: number | null;
  roadDistanceM?: number | null;
  buildingDistanceM?: number | null;
  landuseType?: string | null;
  mapboxValidated?: boolean;
}