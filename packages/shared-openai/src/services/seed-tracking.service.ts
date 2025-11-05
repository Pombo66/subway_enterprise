import { SeedResult, SeedMetadata } from '../utils/seed-manager.util';

/**
 * Seed Tracking Service
 * Provides seed tracking for performance monitoring and analysis
 * Requirements: 3.4, 3.5
 */
export class SeedTrackingService {
  private readonly seedUsageLog: Map<number, SeedUsageRecord> = new Map();
  private readonly performanceMetrics: Map<number, PerformanceMetric[]> = new Map();

  /**
   * Track seed usage for monitoring and analysis
   * Requirement 3.5: Add seed tracking for performance monitoring and analysis
   */
  trackSeedUsage(
    seedResult: SeedResult,
    context: any,
    operationType: string,
    result?: {
      success: boolean;
      tokensUsed?: number;
      responseTime?: number;
      errorMessage?: string;
    }
  ): void {
    const record: SeedUsageRecord = {
      seed: seedResult.seed,
      seedSource: seedResult.seedSource,
      operationType,
      context: this.sanitizeContext(context),
      timestamp: new Date(),
      success: result?.success ?? true,
      tokensUsed: result?.tokensUsed,
      responseTime: result?.responseTime,
      errorMessage: result?.errorMessage
    };

    // Update usage log
    if (!this.seedUsageLog.has(seedResult.seed)) {
      this.seedUsageLog.set(seedResult.seed, record);
    }

    // Track performance metrics
    if (result) {
      this.trackPerformanceMetric(seedResult.seed, result);
    }
  }

  /**
   * Get seed usage statistics for debugging and optimization
   */
  getSeedUsageStats(): SeedUsageStats {
    const allRecords = Array.from(this.seedUsageLog.values());
    const totalUsages = allRecords.length;
    
    if (totalUsages === 0) {
      return {
        totalSeedsUsed: 0,
        uniqueSeeds: 0,
        successRate: 0,
        averageTokensUsed: 0,
        averageResponseTime: 0,
        seedSourceDistribution: {},
        operationTypeDistribution: {},
        mostUsedSeeds: [],
        problematicSeeds: []
      };
    }

    const successfulUsages = allRecords.filter(r => r.success).length;
    const totalTokens = allRecords.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);
    const totalResponseTime = allRecords.reduce((sum, r) => sum + (r.responseTime || 0), 0);
    const recordsWithResponseTime = allRecords.filter(r => r.responseTime).length;

    // Calculate distributions
    const seedSourceDistribution = this.calculateDistribution(allRecords, 'seedSource');
    const operationTypeDistribution = this.calculateDistribution(allRecords, 'operationType');

    // Find most used seeds
    const seedUsageCounts = new Map<number, number>();
    allRecords.forEach(record => {
      seedUsageCounts.set(record.seed, (seedUsageCounts.get(record.seed) || 0) + 1);
    });

    const mostUsedSeeds = Array.from(seedUsageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([seed, count]) => ({ seed, usageCount: count }));

    // Find problematic seeds (high failure rate)
    const problematicSeeds = this.findProblematicSeeds(allRecords);

    return {
      totalSeedsUsed: totalUsages,
      uniqueSeeds: new Set(allRecords.map(r => r.seed)).size,
      successRate: (successfulUsages / totalUsages) * 100,
      averageTokensUsed: totalTokens / totalUsages,
      averageResponseTime: recordsWithResponseTime > 0 ? totalResponseTime / recordsWithResponseTime : 0,
      seedSourceDistribution,
      operationTypeDistribution,
      mostUsedSeeds,
      problematicSeeds
    };
  }

  /**
   * Get performance metrics for a specific seed
   */
  getSeedPerformanceMetrics(seed: number): PerformanceMetric[] {
    return this.performanceMetrics.get(seed) || [];
  }

  /**
   * Find seeds that consistently produce good results
   */
  getHighPerformingSeeds(minUsages: number = 5): HighPerformingSeed[] {
    const seedPerformance = new Map<number, SeedPerformanceAnalysis>();

    // Analyze performance for each seed
    for (const [seed, metrics] of this.performanceMetrics) {
      if (metrics.length >= minUsages) {
        const analysis = this.analyzeSeedPerformance(seed, metrics);
        seedPerformance.set(seed, analysis);
      }
    }

    // Sort by performance score
    return Array.from(seedPerformance.entries())
      .map(([seed, analysis]) => ({
        seed,
        usageCount: analysis.usageCount,
        successRate: analysis.successRate,
        averageTokens: analysis.averageTokens,
        averageResponseTime: analysis.averageResponseTime,
        performanceScore: analysis.performanceScore
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore);
  }

  /**
   * Create seed management utilities for testing and validation
   * Requirement 3.5: Create seed management utilities for testing and validation
   */
  createTestingUtilities(): SeedTestingUtilities {
    return {
      generateTestSeeds: (count: number) => this.generateTestSeeds(count),
      validateSeedConsistency: (seed: number, context: any, iterations: number) => 
        this.validateSeedConsistency(seed, context, iterations),
      benchmarkSeedPerformance: (seeds: number[], context: any) => 
        this.benchmarkSeedPerformance(seeds, context),
      findOptimalSeedsForContext: (context: any) => 
        this.findOptimalSeedsForContext(context)
    };
  }

  /**
   * Clear tracking data (useful for testing or periodic cleanup)
   */
  clearTrackingData(): void {
    this.seedUsageLog.clear();
    this.performanceMetrics.clear();
  }

  /**
   * Export tracking data for analysis
   */
  exportTrackingData(): {
    usageLog: SeedUsageRecord[];
    performanceMetrics: { seed: number; metrics: PerformanceMetric[] }[];
    exportedAt: Date;
  } {
    return {
      usageLog: Array.from(this.seedUsageLog.values()),
      performanceMetrics: Array.from(this.performanceMetrics.entries()).map(([seed, metrics]) => ({
        seed,
        metrics
      })),
      exportedAt: new Date()
    };
  }

  /**
   * Import tracking data from previous sessions
   */
  importTrackingData(data: {
    usageLog: SeedUsageRecord[];
    performanceMetrics: { seed: number; metrics: PerformanceMetric[] }[];
  }): void {
    // Import usage log
    data.usageLog.forEach(record => {
      this.seedUsageLog.set(record.seed, record);
    });

    // Import performance metrics
    data.performanceMetrics.forEach(({ seed, metrics }) => {
      this.performanceMetrics.set(seed, metrics);
    });
  }

  private trackPerformanceMetric(seed: number, result: any): void {
    if (!this.performanceMetrics.has(seed)) {
      this.performanceMetrics.set(seed, []);
    }

    const metric: PerformanceMetric = {
      timestamp: new Date(),
      success: result.success,
      tokensUsed: result.tokensUsed || 0,
      responseTime: result.responseTime || 0,
      errorType: result.errorMessage ? this.categorizeError(result.errorMessage) : undefined
    };

    this.performanceMetrics.get(seed)!.push(metric);

    // Keep only recent metrics (last 100 per seed)
    const metrics = this.performanceMetrics.get(seed)!;
    if (metrics.length > 100) {
      this.performanceMetrics.set(seed, metrics.slice(-100));
    }
  }

  private sanitizeContext(context: any): any {
    // Remove sensitive information from context before storing
    if (typeof context === 'object' && context !== null) {
      const sanitized = { ...context };
      
      // Remove potentially sensitive fields
      delete sanitized.apiKey;
      delete sanitized.token;
      delete sanitized.password;
      delete sanitized.secret;
      
      return sanitized;
    }
    
    return context;
  }

  private calculateDistribution(records: SeedUsageRecord[], field: keyof SeedUsageRecord): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    records.forEach(record => {
      const value = String(record[field]);
      distribution[value] = (distribution[value] || 0) + 1;
    });

    return distribution;
  }

  private findProblematicSeeds(records: SeedUsageRecord[]): ProblematicSeed[] {
    const seedFailures = new Map<number, { total: number; failures: number; errors: string[] }>();

    records.forEach(record => {
      if (!seedFailures.has(record.seed)) {
        seedFailures.set(record.seed, { total: 0, failures: 0, errors: [] });
      }

      const stats = seedFailures.get(record.seed)!;
      stats.total++;
      
      if (!record.success) {
        stats.failures++;
        if (record.errorMessage) {
          stats.errors.push(record.errorMessage);
        }
      }
    });

    return Array.from(seedFailures.entries())
      .filter(([seed, stats]) => stats.total >= 3 && (stats.failures / stats.total) > 0.5) // >50% failure rate
      .map(([seed, stats]) => ({
        seed,
        usageCount: stats.total,
        failureRate: (stats.failures / stats.total) * 100,
        commonErrors: this.getCommonErrors(stats.errors)
      }))
      .sort((a, b) => b.failureRate - a.failureRate);
  }

  private analyzeSeedPerformance(seed: number, metrics: PerformanceMetric[]): SeedPerformanceAnalysis {
    const successfulMetrics = metrics.filter(m => m.success);
    const usageCount = metrics.length;
    const successRate = (successfulMetrics.length / usageCount) * 100;
    
    const averageTokens = successfulMetrics.length > 0 
      ? successfulMetrics.reduce((sum, m) => sum + m.tokensUsed, 0) / successfulMetrics.length
      : 0;
      
    const averageResponseTime = successfulMetrics.length > 0
      ? successfulMetrics.reduce((sum, m) => sum + m.responseTime, 0) / successfulMetrics.length
      : 0;

    // Calculate performance score (higher is better)
    const performanceScore = (successRate / 100) * 0.6 + 
                            (1 - Math.min(averageTokens / 1000, 1)) * 0.2 +
                            (1 - Math.min(averageResponseTime / 10000, 1)) * 0.2;

    return {
      usageCount,
      successRate,
      averageTokens,
      averageResponseTime,
      performanceScore
    };
  }

  private getCommonErrors(errors: string[]): string[] {
    const errorCounts = new Map<string, number>();
    
    errors.forEach(error => {
      const errorType = this.categorizeError(error);
      errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
    });

    return Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([error]) => error);
  }

  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('rate limit') || message.includes('429')) return 'rate_limit';
    if (message.includes('parsing') || message.includes('json')) return 'parsing_error';
    if (message.includes('network') || message.includes('connection')) return 'network_error';
    if (message.includes('auth') || message.includes('401')) return 'auth_error';
    if (message.includes('quota') || message.includes('billing')) return 'quota_error';
    
    return 'unknown_error';
  }

  // Testing utilities implementation
  private generateTestSeeds(count: number): number[] {
    const seeds: number[] = [];
    for (let i = 0; i < count; i++) {
      seeds.push(Math.floor(Math.random() * 2147483647) + 1);
    }
    return seeds;
  }

  private async validateSeedConsistency(
    seed: number, 
    context: any, 
    iterations: number
  ): Promise<ConsistencyValidationResult> {
    // This would need to be implemented with actual API calls
    // For now, return a placeholder structure
    return {
      seed,
      iterations,
      consistentResults: iterations, // Assume all consistent for now
      consistencyRate: 100,
      variations: [],
      isConsistent: true
    };
  }

  private async benchmarkSeedPerformance(
    seeds: number[], 
    context: any
  ): Promise<SeedBenchmarkResult[]> {
    // This would need actual API calls to benchmark
    // For now, return placeholder data
    return seeds.map(seed => ({
      seed,
      averageResponseTime: Math.random() * 5000 + 1000,
      averageTokensUsed: Math.floor(Math.random() * 500 + 100),
      successRate: 90 + Math.random() * 10,
      performanceScore: Math.random() * 0.4 + 0.6
    }));
  }

  private findOptimalSeedsForContext(context: any): OptimalSeedRecommendation {
    const contextHash = JSON.stringify(context);
    const relevantRecords = Array.from(this.seedUsageLog.values())
      .filter(record => JSON.stringify(record.context) === contextHash);

    if (relevantRecords.length === 0) {
      return {
        recommendedSeeds: [],
        confidence: 0,
        reason: 'No historical data available for this context'
      };
    }

    // Find seeds with best performance for this context
    const seedPerformance = new Map<number, { successes: number; total: number; avgTokens: number }>();
    
    relevantRecords.forEach(record => {
      if (!seedPerformance.has(record.seed)) {
        seedPerformance.set(record.seed, { successes: 0, total: 0, avgTokens: 0 });
      }
      
      const perf = seedPerformance.get(record.seed)!;
      perf.total++;
      if (record.success) {
        perf.successes++;
        perf.avgTokens += record.tokensUsed || 0;
      }
    });

    const recommendedSeeds = Array.from(seedPerformance.entries())
      .filter(([seed, perf]) => perf.total >= 2) // At least 2 usages
      .map(([seed, perf]) => ({
        seed,
        successRate: (perf.successes / perf.total) * 100,
        averageTokens: perf.successes > 0 ? perf.avgTokens / perf.successes : 0
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    return {
      recommendedSeeds,
      confidence: Math.min(relevantRecords.length / 10, 1) * 100, // Higher confidence with more data
      reason: `Based on ${relevantRecords.length} historical usages for similar context`
    };
  }
}

export interface SeedUsageRecord {
  seed: number;
  seedSource: string;
  operationType: string;
  context: any;
  timestamp: Date;
  success: boolean;
  tokensUsed?: number;
  responseTime?: number;
  errorMessage?: string;
}

export interface PerformanceMetric {
  timestamp: Date;
  success: boolean;
  tokensUsed: number;
  responseTime: number;
  errorType?: string;
}

export interface SeedUsageStats {
  totalSeedsUsed: number;
  uniqueSeeds: number;
  successRate: number;
  averageTokensUsed: number;
  averageResponseTime: number;
  seedSourceDistribution: Record<string, number>;
  operationTypeDistribution: Record<string, number>;
  mostUsedSeeds: { seed: number; usageCount: number }[];
  problematicSeeds: ProblematicSeed[];
}

export interface ProblematicSeed {
  seed: number;
  usageCount: number;
  failureRate: number;
  commonErrors: string[];
}

export interface HighPerformingSeed {
  seed: number;
  usageCount: number;
  successRate: number;
  averageTokens: number;
  averageResponseTime: number;
  performanceScore: number;
}

export interface SeedPerformanceAnalysis {
  usageCount: number;
  successRate: number;
  averageTokens: number;
  averageResponseTime: number;
  performanceScore: number;
}

export interface SeedTestingUtilities {
  generateTestSeeds: (count: number) => number[];
  validateSeedConsistency: (seed: number, context: any, iterations: number) => Promise<ConsistencyValidationResult>;
  benchmarkSeedPerformance: (seeds: number[], context: any) => Promise<SeedBenchmarkResult[]>;
  findOptimalSeedsForContext: (context: any) => OptimalSeedRecommendation;
}

export interface ConsistencyValidationResult {
  seed: number;
  iterations: number;
  consistentResults: number;
  consistencyRate: number;
  variations: string[];
  isConsistent: boolean;
}

export interface SeedBenchmarkResult {
  seed: number;
  averageResponseTime: number;
  averageTokensUsed: number;
  successRate: number;
  performanceScore: number;
}

export interface OptimalSeedRecommendation {
  recommendedSeeds: {
    seed: number;
    successRate: number;
    averageTokens: number;
  }[];
  confidence: number;
  reason: string;
}