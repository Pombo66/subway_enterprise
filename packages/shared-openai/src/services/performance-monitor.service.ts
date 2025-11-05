/**
 * Performance Monitor Service
 * Comprehensive logging and monitoring for OpenAI API performance
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

export interface PerformanceMetrics {
  operationType: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tokenUsage?: {
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost?: number;
  success: boolean;
  error?: string;
  responseLength?: number;
  responsePreview?: string;
  retryCount?: number;
  timeoutOccurred?: boolean;
}

export interface AggregatedStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  totalCost: number;
  timeoutRate: number;
  retryRate: number;
  averageRetryCount: number;
  operationTypes: Record<string, {
    count: number;
    averageTime: number;
    successRate: number;
    averageTokens: number;
  }>;
}

export interface LoggingConfig {
  logResponsePreview: boolean;
  previewLength: number; // 80 characters (Requirement 8.1)
  logFullErrors: boolean;
  logTokenUsage: boolean;
  logPerformanceMetrics: boolean;
  enableBeforeAfterComparison: boolean;
}

export class PerformanceMonitorService {
  private readonly config: LoggingConfig;
  private readonly logger: (level: string, message: string, data?: any) => void;
  private metrics: PerformanceMetrics[] = [];
  private baselineMetrics?: AggregatedStats;

  constructor(
    config: Partial<LoggingConfig> = {},
    logger?: (level: string, message: string, data?: any) => void
  ) {
    this.config = {
      logResponsePreview: true,
      previewLength: 80, // Requirement 8.1: Log first 80 characters only
      logFullErrors: false,
      logTokenUsage: true,
      logPerformanceMetrics: true,
      enableBeforeAfterComparison: true,
      ...config
    };

    this.logger = logger || ((level: string, message: string, data?: any) => {
      console.log(`[${level.toUpperCase()}] [PerformanceMonitor] ${message}`, data || '');
    });
  }

  /**
   * Start tracking an operation
   */
  startOperation(operationType: string, operationId?: string): string {
    const id = operationId || this.generateOperationId();
    const metric: PerformanceMetrics = {
      operationType,
      startTime: new Date(),
      success: false
    };

    // Store with ID for later completion
    (metric as any).id = id;
    this.metrics.push(metric);

    this.logger('debug', 'Operation started', {
      operationType,
      operationId: id,
      startTime: metric.startTime.toISOString()
    });

    return id;
  }

  /**
   * Complete operation tracking with results
   * Requirements: 8.1, 8.2, 8.3 - Log response length, token usage, cost, and response time
   */
  completeOperation(
    operationId: string,
    result: {
      success: boolean;
      responseText?: string;
      tokenUsage?: { promptTokens: number; outputTokens: number; totalTokens: number };
      cost?: number;
      error?: Error;
      retryCount?: number;
      timeoutOccurred?: boolean;
    }
  ): void {
    const metric = this.metrics.find(m => (m as any).id === operationId);
    if (!metric) {
      this.logger('warn', 'Operation not found for completion', { operationId });
      return;
    }

    // Complete the metric
    metric.endTime = new Date();
    metric.duration = metric.endTime.getTime() - metric.startTime.getTime();
    metric.success = result.success;
    metric.tokenUsage = result.tokenUsage;
    metric.cost = result.cost;
    metric.retryCount = result.retryCount || 0;
    metric.timeoutOccurred = result.timeoutOccurred || false;

    if (result.error) {
      metric.error = this.sanitizeErrorMessage(result.error);
    }

    if (result.responseText) {
      metric.responseLength = result.responseText.length;
      // Requirement 8.1: Log response text length and first 80 characters only
      if (this.config.logResponsePreview) {
        metric.responsePreview = result.responseText.substring(0, this.config.previewLength);
      }
    }

    // Log the completed operation
    this.logOperationCompletion(metric);

    // Clean up old metrics to prevent memory issues
    this.cleanupOldMetrics();
  }

  /**
   * Log operation completion with optimized format
   * Requirement 8.1: Log response text length and first 80 characters instead of full responses
   * Requirement 8.2: Track token usage, cost, and response time metrics
   */
  private logOperationCompletion(metric: PerformanceMetrics): void {
    const logData: any = {
      operationType: metric.operationType,
      duration: metric.duration,
      success: metric.success
    };

    // Add response information (Requirement 8.1)
    if (metric.responseLength !== undefined) {
      logData.responseLength = metric.responseLength;
    }
    if (metric.responsePreview && this.config.logResponsePreview) {
      logData.responsePreview = metric.responsePreview;
    }

    // Add token usage and cost (Requirement 8.2)
    if (metric.tokenUsage && this.config.logTokenUsage) {
      logData.tokenUsage = metric.tokenUsage;
    }
    if (metric.cost !== undefined) {
      logData.cost = metric.cost;
    }

    // Add retry and timeout information
    if (metric.retryCount && metric.retryCount > 0) {
      logData.retryCount = metric.retryCount;
    }
    if (metric.timeoutOccurred) {
      logData.timeoutOccurred = true;
    }

    // Add error information without exposing sensitive data (Requirement 8.4)
    if (metric.error) {
      logData.error = metric.error;
    }

    const level = metric.success ? 'info' : 'error';
    const message = `Operation ${metric.success ? 'completed' : 'failed'}: ${metric.operationType}`;

    this.logger(level, message, logData);
  }

  /**
   * Get aggregated performance statistics
   * Requirement 8.3: Add performance monitoring with before/after comparisons
   */
  getAggregatedStats(timeWindow?: { start: Date; end: Date }): AggregatedStats {
    let relevantMetrics = this.metrics.filter(m => m.endTime);

    if (timeWindow) {
      relevantMetrics = relevantMetrics.filter(m => 
        m.endTime! >= timeWindow.start && m.endTime! <= timeWindow.end
      );
    }

    if (relevantMetrics.length === 0) {
      return this.createEmptyStats();
    }

    const successfulOps = relevantMetrics.filter(m => m.success);
    const failedOps = relevantMetrics.filter(m => !m.success);
    const timeoutOps = relevantMetrics.filter(m => m.timeoutOccurred);
    const retryOps = relevantMetrics.filter(m => m.retryCount && m.retryCount > 0);

    const totalDuration = relevantMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const totalTokens = relevantMetrics.reduce((sum, m) => sum + (m.tokenUsage?.totalTokens || 0), 0);
    const totalCost = relevantMetrics.reduce((sum, m) => sum + (m.cost || 0), 0);
    const totalRetries = retryOps.reduce((sum, m) => sum + (m.retryCount || 0), 0);

    // Group by operation type
    const operationTypes: Record<string, {
      count: number;
      averageTime: number;
      successRate: number;
      averageTokens: number;
    }> = {};

    for (const metric of relevantMetrics) {
      if (!operationTypes[metric.operationType]) {
        operationTypes[metric.operationType] = {
          count: 0,
          averageTime: 0,
          successRate: 0,
          averageTokens: 0
        };
      }

      const typeStats = operationTypes[metric.operationType];
      typeStats.count++;
    }

    // Calculate averages for each operation type
    for (const [type, stats] of Object.entries(operationTypes)) {
      const typeMetrics = relevantMetrics.filter(m => m.operationType === type);
      const typeSuccessful = typeMetrics.filter(m => m.success);
      
      stats.averageTime = typeMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / typeMetrics.length;
      stats.successRate = (typeSuccessful.length / typeMetrics.length) * 100;
      stats.averageTokens = typeMetrics.reduce((sum, m) => sum + (m.tokenUsage?.totalTokens || 0), 0) / typeMetrics.length;
    }

    return {
      totalOperations: relevantMetrics.length,
      successfulOperations: successfulOps.length,
      failedOperations: failedOps.length,
      averageResponseTime: totalDuration / relevantMetrics.length,
      totalTokensUsed: totalTokens,
      totalCost: totalCost,
      timeoutRate: (timeoutOps.length / relevantMetrics.length) * 100,
      retryRate: (retryOps.length / relevantMetrics.length) * 100,
      averageRetryCount: retryOps.length > 0 ? totalRetries / retryOps.length : 0,
      operationTypes
    };
  }

  /**
   * Set baseline metrics for before/after comparison
   * Requirement 8.3: Enable before/after performance comparisons
   */
  setBaseline(stats?: AggregatedStats): void {
    this.baselineMetrics = stats || this.getAggregatedStats();
    
    this.logger('info', 'Performance baseline set', {
      totalOperations: this.baselineMetrics.totalOperations,
      averageResponseTime: this.baselineMetrics.averageResponseTime,
      successRate: (this.baselineMetrics.successfulOperations / this.baselineMetrics.totalOperations) * 100
    });
  }

  /**
   * Compare current performance with baseline
   * Requirement 8.3: Monitor performance improvements from optimization changes
   */
  compareWithBaseline(): {
    improvement: {
      responseTime: number; // percentage improvement
      successRate: number;
      tokenEfficiency: number;
      costEfficiency: number;
    };
    current: AggregatedStats;
    baseline?: AggregatedStats;
  } | null {
    if (!this.baselineMetrics) {
      this.logger('warn', 'No baseline metrics available for comparison');
      return null;
    }

    const current = this.getAggregatedStats();
    
    const currentSuccessRate = current.totalOperations > 0 
      ? (current.successfulOperations / current.totalOperations) * 100 
      : 0;
    const baselineSuccessRate = this.baselineMetrics.totalOperations > 0 
      ? (this.baselineMetrics.successfulOperations / this.baselineMetrics.totalOperations) * 100 
      : 0;

    const responseTimeImprovement = this.baselineMetrics.averageResponseTime > 0 
      ? ((this.baselineMetrics.averageResponseTime - current.averageResponseTime) / this.baselineMetrics.averageResponseTime) * 100
      : 0;

    const successRateImprovement = baselineSuccessRate > 0 
      ? ((currentSuccessRate - baselineSuccessRate) / baselineSuccessRate) * 100
      : 0;

    const tokenEfficiencyImprovement = this.baselineMetrics.totalTokensUsed > 0 && current.totalOperations > 0 && this.baselineMetrics.totalOperations > 0
      ? ((this.baselineMetrics.totalTokensUsed / this.baselineMetrics.totalOperations) - (current.totalTokensUsed / current.totalOperations)) / (this.baselineMetrics.totalTokensUsed / this.baselineMetrics.totalOperations) * 100
      : 0;

    const costEfficiencyImprovement = this.baselineMetrics.totalCost > 0 && current.totalOperations > 0 && this.baselineMetrics.totalOperations > 0
      ? ((this.baselineMetrics.totalCost / this.baselineMetrics.totalOperations) - (current.totalCost / current.totalOperations)) / (this.baselineMetrics.totalCost / this.baselineMetrics.totalOperations) * 100
      : 0;

    const comparison = {
      improvement: {
        responseTime: responseTimeImprovement,
        successRate: successRateImprovement,
        tokenEfficiency: tokenEfficiencyImprovement,
        costEfficiency: costEfficiencyImprovement
      },
      current,
      baseline: this.baselineMetrics
    };

    this.logger('info', 'Performance comparison completed', {
      responseTimeImprovement: `${responseTimeImprovement.toFixed(2)}%`,
      successRateImprovement: `${successRateImprovement.toFixed(2)}%`,
      tokenEfficiencyImprovement: `${tokenEfficiencyImprovement.toFixed(2)}%`,
      costEfficiencyImprovement: `${costEfficiencyImprovement.toFixed(2)}%`
    });

    return comparison;
  }

  /**
   * Generate performance report
   * Requirement 8.5: Create dashboards for optimization impact tracking
   */
  generatePerformanceReport(timeWindow?: { start: Date; end: Date }): {
    summary: AggregatedStats;
    comparison?: ReturnType<typeof this.compareWithBaseline>;
    recommendations: string[];
    alerts: string[];
  } {
    const summary = this.getAggregatedStats(timeWindow);
    const comparison = this.config.enableBeforeAfterComparison ? this.compareWithBaseline() : undefined;
    
    const recommendations = this.generateRecommendations(summary);
    const alerts = this.generateAlerts(summary);

    this.logger('info', 'Performance report generated', {
      totalOperations: summary.totalOperations,
      successRate: summary.totalOperations > 0 ? (summary.successfulOperations / summary.totalOperations) * 100 : 0,
      averageResponseTime: summary.averageResponseTime,
      recommendationCount: recommendations.length,
      alertCount: alerts.length
    });

    return {
      summary,
      comparison,
      recommendations,
      alerts
    };
  }

  /**
   * Sanitize error message to avoid exposing sensitive data
   * Requirement 8.4: Log detailed error context without exposing sensitive information
   */
  private sanitizeErrorMessage(error: Error): string {
    let message = error.message;

    // Remove potential API keys, tokens, or other sensitive data
    message = message.replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED]');
    message = message.replace(/sk-[a-zA-Z0-9]+/g, '[API_KEY_REDACTED]');
    message = message.replace(/Bearer\s+[a-zA-Z0-9]+/g, 'Bearer [TOKEN_REDACTED]');
    
    // Keep error type and general message
    return `${error.name}: ${message}`;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(stats: AggregatedStats): string[] {
    const recommendations: string[] = [];

    if (stats.averageResponseTime > 30000) { // 30 seconds
      recommendations.push('Consider reducing token limits or optimizing prompts - response times are high');
    }

    if (stats.timeoutRate > 10) {
      recommendations.push('High timeout rate detected - consider increasing timeout limits or optimizing requests');
    }

    if (stats.retryRate > 20) {
      recommendations.push('High retry rate detected - investigate API reliability or rate limiting issues');
    }

    const successRate = stats.totalOperations > 0 ? (stats.successfulOperations / stats.totalOperations) * 100 : 0;
    if (successRate < 90) {
      recommendations.push('Success rate below 90% - investigate error patterns and improve error handling');
    }

    if (stats.totalTokensUsed / stats.totalOperations > 5000) {
      recommendations.push('High average token usage - consider implementing token optimization strategies');
    }

    return recommendations;
  }

  /**
   * Generate performance alerts
   */
  private generateAlerts(stats: AggregatedStats): string[] {
    const alerts: string[] = [];

    if (stats.averageResponseTime > 60000) { // 60 seconds
      alerts.push('CRITICAL: Average response time exceeds 60 seconds');
    }

    if (stats.timeoutRate > 25) {
      alerts.push('HIGH: Timeout rate exceeds 25%');
    }

    const successRate = stats.totalOperations > 0 ? (stats.successfulOperations / stats.totalOperations) * 100 : 0;
    if (successRate < 80) {
      alerts.push('CRITICAL: Success rate below 80%');
    }

    if (stats.totalCost / stats.totalOperations > 0.10) { // $0.10 per operation
      alerts.push('HIGH: Average cost per operation exceeds $0.10');
    }

    return alerts;
  }

  /**
   * Create empty stats structure
   */
  private createEmptyStats(): AggregatedStats {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      timeoutRate: 0,
      retryRate: 0,
      averageRetryCount: 0,
      operationTypes: {}
    };
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old metrics to prevent memory issues
   */
  private cleanupOldMetrics(): void {
    const maxMetrics = 10000;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    // Remove old metrics
    this.metrics = this.metrics.filter(metric => {
      const age = now - metric.startTime.getTime();
      return age < maxAge;
    });

    // Limit total metrics
    if (this.metrics.length > maxMetrics) {
      this.metrics = this.metrics.slice(-maxMetrics / 2);
    }
  }

  /**
   * Reset all metrics and baseline
   */
  reset(): void {
    this.metrics = [];
    this.baselineMetrics = undefined;
    this.logger('info', 'Performance monitor reset');
  }
}