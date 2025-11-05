import { ExpansionSuggestion, ScopeSelection } from '../services/expansion.service';

// Re-export types from expansion service for convenience
export { ScopeSelection } from '../services/expansion.service';

// Core Intelligence Interfaces
export interface LocationIntelligenceService {
  enhanceLocationSuggestions(
    suggestions: ExpansionSuggestion[], 
    scope: ScopeSelection
  ): Promise<EnhancedSuggestion[]>;
  
  validateLocationViability(
    lat: number, 
    lng: number, 
    scope: ScopeSelection
  ): Promise<ViabilityAssessment>;
  
  identifyAlternativeLocations(
    originalSuggestion: ExpansionSuggestion,
    radius: number
  ): Promise<AlternativeLocation[]>;
}

export interface DemographicAnalysisService {
  analyzeDemographics(
    lat: number, 
    lng: number, 
    radius: number
  ): Promise<DemographicProfile>;
  
  inferDemographicsWithAI(
    location: LocationContext,
    regionalPatterns: RegionalDemographics
  ): Promise<InferredDemographics>;
  
  assessMarketFit(
    demographics: DemographicProfile,
    targetProfile: CustomerProfile
  ): Promise<MarketFitScore>;
}

export interface CompetitiveAnalysisService {
  analyzeCompetitiveLandscape(
    lat: number, 
    lng: number, 
    analysisRadius: number
  ): Promise<CompetitiveAnalysis>;
  
  calculateCannibalizationRisk(
    newLocation: Location,
    existingStores: Store[]
  ): Promise<CannibalizationRisk>;
  
  identifyMarketGaps(
    region: ScopeSelection,
    competitorData: CompetitorStore[]
  ): Promise<MarketGap[]>;
}

export interface ViabilityAssessmentService {
  assessCommercialViability(
    lat: number, 
    lng: number
  ): Promise<CommercialViabilityScore>;
  
  validateLocationAccessibility(
    location: Location
  ): Promise<AccessibilityAssessment>;
  
  analyzeUrbanContext(
    lat: number, 
    lng: number, 
    radius: number
  ): Promise<UrbanContextAnalysis>;
  
  generateStrategicRationale(
    location: Location,
    analysis: LocationAnalysis
  ): Promise<StrategicRationale>;
}

// Enhanced Data Models
export interface EnhancedSuggestion extends ExpansionSuggestion {
  // Intelligence enhancements
  locationIntelligence: LocationIntelligence;
  demographicProfile: DemographicProfile;
  competitiveAnalysis: CompetitiveAnalysis;
  viabilityAssessment: ViabilityAssessment;
  strategicRationale: StrategicRationale;
  
  // Quality indicators
  intelligenceScore: number; // 0-1 overall intelligence confidence
  credibilityRating: 'HIGH' | 'MEDIUM' | 'LOW';
  executiveReadiness: boolean;
}

export interface LocationIntelligence {
  isCommercialArea: boolean;
  distanceToTownCenter: number; // meters
  nearbyCommercialFeatures: CommercialFeature[];
  landUseType: 'commercial' | 'mixed' | 'residential' | 'industrial';
  developmentPotential: number; // 0-1 score
}

export interface DemographicProfile {
  population: PopulationMetrics;
  ageDistribution: AgeDistribution;
  incomeDistribution: IncomeDistribution;
  lifestyleSegments: LifestyleSegment[];
  consumerBehavior: ConsumerBehaviorProfile;
  marketFitScore: number; // 0-1 alignment with Subway target
  dataSource: 'census' | 'commercial' | 'ai_inferred';
  confidence: number; // 0-1 data confidence
}

export interface CompetitiveAnalysis {
  nearbyCompetitors: CompetitorStore[];
  marketSaturation: number; // 0-1 saturation level
  cannibalizationRisk: CannibalizationRisk;
  competitiveAdvantages: string[];
  marketGapOpportunity: number; // 0-1 opportunity score
}

export interface StrategicRationale {
  primaryReasons: string[];
  addressedConcerns: string[];
  alternativeComparison?: AlternativeComparison;
  confidenceFactors: string[];
  riskMitigations: string[];
}

// Supporting Types
export interface PopulationMetrics {
  total: number;
  density: number; // per km²
  growthRate: number; // annual %
  urbanDensityIndex: number; // 0-1
}

export interface AgeDistribution {
  under18: number; // percentage
  age18to34: number;
  age35to54: number;
  age55plus: number;
}

export interface IncomeDistribution {
  medianHouseholdIncome: number;
  averageDisposableIncome: number;
  incomeIndex: number; // 0-1 relative to national average
  purchasingPower: number; // 0-1 score
}

export interface LifestyleSegment {
  name: string;
  percentage: number;
  description: string;
  subwayAffinity: number; // 0-1 likelihood to visit Subway
}

export interface ConsumerBehaviorProfile {
  fastFoodFrequency: number; // visits per month
  healthConsciousness: number; // 0-1 score
  pricesensitivity: number; // 0-1 score
  brandLoyalty: number; // 0-1 score
  digitalEngagement: number; // 0-1 score for app/online ordering
}

export interface CommercialFeature {
  type: 'shopping_center' | 'office_complex' | 'transit_hub' | 'university' | 'hospital' | 'retail_strip';
  name: string;
  distance: number; // meters
  footTrafficScore: number; // 0-1
  relevanceScore: number; // 0-1 for Subway business
}

export interface CompetitorStore {
  brand: string;
  lat: number;
  lng: number;
  distance: number; // meters
  estimatedRevenue?: number;
  marketShare?: number; // 0-1 in local area
  directCompetitor: boolean; // true for QSR, false for other food
}

export interface CannibalizationRisk {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedImpact: number; // 0-1 revenue impact on existing stores
  affectedStores: AffectedStore[];
  mitigationStrategies: string[];
}

export interface AffectedStore {
  storeId: string;
  distance: number; // meters
  estimatedRevenueImpact: number; // percentage
  currentPerformance: number; // 0-1 score
}

export interface MarketGap {
  lat: number;
  lng: number;
  opportunityScore: number; // 0-1
  gapType: 'underserved' | 'competitor_weak' | 'demographic_match';
  description: string;
  estimatedPotential: number; // revenue potential
}

export interface ViabilityAssessment {
  commercialViability: CommercialViabilityScore;
  accessibility: AccessibilityAssessment;
  urbanContext: UrbanContextAnalysis;
  overallScore: number; // 0-1
  concerns: string[];
  strengths: string[];
}

export interface CommercialViabilityScore {
  score: number; // 0-1
  factors: {
    zoning: number; // 0-1 commercial zoning suitability
    landAvailability: number; // 0-1 developable land
    constructionFeasibility: number; // 0-1 ease of construction
    permitComplexity: number; // 0-1 (1 = easy permits)
  };
  estimatedDevelopmentCost: number;
  timeToOpen: number; // months
}

export interface AccessibilityAssessment {
  score: number; // 0-1 overall accessibility
  factors: {
    vehicleAccess: number; // 0-1 car accessibility
    publicTransit: number; // 0-1 transit accessibility
    walkability: number; // 0-1 pedestrian access
    parking: number; // 0-1 parking availability
  };
  nearestTransitDistance: number; // meters
  walkingTrafficScore: number; // 0-1
}

export interface UrbanContextAnalysis {
  score: number; // 0-1 urban context suitability
  factors: {
    populationDensity: number; // 0-1 normalized density
    commercialActivity: number; // 0-1 business activity level
    residentialProximity: number; // 0-1 nearby residential
    employmentCenters: number; // 0-1 nearby employment
  };
  landUsePattern: string;
  developmentTrend: 'growing' | 'stable' | 'declining';
}

export interface AlternativeLocation {
  lat: number;
  lng: number;
  distance: number; // meters from original
  improvementScore: number; // 0-1 how much better than original
  reasons: string[];
  viabilityScore: number; // 0-1
}

export interface AlternativeComparison {
  alternativeLocation: {
    lat: number;
    lng: number;
    name?: string;
  };
  whyOriginalIsBetter: string[];
  tradeoffs: string[];
}

// Configuration Types
export interface IntelligenceConfig {
  enableDemographicInference: boolean;
  enableCompetitiveAnalysis: boolean;
  enableViabilityAssessment: boolean;
  enableStrategicRationale: boolean;
  
  // Thresholds
  minCommercialViabilityScore: number;
  maxDistanceToTownCenter: number; // meters
  minMarketFitScore: number;
  
  // AI Configuration
  aiProvider: 'openai' | 'anthropic';
  demographicInferenceModel: string;
  rationaleGenerationModel: string;
}

// Context Types
export interface LocationContext {
  lat: number;
  lng: number;
  country: string;
  region?: string;
  nearbyFeatures: string[];
  populationDensity?: number;
}

export interface RegionalDemographics {
  country: string;
  region?: string;
  typicalAgeDistribution: AgeDistribution;
  typicalIncomeDistribution: IncomeDistribution;
  commonLifestyleSegments: LifestyleSegment[];
}

export interface CustomerProfile {
  targetAgeRange: [number, number];
  targetIncomeRange: [number, number];
  preferredLifestyleSegments: string[];
  behaviorPreferences: Partial<ConsumerBehaviorProfile>;
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
  country: string;
  region?: string;
}

export interface Store {
  id: string;
  lat: number;
  lng: number;
  performance: number; // 0-1 score
  revenue?: number;
  openDate: Date;
}

export interface LocationAnalysis {
  location: Location;
  demographics: DemographicProfile;
  competitive: CompetitiveAnalysis;
  viability: ViabilityAssessment;
  intelligence: LocationIntelligence;
}

export interface MarketFitScore {
  score: number; // 0-1 overall fit
  factors: {
    ageAlignment: number; // 0-1
    incomeAlignment: number; // 0-1
    lifestyleAlignment: number; // 0-1
    behaviorAlignment: number; // 0-1
  };
  strengths: string[];
  concerns: string[];
}

export interface InferredDemographics extends DemographicProfile {
  inferenceMethod: string;
  inferenceConfidence: number; // 0-1
  basedOnSimilarAreas: string[];
}

// Error Types
export interface IntelligenceError {
  code: string;
  message: string;
  fallbackApplied: boolean;
  impactedFeatures: string[];
  retryable: boolean;
}