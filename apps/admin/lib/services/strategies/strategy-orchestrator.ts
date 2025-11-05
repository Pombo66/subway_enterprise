import {
  StrategyType,
  StrategyConfig,
  StrategyScore,
  ExpansionStrategy,
  ExpansionContext,
  ScoredCell,
  StrategicSuggestion,
  StrategyBreakdown,
  loadStrategyConfig
} from './types';

export class StrategyOrchestrator {
  private strategies: Map<StrategyType, ExpansionStrategy>;
  private config: StrategyConfig;

  constructor(config?: StrategyConfig) {
    this.config = config || loadStrategyConfig();
    this.strategies = new Map();
    this.validateConfiguration();
    this.initializeStrategies();
  }

  /**
   * Apply all enabled strategies to a candidate location
   */
  async scoreCandidate(
    candidate: ScoredCell,
    context: ExpansionContext
  ): Promise<StrategicSuggestion> {
    try {
      // Execute all enabled strategies in parallel
      const strategyPromises = this.config.enabledStrategies.map(async (strategyType) => {
        const strategy = this.strategies.get(strategyType);
        if (!strategy) {
          console.warn(`Strategy ${strategyType} not found, skipping`);
          return null;
        }

        try {
          return await strategy.scoreCandidate(candidate, context.stores, context);
        } catch (error) {
          console.error(`Strategy ${strategyType} failed for candidate ${candidate.id}:`, error);
          // Return fallback score to prevent complete failure
          return this.createFallbackScore(strategyType, candidate);
        }
      });

      const strategyScores = (await Promise.all(strategyPromises))
        .filter((score): score is StrategyScore => score !== null);

      // Aggregate scores using configured weights
      const breakdown = this.aggregateScores(strategyScores);
      
      // Determine dominant strategy
      const dominantStrategy = this.identifyDominantStrategy(strategyScores);
      
      // Create strategic suggestion
      return this.createStrategicSuggestion(candidate, strategyScores, breakdown, dominantStrategy);
      
    } catch (error) {
      console.error(`Strategy orchestration failed for candidate ${candidate.id}:`, error);
      throw error;
    }
  }

  /**
   * Aggregate strategy scores using configured weights
   */
  private aggregateScores(scores: StrategyScore[]): StrategyBreakdown {
    // Normalize scores to 0-1 range
    const normalizedScores = this.normalizeScores(scores);
    
    // Calculate weighted scores
    let whiteSpaceScore = 0;
    let economicScore = 0;
    let anchorScore = 0;
    let clusterScore = 0;

    for (const score of normalizedScores) {
      switch (score.strategyType) {
        case StrategyType.WHITE_SPACE:
          whiteSpaceScore = score.score;
          break;
        case StrategyType.ECONOMIC:
          economicScore = score.score;
          break;
        case StrategyType.ANCHOR:
          anchorScore = score.score;
          break;
        case StrategyType.CLUSTER:
          clusterScore = score.score;
          break;
      }
    }

    // Calculate weighted total
    const weightedTotal = 
      (whiteSpaceScore * this.config.whiteSpaceWeight) +
      (economicScore * this.config.economicWeight) +
      (anchorScore * this.config.anchorWeight) +
      (clusterScore * this.config.clusterWeight);

    // Determine dominant strategy
    const dominantStrategy = this.identifyDominantStrategy(normalizedScores);
    
    // Classify strategically
    const strategicClassification = this.classifyStrategically(
      whiteSpaceScore, economicScore, anchorScore, clusterScore
    );

    return {
      whiteSpaceScore,
      economicScore,
      anchorScore,
      clusterScore,
      weightedTotal,
      dominantStrategy,
      strategicClassification
    };
  }

  /**
   * Determine the dominant strategy for executive summary
   */
  private identifyDominantStrategy(scores: StrategyScore[]): StrategyType {
    if (scores.length === 0) {
      return StrategyType.WHITE_SPACE; // Default fallback
    }

    // Find strategy with highest weighted contribution
    let maxWeightedScore = -1;
    let dominantStrategy = StrategyType.WHITE_SPACE;

    for (const score of scores) {
      let weight = 0;
      switch (score.strategyType) {
        case StrategyType.WHITE_SPACE:
          weight = this.config.whiteSpaceWeight;
          break;
        case StrategyType.ECONOMIC:
          weight = this.config.economicWeight;
          break;
        case StrategyType.ANCHOR:
          weight = this.config.anchorWeight;
          break;
        case StrategyType.CLUSTER:
          weight = this.config.clusterWeight;
          break;
      }

      const weightedScore = score.score * weight;
      if (weightedScore > maxWeightedScore) {
        maxWeightedScore = weightedScore;
        dominantStrategy = score.strategyType;
      }
    }

    return dominantStrategy;
  }

  /**
   * Normalize scores to 0-1 range for consistent weighting
   */
  private normalizeScores(scores: StrategyScore[]): StrategyScore[] {
    return scores.map(score => ({
      ...score,
      score: Math.max(0, Math.min(1, score.score)) // Clamp to 0-1 range
    }));
  }

  /**
   * Classify suggestion strategically based on score patterns
   */
  private classifyStrategically(
    whiteSpace: number,
    economic: number,
    anchor: number,
    cluster: number
  ): string {
    const threshold = 0.6;
    const highScores = [
      whiteSpace > threshold ? 'white_space' : null,
      economic > threshold ? 'economic_growth' : null,
      anchor > threshold ? 'anchor_proximity' : null,
      cluster > threshold ? 'cluster_expansion' : null
    ].filter(Boolean);

    if (highScores.length > 1) {
      return 'multi_strategy';
    } else if (highScores.length === 1) {
      return highScores[0]!;
    } else {
      // Default to dominant strategy
      const scores = [
        { type: 'white_space', score: whiteSpace },
        { type: 'economic_growth', score: economic },
        { type: 'anchor_proximity', score: anchor },
        { type: 'cluster_expansion', score: cluster }
      ];
      
      const maxScore = scores.reduce((max, current) => 
        current.score > max.score ? current : max
      );
      
      return maxScore.type;
    }
  }

  /**
   * Create strategic suggestion from scores and breakdown
   */
  private createStrategicSuggestion(
    candidate: ScoredCell,
    scores: StrategyScore[],
    breakdown: StrategyBreakdown,
    dominantStrategy: StrategyType
  ): StrategicSuggestion {
    // Extract strategy-specific metadata
    const whiteSpaceData = scores.find(s => s.strategyType === StrategyType.WHITE_SPACE)?.metadata || {};
    const economicData = scores.find(s => s.strategyType === StrategyType.ECONOMIC)?.metadata || {};
    const anchorData = scores.find(s => s.strategyType === StrategyType.ANCHOR)?.metadata || {};
    const clusterData = scores.find(s => s.strategyType === StrategyType.CLUSTER)?.metadata || {};

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(dominantStrategy, scores);

    // Create base suggestion (this would normally come from existing ExpansionSuggestionData)
    const baseSuggestion: any = {
      lat: candidate.center[1],
      lng: candidate.center[0],
      confidence: breakdown.weightedTotal,
      rationale: {
        population: candidate.score?.populationScore || 0,
        proximityGap: candidate.score?.proximityScore || 0,
        turnoverGap: candidate.score?.turnoverScore || 0,
        notes: 'Strategic analysis applied'
      },
      rationaleText: executiveSummary,
      band: this.calculateConfidenceBand(breakdown.weightedTotal)
    };

    return {
      ...baseSuggestion,
      strategyBreakdown: {
        whiteSpace: {
          score: breakdown.whiteSpaceScore,
          isWhiteSpace: whiteSpaceData.isWhiteSpace || false,
          nearestStoreKm: whiteSpaceData.nearestStoreKm || 0,
          areaClassification: whiteSpaceData.areaClassification || 'unknown',
          populationInArea: whiteSpaceData.populationInArea || 0
        },
        economic: {
          score: breakdown.economicScore,
          population: economicData.population || 0,
          growthRate: economicData.growthRate || 0,
          medianIncome: economicData.medianIncome || 0,
          incomeIndex: economicData.incomeIndex || 1,
          growthTrajectory: economicData.growthTrajectory || 'unknown'
        },
        anchors: {
          score: breakdown.anchorScore,
          anchorCount: anchorData.anchorCount || 0,
          anchors: anchorData.anchors || [],
          dominantAnchorType: anchorData.dominantAnchorType || 'none',
          isSuperLocation: anchorData.isSuperLocation || false
        },
        clustering: {
          score: breakdown.clusterScore,
          nearestClusterKm: clusterData.nearestClusterKm || 0,
          clusterStrength: clusterData.clusterStrength || 0,
          patternMatch: clusterData.patternMatch || 0,
          patternMatchReasons: clusterData.patternMatchReasons || []
        }
      },
      dominantStrategy,
      strategicClassification: breakdown.strategicClassification as any,
      executiveSummary,
      strategicRationale: {
        executiveSummary,
        strategicHighlights: this.generateStrategicHighlights(scores),
        riskFactors: this.generateRiskFactors(scores),
        competitiveAdvantage: this.generateCompetitiveAdvantage(dominantStrategy, scores),
        dataCompleteness: this.calculateDataCompleteness(scores)
      }
    };
  }

  /**
   * Generate executive summary based on dominant strategy
   */
  private generateExecutiveSummary(dominantStrategy: StrategyType, scores: StrategyScore[]): string {
    const dominantScore = scores.find(s => s.strategyType === dominantStrategy);
    if (!dominantScore) {
      return 'Strategic location identified for expansion';
    }

    switch (dominantStrategy) {
      case StrategyType.WHITE_SPACE:
        return 'Fills significant coverage gap in underserved market';
      case StrategyType.ECONOMIC:
        return 'High-growth market with strong economic indicators';
      case StrategyType.ANCHOR:
        return 'Premium location with natural footfall generators';
      case StrategyType.CLUSTER:
        return 'Replicates proven success patterns from high-performing areas';
      default:
        return 'Strategic location with multiple expansion advantages';
    }
  }

  /**
   * Generate strategic highlights from scores
   */
  private generateStrategicHighlights(scores: StrategyScore[]): string[] {
    return scores
      .filter(score => score.score > 0.5)
      .map(score => score.reasoning)
      .slice(0, 3); // Top 3 highlights
  }

  /**
   * Generate risk factors
   */
  private generateRiskFactors(scores: StrategyScore[]): string[] {
    const risks: string[] = [];
    
    // Check for low scores that might indicate risks
    const lowScores = scores.filter(score => score.score < 0.3);
    for (const score of lowScores) {
      switch (score.strategyType) {
        case StrategyType.ECONOMIC:
          risks.push('Limited economic growth indicators');
          break;
        case StrategyType.ANCHOR:
          risks.push('Limited natural footfall generators nearby');
          break;
        case StrategyType.CLUSTER:
          risks.push('No proven success patterns in area');
          break;
      }
    }
    
    return risks.slice(0, 2); // Max 2 risk factors
  }

  /**
   * Generate competitive advantage statement
   */
  private generateCompetitiveAdvantage(dominantStrategy: StrategyType, scores: StrategyScore[]): string {
    switch (dominantStrategy) {
      case StrategyType.WHITE_SPACE:
        return 'First-mover advantage in underserved market';
      case StrategyType.ECONOMIC:
        return 'Positioned in high-growth demographic corridor';
      case StrategyType.ANCHOR:
        return 'Premium location with guaranteed footfall';
      case StrategyType.CLUSTER:
        return 'Leverages proven success formula';
      default:
        return 'Strategic positioning advantage';
    }
  }

  /**
   * Calculate data completeness across strategies
   */
  private calculateDataCompleteness(scores: StrategyScore[]): number {
    if (scores.length === 0) return 0;
    
    const avgConfidence = scores.reduce((sum, score) => sum + score.confidence, 0) / scores.length;
    return Math.max(0, Math.min(1, avgConfidence));
  }

  /**
   * Calculate confidence band from weighted score
   */
  private calculateConfidenceBand(score: number): string {
    if (score >= 0.7) return 'HIGH';
    if (score >= 0.5) return 'MEDIUM';
    if (score >= 0.3) return 'LOW';
    return 'INSUFFICIENT_DATA';
  }

  /**
   * Create fallback score when strategy fails
   */
  private createFallbackScore(strategyType: StrategyType, candidate: ScoredCell): StrategyScore {
    return {
      strategyType,
      score: 0.5, // Neutral score
      confidence: 0.3, // Low confidence due to failure
      reasoning: `${strategyType} strategy unavailable - using fallback`,
      metadata: {}
    };
  }

  /**
   * Initialize strategy implementations
   */
  private initializeStrategies(): void {
    // Strategy implementations will be added as they are created
    // For now, we'll initialize empty map - strategies will be registered later
    console.log('Strategy orchestrator initialized with configuration:', {
      enabledStrategies: this.config.enabledStrategies,
      weights: {
        whiteSpace: this.config.whiteSpaceWeight,
        economic: this.config.economicWeight,
        anchor: this.config.anchorWeight,
        cluster: this.config.clusterWeight
      }
    });
  }

  /**
   * Register a strategy implementation
   */
  registerStrategy(strategyType: StrategyType, strategy: ExpansionStrategy): void {
    if (!strategy.validateConfig(this.config)) {
      throw new Error(`Strategy ${strategyType} configuration validation failed`);
    }
    
    this.strategies.set(strategyType, strategy);
    console.log(`Registered strategy: ${strategyType}`);
  }

  /**
   * Validate strategy configuration
   */
  private validateConfiguration(): void {
    // Validate weights sum to 1.0
    const totalWeight = 
      this.config.whiteSpaceWeight + 
      this.config.economicWeight + 
      this.config.anchorWeight + 
      this.config.clusterWeight;
    
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error(`Strategy weights must sum to 1.0, got ${totalWeight}`);
    }

    // Validate at least one strategy is enabled
    if (this.config.enabledStrategies.length === 0) {
      throw new Error('At least one strategy must be enabled');
    }

    // Validate threshold values are reasonable
    if (this.config.urbanCoverageKm <= 0 || this.config.ruralCoverageKm <= 0) {
      throw new Error('Coverage radius values must be positive');
    }

    if (this.config.urbanDensityThreshold <= 0 || this.config.suburbanDensityThreshold <= 0) {
      throw new Error('Density threshold values must be positive');
    }

    console.log('Strategy configuration validated successfully');
  }

  /**
   * Get current configuration
   */
  getConfig(): StrategyConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (for runtime updates)
   */
  updateConfig(newConfig: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfiguration();
    console.log('Strategy configuration updated');
  }
}