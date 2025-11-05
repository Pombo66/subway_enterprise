/**
 * TypeScript interfaces for the Expansion Predictor feature
 */

// Scope selection interfaces
export interface ScopeSelection {
  type: 'country' | 'state' | 'custom_area';
  value: string; // country code, state code, or custom area name
  polygon?: GeoJSON.Polygon; // for custom areas
  area?: number; // calculated area in km²
}

export interface CustomAreaBadge {
  name: string;
  area: number; // km²
  outline: 'gold'; // subtle gold outline
}

// Enhanced expansion suggestion interface
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
  topPOIs: string[]; // top 3 nearby POIs
  cacheKey: string;
  modelVersion: string;
  dataSnapshotDate: string;
}

// Legacy interface for backward compatibility
export interface ExpansionRecommendation {
  id: string;
  lat: number;
  lng: number;
  region: string;
  country?: string;
  finalScore: number;
  confidence: number;
  isLive: boolean;
  demandScore: number;
  competitionPenalty: number;
  supplyPenalty: number;
  population: number;
  footfallIndex: number;
  incomeIndex: number;
  predictedAUV?: number;
  paybackPeriod?: number;
  nearestStoreDistance?: number; // Distance to nearest existing store
  aiRecommended?: boolean; // AI recommendation flag
  cacheKey?: string; // Cache key for deterministic results
  modelVersion?: string; // Model version
  dataSnapshotDate?: string; // Data snapshot date
}

// Scope-aware expansion query parameters
export interface ScopeQueryParams {
  scope: ScopeSelection;
  intensity: number; // 0-100
  dataMode: 'live' | 'modelled';
  minDistance: number; // anti-cannibalization km
  maxPerCity?: number;
}

// Legacy expansion query parameters for backward compatibility
export interface ExpansionQueryParams {
  region?: string;
  country?: string;
  target?: number;
  mode: 'live' | 'model';
  limit?: number;
}

// API response format for expansion recommendations
export interface ExpansionRecommendationsResponse {
  recommendations: ExpansionRecommendation[];
  metadata: {
    total: number;
    region?: string;
    mode: 'live' | 'model';
    generatedAt: string;
  };
}

// Region configuration for controls
export interface RegionConfig {
  name: string;
  current: number;
  target: number;
  gap: number;
  maxStores: number;
}

// Expansion insights for drawer display
export interface ExpansionInsights {
  predictedMetrics: {
    auv: number;
    paybackMonths: number;
    breakEvenMonths: number;
  };
  riskFactors: string[];
  opportunities: string[];
  demographics: {
    population: number;
    avgIncome: number;
    footfallScore: number;
  };
  competition: {
    nearestCompetitor: number;
    competitorDensity: number;
    marketSaturation: number;
  };
}

// Color coding for confidence levels
export interface ConfidenceColorMap {
  strongLive: string;     // ≥ 0.9 confidence
  moderate: string;       // 0.7-0.9 confidence
  highRisk: string;       // < 0.7 confidence
  modelled: string;       // Modelled data
  aiHighPotential: string; // AI high potential
  missingData: string;    // Missing data
}

// Default confidence color mapping
export const DEFAULT_CONFIDENCE_COLORS: ConfidenceColorMap = {
  strongLive: '#22c55e',      // Bright Green
  moderate: '#f59e0b',        // Amber
  highRisk: '#ef4444',        // Red
  modelled: '#3b82f6',        // Blue
  aiHighPotential: '#14b8a6', // Teal
  missingData: '#6b7280'      // Grey
};

// Expansion telemetry events
export interface ExpansionTelemetryEvents {
  expansion_mode_toggled: {
    timestamp: string;
    enabled: boolean;
    currentFilters: any;
    visibleStoreCount: number;
  };
  
  expansion_slider_changed: {
    timestamp: string;
    region: string;
    previousTarget: number;
    newTarget: number;
    currentMode: 'live' | 'model';
  };
  
  expansion_marker_clicked: {
    timestamp: string;
    recommendationId: string;
    region: string;
    confidence: number;
    finalScore: number;
    isLive: boolean;
  };
  
  expansion_mode_changed: {
    timestamp: string;
    previousMode: 'live' | 'model';
    newMode: 'live' | 'model';
    affectedRegions: string[];
  };
  
  expansion_ai_query: {
    timestamp: string;
    region: string;
    reasons: string[];
    responseLatency: number;
  };
}

// New scope-based component prop interfaces
export interface ScopeSelectorProps {
  selectedScope: ScopeSelection;
  onScopeChange: (scope: ScopeSelection) => void;
  onCustomAreaDraw: (polygon: GeoJSON.Polygon) => void;
  onCustomAreaClear: () => void;
}

export interface IntensityControlProps {
  intensity: number; // 0-100
  capacityEstimate: number;
  targetSuggestions: number;
  onIntensityChange: (intensity: number) => void;
  onRecompute: () => void;
  isLocked: boolean;
  onLockToggle: () => void;
}

export interface CapacityReadout {
  scopeCapacity: number;
  selectedIntensity: number;
  targetCount: number;
  cappedAt: 300; // absolute maximum
}

export interface DataModeToggleProps {
  currentMode: 'live' | 'modelled';
  onModeChange: (mode: 'live' | 'modelled') => void;
  modelVersion: string;
  dataSnapshotDate: string;
}

export interface DataModeInfo {
  live: {
    icon: '🔴';
    description: 'Current Subway network, openings, closures, performance';
  };
  modelled: {
    icon: '📘';
    description: 'Cached demographic or POI proxy data';
  };
}

export interface SuggestionPopoverProps {
  suggestion: ExpansionSuggestion | null;
  position: { x: number; y: number };
  onSendToPipeline: (suggestion: ExpansionSuggestion) => void;
  onAskSubMind: (suggestion: ExpansionSuggestion) => void;
}

export interface PopoverContent {
  storeName: string;
  locality: string;
  scoreBreakdown: {
    demand: number;
    cannibalization: number;
    opsFit: number;
  };
  nearestSubwayDistance: number;
  topPOIs: string[]; // top 3 nearby POIs
  actions: ['Send to Pipeline', 'Ask SubMind'];
}

// Enhanced expansion overlay props
export interface EnhancedExpansionOverlayProps {
  map: any; // MapLibre map instance
  scope: ScopeSelection;
  suggestions: ExpansionSuggestion[];
  dataMode: 'live' | 'modelled';
  zoomLevel: number;
  onSuggestionHover: (suggestion: ExpansionSuggestion) => void;
  onSuggestionClick: (suggestion: ExpansionSuggestion) => void;
}

// Legacy component prop interfaces for backward compatibility
export interface ExpansionOverlayProps {
  map: any; // MapLibre map instance
  isExpansionMode: boolean;
  expansionData: ExpansionRecommendation[];
  onMarkerClick: (recommendation: ExpansionRecommendation) => void;
  maxMarkers?: number;
}

export interface ExpansionControlsProps {
  regions: RegionConfig[];
  currentMode: 'live' | 'model';
  onModeChange: (mode: 'live' | 'model') => void;
  onRegionSliderChange: (region: string, target: number) => void;
  onRecompute: () => void;
  onAskSubMind: () => void;
  loading?: boolean;
}

export interface ExpansionDrawerProps {
  recommendation: ExpansionRecommendation | null;
  isOpen: boolean;
  onClose: () => void;
  onAskSubMind: (reasoning: string[]) => void;
  insights?: ExpansionInsights;
  loadingInsights?: boolean;
}

export interface ExpansionLegendProps {
  colorMap?: ConfidenceColorMap;
  className?: string;
}

// Hook return types
export interface UseExpansionDataReturn {
  recommendations: ExpansionRecommendation[];
  loading: boolean;
  error: string | null;
  refetch: (params: ExpansionQueryParams) => Promise<void>;
}

export interface UseExpansionStateReturn {
  isExpansionMode: boolean;
  currentMode: 'live' | 'model';
  regionConfigs: RegionConfig[];
  selectedRecommendation: ExpansionRecommendation | null;
  setExpansionMode: (enabled: boolean) => void;
  setCurrentMode: (mode: 'live' | 'model') => void;
  setRegionTarget: (region: string, target: number) => void;
  setSelectedRecommendation: (recommendation: ExpansionRecommendation | null) => void;
}

// API service interfaces
export interface ExpansionApiService {
  getRecommendations(params: ExpansionQueryParams): Promise<ExpansionRecommendationsResponse>;
  recomputeScores(region?: string): Promise<{ message: string; processed: number }>;
}

// SubMind expansion analysis interfaces
export interface SubMindExpansionRequest {
  region: string;
  reasons: string[];
}

export interface SubMindExpansionResponse {
  message: string;
  sources?: Array<{
    type: 'api' | 'sql' | 'note';
    ref: string;
  }>;
  meta?: {
    tokens?: number;
    latencyMs?: number;
  };
}

// Default values
export const DEFAULT_REGION_CONFIGS: RegionConfig[] = [
  { name: 'AMER', current: 0, target: 10, gap: 10, maxStores: 50 },
  { name: 'EMEA', current: 0, target: 8, gap: 8, maxStores: 40 },
  { name: 'APAC', current: 0, target: 12, gap: 12, maxStores: 60 }
];

export const DEFAULT_EXPANSION_MODE: 'live' | 'model' = 'live';
export const DEFAULT_MAX_MARKERS = 500;
export const DEFAULT_DEBOUNCE_MS = 300;

// Type guards
export const isValidExpansionRecommendation = (rec: any): rec is ExpansionRecommendation => {
  return (
    typeof rec === 'object' &&
    typeof rec.id === 'string' &&
    typeof rec.lat === 'number' &&
    typeof rec.lng === 'number' &&
    typeof rec.region === 'string' &&
    typeof rec.finalScore === 'number' &&
    typeof rec.confidence === 'number' &&
    typeof rec.isLive === 'boolean' &&
    rec.lat >= -90 && rec.lat <= 90 &&
    rec.lng >= -180 && rec.lng <= 180 &&
    rec.finalScore >= 0 && rec.finalScore <= 1 &&
    rec.confidence >= 0 && rec.confidence <= 1
  );
};

export const isValidExpansionMode = (mode: any): mode is 'live' | 'model' => {
  return mode === 'live' || mode === 'model';
};