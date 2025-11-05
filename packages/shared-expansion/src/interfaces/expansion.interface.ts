/**
 * Shared interfaces for expansion services
 */

export interface GenerationParams {
  enableAIRationale: boolean;
  aggression: number;
  targetCount?: number;
  region: RegionFilter;
}

export interface RegionFilter {
  country?: string;
  state?: string;
  city?: string;
}

export interface ExpansionSuggestionData {
  id: string;
  lat: number;
  lng: number;
  region: string;
  country: string;
  finalScore: number;
  confidence: number;
  isLive: boolean;
  aiRecommended: boolean;
  demandScore: number;
  competitionPenalty: number;
  supplyPenalty: number;
  population: number;
  footfallIndex: number;
  incomeIndex: number;
  predictedAUV: number;
  paybackPeriod: number;
  cacheKey: string;
  modelVersion: string;
  dataSnapshotDate: string;
  rationaleText?: string;
  hasAIAnalysis?: boolean;
  aiProcessingRank?: number;
  rationale?: {
    population: number;
    proximityGap: number;
    turnoverGap: number;
    notes: string;
  };
}

export interface ExpansionJobResult {
  suggestions: ExpansionSuggestionData[];
  statistics: {
    tokensUsed: number;
    totalCost: number;
    generationTimeMs: number;
  };
  metadata: {
    generationTimeMs: number;
    enhancedRationaleEnabled: boolean;
    diversificationEnabled: boolean;
    aiCostLimitingEnabled: boolean;
    aiCandidatesCount: number;
    totalCandidatesCount: number;
    aiPercentage: number;
    pipelineStages?: string[];
    aiPipelineUsed?: boolean;
  };
}

export interface ScopeSelection {
  type: 'country' | 'state' | 'custom_area';
  value: string;
  polygon?: any; // GeoJSON.Polygon
  area?: number;
}

export interface ScopeQueryParams {
  scope: ScopeSelection;
  intensity: number; // 0-100
  dataMode: 'live' | 'modelled';
  minDistance: number; // anti-cannibalization km
  maxPerCity?: number;
}

export interface ExpansionSuggestion {
  id: string;
  lat: number;
  lng: number;
  finalScore: number;
  confidence: number;
  dataMode: 'live' | 'modelled';
  demandScore: number;
  cannibalizationPenalty: number;
  opsFitScore: number;
  nearestSubwayDistance: number;
  topPOIs: string[];
  cacheKey: string;
  modelVersion: string;
  dataSnapshotDate: string;
}

export interface CapacityEstimate {
  totalSites: number;
  availableSites: number;
  scopeArea: number;
  density: number; // sites per km²
}

export interface CountryBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface BasicLocation {
  lat: number;
  lng: number;
  name: string;
  confidence: number;
}

export interface ExpansionConfig {
  bffUrl: string;
  timeoutMs: number;
  fallbackEnabled: boolean;
}

export interface IExpansionService {
  generate(params: GenerationParams): Promise<ExpansionJobResult>;
  generateExpansionSuggestions(params: GenerationParams): Promise<ExpansionJobResult>;
}