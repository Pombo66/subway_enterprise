import { LocationCandidate } from '../../types/core';
import { GridWindow, H3Cell } from '../../types/geospatial';
import { IGridService } from '../IGridService';
import { IFeatureService, AnalysisContext } from '../IFeatureService';
import { GRID_CONSTANTS } from '../../config/constants';

/**
 * Service for windowed refinement processing
 */
export class RefinementService {
  constructor(
    private gridService: IGridService,
    private featureService: IFeatureService
  ) {}

  /**
   * Apply windowed refinement to shortlisted candidates
   */
  async refineShortlistedCandidates(
    shortlisted: LocationCandidate[],
    context: AnalysisContext
  ): Promise<LocationCandidate[]> {
    try {
      if (shortlisted.length === 0) return [];

      // Convert candidates to H3 cells for windowing
      const cells: H3Cell[] = shortlisted.map(candidate => ({
        index: candidate.h3Index,
        lat: candidate.lat,
        lng: candidate.lng,
        resolution: GRID_CONSTANTS.DEFAULT_RESOLUTION
      }));

      // Create processing windows
      const windows = this.gridService.createWindows(
        cells,
        GRID_CONSTANTS.WINDOW_SIZE_KM,
        GRID_CONSTANTS.BUFFER_SIZE_KM
      );

      // Process each window
      const refinedCandidates: LocationCandidate[] = [];
      
      for (const window of windows) {
        const windowCandidates = shortlisted.filter(candidate =>
          this.isInWindow(candidate, window)
        );

        const refined = await this.refineWindowCandidates(windowCandidates, context);
        refinedCandidates.push(...refined);
      }

      // Deduplicate (in case of window overlaps)
      return this.deduplicateCandidates(refinedCandidates);
    } catch (error) {
      throw new Error(`Failed to refine shortlisted candidates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refine candidates within a specific window
   */
  private async refineWindowCandidates(
    candidates: LocationCandidate[],
    context: AnalysisContext
  ): Promise<LocationCandidate[]> {
    const refined: LocationCandidate[] = [];

    for (const candidate of candidates) {
      try {
        // Apply refined feature computation
        const refinedFeatures = await (this.featureService as any).computeRefinedFeaturesWithTravelTime(
          {
            index: candidate.h3Index,
            lat: candidate.lat,
            lng: candidate.lng,
            resolution: GRID_CONSTANTS.DEFAULT_RESOLUTION
          },
          context
        );

        // Update candidate with refined features
        const refinedCandidate: LocationCandidate = {
          ...candidate,
          features: refinedFeatures,
          // Note: Scores will need to be recalculated after refinement
        };

        refined.push(refinedCandidate);
      } catch (error) {
        console.warn(`Failed to refine candidate ${candidate.id}: ${error}`);
        // Keep original candidate if refinement fails
        refined.push(candidate);
      }
    }

    return refined;
  }

  /**
   * Check if candidate is within a processing window
   */
  private isInWindow(candidate: LocationCandidate, window: GridWindow): boolean {
    return (
      candidate.lat >= window.boundary.minLat &&
      candidate.lat <= window.boundary.maxLat &&
      candidate.lng >= window.boundary.minLng &&
      candidate.lng <= window.boundary.maxLng
    );
  }

  /**
   * Remove duplicate candidates (from window overlaps)
   */
  private deduplicateCandidates(candidates: LocationCandidate[]): LocationCandidate[] {
    const seen = new Set<string>();
    const deduplicated: LocationCandidate[] = [];

    for (const candidate of candidates) {
      if (!seen.has(candidate.id)) {
        seen.add(candidate.id);
        deduplicated.push(candidate);
      }
    }

    return deduplicated;
  }

  /**
   * Get refinement statistics
   */
  getRefinementStats(
    original: LocationCandidate[],
    refined: LocationCandidate[]
  ): {
    processedCount: number;
    improvementCount: number;
    avgFeatureImprovement: {
      population: number;
      anchors: number;
      performance: number;
    };
    processingEfficiency: number;
  } {
    let improvementCount = 0;
    let totalPopImprovement = 0;
    let totalAnchorImprovement = 0;
    let totalPerfImprovement = 0;

    const originalMap = new Map(original.map(c => [c.id, c]));

    for (const refinedCandidate of refined) {
      const originalCandidate = originalMap.get(refinedCandidate.id);
      if (originalCandidate) {
        const popImprovement = refinedCandidate.features.population - originalCandidate.features.population;
        const anchorImprovement = refinedCandidate.features.anchors.diminishingScore - originalCandidate.features.anchors.diminishingScore;
        const perfImprovement = refinedCandidate.features.performanceProxy - originalCandidate.features.performanceProxy;

        if (popImprovement > 0 || anchorImprovement > 0 || perfImprovement > 0) {
          improvementCount++;
        }

        totalPopImprovement += popImprovement;
        totalAnchorImprovement += anchorImprovement;
        totalPerfImprovement += perfImprovement;
      }
    }

    const processedCount = refined.length;
    const avgCount = processedCount > 0 ? processedCount : 1;

    return {
      processedCount,
      improvementCount,
      avgFeatureImprovement: {
        population: totalPopImprovement / avgCount,
        anchors: totalAnchorImprovement / avgCount,
        performance: totalPerfImprovement / avgCount
      },
      processingEfficiency: processedCount / original.length
    };
  }

  /**
   * Validate refinement quality
   */
  validateRefinement(
    original: LocationCandidate[],
    refined: LocationCandidate[]
  ): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check that all candidates were processed
    if (refined.length < original.length) {
      issues.push(`Lost ${original.length - refined.length} candidates during refinement`);
      recommendations.push('Review refinement error handling');
    }

    // Check for data quality improvements
    const stats = this.getRefinementStats(original, refined);
    
    if (stats.improvementCount < original.length * 0.1) {
      issues.push(`Only ${stats.improvementCount} of ${original.length} candidates improved`);
      recommendations.push('Review refinement algorithms and data sources');
    }

    if (stats.processingEfficiency < 0.95) {
      issues.push(`Processing efficiency ${(stats.processingEfficiency * 100).toFixed(1)}% below 95%`);
      recommendations.push('Optimize windowed processing performance');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }
}