import { LocationCandidate, CountryConfig, ConstraintViolation, ExistingStore, RejectionReason, AdministrativeRegion } from '../../types/core';
import { IConstraintService } from '../IConstraintService';
import { CONSTRAINT_DEFAULTS } from '../../config/constants';
import * as turf from '@turf/turf';

/**
 * Implementation of constraint validation and enforcement
 */
export class ConstraintService implements IConstraintService {

  /**
   * Validate spacing constraints between candidates and existing stores
   */
  validateSpacing(
    candidate: LocationCandidate, 
    existingStores: ExistingStore[], 
    selectedCandidates: LocationCandidate[], 
    minSpacingM: number
  ): boolean {
    try {
      const minSpacingKm = minSpacingM / 1000;

      // Check distance to existing brand stores
      for (const store of existingStores) {
        const distance = this.calculateDistance(candidate.lat, candidate.lng, store.lat, store.lng);
        if (distance < minSpacingKm) {
          return false;
        }
      }

      // Check distance to already selected candidates
      for (const selected of selectedCandidates) {
        if (selected.id === candidate.id) continue; // Skip self
        
        const distance = this.calculateDistance(candidate.lat, candidate.lng, selected.lat, selected.lng);
        if (distance < minSpacingKm) {
          return false;
        }
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to validate spacing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate regional share constraints with population weighting
   */
  validateRegionalShare(
    candidates: LocationCandidate[], 
    config: CountryConfig
  ): {
    isValid: boolean;
    violations: ConstraintViolation[];
  } {
    try {
      const violations: ConstraintViolation[] = [];
      
      if (candidates.length === 0) {
        return { isValid: true, violations: [] };
      }

      // Count candidates by region
      const regionCounts = new Map<string, number>();
      for (const candidate of candidates) {
        const count = regionCounts.get(candidate.administrativeRegion) || 0;
        regionCounts.set(candidate.administrativeRegion, count + 1);
      }

      // Calculate population-weighted fairness
      const fairnessResult = this.calculatePopulationWeightedFairness(candidates, config);
      
      // Check absolute max share limit
      const totalCandidates = candidates.length;
      const maxAllowed = Math.floor(totalCandidates * config.maxRegionShare);

      for (const [regionId, count] of regionCounts) {
        const region = config.administrativeRegions.find(r => r.id === regionId);
        const actualShare = count / totalCandidates;
        
        // Check absolute maximum
        if (count > maxAllowed) {
          violations.push({
            reason: RejectionReason.REGIONAL_SHARE_EXCEEDED,
            details: `Region ${region?.name || regionId} has ${count} candidates (${(actualShare*100).toFixed(1)}%) exceeding absolute max share of ${(config.maxRegionShare*100).toFixed(1)}%`,
            suggestedAction: `Reduce candidates in ${region?.name || regionId} to ${maxAllowed} or fewer`
          });
        }

        // Check population-weighted fairness
        const expectedShare = fairnessResult.expectedShares.get(regionId) || 0;
        const fairnessRatio = actualShare / expectedShare;
        
        if (fairnessRatio > 2.0) { // More than 2x expected share
          violations.push({
            reason: RejectionReason.REGIONAL_SHARE_EXCEEDED,
            details: `Region ${region?.name || regionId} has ${(actualShare*100).toFixed(1)}% of candidates but only ${(expectedShare*100).toFixed(1)}% of population (${fairnessRatio.toFixed(1)}x overrepresented)`,
            suggestedAction: `Rebalance candidates to better match population distribution`
          });
        }
      }

      return {
        isValid: violations.length === 0,
        violations
      };
    } catch (error) {
      throw new Error(`Failed to validate regional share: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate population-weighted fairness expectations
   */
  calculatePopulationWeightedFairness(
    candidates: LocationCandidate[],
    config: CountryConfig
  ): {
    expectedShares: Map<string, number>;
    fairnessScore: number;
  } {
    try {
      const totalPopulation = config.administrativeRegions.reduce((sum, region) => sum + region.population, 0);
      const expectedShares = new Map<string, number>();
      
      // Calculate expected share for each region based on population
      for (const region of config.administrativeRegions) {
        const expectedShare = region.population / totalPopulation;
        expectedShares.set(region.id, expectedShare);
      }

      // Calculate actual distribution
      const regionCounts = new Map<string, number>();
      for (const candidate of candidates) {
        const count = regionCounts.get(candidate.administrativeRegion) || 0;
        regionCounts.set(candidate.administrativeRegion, count + 1);
      }

      // Calculate fairness score (1.0 = perfectly fair, 0.0 = completely unfair)
      let fairnessScore = 1.0;
      const totalCandidates = candidates.length;

      if (totalCandidates > 0) {
        for (const [regionId, expectedShare] of expectedShares) {
          const actualCount = regionCounts.get(regionId) || 0;
          const actualShare = actualCount / totalCandidates;
          
          // Calculate deviation from expected
          const deviation = Math.abs(actualShare - expectedShare);
          fairnessScore -= deviation;
        }
      }

      fairnessScore = Math.max(0, fairnessScore);

      return { expectedShares, fairnessScore };
    } catch (error) {
      throw new Error(`Failed to calculate population-weighted fairness: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Suggest regional rebalancing to improve fairness
   */
  suggestRegionalRebalancing(
    candidates: LocationCandidate[],
    config: CountryConfig,
    targetCount: number
  ): Map<string, { current: number; suggested: number; adjustment: number }> {
    try {
      const fairnessResult = this.calculatePopulationWeightedFairness(candidates, config);
      const suggestions = new Map<string, { current: number; suggested: number; adjustment: number }>();

      // Count current distribution
      const regionCounts = new Map<string, number>();
      for (const candidate of candidates) {
        const count = regionCounts.get(candidate.administrativeRegion) || 0;
        regionCounts.set(candidate.administrativeRegion, count + 1);
      }

      // Calculate suggested distribution
      for (const [regionId, expectedShare] of fairnessResult.expectedShares) {
        const currentCount = regionCounts.get(regionId) || 0;
        const suggestedCount = Math.round(targetCount * expectedShare);
        const adjustment = suggestedCount - currentCount;

        suggestions.set(regionId, {
          current: currentCount,
          suggested: suggestedCount,
          adjustment
        });
      }

      return suggestions;
    } catch (error) {
      throw new Error(`Failed to suggest regional rebalancing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate data quality constraints
   */
  validateDataQuality(candidate: LocationCandidate, minCompleteness: number): boolean {
    try {
      return candidate.dataQuality.completeness >= minCompleteness;
    } catch (error) {
      throw new Error(`Failed to validate data quality: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Comprehensive data quality assessment
   */
  assessDataQuality(candidate: LocationCandidate): {
    overallScore: number;
    issues: string[];
    recommendations: string[];
  } {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];
      let qualityScore = 1.0;

      // Check completeness
      if (candidate.dataQuality.completeness < CONSTRAINT_DEFAULTS.MIN_COMPLETENESS) {
        issues.push(`Low data completeness: ${(candidate.dataQuality.completeness * 100).toFixed(1)}%`);
        recommendations.push('Improve data collection for this location');
        qualityScore *= 0.7;
      }

      // Check for estimated data
      if (candidate.dataQuality.estimated.population) {
        issues.push('Population data is estimated');
        recommendations.push('Obtain actual census data for more accurate population figures');
        qualityScore *= 0.9;
      }

      if (candidate.dataQuality.estimated.anchors) {
        issues.push('Anchor point data is estimated');
        recommendations.push('Verify anchor points with local surveys or updated POI data');
        qualityScore *= 0.9;
      }

      if (candidate.dataQuality.estimated.travelTime) {
        issues.push('Travel time data is estimated');
        recommendations.push('Use actual travel time APIs for more accurate catchment analysis');
        qualityScore *= 0.95;
      }

      // Check confidence level
      if (candidate.dataQuality.confidence < 0.7) {
        issues.push(`Low confidence score: ${(candidate.dataQuality.confidence * 100).toFixed(1)}%`);
        recommendations.push('Review data sources and validation methods');
        qualityScore *= candidate.dataQuality.confidence;
      }

      // Check feature quality
      if (candidate.features.population === 0) {
        issues.push('No population data available');
        recommendations.push('Investigate population data sources for this area');
        qualityScore *= 0.8;
      }

      if (candidate.features.nearestBrandKm === Infinity) {
        issues.push('No existing brand stores found for distance calculation');
        recommendations.push('Verify brand store database completeness');
        qualityScore *= 0.9;
      }

      return {
        overallScore: Math.max(0, qualityScore),
        issues,
        recommendations
      };
    } catch (error) {
      throw new Error(`Failed to assess data quality: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Filter candidates by data quality thresholds
   */
  filterByDataQuality(
    candidates: LocationCandidate[],
    minCompleteness: number,
    minConfidence: number = 0.5
  ): {
    passed: LocationCandidate[];
    failed: LocationCandidate[];
    rejectionReasons: Map<string, string[]>;
  } {
    try {
      const passed: LocationCandidate[] = [];
      const failed: LocationCandidate[] = [];
      const rejectionReasons = new Map<string, string[]>();

      for (const candidate of candidates) {
        const reasons: string[] = [];

        if (candidate.dataQuality.completeness < minCompleteness) {
          reasons.push(`Completeness ${(candidate.dataQuality.completeness * 100).toFixed(1)}% below threshold ${(minCompleteness * 100).toFixed(1)}%`);
        }

        if (candidate.dataQuality.confidence < minConfidence) {
          reasons.push(`Confidence ${(candidate.dataQuality.confidence * 100).toFixed(1)}% below threshold ${(minConfidence * 100).toFixed(1)}%`);
        }

        if (reasons.length > 0) {
          failed.push(candidate);
          rejectionReasons.set(candidate.id, reasons);
        } else {
          passed.push(candidate);
        }
      }

      return { passed, failed, rejectionReasons };
    } catch (error) {
      throw new Error(`Failed to filter by data quality: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate acceptance rate with quality considerations
   */
  calculateQualityAdjustedAcceptanceRate(
    candidates: LocationCandidate[],
    selectedCandidates: LocationCandidate[],
    minAcceptanceRate: number
  ): {
    rawRate: number;
    qualityAdjustedRate: number;
    isValid: boolean;
    warning?: string;
  } {
    try {
      if (candidates.length === 0) {
        return { rawRate: 0, qualityAdjustedRate: 0, isValid: true };
      }

      const rawRate = selectedCandidates.length / candidates.length;

      // Weight by data quality - higher quality candidates count more
      const totalQualityWeight = candidates.reduce((sum, c) => sum + c.dataQuality.completeness, 0);
      const selectedQualityWeight = selectedCandidates.reduce((sum, c) => sum + c.dataQuality.completeness, 0);
      
      const qualityAdjustedRate = totalQualityWeight > 0 ? selectedQualityWeight / totalQualityWeight : 0;
      const isValid = qualityAdjustedRate >= minAcceptanceRate;

      return {
        rawRate,
        qualityAdjustedRate,
        isValid,
        warning: isValid ? undefined : `Quality-adjusted acceptance rate ${(qualityAdjustedRate * 100).toFixed(1)}% below threshold ${(minAcceptanceRate * 100).toFixed(1)}%`
      };
    } catch (error) {
      throw new Error(`Failed to calculate quality-adjusted acceptance rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if major metropolitan areas are represented
   */
  validateMetropolitanAreas(
    candidates: LocationCandidate[], 
    config: CountryConfig
  ): {
    isValid: boolean;
    missingAreas: string[];
  } {
    try {
      const missingAreas: string[] = [];
      
      for (const metroArea of config.majorMetropolitanAreas) {
        // Find if any candidate is in this metropolitan area
        const hasCandidate = candidates.some(candidate => {
          // Simple check - in a full implementation, this would use proper geographic boundaries
          return candidate.administrativeRegion.toLowerCase().includes(metroArea.toLowerCase()) ||
                 this.isNearMetropolitanArea(candidate, metroArea, config);
        });

        if (!hasCandidate) {
          missingAreas.push(metroArea);
        }
      }

      return {
        isValid: missingAreas.length === 0,
        missingAreas
      };
    } catch (error) {
      throw new Error(`Failed to validate metropolitan areas: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

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
  } {
    try {
      if (totalCandidates === 0) {
        return { isValid: true, actualRate: 0 };
      }

      const actualRate = selectedCount / totalCandidates;
      const isValid = actualRate >= minAcceptanceRate;

      return {
        isValid,
        actualRate,
        warning: isValid ? undefined : `Acceptance rate ${(actualRate*100).toFixed(1)}% is below minimum threshold of ${(minAcceptanceRate*100).toFixed(1)}%`
      };
    } catch (error) {
      throw new Error(`Failed to validate acceptance rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

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
  ): ConstraintViolation[] {
    try {
      const violations: ConstraintViolation[] = [];

      // Check spacing constraints
      if (!this.validateSpacing(candidate, context.existingStores, context.selectedCandidates, context.minSpacingM)) {
        const nearestStore = this.findNearestStore(candidate, context.existingStores);
        const nearestCandidate = this.findNearestCandidate(candidate, context.selectedCandidates);
        
        let details = `Candidate violates minimum spacing of ${context.minSpacingM}m`;
        if (nearestStore) {
          const distance = this.calculateDistance(candidate.lat, candidate.lng, nearestStore.lat, nearestStore.lng) * 1000;
          details += `. Nearest store: ${nearestStore.name} at ${distance.toFixed(0)}m`;
        }
        if (nearestCandidate) {
          const distance = this.calculateDistance(candidate.lat, candidate.lng, nearestCandidate.lat, nearestCandidate.lng) * 1000;
          details += `. Nearest candidate: ${nearestCandidate.id} at ${distance.toFixed(0)}m`;
        }

        violations.push({
          reason: RejectionReason.SPACING_VIOLATION,
          details,
          suggestedAction: `Increase spacing or remove conflicting locations`
        });
      }

      // Check data quality constraints
      if (!this.validateDataQuality(candidate, context.minCompleteness)) {
        violations.push({
          reason: RejectionReason.LOW_COMPLETENESS,
          details: `Data completeness ${(candidate.dataQuality.completeness*100).toFixed(1)}% is below minimum threshold of ${(context.minCompleteness*100).toFixed(1)}%`,
          suggestedAction: `Improve data quality or lower completeness threshold`
        });
      }

      return violations;
    } catch (error) {
      throw new Error(`Failed to get constraint violations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate distance between two points in kilometers
   */
  calculateDistance(
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number {
    try {
      // Handle invalid coordinates
      if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
        return Infinity;
      }

      // Use Haversine formula for accurate distance calculation
      const R = 6371; // Earth's radius in km
      const dLat = this.toRadians(lat2 - lat1);
      const dLng = this.toRadians(lng2 - lng1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    } catch (error) {
      throw new Error(`Failed to calculate distance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a point is within an administrative region
   */
  isWithinRegion(
    lat: number, lng: number, 
    region: AdministrativeRegion
  ): boolean {
    try {
      const point = turf.point([lng, lat]);
      const polygon = turf.polygon(region.boundary.coordinates);
      return turf.booleanPointInPolygon(point, polygon);
    } catch (error) {
      // Fallback to simple bounding box check if turf fails
      console.warn(`Failed to use precise region check, falling back to simple method: ${error}`);
      return this.isWithinRegionSimple(lat, lng, region);
    }
  }

  /**
   * Batch validate spacing for multiple candidates
   */
  validateBatchSpacing(
    candidates: LocationCandidate[],
    existingStores: ExistingStore[],
    minSpacingM: number
  ): Map<string, boolean> {
    const results = new Map<string, boolean>();
    const selectedCandidates: LocationCandidate[] = [];

    for (const candidate of candidates) {
      const isValid = this.validateSpacing(candidate, existingStores, selectedCandidates, minSpacingM);
      results.set(candidate.id, isValid);
      
      if (isValid) {
        selectedCandidates.push(candidate);
      }
    }

    return results;
  }

  /**
   * Calculate optimal spacing based on population density
   */
  calculateOptimalSpacing(populationDensity: number, baseSpacingM: number): number {
    // Higher population density allows for closer spacing
    const densityFactor = Math.max(0.5, Math.min(2.0, 1000 / populationDensity));
    return Math.round(baseSpacingM * densityFactor);
  }

  // Helper methods
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private findNearestStore(candidate: LocationCandidate, stores: ExistingStore[]): ExistingStore | null {
    if (stores.length === 0) return null;

    let nearest = stores[0];
    let minDistance = this.calculateDistance(candidate.lat, candidate.lng, nearest.lat, nearest.lng);

    for (const store of stores.slice(1)) {
      const distance = this.calculateDistance(candidate.lat, candidate.lng, store.lat, store.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = store;
      }
    }

    return nearest;
  }

  private findNearestCandidate(candidate: LocationCandidate, candidates: LocationCandidate[]): LocationCandidate | null {
    const others = candidates.filter(c => c.id !== candidate.id);
    if (others.length === 0) return null;

    let nearest = others[0];
    let minDistance = this.calculateDistance(candidate.lat, candidate.lng, nearest.lat, nearest.lng);

    for (const other of others.slice(1)) {
      const distance = this.calculateDistance(candidate.lat, candidate.lng, other.lat, other.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = other;
      }
    }

    return nearest;
  }

  private isNearMetropolitanArea(candidate: LocationCandidate, metroArea: string, config: CountryConfig): boolean {
    // Simple implementation - in practice, this would use proper metropolitan area boundaries
    // For now, check if candidate is in a region that might contain the metro area
    const region = config.administrativeRegions.find(r => r.id === candidate.administrativeRegion);
    if (!region) return false;

    // Check if region name contains metro area name (case insensitive)
    return region.name.toLowerCase().includes(metroArea.toLowerCase());
  }

  private isWithinRegionSimple(lat: number, lng: number, region: AdministrativeRegion): boolean {
    // Simple bounding box check as fallback
    const coords = region.boundary.coordinates[0];
    const lats = coords.map(coord => coord[1]);
    const lngs = coords.map(coord => coord[0]);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  }
}