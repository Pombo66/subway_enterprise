import { CountryConfig, ScoreWeights, ExistingStore, CompetitorLocation, PopulationGrid, AnchorPoint } from './core';
import { AIServiceConfig } from './ai';

/**
 * Configuration types for the location generator
 */

export interface GenerationRequest {
  country: CountryConfig;
  existingStores: ExistingStore[];
  competitors?: CompetitorLocation[];
  populationData: PopulationGrid;
  anchors?: AnchorPoint[];
  config: GenerationConfig;
}

export interface GenerationConfig {
  targetK: number;
  minSpacingM: number;
  gridResolution: number; // H3 resolution 8-9
  weights: ScoreWeights;
  enableAI: boolean;
  mode?: 'Defend' | 'Balanced' | 'Blitz';
  aiConfig?: AIServiceConfig;
  performance?: PerformanceConfig;
}

export interface PerformanceConfig {
  maxProcessingTimeMinutes: number; // default 10
  maxMemoryGB: number; // default 4
  enableCaching: boolean;
  windowSizeKm: number; // default 25-50
  bufferSizeKm: number; // default 5-10
}

export interface GenerationResult {
  sites: import('./core').LocationCandidate[];
  portfolio: import('./core').PortfolioSummary;
  diagnostics: import('./core').SystemDiagnostics;
  reproducibility: import('./core').ReproducibilityInfo;
  degraded?: boolean; // True if cache was unavailable and system fell back to L0
}

export interface ValidationConfig {
  minCompleteness: number; // default 0.5
  minAcceptanceRate: number; // default 0.15
  requireMetropolitanAreas: boolean; // default true
  maxRegionShare: number; // default 0.4
}

export interface ProcessingContext {
  startTime: Date;
  seed: string;
  dataVersions: Record<string, string>;
  config: GenerationConfig;
  country: CountryConfig;
}