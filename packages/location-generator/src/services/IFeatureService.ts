import { H3Cell } from '../types/geospatial';
import { CandidateFeatures, ExistingStore, CompetitorLocation, PopulationGrid, AnchorPoint } from '../types/core';

/**
 * Context for feature computation
 */
export interface AnalysisContext {
  existingStores: ExistingStore[];
  competitors: CompetitorLocation[];
  populationData: PopulationGrid;
  anchors: AnchorPoint[];
  countryBoundary: GeoJSON.Polygon;
}

/**
 * Interface for computing location features
 */
export interface IFeatureService {
  /**
   * Compute basic features for national sweep (fast, approximate)
   */
  computeBasicFeatures(cell: H3Cell, context: AnalysisContext): CandidateFeatures;

  /**
   * Compute refined features for shortlisted candidates (detailed, accurate)
   */
  computeRefinedFeatures(cell: H3Cell, context: AnalysisContext): CandidateFeatures;

  /**
   * Calculate population within radius of a point
   */
  calculatePopulation(lat: number, lng: number, radiusKm: number, populationData: PopulationGrid): {
    population: number;
    isEstimated: boolean;
  };

  /**
   * Find nearest brand store distance
   */
  calculateNearestBrandDistance(lat: number, lng: number, existingStores: ExistingStore[]): number;

  /**
   * Calculate competitor density within radius
   */
  calculateCompetitorDensity(lat: number, lng: number, competitors: CompetitorLocation[], radiusKm: number): number;

  /**
   * Process anchor points with deduplication and scoring
   */
  processAnchors(lat: number, lng: number, anchors: AnchorPoint[], radiusKm: number): import('../types/core').AnchorData;

  /**
   * Calculate performance proxy (market-based estimates)
   */
  calculatePerformanceProxy(lat: number, lng: number, context: AnalysisContext): number;

  /**
   * Get travel time catchment (with fallback to radial)
   */
  getTravelTimeCatchment(lat: number, lng: number, timeMinutes: number): Promise<{
    population: number;
    isEstimated: boolean;
  }>;
}