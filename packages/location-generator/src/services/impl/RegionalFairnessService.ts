import { LocationCandidate, CountryConfig } from '../../types/core';

/**
 * Regional fairness analysis and visualization
 */
export interface RegionalDistribution {
  regionId: string;
  regionName: string;
  population: number;
  populationShare: number; // % of total population
  selectedSites: number;
  siteShare: number; // % of total sites
  fairnessRatio: number; // siteShare / populationShare
  status: 'under' | 'balanced' | 'over';
  deviation: number; // absolute difference from expected
}

export interface FairnessAnalysis {
  overallScore: number; // 0-1, higher is more fair
  totalSites: number;
  totalPopulation: number;
  distributions: RegionalDistribution[];
  recommendations: string[];
  visualizationData: {
    chartType: 'bar';
    data: Array<{
      region: string;
      expected: number;
      actual: number;
      status: string;
    }>;
  };
}

export class RegionalFairnessService {
  /**
   * Analyze regional fairness of portfolio
   */
  analyzeRegionalFairness(
    portfolio: LocationCandidate[],
    config: CountryConfig,
    options: {
      fairnessThreshold?: number; // ±20% = 0.2
      minSitesPerRegion?: number;
    } = {}
  ): FairnessAnalysis {
    const { fairnessThreshold = 0.2, minSitesPerRegion = 1 } = options;
    
    // Get regional data
    const regions = config.administrativeRegions || [];
    const totalPopulation = regions.reduce((sum, r) => sum + r.population, 0);
    const totalSites = portfolio.length;
    
    // Count sites per region
    const siteCounts: Record<string, number> = {};
    portfolio.forEach(site => {
      siteCounts[site.administrativeRegion] = (siteCounts[site.administrativeRegion] || 0) + 1;
    });
    
    // Calculate distributions
    const distributions: RegionalDistribution[] = regions.map(region => {
      const selectedSites = siteCounts[region.id] || 0;
      const populationShare = region.population / totalPopulation;
      const siteShare = totalSites > 0 ? selectedSites / totalSites : 0;
      const fairnessRatio = populationShare > 0 ? siteShare / populationShare : 0;
      const deviation = Math.abs(siteShare - populationShare);
      
      let status: 'under' | 'balanced' | 'over' = 'balanced';
      if (fairnessRatio < (1 - fairnessThreshold)) {
        status = 'under';
      } else if (fairnessRatio > (1 + fairnessThreshold)) {
        status = 'over';
      }
      
      return {
        regionId: region.id,
        regionName: region.name,
        population: region.population,
        populationShare,
        selectedSites,
        siteShare,
        fairnessRatio,
        status,
        deviation
      };
    });
    
    // Calculate overall fairness score
    const overallScore = this.calculateOverallFairnessScore(distributions);
    
    // Generate recommendations
    const recommendations = this.generateFairnessRecommendations(
      distributions, 
      fairnessThreshold,
      minSitesPerRegion
    );
    
    // Prepare visualization data
    const visualizationData = {
      chartType: 'bar' as const,
      data: distributions.map(d => ({
        region: d.regionName,
        expected: d.populationShare * 100,
        actual: d.siteShare * 100,
        status: d.status
      }))
    };
    
    return {
      overallScore,
      totalSites,
      totalPopulation,
      distributions,
      recommendations,
      visualizationData
    };
  }

  /**
   * Get fairness-adjusted site recommendations
   */
  getFairnessAdjustedRecommendations(
    candidates: LocationCandidate[],
    currentPortfolio: LocationCandidate[],
    config: CountryConfig,
    targetAdditionalSites: number
  ): {
    recommendations: LocationCandidate[];
    fairnessImpact: FairnessAnalysis;
    reasoning: string[];
  } {
    // Analyze current fairness
    const currentFairness = this.analyzeRegionalFairness(currentPortfolio, config);
    
    // Identify under-represented regions
    const underRepresented = currentFairness.distributions
      .filter(d => d.status === 'under')
      .sort((a, b) => a.fairnessRatio - b.fairnessRatio);
    
    // Select candidates prioritizing under-represented regions
    const recommendations: LocationCandidate[] = [];
    const reasoning: string[] = [];
    
    // First, try to balance under-represented regions
    for (const region of underRepresented) {
      const regionCandidates = candidates.filter(c => c.administrativeRegion === region.regionId);
      const needed = Math.ceil(region.populationShare * (currentPortfolio.length + targetAdditionalSites)) - region.selectedSites;
      
      if (needed > 0 && regionCandidates.length > 0) {
        const selected = regionCandidates
          .sort((a, b) => b.scores.final - a.scores.final)
          .slice(0, Math.min(needed, targetAdditionalSites - recommendations.length));
        
        recommendations.push(...selected);
        reasoning.push(`Added ${selected.length} sites to ${region.regionName} (${region.fairnessRatio.toFixed(2)}x fair share)`);
        
        if (recommendations.length >= targetAdditionalSites) break;
      }
    }
    
    // Fill remaining slots with best candidates
    if (recommendations.length < targetAdditionalSites) {
      const remaining = targetAdditionalSites - recommendations.length;
      const usedIds = new Set(recommendations.map(r => r.id));
      const remainingCandidates = candidates
        .filter(c => !usedIds.has(c.id))
        .sort((a, b) => b.scores.final - a.scores.final)
        .slice(0, remaining);
      
      recommendations.push(...remainingCandidates);
      reasoning.push(`Added ${remainingCandidates.length} highest-scoring sites for remaining slots`);
    }
    
    // Calculate fairness impact
    const projectedPortfolio = [...currentPortfolio, ...recommendations];
    const fairnessImpact = this.analyzeRegionalFairness(projectedPortfolio, config);
    
    return {
      recommendations,
      fairnessImpact,
      reasoning
    };
  }

  /**
   * Generate fairness report for executives
   */
  generateExecutiveFairnessReport(
    analysis: FairnessAnalysis,
    config: CountryConfig
  ): {
    summary: string;
    keyMetrics: {
      fairnessScore: string;
      balancedRegions: number;
      underRepresented: number;
      overRepresented: number;
    };
    topConcerns: string[];
    actionItems: string[];
  } {
    const balanced = analysis.distributions.filter(d => d.status === 'balanced').length;
    const under = analysis.distributions.filter(d => d.status === 'under').length;
    const over = analysis.distributions.filter(d => d.status === 'over').length;
    
    const summary = `Portfolio achieves ${(analysis.overallScore * 100).toFixed(0)}% regional fairness across ${config.countryCode} with ${balanced}/${analysis.distributions.length} regions well-balanced.`;
    
    const keyMetrics = {
      fairnessScore: `${(analysis.overallScore * 100).toFixed(0)}%`,
      balancedRegions: balanced,
      underRepresented: under,
      overRepresented: over
    };
    
    // Identify top concerns
    const topConcerns = analysis.distributions
      .filter(d => d.status !== 'balanced')
      .sort((a, b) => b.deviation - a.deviation)
      .slice(0, 3)
      .map(d => `${d.regionName}: ${d.selectedSites} sites (${(d.fairnessRatio * 100).toFixed(0)}% of fair share)`);
    
    // Generate action items
    const actionItems = [];
    if (under > 0) {
      actionItems.push(`Prioritize expansion in ${under} under-represented region(s)`);
    }
    if (over > 0) {
      actionItems.push(`Review concentration in ${over} over-represented region(s)`);
    }
    if (analysis.overallScore < 0.8) {
      actionItems.push('Implement regional balance constraints in next expansion phase');
    }
    if (actionItems.length === 0) {
      actionItems.push('Maintain current regional balance in future expansions');
    }
    
    return {
      summary,
      keyMetrics,
      topConcerns,
      actionItems
    };
  }

  /**
   * Calculate overall fairness score (0-1)
   */
  private calculateOverallFairnessScore(distributions: RegionalDistribution[]): number {
    if (distributions.length === 0) return 1;
    
    // Use Gini coefficient approach - lower deviation = higher fairness
    const totalDeviation = distributions.reduce((sum, d) => sum + d.deviation, 0);
    const maxPossibleDeviation = distributions.length * 0.5; // Theoretical maximum
    
    return Math.max(0, 1 - (totalDeviation / maxPossibleDeviation));
  }

  /**
   * Generate fairness recommendations
   */
  private generateFairnessRecommendations(
    distributions: RegionalDistribution[],
    threshold: number,
    minSitesPerRegion: number
  ): string[] {
    const recommendations: string[] = [];
    
    const under = distributions.filter(d => d.status === 'under');
    const over = distributions.filter(d => d.status === 'over');
    const zeroSites = distributions.filter(d => d.selectedSites === 0);
    
    if (zeroSites.length > 0) {
      recommendations.push(`${zeroSites.length} region(s) have no sites - consider minimum representation`);
    }
    
    if (under.length > 0) {
      const worstUnder = under.sort((a, b) => a.fairnessRatio - b.fairnessRatio)[0];
      recommendations.push(`${worstUnder.regionName} most under-represented (${(worstUnder.fairnessRatio * 100).toFixed(0)}% of fair share)`);
    }
    
    if (over.length > 0) {
      const worstOver = over.sort((a, b) => b.fairnessRatio - a.fairnessRatio)[0];
      recommendations.push(`${worstOver.regionName} most over-represented (${(worstOver.fairnessRatio * 100).toFixed(0)}% of fair share)`);
    }
    
    const totalImbalance = distributions.reduce((sum, d) => sum + Math.abs(d.deviation), 0);
    if (totalImbalance < 0.1) {
      recommendations.push('Regional distribution is well-balanced');
    } else if (totalImbalance > 0.3) {
      recommendations.push('Significant regional imbalance - review expansion strategy');
    }
    
    return recommendations;
  }
}