import { CandidateFeatures, ScoreBreakdown, ScoreWeights, LocationCandidate, DataQuality } from '../types/core';

/**
 * Interface for scoring and ranking location candidates
 */
export interface IScoringService {
  /**
   * Calculate all sub-scores for a candidate
   */
  calculateScores(features: CandidateFeatures, weights: ScoreWeights, dataQuality: DataQuality): ScoreBreakdown;

  /**
   * Normalize scores across all candidates
   */
  normalizeScores(candidates: LocationCandidate[]): LocationCandidate[];

  /**
   * Calculate individual score components
   */
  calculatePopulationScore(population: number, maxPopulation: number): number;
  calculateGapScore(nearestBrandKm: number, competitorDensity: number): number;
  calculateAnchorScore(anchorData: import('../types/core').AnchorData): number;
  calculatePerformanceScore(performanceProxy: number): number;
  calculateSaturationPenalty(competitorDensity: number, nearestBrandKm: number): number;

  /**
   * Apply data quality adjustments to weights
   */
  adjustWeightsForDataQuality(weights: ScoreWeights, dataQuality: DataQuality): ScoreWeights;

  /**
   * Calculate final weighted score
   */
  calculateFinalScore(scores: Omit<ScoreBreakdown, 'final'>, weights: ScoreWeights): number;

  /**
   * Rank candidates by final score
   */
  rankCandidates(candidates: LocationCandidate[]): LocationCandidate[];

  /**
   * Calculate scoring distribution statistics
   */
  calculateScoringDistribution(candidates: LocationCandidate[]): import('../types/core').ScoringDistribution;
}