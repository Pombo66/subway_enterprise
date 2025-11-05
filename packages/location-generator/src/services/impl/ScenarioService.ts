import { LocationCandidate, ScoreWeights } from '../../types/core';
import { ScoringService } from './ScoringService';
import { PortfolioService } from './PortfolioService';
import { ParetoService } from './ParetoService';
import { SCENARIO_MULTIPLIERS } from '../../config/constants';

/**
 * Fast scenario switching with cached features
 */
export interface ScenarioResult {
  mode: 'Defend' | 'Balanced' | 'Blitz';
  weights: ScoreWeights;
  portfolio: LocationCandidate[];
  paretoFrontier: any[];
  processingTimeMs: number;
  cacheHit: boolean;
}

export class ScenarioService {
  private scenarioCache = new Map<string, ScenarioResult>();

  constructor(
    private scoringService: ScoringService,
    private portfolioService: PortfolioService,
    private paretoService: ParetoService
  ) {}

  /**
   * Switch scenario mode with cached features (no fresh API calls)
   */
  async switchScenario(
    mode: 'Defend' | 'Balanced' | 'Blitz',
    candidatesWithFeatures: LocationCandidate[],
    baseWeights: ScoreWeights,
    config: any
  ): Promise<ScenarioResult> {
    const startTime = Date.now();
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(mode, candidatesWithFeatures, config);
    
    // Check cache first
    const cached = this.scenarioCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        processingTimeMs: Date.now() - startTime,
        cacheHit: true
      };
    }

    // Apply scenario weights (deterministic, no AI calls)
    const scenarioWeights = this.applyScenarioWeights(mode, baseWeights);

    // Re-score candidates with new weights (using cached features)
    const rescoredCandidates = candidatesWithFeatures.map(candidate => ({
      ...candidate,
      scores: this.scoringService.calculateScores(
        candidate.features, // Using cached features!
        scenarioWeights,
        candidate.dataQuality
      )
    }));

    // Normalize scores
    const normalizedCandidates = this.scoringService.normalizeScores(rescoredCandidates);

    // Build portfolio with new scores
    const portfolioResult = this.portfolioService.buildPortfolio(
      normalizedCandidates,
      config.country,
      config.existingStores,
      config.targetK,
      config.minSpacingM
    );

    // Generate Pareto frontier
    const paretoResult = this.paretoService.generateParetoFrontier(
      normalizedCandidates,
      config.country,
      config.existingStores,
      5,
      Math.min(100, normalizedCandidates.length)
    );

    const result: ScenarioResult = {
      mode,
      weights: scenarioWeights,
      portfolio: portfolioResult.selected,
      paretoFrontier: paretoResult.frontier,
      processingTimeMs: Date.now() - startTime,
      cacheHit: false
    };

    // Cache result
    this.scenarioCache.set(cacheKey, result);

    return result;
  }

  /**
   * Apply scenario multipliers to base weights (deterministic)
   */
  private applyScenarioWeights(mode: 'Defend' | 'Balanced' | 'Blitz', baseWeights: ScoreWeights): ScoreWeights {
    const multipliers = SCENARIO_MULTIPLIERS[mode];
    
    const adjusted: ScoreWeights = {
      population: baseWeights.population * multipliers.population,
      gap: baseWeights.gap * multipliers.gap,
      anchor: baseWeights.anchor * multipliers.anchor,
      performance: baseWeights.performance * multipliers.performance,
      saturation: baseWeights.saturation * multipliers.saturation
    };

    // Normalize to sum to 1
    const total = Object.values(adjusted).reduce((sum, weight) => sum + weight, 0);
    Object.keys(adjusted).forEach(key => {
      adjusted[key as keyof ScoreWeights] /= total;
    });

    return adjusted;
  }

  /**
   * Generate cache key for scenario
   */
  private generateCacheKey(mode: string, candidates: LocationCandidate[], config: any): string {
    const candidateIds = candidates.map(c => c.id).sort().join(',');
    const configHash = JSON.stringify({
      targetK: config.targetK,
      minSpacingM: config.minSpacingM,
      countryCode: config.country?.countryCode
    });
    
    return `${mode}_${this.hashString(candidateIds)}_${this.hashString(configHash)}`;
  }

  /**
   * Clear scenario cache
   */
  clearCache(): void {
    this.scenarioCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    scenarios: string[];
  } {
    const scenarios = Array.from(this.scenarioCache.keys()).map(key => key.split('_')[0]);
    
    return {
      size: this.scenarioCache.size,
      hitRate: 0, // Would track in production
      scenarios: [...new Set(scenarios)]
    };
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}