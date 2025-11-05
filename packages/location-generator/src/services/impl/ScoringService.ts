import { CandidateFeatures, ScoreBreakdown, ScoreWeights, LocationCandidate, DataQuality, ScoringDistribution } from '../../types/core';
import { IScoringService } from '../IScoringService';
import { DEFAULT_WEIGHTS, DATA_QUALITY } from '../../config/constants';

/**
 * Implementation of multi-factor scoring and ranking system
 */
export class ScoringService implements IScoringService {

  /**
   * Calculate all sub-scores for a candidate
   */
  calculateScores(features: CandidateFeatures, weights: ScoreWeights, dataQuality: DataQuality): ScoreBreakdown {
    try {
      // Adjust weights based on data quality
      const adjustedWeights = this.adjustWeightsForDataQuality(weights, dataQuality);

      // Calculate individual sub-scores (0-1 normalized)
      const populationScore = this.calculatePopulationScore(features.population, 100000); // Max 100k population
      const gapScore = this.calculateGapScore(features.nearestBrandKm, features.competitorDensity);
      const anchorScore = this.calculateAnchorScore(features.anchors);
      const performanceScore = this.calculatePerformanceScore(features.performanceProxy);
      const saturationPenalty = this.calculateSaturationPenalty(features.competitorDensity, features.nearestBrandKm);

      // Calculate final weighted score
      const finalScore = this.calculateFinalScore(
        { population: populationScore, gap: gapScore, anchor: anchorScore, performance: performanceScore, saturationPenalty },
        adjustedWeights
      );

      return {
        population: populationScore,
        gap: gapScore,
        anchor: anchorScore,
        performance: performanceScore,
        saturationPenalty,
        final: finalScore
      };
    } catch (error) {
      throw new Error(`Failed to calculate scores: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize scores across all candidates
   */
  normalizeScores(candidates: LocationCandidate[]): LocationCandidate[] {
    try {
      if (candidates.length === 0) return candidates;

      // Find min/max for each score component
      const stats = this.calculateScoreStats(candidates);

      // Normalize each candidate's scores
      return candidates.map(candidate => ({
        ...candidate,
        scores: {
          ...candidate.scores,
          population: this.normalizeScore(candidate.scores.population, stats.population.min, stats.population.max),
          gap: this.normalizeScore(candidate.scores.gap, stats.gap.min, stats.gap.max),
          anchor: this.normalizeScore(candidate.scores.anchor, stats.anchor.min, stats.anchor.max),
          performance: this.normalizeScore(candidate.scores.performance, stats.performance.min, stats.performance.max),
          saturationPenalty: this.normalizeScore(candidate.scores.saturationPenalty, stats.saturationPenalty.min, stats.saturationPenalty.max),
          final: this.normalizeScore(candidate.scores.final, stats.final.min, stats.final.max)
        }
      }));
    } catch (error) {
      throw new Error(`Failed to normalize scores: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate population score (0-1 normalized)
   */
  calculatePopulationScore(population: number, maxPopulation: number): number {
    if (population <= 0) return 0;
    return Math.min(population / maxPopulation, 1.0);
  }

  /**
   * Calculate gap score based on distance to nearest brand and competitor density
   */
  calculateGapScore(nearestBrandKm: number, competitorDensity: number): number {
    // Higher score for areas far from existing brand stores and with low competition
    const distanceScore = nearestBrandKm === Infinity ? 1.0 : Math.min(nearestBrandKm / 20, 1.0); // Max 20km
    const competitionScore = Math.max(0, 1.0 - (competitorDensity * 10)); // Penalize high competition
    
    return (distanceScore + competitionScore) / 2;
  }

  /**
   * Calculate anchor score from anchor data
   */
  calculateAnchorScore(anchorData: import('../../types/core').AnchorData): number {
    if (anchorData.diminishingScore === 0) return 0;
    
    // Normalize diminishing score (typical max around 10-15 for good locations)
    return Math.min(anchorData.diminishingScore / 15, 1.0);
  }

  /**
   * Calculate performance score
   */
  calculatePerformanceScore(performanceProxy: number): number {
    // Performance proxy is already 0-1 normalized
    return Math.max(0, Math.min(performanceProxy, 1.0));
  }

  /**
   * Calculate saturation penalty
   */
  calculateSaturationPenalty(competitorDensity: number, nearestBrandKm: number): number {
    // Higher penalty for high competition and close brand stores
    const competitionPenalty = Math.min(competitorDensity * 5, 0.5); // Max 50% penalty from competition
    const brandProximityPenalty = nearestBrandKm < 1 ? 0.3 : 0; // 30% penalty if brand store within 1km
    
    return Math.min(competitionPenalty + brandProximityPenalty, 1.0);
  }

  /**
   * Apply data quality adjustments to weights
   */
  adjustWeightsForDataQuality(weights: ScoreWeights, dataQuality: DataQuality): ScoreWeights {
    const adjusted = { ...weights };
    let redistributionAmount = 0;

    // Reduce weights for estimated data
    if (dataQuality.estimated.population) {
      const reduction = adjusted.population * DATA_QUALITY.ESTIMATED_DATA_WEIGHT_REDUCTION;
      adjusted.population -= reduction;
      redistributionAmount += reduction;
    }

    if (dataQuality.estimated.anchors) {
      const reduction = adjusted.anchor * DATA_QUALITY.ESTIMATED_DATA_WEIGHT_REDUCTION;
      adjusted.anchor -= reduction;
      redistributionAmount += reduction;
    }

    if (dataQuality.estimated.travelTime) {
      // If travel time is estimated, slightly reduce performance weight
      const reduction = adjusted.performance * 0.2; // 20% reduction for travel time estimation
      adjusted.performance -= reduction;
      redistributionAmount += reduction;
    }

    // Redistribute to gap score (most reliable metric)
    adjusted.gap += redistributionAmount;

    // Ensure weights still sum to 1
    const total = Object.values(adjusted).reduce((sum, weight) => sum + weight, 0);
    if (total > 0) {
      Object.keys(adjusted).forEach(key => {
        adjusted[key as keyof ScoreWeights] /= total;
      });
    }

    return adjusted;
  }

  /**
   * Calculate data completeness score for a candidate
   */
  calculateCompletenessScore(features: CandidateFeatures, dataQuality: DataQuality): number {
    let completenessScore = 0;
    let totalFactors = 0;

    // Population data completeness
    if (features.population > 0) {
      completenessScore += dataQuality.estimated.population ? 0.5 : 1.0;
    }
    totalFactors++;

    // Brand distance completeness (always available if stores exist)
    if (features.nearestBrandKm !== Infinity) {
      completenessScore += 1.0;
    }
    totalFactors++;

    // Competitor data completeness
    completenessScore += 1.0; // Competitor density always calculable (0 if no data)
    totalFactors++;

    // Anchor data completeness
    if (features.anchors.raw > 0) {
      completenessScore += dataQuality.estimated.anchors ? 0.5 : 1.0;
    } else {
      completenessScore += 0.3; // Partial credit for having processed anchors (even if 0)
    }
    totalFactors++;

    // Performance proxy completeness
    completenessScore += features.performanceProxy > 0 ? 1.0 : 0.5;
    totalFactors++;

    return completenessScore / totalFactors;
  }

  /**
   * Apply quality-based score adjustments
   */
  applyQualityAdjustments(scores: ScoreBreakdown, dataQuality: DataQuality): ScoreBreakdown {
    const adjusted = { ...scores };

    // Reduce confidence in scores based on data quality
    const qualityMultiplier = Math.max(0.5, dataQuality.completeness);

    // Apply quality multiplier to estimated components
    if (dataQuality.estimated.population) {
      adjusted.population *= qualityMultiplier;
    }

    if (dataQuality.estimated.anchors) {
      adjusted.anchor *= qualityMultiplier;
    }

    if (dataQuality.estimated.travelTime) {
      adjusted.performance *= qualityMultiplier;
    }

    // Recalculate final score with adjusted components
    const weights = DEFAULT_WEIGHTS; // Use default weights for recalculation
    adjusted.final = this.calculateFinalScore(
      {
        population: adjusted.population,
        gap: adjusted.gap,
        anchor: adjusted.anchor,
        performance: adjusted.performance,
        saturationPenalty: adjusted.saturationPenalty
      },
      weights
    );

    return adjusted;
  }

  /**
   * Calculate final weighted score
   */
  calculateFinalScore(scores: Omit<ScoreBreakdown, 'final'>, weights: ScoreWeights): number {
    const weightedSum = 
      scores.population * weights.population +
      scores.gap * weights.gap +
      scores.anchor * weights.anchor +
      scores.performance * weights.performance;
    
    // Apply saturation penalty
    const finalScore = weightedSum * (1 - scores.saturationPenalty * weights.saturation);
    
    return Math.max(0, Math.min(finalScore, 1.0));
  }

  /**
   * Rank candidates by final score
   */
  rankCandidates(candidates: LocationCandidate[]): LocationCandidate[] {
    return [...candidates].sort((a, b) => b.scores.final - a.scores.final);
  }

  /**
   * Calculate scoring distribution statistics
   */
  calculateScoringDistribution(candidates: LocationCandidate[]): ScoringDistribution {
    try {
      if (candidates.length === 0) {
        return { mean: 0, median: 0, std: 0, min: 0, max: 0 };
      }

      const scores = candidates.map(c => c.scores.final).sort((a, b) => a - b);
      
      const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const median = scores.length % 2 === 0 
        ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
        : scores[Math.floor(scores.length / 2)];
      
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
      const std = Math.sqrt(variance);
      
      return {
        mean,
        median,
        std,
        min: scores[0],
        max: scores[scores.length - 1]
      };
    } catch (error) {
      throw new Error(`Failed to calculate scoring distribution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods
  private calculateScoreStats(candidates: LocationCandidate[]) {
    const stats = {
      population: { min: Infinity, max: -Infinity },
      gap: { min: Infinity, max: -Infinity },
      anchor: { min: Infinity, max: -Infinity },
      performance: { min: Infinity, max: -Infinity },
      saturationPenalty: { min: Infinity, max: -Infinity },
      final: { min: Infinity, max: -Infinity }
    };

    for (const candidate of candidates) {
      const scores = candidate.scores;
      
      stats.population.min = Math.min(stats.population.min, scores.population);
      stats.population.max = Math.max(stats.population.max, scores.population);
      
      stats.gap.min = Math.min(stats.gap.min, scores.gap);
      stats.gap.max = Math.max(stats.gap.max, scores.gap);
      
      stats.anchor.min = Math.min(stats.anchor.min, scores.anchor);
      stats.anchor.max = Math.max(stats.anchor.max, scores.anchor);
      
      stats.performance.min = Math.min(stats.performance.min, scores.performance);
      stats.performance.max = Math.max(stats.performance.max, scores.performance);
      
      stats.saturationPenalty.min = Math.min(stats.saturationPenalty.min, scores.saturationPenalty);
      stats.saturationPenalty.max = Math.max(stats.saturationPenalty.max, scores.saturationPenalty);
      
      stats.final.min = Math.min(stats.final.min, scores.final);
      stats.final.max = Math.max(stats.final.max, scores.final);
    }

    return stats;
  }

  private normalizeScore(score: number, min: number, max: number): number {
    if (max === min) return 0.5; // If all scores are the same
    return (score - min) / (max - min);
  }
}