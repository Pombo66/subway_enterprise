import { ExpansionSuggestionData } from '../expansion-generation.service';

export enum StrategyType {
  WHITE_SPACE = 'white_space',
  ECONOMIC = 'economic',
  ANCHOR = 'anchor',
  CLUSTER = 'cluster'
}

export interface StrategyConfig {
  whiteSpaceWeight: number;
  economicWeight: number;
  anchorWeight: number;
  clusterWeight: number;
  enabledStrategies: StrategyType[];
  
  // Coverage radius configuration
  urbanCoverageKm: number;
  suburbanCoverageKm: number;
  ruralCoverageKm: number;
  
  // Density thresholds
  urbanDensityThreshold: number;
  suburbanDensityThreshold: number;
  
  // Anchor proximity thresholds
  transportProximityM: number;
  educationProximityM: number;
  retailProximityM: number;
  serviceProximityM: number;
  
  // Growth thresholds
  highGrowthThreshold: number;
  decliningThreshold: number;
  
  // Cluster analysis
  clusterMinStores: number;
  clusterMaxRadiusKm: number;
  highPerformerPercentile: number;
  
  // Performance tuning
  strategyCacheTtlHours: number;
  demographicCacheTtlDays: number;
  osmCacheTtlDays: number;
  maxParallelStrategies: number;
  
  // Data sources
  demographicDataSource: 'csv' | 'api';
  demographicCsvPath?: string;
  osmOverpassUrl: string;
  osmRateLimitPerSec: number;
}

export interface StrategyScore {
  strategyType: StrategyType;
  score: number;
  confidence: number;
  reasoning: string;
  metadata: Record<string, any>;
}

export interface ExpansionContext {
  stores: Store[];
  region: RegionFilter;
  config: StrategyConfig;
  timestamp: Date;
}

export interface Store {
  id: string;
  latitude: number;
  longitude: number;
  annualTurnover?: number | null;
  cityPopulationBand?: string | null;
  status?: string | null;
  country?: string | null;
  region?: string | null;
}

export interface RegionFilter {
  country?: string;
  state?: string;
  boundingBox?: BoundingBox;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ScoredCell {
  id: string;
  center: [number, number]; // [lng, lat]
  bounds: any;
  score?: any;
  confidence?: number;
  nearestStoreDistance?: number;
}

export interface StrategicSuggestion extends ExpansionSuggestionData {
  // Strategy scoring breakdown
  strategyBreakdown: {
    whiteSpace: {
      score: number;
      isWhiteSpace: boolean;
      nearestStoreKm: number;
      areaClassification: string;
      populationInArea: number;
    };
    economic: {
      score: number;
      population: number;
      growthRate: number;
      medianIncome: number;
      incomeIndex: number;
      growthTrajectory: string;
    };
    anchors: {
      score: number;
      anchorCount: number;
      anchors: AnchorLocation[];
      dominantAnchorType: string;
      isSuperLocation: boolean;
    };
    clustering: {
      score: number;
      nearestClusterKm: number;
      clusterStrength: number;
      patternMatch: number;
      patternMatchReasons: string[];
    };
  };
  
  // Strategic classification
  dominantStrategy: StrategyType;
  strategicClassification: 'white_space' | 'economic_growth' | 'anchor_proximity' | 'cluster_expansion' | 'multi_strategy';
  executiveSummary: string;
  
  // Enhanced rationale
  strategicRationale: {
    executiveSummary: string;
    strategicHighlights: string[];
    riskFactors: string[];
    competitiveAdvantage: string;
    dataCompleteness: number;
  };
}

export interface AnchorLocation {
  type: 'transport' | 'education' | 'retail' | 'service_station';
  subtype: string; // 'railway_station', 'university', 'shopping_mall', etc.
  name: string;
  lat: number;
  lng: number;
  distance: number;
  size: 'major' | 'medium' | 'minor';
  estimatedFootfall: number;
  boost: number;
}

export interface ExpansionStrategy {
  /**
   * Score a candidate location using this strategy
   */
  scoreCandidate(
    candidate: ScoredCell,
    stores: Store[],
    context: ExpansionContext
  ): Promise<StrategyScore>;
  
  /**
   * Get strategy name for logging and identification
   */
  getStrategyName(): string;
  
  /**
   * Validate strategy configuration
   */
  validateConfig(config: StrategyConfig): boolean;
}

export interface StrategyBreakdown {
  whiteSpaceScore: number;
  economicScore: number;
  anchorScore: number;
  clusterScore: number;
  weightedTotal: number;
  dominantStrategy: StrategyType;
  strategicClassification: string;
}

// Utility function to load configuration from environment variables
export function loadStrategyConfig(): StrategyConfig {
  const whiteSpaceWeight = parseFloat(process.env.EXPANSION_WHITE_SPACE_WEIGHT || '0.25');
  const economicWeight = parseFloat(process.env.EXPANSION_ECONOMIC_WEIGHT || '0.25');
  const anchorWeight = parseFloat(process.env.EXPANSION_ANCHOR_WEIGHT || '0.25');
  const clusterWeight = parseFloat(process.env.EXPANSION_CLUSTER_WEIGHT || '0.25');
  
  // Validate weights sum to 1.0
  const totalWeight = whiteSpaceWeight + economicWeight + anchorWeight + clusterWeight;
  if (Math.abs(totalWeight - 1.0) > 0.01) {
    throw new Error(`Strategy weights must sum to 1.0, got ${totalWeight}`);
  }
  
  return {
    whiteSpaceWeight,
    economicWeight,
    anchorWeight,
    clusterWeight,
    enabledStrategies: [
      StrategyType.WHITE_SPACE,
      StrategyType.ECONOMIC,
      StrategyType.ANCHOR,
      StrategyType.CLUSTER
    ],
    
    // Coverage radius
    urbanCoverageKm: parseFloat(process.env.EXPANSION_URBAN_COVERAGE_KM || '12.5'),
    suburbanCoverageKm: parseFloat(process.env.EXPANSION_SUBURBAN_COVERAGE_KM || '17.5'),
    ruralCoverageKm: parseFloat(process.env.EXPANSION_RURAL_COVERAGE_KM || '25'),
    
    // Density thresholds
    urbanDensityThreshold: parseInt(process.env.EXPANSION_URBAN_DENSITY_THRESHOLD || '400'),
    suburbanDensityThreshold: parseInt(process.env.EXPANSION_SUBURBAN_DENSITY_THRESHOLD || '150'),
    
    // Anchor proximity
    transportProximityM: parseInt(process.env.EXPANSION_TRANSPORT_PROXIMITY_M || '500'),
    educationProximityM: parseInt(process.env.EXPANSION_EDUCATION_PROXIMITY_M || '600'),
    retailProximityM: parseInt(process.env.EXPANSION_RETAIL_PROXIMITY_M || '400'),
    serviceProximityM: parseInt(process.env.EXPANSION_SERVICE_PROXIMITY_M || '200'),
    
    // Growth thresholds
    highGrowthThreshold: parseFloat(process.env.EXPANSION_HIGH_GROWTH_THRESHOLD || '2.0'),
    decliningThreshold: parseFloat(process.env.EXPANSION_DECLINING_THRESHOLD || '-0.5'),
    
    // Cluster analysis
    clusterMinStores: parseInt(process.env.EXPANSION_CLUSTER_MIN_STORES || '3'),
    clusterMaxRadiusKm: parseFloat(process.env.EXPANSION_CLUSTER_MAX_RADIUS_KM || '15'),
    highPerformerPercentile: parseInt(process.env.EXPANSION_HIGH_PERFORMER_PERCENTILE || '75'),
    
    // Performance tuning
    strategyCacheTtlHours: parseInt(process.env.EXPANSION_STRATEGY_CACHE_TTL_HOURS || '24'),
    demographicCacheTtlDays: parseInt(process.env.EXPANSION_DEMOGRAPHIC_CACHE_TTL_DAYS || '90'),
    osmCacheTtlDays: parseInt(process.env.EXPANSION_OSM_CACHE_TTL_DAYS || '30'),
    maxParallelStrategies: parseInt(process.env.EXPANSION_MAX_PARALLEL_STRATEGIES || '4'),
    
    // Data sources
    demographicDataSource: (process.env.EXPANSION_DEMOGRAPHIC_DATA_SOURCE as 'csv' | 'api') || 'csv',
    demographicCsvPath: process.env.EXPANSION_DEMOGRAPHIC_CSV_PATH,
    osmOverpassUrl: process.env.EXPANSION_OSM_OVERPASS_URL || 'https://overpass-api.de/api/interpreter',
    osmRateLimitPerSec: parseInt(process.env.EXPANSION_OSM_RATE_LIMIT_PER_SEC || '1')
  };
}