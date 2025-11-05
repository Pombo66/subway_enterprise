import { GeoJSON } from 'geojson';

/**
 * Core data models for the National Store Location Generator
 */

export interface CountryConfig {
  countryCode: string;
  boundary: GeoJSON.Polygon;
  administrativeRegions: AdministrativeRegion[];
  majorMetropolitanAreas: string[];
  maxRegionShare: number; // default 0.4
}

export interface AdministrativeRegion {
  id: string;
  name: string;
  boundary: GeoJSON.Polygon;
  population: number;
}

export interface LocationCandidate {
  id: string;
  lat: number;
  lng: number;
  h3Index: string;
  administrativeRegion: string;
  features: CandidateFeatures;
  scores: ScoreBreakdown;
  constraints: ConstraintStatus;
  dataQuality: DataQuality;
  status: CandidateStatus;
  rationale?: string;
  confidence?: number;
}

export interface CandidateFeatures {
  population: number;
  nearestBrandKm: number;
  competitorDensity: number;
  anchors: AnchorData;
  performanceProxy: number;
}

export interface AnchorData {
  raw: number;
  deduplicated: number;
  diminishingScore: number;
  breakdown: Record<AnchorType, number>;
}

export interface ScoreBreakdown {
  population: number;
  gap: number;
  anchor: number;
  performance: number;
  saturationPenalty: number;
  final: number;
}

export interface ConstraintStatus {
  spacingOk: boolean;
  stateShareOk: boolean;
}

export interface DataQuality {
  completeness: number; // 0-1 scale
  estimated: {
    population: boolean;
    anchors: boolean;
    travelTime: boolean;
  };
  confidence: number;
}

export interface ExistingStore {
  id: string;
  name: string;
  lat: number;
  lng: number;
  turnover?: number;
}

export interface CompetitorLocation {
  lat: number;
  lng: number;
}

export interface AnchorPoint {
  id: string;
  lat: number;
  lng: number;
  type: AnchorType;
  name?: string;
}

export interface PopulationGrid {
  cells: PopulationCell[];
  resolution: number;
  dataSource: string;
}

export interface PopulationCell {
  lat: number;
  lng: number;
  population: number;
  h3Index?: string;
}

export interface PortfolioSummary {
  selectedCount: number;
  rejectedCount: number;
  stateDistribution: Record<string, number>;
  acceptanceRate: number;
}

export interface SystemDiagnostics {
  weightsUsed: ScoreWeights;
  anchorDedupReport: AnchorDedupReport;
  rejectionBreakdown: Record<RejectionReason, number>;
  scoringDistribution: ScoringDistribution;
}

export interface ReproducibilityInfo {
  seed: string;
  dataVersions: Record<string, string>;
  scenarioHash: string;
}

export interface AnchorDedupReport {
  totalAnchors: number;
  deduplicatedAnchors: number;
  mergesByType: Record<AnchorType, number>;
}

export interface ScoringDistribution {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
}

// Enums and constants
export enum AnchorType {
  MALL_TENANT = 'mall-tenant',
  STATION_SHOPS = 'station-shops',
  GROCER = 'grocer-grocer',
  RETAIL = 'retail-retail'
}

export enum CandidateStatus {
  SELECTED = 'SELECTED',
  REJECTED = 'REJECTED',
  HOLD = 'HOLD'
}

export enum RejectionReason {
  SPACING_VIOLATION = 'spacing',
  REGIONAL_SHARE_EXCEEDED = 'regional_share',
  LOW_COMPLETENESS = 'data_quality',
  SATURATION_PENALTY = 'market_saturation'
}

export interface ConstraintViolation {
  reason: RejectionReason;
  details: string;
  suggestedAction?: string;
}

export interface ScoreWeights {
  population: number;
  gap: number;
  anchor: number;
  performance: number;
  saturation: number;
}