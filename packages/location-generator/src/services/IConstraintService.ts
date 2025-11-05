import { LocationCandidate, CountryConfig, ConstraintViolation, ExistingStore } from '../types/core';

/**
 * Interface for constraint validation and enforcement
 */
export interface IConstraintService {
  /**
   * Validate spacing constraints between candidates and existing stores
   */
  validateSpacing(
    candidate: LocationCandidate, 
    existingStores: ExistingStore[], 
    selectedCandidates: LocationCandidate[], 
    minSpacingM: number
  ): boolean;

  /**
   * Validate regional share constraints
   */
  validateRegionalShare(
    candidates: LocationCandidate[], 
    config: CountryConfig
  ): {
    isValid: boolean;
    violations: ConstraintViolation[];
  };

  /**
   * Validate data quality constraints
   */
  validateDataQuality(candidate: LocationCandidate, minCompleteness: number): boolean;

  /**
   * Check if major metropolitan areas are represented
   */
  validateMetropolitanAreas(
    candidates: LocationCandidate[], 
    config: CountryConfig
  ): {
    isValid: boolean;
    missingAreas: string[];
  };

  /**
   * Calculate acceptance rate and validate minimum threshold
   */
  validateAcceptanceRate(
    selectedCount: number, 
    totalCandidates: number, 
    minAcceptanceRate: number
  ): {
    isValid: boolean;
    actualRate: number;
    warning?: string;
  };

  /**
   * Get all constraint violations for a candidate
   */
  getConstraintViolations(
    candidate: LocationCandidate,
    context: {
      existingStores: ExistingStore[];
      selectedCandidates: LocationCandidate[];
      config: CountryConfig;
      minSpacingM: number;
      minCompleteness: number;
    }
  ): ConstraintViolation[];

  /**
   * Calculate distance between two points in meters
   */
  calculateDistance(
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number;

  /**
   * Check if a point is within an administrative region
   */
  isWithinRegion(
    lat: number, lng: number, 
    region: import('../types/core').AdministrativeRegion
  ): boolean;
}