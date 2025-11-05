import { LocationCandidate, CountryConfig } from '../../types/core';
import { SHORTLIST_PARAMS } from '../../config/constants';

/**
 * Service for shortlisting candidates based on national and regional criteria
 */
export class ShortlistService {

  /**
   * Perform national shortlisting with fairness considerations
   */
  shortlistCandidates(
    candidates: LocationCandidate[],
    config: CountryConfig,
    targetK: number
  ): LocationCandidate[] {
    try {
      if (candidates.length === 0) return [];

      // Calculate shortlist size (at least 5x target K)
      const minShortlistSize = Math.max(targetK * SHORTLIST_PARAMS.MIN_CANDIDATES_MULTIPLIER, 50);
      
      // Step 1: National top slice (1.5% of all candidates)
      const nationalTopCount = Math.max(
        Math.ceil(candidates.length * SHORTLIST_PARAMS.NATIONAL_TOP_PERCENT),
        Math.ceil(minShortlistSize * 0.7) // At least 70% from national top
      );

      const nationalTop = this.selectNationalTop(candidates, nationalTopCount);

      // Step 2: Regional top slice for fairness
      const regionalCandidates = this.selectRegionalTop(candidates, config, minShortlistSize - nationalTop.length);

      // Step 3: Combine and deduplicate
      const shortlisted = this.combineAndDeduplicate(nationalTop, regionalCandidates);

      // Step 4: Ensure minimum size
      if (shortlisted.length < minShortlistSize && shortlisted.length < candidates.length) {
        const additional = this.selectAdditionalCandidates(
          candidates,
          shortlisted,
          minShortlistSize - shortlisted.length
        );
        shortlisted.push(...additional);
      }

      return shortlisted.slice(0, Math.min(shortlisted.length, minShortlistSize * 2)); // Cap at 2x min size
    } catch (error) {
      throw new Error(`Failed to shortlist candidates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Select top candidates nationally based on coverage gap scores
   */
  private selectNationalTop(candidates: LocationCandidate[], count: number): LocationCandidate[] {
    // Sort by gap score (coverage gap is most important for shortlisting)
    const sorted = [...candidates].sort((a, b) => b.scores.gap - a.scores.gap);
    return sorted.slice(0, count);
  }

  /**
   * Select top candidates per region for fairness
   */
  private selectRegionalTop(
    candidates: LocationCandidate[],
    config: CountryConfig,
    totalCount: number
  ): LocationCandidate[] {
    const regionalCandidates: LocationCandidate[] = [];
    
    // Group candidates by region
    const regionGroups = new Map<string, LocationCandidate[]>();
    for (const candidate of candidates) {
      const group = regionGroups.get(candidate.administrativeRegion) || [];
      group.push(candidate);
      regionGroups.set(candidate.administrativeRegion, group);
    }

    // Calculate allocation per region based on population
    const totalPopulation = config.administrativeRegions.reduce((sum, r) => sum + r.population, 0);
    const allocations = new Map<string, number>();
    
    for (const region of config.administrativeRegions) {
      const share = region.population / totalPopulation;
      const allocation = Math.max(1, Math.floor(totalCount * share));
      allocations.set(region.id, allocation);
    }

    // Select top candidates from each region
    for (const [regionId, group] of regionGroups) {
      const allocation = allocations.get(regionId) || 1;
      const sorted = group.sort((a, b) => b.scores.gap - a.scores.gap);
      const selected = sorted.slice(0, Math.min(allocation, group.length));
      regionalCandidates.push(...selected);
    }

    return regionalCandidates;
  }

  /**
   * Combine national and regional selections, removing duplicates
   */
  private combineAndDeduplicate(
    nationalTop: LocationCandidate[],
    regionalTop: LocationCandidate[]
  ): LocationCandidate[] {
    const combined = [...nationalTop];
    const existingIds = new Set(nationalTop.map(c => c.id));

    for (const candidate of regionalTop) {
      if (!existingIds.has(candidate.id)) {
        combined.push(candidate);
        existingIds.add(candidate.id);
      }
    }

    return combined;
  }

  /**
   * Select additional candidates to meet minimum shortlist size
   */
  private selectAdditionalCandidates(
    allCandidates: LocationCandidate[],
    alreadySelected: LocationCandidate[],
    additionalCount: number
  ): LocationCandidate[] {
    const selectedIds = new Set(alreadySelected.map(c => c.id));
    const remaining = allCandidates.filter(c => !selectedIds.has(c.id));
    
    // Sort remaining by final score
    const sorted = remaining.sort((a, b) => b.scores.final - a.scores.final);
    return sorted.slice(0, additionalCount);
  }

  /**
   * Validate shortlist quality and coverage
   */
  validateShortlist(
    shortlisted: LocationCandidate[],
    config: CountryConfig,
    targetK: number
  ): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check minimum size
    const minSize = targetK * SHORTLIST_PARAMS.MIN_CANDIDATES_MULTIPLIER;
    if (shortlisted.length < minSize) {
      issues.push(`Shortlist size ${shortlisted.length} below minimum ${minSize}`);
      recommendations.push('Relax shortlisting criteria or increase candidate pool');
    }

    // Check regional representation
    const regionCounts = new Map<string, number>();
    for (const candidate of shortlisted) {
      const count = regionCounts.get(candidate.administrativeRegion) || 0;
      regionCounts.set(candidate.administrativeRegion, count + 1);
    }

    const representedRegions = regionCounts.size;
    const totalRegions = config.administrativeRegions.length;
    
    if (representedRegions < Math.min(totalRegions, 3)) {
      issues.push(`Only ${representedRegions} of ${totalRegions} regions represented`);
      recommendations.push('Ensure regional diversity in shortlisting');
    }

    // Check score distribution
    const scores = shortlisted.map(c => c.scores.final);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    if (avgScore < 0.3) {
      issues.push(`Low average score ${avgScore.toFixed(2)} in shortlist`);
      recommendations.push('Review scoring criteria or candidate quality');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get shortlist statistics
   */
  getShortlistStats(shortlisted: LocationCandidate[], config: CountryConfig): {
    totalCount: number;
    regionDistribution: Map<string, number>;
    scoreDistribution: {
      mean: number;
      median: number;
      min: number;
      max: number;
    };
    qualityMetrics: {
      avgCompleteness: number;
      estimatedDataPercent: number;
    };
  } {
    const regionDistribution = new Map<string, number>();
    const scores = shortlisted.map(c => c.scores.final).sort((a, b) => a - b);
    
    let totalCompleteness = 0;
    let estimatedDataCount = 0;

    for (const candidate of shortlisted) {
      // Region distribution
      const count = regionDistribution.get(candidate.administrativeRegion) || 0;
      regionDistribution.set(candidate.administrativeRegion, count + 1);

      // Quality metrics
      totalCompleteness += candidate.dataQuality.completeness;
      if (candidate.dataQuality.estimated.population || candidate.dataQuality.estimated.anchors) {
        estimatedDataCount++;
      }
    }

    const scoreDistribution = {
      mean: scores.reduce((sum, s) => sum + s, 0) / scores.length,
      median: scores.length % 2 === 0 
        ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
        : scores[Math.floor(scores.length / 2)],
      min: scores[0] || 0,
      max: scores[scores.length - 1] || 0
    };

    return {
      totalCount: shortlisted.length,
      regionDistribution,
      scoreDistribution,
      qualityMetrics: {
        avgCompleteness: totalCompleteness / shortlisted.length,
        estimatedDataPercent: (estimatedDataCount / shortlisted.length) * 100
      }
    };
  }
}