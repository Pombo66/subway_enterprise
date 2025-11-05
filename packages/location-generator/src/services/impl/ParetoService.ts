import { LocationCandidate, CountryConfig, ExistingStore } from '../../types/core';
import { PortfolioService } from './PortfolioService';

/**
 * Pareto frontier analysis for portfolio optimization
 */
export interface ParetoPoint {
  k: number;
  roi: number;
  risk: number;
  coverage: number;
  portfolio: LocationCandidate[];
  isKnee: boolean;
  isDominated: boolean;
}

export class ParetoService {
  constructor(private portfolioService: PortfolioService) {}

  /**
   * Generate Pareto frontier by sweeping K from 5 to max_sites
   */
  generateParetoFrontier(
    candidates: LocationCandidate[],
    config: CountryConfig,
    existingStores: ExistingStore[],
    minK: number = 5,
    maxK?: number
  ): {
    frontier: ParetoPoint[];
    kneePoint: ParetoPoint;
    dominated: ParetoPoint[];
  } {
    const maxSites = maxK || Math.min(candidates.length, 300);
    const allPoints: ParetoPoint[] = [];

    // Sweep K values
    const kValues = this.generateKValues(minK, maxSites);
    
    for (const k of kValues) {
      try {
        const result = this.portfolioService.buildPortfolio(
          candidates,
          config,
          existingStores,
          k
        );

        const metrics = this.portfolioService.calculatePortfolioMetrics(result.selected);
        
        const point: ParetoPoint = {
          k,
          roi: this.calculateROI(result.selected),
          risk: this.calculateRisk(result.selected, metrics),
          coverage: this.calculateCoverage(result.selected, config),
          portfolio: result.selected,
          isKnee: false,
          isDominated: false
        };

        allPoints.push(point);
      } catch (error) {
        console.warn(`Failed to generate portfolio for K=${k}:`, error);
      }
    }

    // Filter to non-dominated points
    const frontier = this.filterNonDominated(allPoints);
    
    // Find knee point (largest ΔROI/ΔRisk change)
    const kneePoint = this.findKneePoint(frontier);
    
    // Mark dominated points
    const dominated = allPoints.filter(p => !frontier.includes(p));
    dominated.forEach(p => p.isDominated = true);

    return { frontier, kneePoint, dominated };
  }

  /**
   * Generate K values for frontier sweep
   */
  private generateKValues(minK: number, maxK: number): number[] {
    const values: number[] = [];
    
    // Dense sampling for small K
    for (let k = minK; k <= Math.min(20, maxK); k++) {
      values.push(k);
    }
    
    // Sparser sampling for larger K
    if (maxK > 20) {
      const step = Math.max(5, Math.floor((maxK - 20) / 10));
      for (let k = 25; k <= maxK; k += step) {
        values.push(k);
      }
    }
    
    return values;
  }

  /**
   * Filter to non-dominated points (Pareto frontier)
   */
  private filterNonDominated(points: ParetoPoint[]): ParetoPoint[] {
    const frontier: ParetoPoint[] = [];
    
    for (const point of points) {
      let isDominated = false;
      
      for (const other of points) {
        if (other === point) continue;
        
        // Point is dominated if another point is better in all objectives
        if (other.roi >= point.roi && 
            other.coverage >= point.coverage && 
            other.risk <= point.risk &&
            (other.roi > point.roi || other.coverage > point.coverage || other.risk < point.risk)) {
          isDominated = true;
          break;
        }
      }
      
      if (!isDominated) {
        frontier.push(point);
      }
    }
    
    // Sort by ROI for consistent ordering
    return frontier.sort((a, b) => b.roi - a.roi);
  }

  /**
   * Find knee point (largest marginal change)
   */
  private findKneePoint(frontier: ParetoPoint[]): ParetoPoint {
    if (frontier.length <= 2) {
      return frontier[0] || frontier[frontier.length - 1];
    }

    let maxChange = 0;
    let kneeIndex = 0;

    for (let i = 1; i < frontier.length - 1; i++) {
      const prev = frontier[i - 1];
      const curr = frontier[i];
      const next = frontier[i + 1];

      // Calculate marginal changes
      const deltaROI1 = prev.roi - curr.roi;
      const deltaRisk1 = curr.risk - prev.risk;
      const deltaROI2 = curr.roi - next.roi;
      const deltaRisk2 = next.risk - curr.risk;

      // Find point with largest change in slope
      const slope1 = deltaRisk1 > 0 ? deltaROI1 / deltaRisk1 : deltaROI1;
      const slope2 = deltaRisk2 > 0 ? deltaROI2 / deltaRisk2 : deltaROI2;
      const slopeChange = Math.abs(slope2 - slope1);

      if (slopeChange > maxChange) {
        maxChange = slopeChange;
        kneeIndex = i;
      }
    }

    frontier[kneeIndex].isKnee = true;
    return frontier[kneeIndex];
  }

  /**
   * Calculate portfolio ROI estimate
   */
  private calculateROI(portfolio: LocationCandidate[]): number {
    if (portfolio.length === 0) return 0;
    
    // Simple ROI based on population and performance scores
    const totalValue = portfolio.reduce((sum, site) => {
      const popScore = site.scores.population;
      const perfScore = site.scores.performance;
      const gapScore = site.scores.gap;
      
      // Estimate annual revenue potential
      const revenueEstimate = (popScore * 500000) + (perfScore * 200000) + (gapScore * 300000);
      return sum + revenueEstimate;
    }, 0);

    // Assume average investment of $300k per site
    const totalInvestment = portfolio.length * 300000;
    
    return totalInvestment > 0 ? (totalValue / totalInvestment) - 1 : 0;
  }

  /**
   * Calculate portfolio risk
   */
  private calculateRisk(portfolio: LocationCandidate[], metrics: any): number {
    if (portfolio.length === 0) return 1;

    // Risk factors
    const dataQualityRisk = 1 - metrics.qualityMetrics.averageCompleteness;
    const concentrationRisk = this.calculateConcentrationRisk(portfolio);
    const saturationRisk = portfolio.reduce((sum, site) => sum + site.scores.saturationPenalty, 0) / portfolio.length;

    return (dataQualityRisk + concentrationRisk + saturationRisk) / 3;
  }

  /**
   * Calculate geographic concentration risk
   */
  private calculateConcentrationRisk(portfolio: LocationCandidate[]): number {
    if (portfolio.length <= 1) return 0;

    // Calculate coefficient of variation for geographic spread
    const lats = portfolio.map(s => s.lat);
    const lngs = portfolio.map(s => s.lng);
    
    const latMean = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
    const lngMean = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;
    
    const latVar = lats.reduce((sum, lat) => sum + Math.pow(lat - latMean, 2), 0) / lats.length;
    const lngVar = lngs.reduce((sum, lng) => sum + Math.pow(lng - lngMean, 2), 0) / lngs.length;
    
    const avgVar = (latVar + lngVar) / 2;
    const cv = Math.sqrt(avgVar) / Math.sqrt(latMean * latMean + lngMean * lngMean);
    
    // Higher concentration = higher risk
    return Math.max(0, 1 - cv * 10);
  }

  /**
   * Calculate market coverage
   */
  private calculateCoverage(portfolio: LocationCandidate[], config: CountryConfig): number {
    if (portfolio.length === 0) return 0;

    // Coverage based on population served and geographic distribution
    const totalPopulation = portfolio.reduce((sum, site) => sum + site.features.population, 0);
    const countryPopulation = config.administrativeRegions.reduce((sum, region) => sum + region.population, 0);
    
    const populationCoverage = Math.min(1, totalPopulation / (countryPopulation * 0.1)); // Assume 10% market penetration target
    
    // Geographic coverage bonus
    const regionsCovered = new Set(portfolio.map(s => s.administrativeRegion)).size;
    const totalRegions = config.administrativeRegions.length;
    const geographicCoverage = regionsCovered / totalRegions;
    
    return (populationCoverage * 0.7) + (geographicCoverage * 0.3);
  }

  /**
   * Get frontier summary for UI
   */
  getFrontierSummary(frontier: ParetoPoint[]): {
    totalPoints: number;
    roiRange: { min: number; max: number };
    riskRange: { min: number; max: number };
    coverageRange: { min: number; max: number };
    recommendedK: number;
  } {
    if (frontier.length === 0) {
      return {
        totalPoints: 0,
        roiRange: { min: 0, max: 0 },
        riskRange: { min: 0, max: 0 },
        coverageRange: { min: 0, max: 0 },
        recommendedK: 0
      };
    }

    const rois = frontier.map(p => p.roi);
    const risks = frontier.map(p => p.risk);
    const coverages = frontier.map(p => p.coverage);
    const kneePoint = frontier.find(p => p.isKnee);

    return {
      totalPoints: frontier.length,
      roiRange: { min: Math.min(...rois), max: Math.max(...rois) },
      riskRange: { min: Math.min(...risks), max: Math.max(...risks) },
      coverageRange: { min: Math.min(...coverages), max: Math.max(...coverages) },
      recommendedK: kneePoint?.k || frontier[0]?.k || 0
    };
  }
}