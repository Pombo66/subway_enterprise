export interface OpenAIMetrics {
  timestamp: string;
  service: 'rationale' | 'strategy';
  apiCalls: number;
  tokensUsed: number;
  errors: number;
  cacheHitRate: number;
  averageResponseTime: number;
  costEstimate: number; // in USD
}

export interface OpenAIAlert {
  type: 'NO_API_CALLS' | 'HIGH_ERROR_RATE' | 'RATE_LIMIT' | 'HIGH_COST';
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  timestamp: string;
  metrics: Partial<OpenAIMetrics>;
}

export class OpenAIMonitoringService {
  private static readonly TOKEN_COST_PER_1K = {
    'gpt-5-nano': { input: 0.0001, output: 0.0004 },
    'gpt-5-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4': { input: 0.03, output: 0.06 }
  };

  /**
   * Monitor OpenAI usage and generate alerts
   */
  static monitorUsage(
    rationaleStats: any,
    strategyStats: any,
    enabledFeatures: { aiRationale: boolean; openaiStrategy: boolean }
  ): OpenAIAlert[] {
    const alerts: OpenAIAlert[] = [];
    const timestamp = new Date().toISOString();

    // Check for enabled AI but no API calls
    if (enabledFeatures.aiRationale && rationaleStats.apiCalls === 0 && rationaleStats.cacheHits === 0) {
      alerts.push({
        type: 'NO_API_CALLS',
        severity: 'CRITICAL',
        message: 'AI rationales enabled but no API calls or cache hits detected. This indicates a configuration or integration issue.',
        timestamp,
        metrics: {
          service: 'rationale',
          apiCalls: rationaleStats.apiCalls,
          cacheHitRate: rationaleStats.hitRate
        }
      });
    }

    if (enabledFeatures.openaiStrategy && strategyStats.apiCalls === 0 && strategyStats.fallbackUsed > 0) {
      alerts.push({
        type: 'NO_API_CALLS',
        severity: 'ERROR',
        message: 'OpenAI strategy layer enabled but falling back to deterministic selection. Check API configuration.',
        timestamp,
        metrics: {
          service: 'strategy',
          apiCalls: strategyStats.apiCalls,
          errors: strategyStats.fallbackUsed
        }
      });
    }

    // Check for high error rates
    const rationaleErrorRate = this.calculateErrorRate(rationaleStats);
    if (rationaleErrorRate > 0.1) { // 10% error rate threshold
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        severity: rationaleErrorRate > 0.5 ? 'CRITICAL' : 'ERROR',
        message: `High error rate detected in rationale generation: ${(rationaleErrorRate * 100).toFixed(1)}%`,
        timestamp,
        metrics: {
          service: 'rationale',
          errors: rationaleStats.apiErrors || 0,
          apiCalls: rationaleStats.apiCalls
        }
      });
    }

    // Check for rate limiting (indicated by fallbacks in strategy service)
    if (strategyStats.fallbackUsed > 0 && strategyStats.apiErrors > 0) {
      alerts.push({
        type: 'RATE_LIMIT',
        severity: 'WARNING',
        message: `Possible rate limiting detected. ${strategyStats.fallbackUsed} fallbacks used.`,
        timestamp,
        metrics: {
          service: 'strategy',
          errors: strategyStats.apiErrors,
          apiCalls: strategyStats.apiCalls
        }
      });
    }

    // Check for high costs
    const totalCost = this.estimateCost(rationaleStats.totalTokensUsed, 'gpt-5-mini') +
                     this.estimateCost(strategyStats.totalTokensUsed, 'gpt-4');
    
    if (totalCost > 10) { // $10 threshold
      alerts.push({
        type: 'HIGH_COST',
        severity: totalCost > 50 ? 'ERROR' : 'WARNING',
        message: `High OpenAI usage cost detected: $${totalCost.toFixed(2)}`,
        timestamp,
        metrics: {
          service: 'rationale',
          tokensUsed: rationaleStats.totalTokensUsed + strategyStats.totalTokensUsed,
          costEstimate: totalCost
        }
      });
    }

    return alerts;
  }

  /**
   * Calculate error rate from service statistics
   */
  private static calculateErrorRate(stats: any): number {
    const totalAttempts = stats.apiCalls + (stats.apiErrors || 0);
    return totalAttempts > 0 ? (stats.apiErrors || 0) / totalAttempts : 0;
  }

  /**
   * Estimate cost based on token usage and model
   */
  private static estimateCost(tokens: number, model: string): number {
    const costs = this.TOKEN_COST_PER_1K[model as keyof typeof this.TOKEN_COST_PER_1K];
    if (!costs) return 0;

    // Assume 75% input tokens, 25% output tokens
    const inputTokens = tokens * 0.75;
    const outputTokens = tokens * 0.25;

    return (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output);
  }

  /**
   * Generate metrics for monitoring dashboard
   */
  static generateMetrics(
    rationaleStats: any,
    strategyStats: any,
    generationTimeMs: number
  ): OpenAIMetrics[] {
    const timestamp = new Date().toISOString();
    const metrics: OpenAIMetrics[] = [];

    // Rationale service metrics
    if (rationaleStats.apiCalls > 0 || rationaleStats.cacheHits > 0) {
      metrics.push({
        timestamp,
        service: 'rationale',
        apiCalls: rationaleStats.apiCalls,
        tokensUsed: rationaleStats.totalTokensUsed,
        errors: rationaleStats.apiErrors || 0,
        cacheHitRate: rationaleStats.hitRate,
        averageResponseTime: rationaleStats.apiCalls > 0 ? generationTimeMs / rationaleStats.apiCalls : 0,
        costEstimate: this.estimateCost(rationaleStats.totalTokensUsed, 'gpt-5-mini')
      });
    }

    // Strategy service metrics
    if (strategyStats.apiCalls > 0 || strategyStats.fallbackUsed > 0) {
      metrics.push({
        timestamp,
        service: 'strategy',
        apiCalls: strategyStats.apiCalls,
        tokensUsed: strategyStats.totalTokensUsed,
        errors: strategyStats.apiErrors || 0,
        cacheHitRate: strategyStats.hitRate,
        averageResponseTime: strategyStats.apiCalls > 0 ? generationTimeMs / strategyStats.apiCalls : 0,
        costEstimate: this.estimateCost(strategyStats.totalTokensUsed, 'gpt-4')
      });
    }

    return metrics;
  }

  /**
   * Log alerts to console and external monitoring systems
   */
  static logAlerts(alerts: OpenAIAlert[]): void {
    alerts.forEach(alert => {
      const logLevel = alert.severity === 'CRITICAL' ? 'error' : 
                     alert.severity === 'ERROR' ? 'error' : 'warn';
      
      console[logLevel](`🚨 OpenAI Alert [${alert.type}]: ${alert.message}`, {
        severity: alert.severity,
        timestamp: alert.timestamp,
        metrics: alert.metrics
      });

      // Here you could integrate with external monitoring services like:
      // - DataDog
      // - New Relic
      // - Sentry
      // - Custom webhook endpoints
    });
  }

  /**
   * Log metrics for monitoring dashboard
   */
  static logMetrics(metrics: OpenAIMetrics[]): void {
    metrics.forEach(metric => {
      console.log(`📊 OpenAI Metrics [${metric.service}]:`, {
        timestamp: metric.timestamp,
        apiCalls: metric.apiCalls,
        tokensUsed: metric.tokensUsed,
        errors: metric.errors,
        cacheHitRate: `${metric.cacheHitRate}%`,
        avgResponseTime: `${metric.averageResponseTime.toFixed(0)}ms`,
        costEstimate: `$${metric.costEstimate.toFixed(4)}`
      });

      // Here you could send metrics to monitoring services like:
      // - Prometheus
      // - InfluxDB
      // - CloudWatch
      // - Custom metrics endpoint
    });
  }
}