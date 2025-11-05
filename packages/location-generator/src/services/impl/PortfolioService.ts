import { LocationCandidate, CountryConfig, ExistingStore, CandidateStatus, PortfolioSummary, RejectionReason } from '../../types/core';
import { IConstraintService } from '../IConstraintService';
import { CONSTRAINT_DEFAULTS } from '../../config/constants';

/**
 * Service for portfolio building and optimization
 */
export class PortfolioService {
  constructor(private constraintService: IConstraintService) {}

  /**
   * Build portfolio using greedy selection algorithm
   */
  buildPortfolio(
    candidates: LocationCandidate[],
    config: CountryConfig,
    existingStores: ExistingStore[],
    targetK: number,
    minSpacingM: number = CONSTRAINT_DEFAULTS.MIN_SPACING_M
  ): {
    selected: LocationCandidate[];
    rejected: LocationCandidate[];
    summary: PortfolioSummary;
  } {
    try {
      const selected: LocationCandidate[] = [];
      const rejected: LocationCandidate[] = [];
      
      // Sort candidates by final score (descending)
      const sortedCandidates = [...candidates].sort((a, b) => b.scores.final - a.scores.final);

      // Greedy selection with constraint checking
      for (const candidate of sortedCandidates) {
        if (selected.length >= targetK) {
          // Mark remaining as rejected due to capacity
          candidate.status = CandidateStatus.REJECTED;
          rejected.push(candidate);
          continue;
        }

        // Check all constraints
        const violations = this.constraintService.getConstraintViolations(candidate, {
          existingStores,
          selectedCandidates: selected,
          config,
          minSpacingM,
          minCompleteness: CONSTRAINT_DEFAULTS.MIN_COMPLETENESS
        });

        if (violations.length === 0) {
          // Accept candidate
          candidate.status = CandidateStatus.SELECTED;
          candidate.constraints.spacingOk = true;
          candidate.constraints.stateShareOk = true;
          selected.push(candidate);
        } else {
          // Reject candidate
          candidate.status = CandidateStatus.REJECTED;
          rejected.push(candidate);
        }
      }

      // Generate portfolio summary
      const summary = this.generatePortfolioSummary(selected, rejected, config);

      return { selected, rejected, summary };
    } catch (error) {
      throw new Error(`Failed to build portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate portfolio summary with statistics
   */
  private generatePortfolioSummary(
    selected: LocationCandidate[],
    rejected: LocationCandidate[],
    config: CountryConfig
  ): PortfolioSummary {
    // Calculate state distribution
    const stateDistribution: Record<string, number> = {};
    for (const candidate of selected) {
      stateDistribution[candidate.administrativeRegion] = 
        (stateDistribution[candidate.administrativeRegion] || 0) + 1;
    }

    // Calculate acceptance rate
    const totalCandidates = selected.length + rejected.length;
    const acceptanceRate = totalCandidates > 0 ? selected.length / totalCandidates : 0;

    return {
      selectedCount: selected.length,
      rejectedCount: rejected.length,
      stateDistribution,
      acceptanceRate
    };
  }

  /**
   * Optimize portfolio with iterative improvement
   */
  optimizePortfolio(
    selected: LocationCandidate[],
    rejected: LocationCandidate[],
    config: CountryConfig,
    existingStores: ExistingStore[],
    minSpacingM: number
  ): {
    optimized: LocationCandidate[];
    improvements: number;
    swaps: Array<{ removed: string; added: string; improvement: number }>;
  } {
    const optimized = [...selected];
    const swaps: Array<{ removed: string; added: string; improvement: number }> = [];
    let improvements = 0;

    // Try to swap lower-scoring selected candidates with higher-scoring rejected ones
    const sortedRejected = rejected
      .filter(r => r.status === CandidateStatus.REJECTED)
      .sort((a, b) => b.scores.final - a.scores.final);

    for (const rejectedCandidate of sortedRejected) {
      // Find the lowest scoring selected candidate that could be replaced
      const sortedSelected = optimized.sort((a, b) => a.scores.final - b.scores.final);
      
      for (let i = 0; i < sortedSelected.length; i++) {
        const selectedCandidate = sortedSelected[i];
        
        // Check if rejected candidate scores higher
        if (rejectedCandidate.scores.final > selectedCandidate.scores.final) {
          // Try the swap
          const tempOptimized = [...optimized];
          tempOptimized[i] = rejectedCandidate;
          
          // Check if the swap maintains all constraints
          const violations = this.constraintService.getConstraintViolations(rejectedCandidate, {
            existingStores,
            selectedCandidates: tempOptimized.filter(c => c.id !== rejectedCandidate.id),
            config,
            minSpacingM,
            minCompleteness: CONSTRAINT_DEFAULTS.MIN_COMPLETENESS
          });

          if (violations.length === 0) {
            // Perform the swap
            optimized[i] = rejectedCandidate;
            rejectedCandidate.status = CandidateStatus.SELECTED;
            selectedCandidate.status = CandidateStatus.REJECTED;
            
            const improvement = rejectedCandidate.scores.final - selectedCandidate.scores.final;
            swaps.push({
              removed: selectedCandidate.id,
              added: rejectedCandidate.id,
              improvement
            });
            improvements++;
            break;
          }
        }
      }
    }

    return { optimized, improvements, swaps };
  }

  /**
   * Validate portfolio against requirements
   */
  validatePortfolio(
    selected: LocationCandidate[],
    config: CountryConfig,
    targetK: number
  ): {
    isValid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check target count
    if (selected.length < targetK * 0.8) {
      issues.push(`Selected ${selected.length} candidates, significantly below target ${targetK}`);
    } else if (selected.length < targetK) {
      warnings.push(`Selected ${selected.length} candidates, below target ${targetK}`);
    }

    // Check regional fairness
    const fairnessResult = this.constraintService.validateRegionalShare(selected, config);
    if (!fairnessResult.isValid) {
      issues.push(`Regional fairness violations: ${fairnessResult.violations.length} issues`);
    }

    // Check metropolitan area coverage
    const metroResult = this.constraintService.validateMetropolitanAreas(selected, config);
    if (!metroResult.isValid) {
      warnings.push(`Missing metropolitan areas: ${metroResult.missingAreas.join(', ')}`);
    }

    // Check acceptance rate
    const minAcceptanceRate = CONSTRAINT_DEFAULTS.MIN_ACCEPTANCE_RATE;
    const acceptanceRate = selected.length / (selected.length + 100); // Approximate
    if (acceptanceRate < minAcceptanceRate) {
      warnings.push(`Low acceptance rate: ${(acceptanceRate * 100).toFixed(1)}%`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Calculate portfolio metrics
   */
  calculatePortfolioMetrics(selected: LocationCandidate[]): {
    totalScore: number;
    averageScore: number;
    scoreDistribution: {
      population: number;
      gap: number;
      anchor: number;
      performance: number;
    };
    qualityMetrics: {
      averageCompleteness: number;
      estimatedDataPercent: number;
    };
    geographicSpread: {
      latRange: number;
      lngRange: number;
      centroid: { lat: number; lng: number };
    };
  } {
    if (selected.length === 0) {
      return {
        totalScore: 0,
        averageScore: 0,
        scoreDistribution: { population: 0, gap: 0, anchor: 0, performance: 0 },
        qualityMetrics: { averageCompleteness: 0, estimatedDataPercent: 0 },
        geographicSpread: { latRange: 0, lngRange: 0, centroid: { lat: 0, lng: 0 } }
      };
    }

    // Score metrics
    const totalScore = selected.reduce((sum, c) => sum + c.scores.final, 0);
    const averageScore = totalScore / selected.length;

    const scoreDistribution = {
      population: selected.reduce((sum, c) => sum + c.scores.population, 0) / selected.length,
      gap: selected.reduce((sum, c) => sum + c.scores.gap, 0) / selected.length,
      anchor: selected.reduce((sum, c) => sum + c.scores.anchor, 0) / selected.length,
      performance: selected.reduce((sum, c) => sum + c.scores.performance, 0) / selected.length
    };

    // Quality metrics
    const totalCompleteness = selected.reduce((sum, c) => sum + c.dataQuality.completeness, 0);
    const estimatedCount = selected.filter(c => 
      c.dataQuality.estimated.population || c.dataQuality.estimated.anchors
    ).length;

    const qualityMetrics = {
      averageCompleteness: totalCompleteness / selected.length,
      estimatedDataPercent: (estimatedCount / selected.length) * 100
    };

    // Geographic spread
    const lats = selected.map(c => c.lat);
    const lngs = selected.map(c => c.lng);
    
    const geographicSpread = {
      latRange: Math.max(...lats) - Math.min(...lats),
      lngRange: Math.max(...lngs) - Math.min(...lngs),
      centroid: {
        lat: lats.reduce((sum, lat) => sum + lat, 0) / lats.length,
        lng: lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length
      }
    };

    return {
      totalScore,
      averageScore,
      scoreDistribution,
      qualityMetrics,
      geographicSpread
    };
  }

  /**
   * Generate rejection breakdown
   */
  generateRejectionBreakdown(rejected: LocationCandidate[]): Record<RejectionReason, number> {
    const breakdown: Record<RejectionReason, number> = {
      [RejectionReason.SPACING_VIOLATION]: 0,
      [RejectionReason.REGIONAL_SHARE_EXCEEDED]: 0,
      [RejectionReason.LOW_COMPLETENESS]: 0,
      [RejectionReason.SATURATION_PENALTY]: 0
    };

    // This would need to be populated during the selection process
    // For now, return empty breakdown
    return breakdown;
  }
}