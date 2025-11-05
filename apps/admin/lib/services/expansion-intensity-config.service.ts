import {
  ExpansionIntensity,
  IntensityConfiguration,
  GeographicConstraints
} from './types/intelligent-expansion.types';

/**
 * Expansion Intensity Configuration Service
 * Manages intensity levels, configurations, and provides transparency reporting
 */
export class ExpansionIntensityConfigService {
  private readonly DEFAULT_CONFIGURATIONS: Map<ExpansionIntensity, IntensityConfiguration>;

  constructor() {
    this.DEFAULT_CONFIGURATIONS = new Map([
      [ExpansionIntensity.LIGHT, {
        level: ExpansionIntensity.LIGHT,
        targetCount: 50,
        prioritizationStrategy: 'highest_potential',
        geographicDistribution: {
          maxPerRegion: 8,
          minRegionSpread: 3,
          avoidConcentration: true
        },
        aiSelectionCriteria: {
          potentialWeight: 0.4,
          viabilityWeight: 0.3,
          strategicWeight: 0.2,
          riskWeight: 0.1
        }
      }],
      [ExpansionIntensity.MODERATE, {
        level: ExpansionIntensity.MODERATE,
        targetCount: 100,
        prioritizationStrategy: 'geographic_balance',
        geographicDistribution: {
          maxPerRegion: 15,
          minRegionSpread: 4,
          avoidConcentration: true
        },
        aiSelectionCriteria: {
          potentialWeight: 0.35,
          viabilityWeight: 0.3,
          strategicWeight: 0.25,
          riskWeight: 0.1
        }
      }],
      [ExpansionIntensity.MEDIUM, {
        level: ExpansionIntensity.MEDIUM,
        targetCount: 150,
        prioritizationStrategy: 'geographic_balance',
        geographicDistribution: {
          maxPerRegion: 20,
          minRegionSpread: 5,
          avoidConcentration: true
        },
        aiSelectionCriteria: {
          potentialWeight: 0.3,
          viabilityWeight: 0.3,
          strategicWeight: 0.3,
          riskWeight: 0.1
        }
      }],
      [ExpansionIntensity.HIGH, {
        level: ExpansionIntensity.HIGH,
        targetCount: 200,
        prioritizationStrategy: 'strategic_timing',
        geographicDistribution: {
          maxPerRegion: 25,
          minRegionSpread: 6,
          avoidConcentration: false
        },
        aiSelectionCriteria: {
          potentialWeight: 0.25,
          viabilityWeight: 0.25,
          strategicWeight: 0.35,
          riskWeight: 0.15
        }
      }],
      [ExpansionIntensity.VERY_HIGH, {
        level: ExpansionIntensity.VERY_HIGH,
        targetCount: 250,
        prioritizationStrategy: 'strategic_timing',
        geographicDistribution: {
          maxPerRegion: 30,
          minRegionSpread: 7,
          avoidConcentration: false
        },
        aiSelectionCriteria: {
          potentialWeight: 0.2,
          viabilityWeight: 0.25,
          strategicWeight: 0.4,
          riskWeight: 0.15
        }
      }],
      [ExpansionIntensity.AGGRESSIVE, {
        level: ExpansionIntensity.AGGRESSIVE,
        targetCount: 300,
        prioritizationStrategy: 'highest_potential',
        geographicDistribution: {
          maxPerRegion: 40,
          minRegionSpread: 8,
          avoidConcentration: false
        },
        aiSelectionCriteria: {
          potentialWeight: 0.15,
          viabilityWeight: 0.2,
          strategicWeight: 0.45,
          riskWeight: 0.2
        }
      }]
    ]);

    console.log('🔧 Expansion Intensity Configuration Service initialized');
  }

  /**
   * Map aggression parameter (0-100) to intensity level
   */
  mapAggressionToIntensity(aggression: number): { name: string; targetStores: number; level: ExpansionIntensity } {
    let intensityLevel: ExpansionIntensity;
    
    if (aggression <= 20) {
      intensityLevel = ExpansionIntensity.LIGHT;
    } else if (aggression <= 40) {
      intensityLevel = ExpansionIntensity.MODERATE;
    } else if (aggression <= 60) {
      intensityLevel = ExpansionIntensity.MEDIUM;
    } else if (aggression <= 80) {
      intensityLevel = ExpansionIntensity.HIGH;
    } else {
      intensityLevel = ExpansionIntensity.AGGRESSIVE;
    }
    
    const config = this.getConfiguration(intensityLevel);
    const levelInfo = this.getAllIntensityLevels().find(l => l.level === intensityLevel);
    
    return {
      name: levelInfo?.name || intensityLevel,
      targetStores: config.targetCount,
      level: intensityLevel
    };
  }

  /**
   * Get configuration for specific intensity level
   */
  getConfiguration(intensityLevel: ExpansionIntensity): IntensityConfiguration {
    const config = this.DEFAULT_CONFIGURATIONS.get(intensityLevel);
    if (!config) {
      throw new Error(`No configuration found for intensity level: ${intensityLevel}`);
    }
    return { ...config }; // Return a copy to prevent mutations
  }

  /**
   * Get all available intensity levels with descriptions
   */
  getAllIntensityLevels(): Array<{
    level: ExpansionIntensity;
    name: string;
    description: string;
    targetCount: number;
    riskLevel: string;
  }> {
    return [
      {
        level: ExpansionIntensity.LIGHT,
        name: 'Light',
        description: 'Conservative expansion focusing on highest-potential locations with minimal risk',
        targetCount: 50,
        riskLevel: 'Low'
      },
      {
        level: ExpansionIntensity.MODERATE,
        name: 'Moderate',
        description: 'Balanced approach with geographic distribution and moderate growth',
        targetCount: 100,
        riskLevel: 'Low-Medium'
      },
      {
        level: ExpansionIntensity.MEDIUM,
        name: 'Medium',
        description: 'Growth-focused expansion with strategic market positioning',
        targetCount: 150,
        riskLevel: 'Medium'
      },
      {
        level: ExpansionIntensity.HIGH,
        name: 'High',
        description: 'Aggressive growth with strategic timing and market capture',
        targetCount: 200,
        riskLevel: 'Medium-High'
      },
      {
        level: ExpansionIntensity.VERY_HIGH,
        name: 'Very High',
        description: 'Very aggressive expansion with strategic market dominance focus',
        targetCount: 250,
        riskLevel: 'High'
      },
      {
        level: ExpansionIntensity.AGGRESSIVE,
        name: 'Aggressive',
        description: 'Maximum expansion rate with strategic market saturation approach',
        targetCount: 300,
        riskLevel: 'Very High'
      }
    ];
  }

  /**
   * Create geographic constraints from intensity configuration
   */
  createGeographicConstraints(config: IntensityConfiguration): GeographicConstraints {
    return {
      maxPerState: config.geographicDistribution.maxPerRegion,
      minStateSpread: config.geographicDistribution.minRegionSpread,
      avoidConcentration: config.geographicDistribution.avoidConcentration
    };
  }

  /**
   * Validate intensity level against market conditions
   */
  validateIntensityForMarket(
    intensityLevel: ExpansionIntensity,
    totalHighPotentialLocations: number,
    existingStoreCount: number
  ): {
    isValid: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const config = this.getConfiguration(intensityLevel);
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check if there are enough high-potential locations
    if (totalHighPotentialLocations < config.targetCount) {
      warnings.push(`Only ${totalHighPotentialLocations} high-potential locations available for ${config.targetCount} target stores`);
      recommendations.push(`Consider reducing intensity to ${this.suggestLowerIntensity(intensityLevel)} or expanding search criteria`);
    }

    // Check market saturation risk
    const expansionRatio = config.targetCount / Math.max(1, existingStoreCount);
    if (expansionRatio > 2.0) {
      warnings.push(`High expansion ratio: ${config.targetCount} new stores vs ${existingStoreCount} existing (${expansionRatio.toFixed(1)}x)`);
      recommendations.push('Consider phased expansion approach to reduce market saturation risk');
    }

    // Check if intensity is too conservative
    if (totalHighPotentialLocations > config.targetCount * 2 && intensityLevel < ExpansionIntensity.HIGH) {
      recommendations.push(`${totalHighPotentialLocations} high-potential locations available - consider increasing intensity to ${this.suggestHigherIntensity(intensityLevel)}`);
    }

    const isValid = warnings.length === 0;

    return {
      isValid,
      warnings,
      recommendations
    };
  }

  /**
   * Generate transparency report about alternatives beyond selected intensity
   */
  generateTransparencyReport(
    selectedIntensity: ExpansionIntensity,
    totalHighPotentialLocations: number,
    selectedCount: number
  ): {
    selectedIntensity: string;
    selectedCount: number;
    alternativesAvailable: number;
    higherIntensityOptions: Array<{
      level: string;
      targetCount: number;
      additionalStores: number;
    }>;
    marketCoverage: string;
  } {
    const config = this.getConfiguration(selectedIntensity);
    const alternativesAvailable = Math.max(0, totalHighPotentialLocations - selectedCount);

    // Find higher intensity options
    const higherIntensityOptions = this.getAllIntensityLevels()
      .filter(level => level.level > selectedIntensity)
      .map(level => ({
        level: level.name,
        targetCount: level.targetCount,
        additionalStores: level.targetCount - selectedCount
      }))
      .filter(option => option.additionalStores > 0 && option.targetCount <= totalHighPotentialLocations);

    const marketCoverage = totalHighPotentialLocations > 0 
      ? `${((selectedCount / totalHighPotentialLocations) * 100).toFixed(1)}% of high-potential locations selected`
      : 'No high-potential locations available';

    return {
      selectedIntensity: this.getAllIntensityLevels().find(l => l.level === selectedIntensity)?.name || 'Unknown',
      selectedCount,
      alternativesAvailable,
      higherIntensityOptions,
      marketCoverage
    };
  }

  /**
   * Suggest lower intensity level
   */
  private suggestLowerIntensity(currentLevel: ExpansionIntensity): string {
    const levels = [
      ExpansionIntensity.LIGHT,
      ExpansionIntensity.MODERATE,
      ExpansionIntensity.MEDIUM,
      ExpansionIntensity.HIGH,
      ExpansionIntensity.VERY_HIGH,
      ExpansionIntensity.AGGRESSIVE
    ];

    const currentIndex = levels.indexOf(currentLevel);
    if (currentIndex > 0) {
      const lowerLevel = levels[currentIndex - 1];
      return this.getAllIntensityLevels().find(l => l.level === lowerLevel)?.name || 'Lower';
    }
    return 'Light';
  }

  /**
   * Suggest higher intensity level
   */
  private suggestHigherIntensity(currentLevel: ExpansionIntensity): string {
    const levels = [
      ExpansionIntensity.LIGHT,
      ExpansionIntensity.MODERATE,
      ExpansionIntensity.MEDIUM,
      ExpansionIntensity.HIGH,
      ExpansionIntensity.VERY_HIGH,
      ExpansionIntensity.AGGRESSIVE
    ];

    const currentIndex = levels.indexOf(currentLevel);
    if (currentIndex < levels.length - 1) {
      const higherLevel = levels[currentIndex + 1];
      return this.getAllIntensityLevels().find(l => l.level === higherLevel)?.name || 'Higher';
    }
    return 'Aggressive';
  }

  /**
   * Get recommended intensity based on market conditions
   */
  getRecommendedIntensity(
    totalHighPotentialLocations: number,
    existingStoreCount: number,
    marketSaturation: number
  ): {
    recommendedLevel: ExpansionIntensity;
    reasoning: string;
    alternatives: ExpansionIntensity[];
  } {
    let recommendedLevel: ExpansionIntensity;
    let reasoning: string;

    // Calculate market capacity
    const marketCapacity = totalHighPotentialLocations / Math.max(1, existingStoreCount);

    if (marketSaturation > 0.8) {
      recommendedLevel = ExpansionIntensity.LIGHT;
      reasoning = 'High market saturation suggests conservative expansion approach';
    } else if (marketCapacity > 3 && marketSaturation < 0.4) {
      recommendedLevel = ExpansionIntensity.AGGRESSIVE;
      reasoning = 'Large market opportunity with low saturation supports aggressive expansion';
    } else if (marketCapacity > 2 && marketSaturation < 0.6) {
      recommendedLevel = ExpansionIntensity.HIGH;
      reasoning = 'Good market opportunity supports high-intensity expansion';
    } else if (marketCapacity > 1.5) {
      recommendedLevel = ExpansionIntensity.MEDIUM;
      reasoning = 'Moderate market opportunity suggests balanced expansion approach';
    } else {
      recommendedLevel = ExpansionIntensity.MODERATE;
      reasoning = 'Limited market opportunity recommends moderate expansion pace';
    }

    // Suggest alternatives
    const alternatives: ExpansionIntensity[] = [];
    const levels = [
      ExpansionIntensity.LIGHT,
      ExpansionIntensity.MODERATE,
      ExpansionIntensity.MEDIUM,
      ExpansionIntensity.HIGH,
      ExpansionIntensity.VERY_HIGH,
      ExpansionIntensity.AGGRESSIVE
    ];

    const recommendedIndex = levels.indexOf(recommendedLevel);
    if (recommendedIndex > 0) alternatives.push(levels[recommendedIndex - 1]);
    if (recommendedIndex < levels.length - 1) alternatives.push(levels[recommendedIndex + 1]);

    return {
      recommendedLevel,
      reasoning,
      alternatives
    };
  }
}