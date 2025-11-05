import { LocationCandidate, ScoreWeights } from '../../types/core';
import { ScoringService } from './ScoringService';
import { PortfolioService } from './PortfolioService';

/**
 * Stability analysis with weight jittering
 */
export interface StabilityAnalysis {
  siteId: string;
  stabilityScore: number; // 0-1, how often site stays selected
  confidenceLevel: 'high' | 'medium' | 'low';
  sensitiveParameters: string[];
  robustnessMetrics: {
    selectionRate: number;
    avgRankChange: number;
    maxRankChange: number;
  };
}

export interface PortfolioStability {
  overallStability: number;
  stableSites: number;
  unstableSites: number;
  siteAnalyses: StabilityAnalysis[];
  recommendedActions: string[];
}

export class StabilityService {
  constructor(
    private scoringService: ScoringService,
    private portfolioService: PortfolioService
  ) {}

  /**
   * Analyze portfolio stability with weight jittering (±10%)
   */
  analyzePortfolioStability(
    candidates: LocationCandidate[],
    baseWeights: ScoreWeights,
    config: any,
    iterations: number = 50
  ): PortfolioStability {
    const siteStabilities = new Map<string, number[]>(); // Track selection rates
    const siteRanks = new Map<string, number[]>(); // Track rank changes
    
    // Initialize tracking
    candidates.forEach(candidate => {
      siteStabilities.set(candidate.id, []);
      siteRanks.set(candidate.id, []);
    });

    // Run stability iterations
    for (let i = 0; i < iterations; i++) {
      const jitteredWeights = this.jitterWeights(baseWeights, 0.1); // ±10%
      
      // Re-score with jittered weights
      const rescoredCandidates = candidates.map(candidate => ({
        ...candidate,
        scores: this.scoringService.calculateScores(
          candidate.features,
          jitteredWeights,
          candidate.dataQuality
        )
      }));

      // Normalize and rank
      const normalizedCandidates = this.scoringService.normalizeScores(rescoredCandidates);
      const rankedCandidates = this.scoringService.rankCandidates(normalizedCandidates);

      // Build portfolio
      const portfolioResult = this.portfolioService.buildPortfolio(
        rankedCandidates,
        config.country,
        config.existingStores,
        config.targetK,
        config.minSpacingM
      );

      // Track selections and ranks
      const selectedIds = new Set(portfolioResult.selected.map(s => s.id));
      
      rankedCandidates.forEach((candidate, rank) => {
        const isSelected = selectedIds.has(candidate.id);
        siteStabilities.get(candidate.id)?.push(isSelected ? 1 : 0);
        siteRanks.get(candidate.id)?.push(rank + 1);
      });
    }

    // Analyze results
    const siteAnalyses: StabilityAnalysis[] = [];
    let totalStability = 0;
    let stableSites = 0;

    for (const candidate of candidates) {
      const selections = siteStabilities.get(candidate.id) || [];
      const ranks = siteRanks.get(candidate.id) || [];
      
      const analysis = this.analyzeSiteStability(candidate, selections, ranks, baseWeights);
      siteAnalyses.push(analysis);
      
      totalStability += analysis.stabilityScore;
      if (analysis.confidenceLevel === 'high') stableSites++;
    }

    const overallStability = totalStability / candidates.length;
    const unstableSites = candidates.length - stableSites;

    return {
      overallStability,
      stableSites,
      unstableSites,
      siteAnalyses: siteAnalyses.sort((a, b) => b.stabilityScore - a.stabilityScore),
      recommendedActions: this.generateRecommendations(siteAnalyses, overallStability)
    };
  }

  /**
   * Analyze individual site stability
   */
  private analyzeSiteStability(
    candidate: LocationCandidate,
    selections: number[],
    ranks: number[],
    baseWeights: ScoreWeights
  ): StabilityAnalysis {
    const selectionRate = selections.reduce((sum, sel) => sum + sel, 0) / selections.length;
    
    const avgRank = ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length;
    const baseRank = ranks[0] || avgRank;
    const avgRankChange = Math.abs(avgRank - baseRank);
    const maxRankChange = Math.max(...ranks.map(rank => Math.abs(rank - baseRank)));

    const stabilityScore = selectionRate;
    const confidenceLevel = this.getConfidenceLevel(stabilityScore);
    const sensitiveParameters = this.identifySensitiveParameters(candidate, baseWeights);

    return {
      siteId: candidate.id,
      stabilityScore,
      confidenceLevel,
      sensitiveParameters,
      robustnessMetrics: {
        selectionRate,
        avgRankChange,
        maxRankChange
      }
    };
  }

  /**
   * Jitter weights by specified percentage
   */
  private jitterWeights(baseWeights: ScoreWeights, jitterPercent: number): ScoreWeights {
    const jittered: ScoreWeights = {
      population: this.jitterValue(baseWeights.population, jitterPercent),
      gap: this.jitterValue(baseWeights.gap, jitterPercent),
      anchor: this.jitterValue(baseWeights.anchor, jitterPercent),
      performance: this.jitterValue(baseWeights.performance, jitterPercent),
      saturation: this.jitterValue(baseWeights.saturation, jitterPercent)
    };

    // Normalize to sum to 1
    const total = Object.values(jittered).reduce((sum, weight) => sum + weight, 0);
    Object.keys(jittered).forEach(key => {
      jittered[key as keyof ScoreWeights] /= total;
    });

    return jittered;
  }

  /**
   * Jitter individual value
   */
  private jitterValue(value: number, jitterPercent: number): number {
    const jitter = (Math.random() - 0.5) * 2 * jitterPercent; // -jitterPercent to +jitterPercent
    return Math.max(0, value * (1 + jitter));
  }

  /**
   * Get confidence level from stability score
   */
  private getConfidenceLevel(stabilityScore: number): 'high' | 'medium' | 'low' {
    if (stabilityScore >= 0.8) return 'high';
    if (stabilityScore >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Identify parameters this site is most sensitive to
   */
  private identifySensitiveParameters(candidate: LocationCandidate, weights: ScoreWeights): string[] {
    const sensitive: string[] = [];
    
    // Check which scores contribute most to final score
    const contributions = {
      population: candidate.scores.population * weights.population,
      gap: candidate.scores.gap * weights.gap,
      anchor: candidate.scores.anchor * weights.anchor,
      performance: candidate.scores.performance * weights.performance
    };

    // Sort by contribution
    const sorted = Object.entries(contributions).sort(([,a], [,b]) => b - a);
    
    // Top 2 contributors are considered sensitive
    sensitive.push(sorted[0][0], sorted[1][0]);

    return sensitive;
  }

  /**
   * Generate recommendations based on stability analysis
   */
  private generateRecommendations(analyses: StabilityAnalysis[], overallStability: number): string[] {
    const recommendations: string[] = [];

    if (overallStability < 0.6) {
      recommendations.push('Portfolio shows low stability - consider adjusting scoring weights');
    }

    const unstableCount = analyses.filter(a => a.confidenceLevel === 'low').length;
    if (unstableCount > analyses.length * 0.3) {
      recommendations.push('High number of unstable sites - review data quality and scoring criteria');
    }

    const highRankVariance = analyses.filter(a => a.robustnessMetrics.maxRankChange > 20).length;
    if (highRankVariance > 5) {
      recommendations.push('Some sites show high rank variance - consider additional validation');
    }

    if (recommendations.length === 0) {
      recommendations.push('Portfolio shows good stability across weight variations');
    }

    return recommendations;
  }

  /**
   * Get stability summary for UI display
   */
  getStabilitySummary(stability: PortfolioStability): {
    overallScore: string;
    stablePercentage: number;
    topRisks: string[];
    confidence: 'high' | 'medium' | 'low';
  } {
    const stablePercentage = (stability.stableSites / (stability.stableSites + stability.unstableSites)) * 100;
    
    const topRisks = stability.siteAnalyses
      .filter(a => a.confidenceLevel === 'low')
      .slice(0, 3)
      .map(a => `Site ${a.siteId}: ${a.sensitiveParameters.join(', ')} sensitive`);

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (stability.overallStability >= 0.8) confidence = 'high';
    else if (stability.overallStability >= 0.6) confidence = 'medium';

    return {
      overallScore: `${(stability.overallStability * 100).toFixed(0)}%`,
      stablePercentage,
      topRisks,
      confidence
    };
  }
}