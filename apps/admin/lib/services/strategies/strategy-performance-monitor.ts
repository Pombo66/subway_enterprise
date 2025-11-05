import { StrategyType, StrategyScore } from './types';

export interface StrategyMetrics {
  strategyType: StrategyType;
  suggestionCount: number;
  averageScore: number;
  totalScore: number;
  minScore: number;
  maxScore: number;
  scoreDistribution: {
    low: number;    // 0-33
    medium: number; // 34-66
    high: number;   // 67-100
  };
  averageConfidence: number;
  effectivenessRating: 'low' | 'medium' | 'high';
  lastUpdated: Date;
}

export interface OverallMetrics {
  totalSuggestions: number;
  averageProcessingTime: number;
  strategyDistribution: Record<StrategyType, number>;
  dominantStrategies: Array<{
    strategy: StrategyType;
    percentage: number;
    count: number;
  }>;
  performanceRanking: Array<{
    strategy: StrategyType;
    effectivenessScore: number;
    rank: number;
  }>;
  generationSummary: string;
}

export class StrategyPerformanceMonitor {
  private strategyMetrics: Map<StrategyType, StrategyMetrics> = new Map();
  private processingTimes: number[] = [];
  private totalSuggestions = 0;
  private startTime = Date.now();

  constructor() {
    // Initialize metrics for all strategy types
    Object.values(StrategyType).forEach(strategyType => {
      this.strategyMetrics.set(strategyType, {
        strategyType,
        suggestionCount: 0,
        averageScore: 0,
        totalScore: 0,
        minScore: Infinity,
        maxScore: -Infinity,
        scoreDistribution: { low: 0, medium: 0, high: 0 },
        averageConfidence: 0,
        effectivenessRating: 'low',
        lastUpdated: new Date()
      });
    });
    
    console.log('📊 StrategyPerformanceMonitor initialized');
  }

  /**
   * Track suggestion count per strategy and average score contribution
   * Implements requirement 17 for strategy performance tracking
   */
  recordStrategyScore(strategyScore: StrategyScore, dominantStrategy?: StrategyType): void {
    const metrics = this.strategyMetrics.get(strategyScore.strategyType);
    if (!metrics) return;

    // Update basic metrics
    metrics.suggestionCount++;
    metrics.totalScore += strategyScore.score;
    metrics.averageScore = metrics.totalScore / metrics.suggestionCount;
    metrics.minScore = Math.min(metrics.minScore, strategyScore.score);
    metrics.maxScore = Math.max(metrics.maxScore, strategyScore.score);
    
    // Update confidence tracking
    const totalConfidence = (metrics.averageConfidence * (metrics.suggestionCount - 1)) + strategyScore.confidence;
    metrics.averageConfidence = totalConfidence / metrics.suggestionCount;

    // Update score distribution
    if (strategyScore.score <= 33) {
      metrics.scoreDistribution.low++;
    } else if (strategyScore.score <= 66) {
      metrics.scoreDistribution.medium++;
    } else {
      metrics.scoreDistribution.high++;
    }

    // Calculate effectiveness rating
    metrics.effectivenessRating = this.calculateEffectivenessRating(metrics);
    metrics.lastUpdated = new Date();

    // Track if this was the dominant strategy
    if (dominantStrategy === strategyScore.strategyType) {
      this.totalSuggestions++;
    }

    this.strategyMetrics.set(strategyScore.strategyType, metrics);
  }

  /**
   * Record processing time for performance analysis
   */
  recordProcessingTime(timeMs: number): void {
    this.processingTimes.push(timeMs);
    
    // Keep only last 1000 measurements to prevent memory issues
    if (this.processingTimes.length > 1000) {
      this.processingTimes = this.processingTimes.slice(-1000);
    }
  }

  /**
   * Calculate strategy effectiveness metrics and distribution
   * Implements requirement 17 for effectiveness calculation
   */
  getStrategyMetrics(strategyType: StrategyType): StrategyMetrics | null {
    return this.strategyMetrics.get(strategyType) || null;
  }

  /**
   * Get all strategy metrics
   */
  getAllStrategyMetrics(): StrategyMetrics[] {
    return Array.from(this.strategyMetrics.values());
  }

  /**
   * Get overall performance metrics
   * Implements requirement 17 for overall metrics reporting
   */
  getOverallMetrics(): OverallMetrics {
    const allMetrics = this.getAllStrategyMetrics();
    const totalSuggestions = allMetrics.reduce((sum, m) => sum + m.suggestionCount, 0);
    
    // Calculate strategy distribution
    const strategyDistribution: Record<StrategyType, number> = {} as Record<StrategyType, number>;
    allMetrics.forEach(metrics => {
      const percentage = totalSuggestions > 0 ? (metrics.suggestionCount / totalSuggestions) * 100 : 0;
      strategyDistribution[metrics.strategyType] = Math.round(percentage * 100) / 100;
    });

    // Identify dominant strategies
    const dominantStrategies = allMetrics
      .map(metrics => ({
        strategy: metrics.strategyType,
        percentage: totalSuggestions > 0 ? (metrics.suggestionCount / totalSuggestions) * 100 : 0,
        count: metrics.suggestionCount
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3); // Top 3

    // Calculate performance ranking
    const performanceRanking = allMetrics
      .map(metrics => ({
        strategy: metrics.strategyType,
        effectivenessScore: this.calculateOverallEffectiveness(metrics),
        rank: 0 // Will be set after sorting
      }))
      .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    // Calculate average processing time
    const averageProcessingTime = this.processingTimes.length > 0 
      ? this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length
      : 0;

    // Generate summary
    const generationSummary = this.generateSummary(dominantStrategies, performanceRanking);

    return {
      totalSuggestions,
      averageProcessingTime: Math.round(averageProcessingTime),
      strategyDistribution,
      dominantStrategies,
      performanceRanking,
      generationSummary
    };
  }

  /**
   * Generate strategy distribution summary
   * Implements requirement 17 for strategy distribution reporting
   */
  generateDistributionSummary(): string {
    const overall = this.getOverallMetrics();
    const { dominantStrategies } = overall;
    
    if (dominantStrategies.length === 0) {
      return 'No strategy data available';
    }

    const topStrategy = dominantStrategies[0];
    const summaryParts: string[] = [];

    // Add top strategy
    summaryParts.push(`${topStrategy.percentage.toFixed(0)}% ${topStrategy.strategy.replace('_', ' ')}`);

    // Add other significant strategies
    dominantStrategies.slice(1).forEach(strategy => {
      if (strategy.percentage > 10) {
        summaryParts.push(`${strategy.percentage.toFixed(0)}% ${strategy.strategy.replace('_', ' ')}`);
      }
    });

    return summaryParts.join(', ');
  }

  /**
   * Get strategy effectiveness report
   */
  getEffectivenessReport(): string {
    const allMetrics = this.getAllStrategyMetrics();
    const report: string[] = [];

    report.push('📊 Strategy Effectiveness Report');
    report.push('================================');

    allMetrics
      .sort((a, b) => this.calculateOverallEffectiveness(b) - this.calculateOverallEffectiveness(a))
      .forEach((metrics, index) => {
        const effectiveness = this.calculateOverallEffectiveness(metrics);
        const strategyName = metrics.strategyType.replace('_', ' ').toUpperCase();
        
        report.push(`${index + 1}. ${strategyName}`);
        report.push(`   Suggestions: ${metrics.suggestionCount}`);
        report.push(`   Avg Score: ${metrics.averageScore.toFixed(1)}`);
        report.push(`   Effectiveness: ${effectiveness.toFixed(1)} (${metrics.effectivenessRating})`);
        report.push(`   High Scores: ${metrics.scoreDistribution.high}/${metrics.suggestionCount}`);
        report.push('');
      });

    return report.join('\n');
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.strategyMetrics.clear();
    this.processingTimes = [];
    this.totalSuggestions = 0;
    this.startTime = Date.now();
    
    // Reinitialize metrics
    Object.values(StrategyType).forEach(strategyType => {
      this.strategyMetrics.set(strategyType, {
        strategyType,
        suggestionCount: 0,
        averageScore: 0,
        totalScore: 0,
        minScore: Infinity,
        maxScore: -Infinity,
        scoreDistribution: { low: 0, medium: 0, high: 0 },
        averageConfidence: 0,
        effectivenessRating: 'low',
        lastUpdated: new Date()
      });
    });
    
    console.log('📊 Strategy performance metrics reset');
  }

  /**
   * Calculate effectiveness rating for a strategy
   */
  private calculateEffectivenessRating(metrics: StrategyMetrics): 'low' | 'medium' | 'high' {
    const effectiveness = this.calculateOverallEffectiveness(metrics);
    
    if (effectiveness >= 70) return 'high';
    if (effectiveness >= 40) return 'medium';
    return 'low';
  }

  /**
   * Calculate overall effectiveness score
   */
  private calculateOverallEffectiveness(metrics: StrategyMetrics): number {
    if (metrics.suggestionCount === 0) return 0;
    
    // Weighted score: 60% average score, 30% high score ratio, 10% confidence
    const avgScoreWeight = metrics.averageScore * 0.6;
    const highScoreRatio = (metrics.scoreDistribution.high / metrics.suggestionCount) * 100 * 0.3;
    const confidenceWeight = metrics.averageConfidence * 100 * 0.1;
    
    return avgScoreWeight + highScoreRatio + confidenceWeight;
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    dominantStrategies: Array<{ strategy: StrategyType; percentage: number; count: number }>,
    performanceRanking: Array<{ strategy: StrategyType; effectivenessScore: number; rank: number }>
  ): string {
    if (dominantStrategies.length === 0) {
      return 'No strategy data available for summary generation';
    }

    const topStrategy = dominantStrategies[0];
    const topPerformer = performanceRanking[0];
    
    let summary = `Primary strategy: ${topStrategy.strategy.replace('_', ' ')} (${topStrategy.percentage.toFixed(0)}% of suggestions)`;
    
    if (topPerformer.strategy !== topStrategy.strategy) {
      summary += `. Most effective: ${topPerformer.strategy.replace('_', ' ')} (${topPerformer.effectivenessScore.toFixed(0)} effectiveness score)`;
    }
    
    // Add distribution context
    const significantStrategies = dominantStrategies.filter(s => s.percentage > 15);
    if (significantStrategies.length > 1) {
      summary += `. Multi-strategy approach with ${significantStrategies.length} significant contributors`;
    }
    
    return summary;
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics() {
    return {
      strategyMetrics: Object.fromEntries(this.strategyMetrics),
      overallMetrics: this.getOverallMetrics(),
      uptime: Date.now() - this.startTime,
      lastUpdated: new Date()
    };
  }
}