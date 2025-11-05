import { LocationCandidate, ScoreWeights } from '../../types/core';
import { ScoringService } from './ScoringService';

/**
 * Counterfactual analysis for "what would flip this site's ranking"
 */
export interface CounterfactualThreshold {
  parameter: string;
  currentValue: number;
  thresholdValue: number;
  direction: 'increase' | 'decrease';
  impact: string;
  likelihood: 'high' | 'medium' | 'low';
}

export interface CounterfactualAnalysis {
  siteId: string;
  currentRank: number;
  targetRank: number;
  thresholds: CounterfactualThreshold[];
  // Key thresholds for product integration (1-2 most impactful)
  primaryThresholds: {
    feature: string;
    threshold: number;
    unit: string;
  }[];
  easiestPath: CounterfactualThreshold;
  summary: string;
}

export class CounterfactualService {
  constructor(private scoringService: ScoringService) {}

  /**
   * Generate counterfactual analysis for a site
   */
  generateCounterfactuals(
    targetSite: LocationCandidate,
    allCandidates: LocationCandidate[],
    weights: ScoreWeights,
    targetImprovement: 'next_rank' | 'top_10' | 'top_5' = 'next_rank'
  ): CounterfactualAnalysis {
    const currentRank = this.getCurrentRank(targetSite, allCandidates);
    const targetRank = this.getTargetRank(currentRank, targetImprovement, allCandidates.length);
    
    const thresholds = this.calculateThresholds(targetSite, allCandidates, weights, targetRank);
    const easiestPath = this.findEasiestPath(thresholds);
    
    // Extract 1-2 most impactful thresholds for product integration
    const primaryThresholds = thresholds
      .slice(0, 2)
      .map(t => ({
        feature: this.getFeatureDisplayName(t.parameter),
        threshold: t.thresholdValue,
        unit: this.getFeatureUnit(t.parameter)
      }));

    return {
      siteId: targetSite.id,
      currentRank,
      targetRank,
      thresholds,
      primaryThresholds,
      easiestPath,
      summary: this.generateSummary(targetSite, thresholds, easiestPath)
    };
  }

  /**
   * Calculate thresholds for different parameters
   */
  private calculateThresholds(
    targetSite: LocationCandidate,
    allCandidates: LocationCandidate[],
    weights: ScoreWeights,
    targetRank: number
  ): CounterfactualThreshold[] {
    const thresholds: CounterfactualThreshold[] = [];
    const targetScore = this.getScoreAtRank(allCandidates, targetRank);
    
    // Population threshold
    const popThreshold = this.calculatePopulationThreshold(targetSite, targetScore, weights);
    if (popThreshold) thresholds.push(popThreshold);
    
    // Distance threshold (nearest brand)
    const distanceThreshold = this.calculateDistanceThreshold(targetSite, targetScore, weights);
    if (distanceThreshold) thresholds.push(distanceThreshold);
    
    // Anchor threshold
    const anchorThreshold = this.calculateAnchorThreshold(targetSite, targetScore, weights);
    if (anchorThreshold) thresholds.push(anchorThreshold);
    
    // Competition threshold
    const competitionThreshold = this.calculateCompetitionThreshold(targetSite, targetScore, weights);
    if (competitionThreshold) thresholds.push(competitionThreshold);

    return thresholds.sort((a, b) => this.getLikelihoodScore(b.likelihood) - this.getLikelihoodScore(a.likelihood));
  }

  /**
   * Calculate population threshold to reach target score
   */
  private calculatePopulationThreshold(
    site: LocationCandidate,
    targetScore: number,
    weights: ScoreWeights
  ): CounterfactualThreshold | null {
    const currentPop = site.features.population;
    const currentPopScore = site.scores.population;
    const popWeight = weights.population;
    
    // Calculate required population score increase
    const scoreGap = targetScore - site.scores.final;
    const requiredPopScoreIncrease = scoreGap / popWeight;
    const requiredPopScore = currentPopScore + requiredPopScoreIncrease;
    
    // Estimate required population (assuming linear relationship)
    const requiredPop = currentPop * (requiredPopScore / currentPopScore);
    const popIncrease = requiredPop - currentPop;
    
    if (popIncrease <= 0 || requiredPopScore > 1) return null;
    
    return {
      parameter: 'population',
      currentValue: currentPop,
      thresholdValue: requiredPop,
      direction: 'increase',
      impact: `+${popIncrease.toLocaleString()} people in catchment`,
      likelihood: this.assessPopulationLikelihood(popIncrease / currentPop)
    };
  }

  /**
   * Calculate distance threshold (nearest brand store)
   */
  private calculateDistanceThreshold(
    site: LocationCandidate,
    targetScore: number,
    weights: ScoreWeights
  ): CounterfactualThreshold | null {
    const currentDistance = site.features.nearestBrandKm;
    const gapWeight = weights.gap;
    
    // Estimate required distance increase for gap score improvement
    const scoreGap = targetScore - site.scores.final;
    const requiredGapIncrease = scoreGap / gapWeight;
    
    // Rough estimate: each km increases gap score by ~0.05
    const requiredDistanceIncrease = requiredGapIncrease / 0.05;
    const requiredDistance = currentDistance + requiredDistanceIncrease;
    
    if (requiredDistanceIncrease <= 0) return null;
    
    return {
      parameter: 'nearest_brand_km',
      currentValue: currentDistance,
      thresholdValue: requiredDistance,
      direction: 'increase',
      impact: `Nearest Subway ${requiredDistance.toFixed(1)}km away (vs ${currentDistance.toFixed(1)}km)`,
      likelihood: 'low' // Can't easily move existing stores
    };
  }

  /**
   * Calculate anchor threshold
   */
  private calculateAnchorThreshold(
    site: LocationCandidate,
    targetScore: number,
    weights: ScoreWeights
  ): CounterfactualThreshold | null {
    const currentAnchors = site.features.anchors.deduplicated;
    const anchorWeight = weights.anchor;
    
    const scoreGap = targetScore - site.scores.final;
    const requiredAnchorIncrease = scoreGap / anchorWeight;
    
    // Estimate additional anchors needed (rough: each anchor adds ~0.1 to score)
    const additionalAnchors = Math.ceil(requiredAnchorIncrease / 0.1);
    const requiredAnchors = currentAnchors + additionalAnchors;
    
    if (additionalAnchors <= 0) return null;
    
    return {
      parameter: 'anchor_points',
      currentValue: currentAnchors,
      thresholdValue: requiredAnchors,
      direction: 'increase',
      impact: `+${additionalAnchors} anchor points nearby`,
      likelihood: this.assessAnchorLikelihood(additionalAnchors)
    };
  }

  /**
   * Calculate competition threshold
   */
  private calculateCompetitionThreshold(
    site: LocationCandidate,
    targetScore: number,
    weights: ScoreWeights
  ): CounterfactualThreshold | null {
    const currentCompetition = site.features.competitorDensity;
    const saturationWeight = weights.saturation;
    
    const scoreGap = targetScore - site.scores.final;
    // Reducing competition reduces saturation penalty
    const requiredSaturationReduction = scoreGap / saturationWeight;
    
    // Estimate required competition reduction
    const requiredCompetitionReduction = requiredSaturationReduction * 0.2; // Rough estimate
    const requiredCompetition = Math.max(0, currentCompetition - requiredCompetitionReduction);
    
    if (requiredCompetitionReduction <= 0) return null;
    
    return {
      parameter: 'competitor_density',
      currentValue: currentCompetition,
      thresholdValue: requiredCompetition,
      direction: 'decrease',
      impact: `Competition density ${requiredCompetition.toFixed(3)}/km² (vs ${currentCompetition.toFixed(3)}/km²)`,
      likelihood: 'low' // Can't easily remove competitors
    };
  }

  /**
   * Find the easiest path to improvement
   */
  private findEasiestPath(thresholds: CounterfactualThreshold[]): CounterfactualThreshold {
    // Prioritize by likelihood and feasibility
    const feasible = thresholds.filter(t => t.likelihood !== 'low');
    
    if (feasible.length > 0) {
      return feasible[0]; // Already sorted by likelihood
    }
    
    return thresholds[0] || {
      parameter: 'none',
      currentValue: 0,
      thresholdValue: 0,
      direction: 'increase',
      impact: 'No feasible improvements identified',
      likelihood: 'low'
    };
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    site: LocationCandidate,
    thresholds: CounterfactualThreshold[],
    easiestPath: CounterfactualThreshold
  ): string {
    if (thresholds.length === 0) {
      return `Site ${site.id} is already well-positioned with limited improvement opportunities.`;
    }

    const feasibleCount = thresholds.filter(t => t.likelihood !== 'low').length;
    
    if (feasibleCount === 0) {
      return `Site ${site.id} would need structural market changes to improve ranking significantly.`;
    }

    return `Site ${site.id} could improve with ${easiestPath.impact}. ${feasibleCount} feasible improvement paths identified.`;
  }

  // Helper methods
  private getCurrentRank(site: LocationCandidate, allCandidates: LocationCandidate[]): number {
    const sorted = [...allCandidates].sort((a, b) => b.scores.final - a.scores.final);
    return sorted.findIndex(s => s.id === site.id) + 1;
  }

  private getTargetRank(currentRank: number, improvement: string, totalCandidates: number): number {
    switch (improvement) {
      case 'next_rank':
        return Math.max(1, currentRank - 1);
      case 'top_10':
        return Math.min(10, currentRank - 1);
      case 'top_5':
        return Math.min(5, currentRank - 1);
      default:
        return Math.max(1, currentRank - 1);
    }
  }

  private getScoreAtRank(candidates: LocationCandidate[], rank: number): number {
    const sorted = [...candidates].sort((a, b) => b.scores.final - a.scores.final);
    return sorted[rank - 1]?.scores.final || 1.0;
  }

  private assessPopulationLikelihood(percentIncrease: number): 'high' | 'medium' | 'low' {
    if (percentIncrease < 0.1) return 'high';    // <10% increase
    if (percentIncrease < 0.3) return 'medium';  // 10-30% increase
    return 'low';                                // >30% increase
  }

  private assessAnchorLikelihood(additionalAnchors: number): 'high' | 'medium' | 'low' {
    if (additionalAnchors <= 2) return 'high';
    if (additionalAnchors <= 5) return 'medium';
    return 'low';
  }

  private getLikelihoodScore(likelihood: 'high' | 'medium' | 'low'): number {
    switch (likelihood) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  }

  private getFeatureDisplayName(parameter: string): string {
    const displayNames: Record<string, string> = {
      'population': 'Population',
      'nearest_brand_km': 'Nearest Subway',
      'anchor_count': 'Anchor Count',
      'competitor_density': 'Competition Density'
    };
    return displayNames[parameter] || parameter;
  }

  private getFeatureUnit(parameter: string): string {
    const units: Record<string, string> = {
      'population': 'people',
      'nearest_brand_km': 'km',
      'anchor_count': 'anchors',
      'competitor_density': 'per km²'
    };
    return units[parameter] || 'units';
  }
}