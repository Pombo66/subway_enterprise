import { DemographicDataService, EconomicIndicators } from './demographic-data.service';
import { 
  ExpansionStrategy, 
  StrategyScore, 
  StrategyType, 
  ScoredCell, 
  Store, 
  ExpansionContext,
  StrategyConfig
} from './types';

export class PopulationDensityStrategy implements ExpansionStrategy {
  private readonly demographicService: DemographicDataService;
  
  constructor(demographicService: DemographicDataService) {
    this.demographicService = demographicService;
    console.log('📈 PopulationDensityStrategy initialized');
  }

  getStrategyName(): string {
    return 'Population-Density Strategy';
  }

  validateConfig(config: StrategyConfig): boolean {
    return (
      config.economicWeight >= 0 &&
      config.economicWeight <= 1 &&
      config.highGrowthThreshold > 0 &&
      config.decliningThreshold < 0
    );
  }

  /**
   * Score based on economic potential and growth trajectory
   * Implements requirements 3, 4 for economic indicators and growth trajectory
   */
  async scoreCandidate(
    candidate: ScoredCell,
    stores: Store[],
    context: ExpansionContext
  ): Promise<StrategyScore> {
    try {
      const [lat, lng] = [candidate.center[1], candidate.center[0]]; // Convert from [lng, lat] to [lat, lng]
      
      // Get economic indicators for the location
      const indicators = await this.demographicService.getEconomicIndicators(lat, lng);
      
      // Calculate base economic score
      const baseScore = this.calculateEconomicScore(indicators);
      
      // Apply growth trajectory modifiers
      const modifiedScore = this.applyGrowthModifiers(baseScore, indicators.growthTrajectory, context.config);
      
      // Weight by economic weight parameter
      const weightedScore = modifiedScore * context.config.economicWeight;
      
      // Generate reasoning text
      const reasoning = this.generateEconomicRationale(indicators);
      
      // Normalize score to 0-100 range
      const normalizedScore = Math.min(100, Math.max(0, weightedScore));
      
      return {
        strategyType: StrategyType.ECONOMIC,
        score: normalizedScore,
        confidence: indicators.dataCompleteness,
        reasoning,
        metadata: {
          economicIndicators: indicators,
          baseEconomicScore: baseScore,
          growthModifier: this.getGrowthModifier(indicators.growthTrajectory, context.config),
          weightedScore,
          population: indicators.population,
          growthRate: indicators.populationGrowthRate,
          medianIncome: indicators.medianIncome,
          incomeIndex: indicators.incomeIndex,
          growthTrajectory: indicators.growthTrajectory,
          dataCompleteness: indicators.dataCompleteness,
          dataSource: indicators.dataSource
        }
      };
      
    } catch (error) {
      console.error('Population density strategy error:', error);
      return {
        strategyType: StrategyType.ECONOMIC,
        score: 0,
        confidence: 0.1,
        reasoning: 'Error analyzing economic indicators',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Calculate economic score: population × (1 + growth_rate) × income_index
   * Implements requirement 3.4 for economic score calculation
   */
  private calculateEconomicScore(indicators: EconomicIndicators): number {
    const { population, populationGrowthRate, incomeIndex } = indicators;
    
    // Base economic score formula from requirements
    const economicScore = population * (1 + populationGrowthRate / 100) * incomeIndex;
    
    // Normalize to a reasonable scale (0-100)
    // Assuming max population of 1M, max growth of 5%, max income index of 2.0
    const maxPossibleScore = 1000000 * 1.05 * 2.0; // 2.1M
    const normalizedScore = (economicScore / maxPossibleScore) * 100;
    
    return Math.min(100, Math.max(0, normalizedScore));
  }

  /**
   * Apply growth trajectory modifiers
   * Implements requirements 4.1, 4.2 for growth trajectory classification and modifiers
   */
  private applyGrowthModifiers(
    baseScore: number,
    trajectory: string,
    config: StrategyConfig
  ): number {
    const modifier = this.getGrowthModifier(trajectory, config);
    return baseScore * modifier;
  }

  /**
   * Get growth modifier based on trajectory
   */
  private getGrowthModifier(trajectory: string, config: StrategyConfig): number {
    switch (trajectory) {
      case 'high_growth':
        // +25% for high growth areas (Requirement 4.1)
        return 1.25;
      case 'moderate_growth':
        // No modifier for moderate growth
        return 1.0;
      case 'stable':
        // Small penalty for stable areas
        return 0.95;
      case 'declining':
        // -20% for declining markets (Requirement 4.2)
        return 0.8;
      default:
        return 1.0;
    }
  }

  /**
   * Generate reasoning text explaining economic factors
   * Implements requirements 3.7, 4.3 for including economic indicators and growth trajectory
   */
  private generateEconomicRationale(indicators: EconomicIndicators): string {
    const {
      population,
      populationGrowthRate,
      medianIncome,
      incomeIndex,
      growthTrajectory,
      economicScore,
      dataCompleteness,
      dataSource
    } = indicators;

    let reasoning = `Economic analysis: Population ${population.toLocaleString()}`;
    
    // Add growth rate context
    if (populationGrowthRate > 0) {
      reasoning += `, growing at ${populationGrowthRate.toFixed(1)}% annually`;
    } else if (populationGrowthRate < 0) {
      reasoning += `, declining at ${Math.abs(populationGrowthRate).toFixed(1)}% annually`;
    } else {
      reasoning += `, stable population`;
    }
    
    // Add income context
    reasoning += `. Median income $${medianIncome.toLocaleString()} (${(incomeIndex * 100).toFixed(0)}% of national median)`;
    
    // Add growth trajectory classification
    switch (growthTrajectory) {
      case 'high_growth':
        reasoning += '. High-growth market with strong expansion potential (+25% boost)';
        break;
      case 'moderate_growth':
        reasoning += '. Moderate growth market with steady expansion opportunity';
        break;
      case 'stable':
        reasoning += '. Stable market with consistent demand';
        break;
      case 'declining':
        reasoning += '. Declining market with reduced expansion potential (-20% penalty)';
        break;
    }
    
    // Add economic score
    reasoning += `. Economic score: ${economicScore.toFixed(0)}`;
    
    // Add data quality context
    if (dataCompleteness < 0.7) {
      reasoning += ` (${Math.round(dataCompleteness * 100)}% data completeness from ${dataSource} source)`;
    }
    
    // Handle "unknown" data flags in rationale
    if (dataCompleteness < 0.5) {
      reasoning += '. Note: Limited demographic data available - estimates used';
    }
    
    return reasoning;
  }
}