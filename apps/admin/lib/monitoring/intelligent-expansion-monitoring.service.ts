/**
 * Intelligent Expansion Performance Monitoring Service
 * Monitors performance, timing, and cache metrics for AI-enhanced expansion services
 */

export interface AIServiceMetrics {
  serviceName: string;
  apiCalls: number;
  cacheHits: number;
  cacheMisses: number;
  totalTokensUsed: number;
  averageResponseTime: number;
  errorCount: number;
  successRate: number;
}

export interface ExpansionPerformanceMetrics {
  totalGenerationTime: number;
  candidatesAnalyzed: number;
  candidatesPerSecond: number;
  memoryUsageMB: number;
  aiServicesMetrics: AIServiceMetrics[];
  intensityOptimizationTime?: number;
  qualityValidationTime?: number;
  enhancedRationaleTime?: number;
}

export interface PerformanceAlert {
  type: 'WARNING' | 'ERROR' | 'INFO';
  service: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
}

export interface CachePerformanceReport {
  service: string;
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  recommendation: string;
}

export interface PerformanceDashboard {
  overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  totalApiCalls: number;
  totalTokensUsed: number;
  averageCacheHitRate: number;
  performanceScore: number;
  alerts: PerformanceAlert[];
  serviceReports: CachePerformanceReport[];
  recommendations: string[];
}

export class IntelligentExpansionMonitoringService {
  private static instance: IntelligentExpansionMonitoringService;
  private performanceHistory: ExpansionPerformanceMetrics[] = [];
  private alertHistory: PerformanceAlert[] = [];
  
  // Performance thresholds
  private readonly THRESHOLDS = {
    MAX_RESPONSE_TIME_MS: 5000,
    MIN_CACHE_HIT_RATE: 0.6, // 60%
    MAX_ERROR_RATE: 0.05, // 5%
    MAX_TOKENS_PER_REQUEST: 2000,
    MAX_MEMORY_MB: 1000,
    MIN_CANDIDATES_PER_SECOND: 10
  };

  private constructor() {
    console.log('🔍 Intelligent Expansion Monitoring Service initialized');
  }

  public static getInstance(): IntelligentExpansionMonitoringService {
    if (!IntelligentExpansionMonitoringService.instance) {
      IntelligentExpansionMonitoringService.instance = new IntelligentExpansionMonitoringService();
    }
    return IntelligentExpansionMonitoringService.instance;
  }

  /**
   * Record performance metrics for an expansion generation
   */
  recordExpansionPerformance(metrics: ExpansionPerformanceMetrics): void {
    console.log('📊 Recording expansion performance metrics:', {
      totalTime: `${metrics.totalGenerationTime}ms`,
      candidatesAnalyzed: metrics.candidatesAnalyzed,
      candidatesPerSecond: metrics.candidatesPerSecond.toFixed(1),
      memoryUsage: `${metrics.memoryUsageMB}MB`,
      aiServices: metrics.aiServicesMetrics.length
    });

    // Store metrics
    this.performanceHistory.push({
      ...metrics,
      timestamp: new Date()
    } as any);

    // Keep only last 100 records
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }

    // Generate alerts based on metrics
    this.generatePerformanceAlerts(metrics);
  }

  /**
   * Monitor AI service performance and generate alerts
   */
  monitorAIServicePerformance(
    contextService: any,
    diversificationService: any,
    intensityService: any,
    placementService: any
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    const services = [
      { name: 'Context Analysis', service: contextService },
      { name: 'Rationale Diversification', service: diversificationService },
      { name: 'Expansion Intensity', service: intensityService },
      { name: 'Placement Intelligence', service: placementService }
    ];

    services.forEach(({ name, service }) => {
      if (!service || typeof service.getCacheStats !== 'function') {
        alerts.push({
          type: 'WARNING',
          service: name,
          metric: 'service_availability',
          value: 0,
          threshold: 1,
          message: `${name} service not available or missing getCacheStats method`,
          timestamp: new Date()
        });
        return;
      }

      const stats = service.getCacheStats();
      
      // Check cache hit rate
      if (stats.hitRate < this.THRESHOLDS.MIN_CACHE_HIT_RATE * 100) {
        alerts.push({
          type: 'WARNING',
          service: name,
          metric: 'cache_hit_rate',
          value: stats.hitRate,
          threshold: this.THRESHOLDS.MIN_CACHE_HIT_RATE * 100,
          message: `Low cache hit rate: ${stats.hitRate.toFixed(1)}% (threshold: ${(this.THRESHOLDS.MIN_CACHE_HIT_RATE * 100).toFixed(1)}%)`,
          timestamp: new Date()
        });
      }

      // Check API call volume
      if (stats.apiCalls > 100) {
        alerts.push({
          type: 'INFO',
          service: name,
          metric: 'api_calls',
          value: stats.apiCalls,
          threshold: 100,
          message: `High API usage: ${stats.apiCalls} calls`,
          timestamp: new Date()
        });
      }

      // Check token usage
      if (stats.totalTokensUsed > this.THRESHOLDS.MAX_TOKENS_PER_REQUEST * stats.apiCalls) {
        alerts.push({
          type: 'WARNING',
          service: name,
          metric: 'token_usage',
          value: stats.totalTokensUsed,
          threshold: this.THRESHOLDS.MAX_TOKENS_PER_REQUEST * stats.apiCalls,
          message: `High token usage: ${stats.totalTokensUsed} tokens across ${stats.apiCalls} calls`,
          timestamp: new Date()
        });
      }
    });

    // Store alerts
    this.alertHistory.push(...alerts);
    
    // Keep only last 500 alerts
    if (this.alertHistory.length > 500) {
      this.alertHistory = this.alertHistory.slice(-500);
    }

    return alerts;
  }

  /**
   * Generate performance dashboard
   */
  generatePerformanceDashboard(): PerformanceDashboard {
    const recentMetrics = this.performanceHistory.slice(-10); // Last 10 generations
    const recentAlerts = this.alertHistory.slice(-50); // Last 50 alerts

    if (recentMetrics.length === 0) {
      return {
        overallHealth: 'FAIR',
        totalApiCalls: 0,
        totalTokensUsed: 0,
        averageCacheHitRate: 0,
        performanceScore: 0.5,
        alerts: [],
        serviceReports: [],
        recommendations: ['No performance data available - run expansion generation to collect metrics']
      };
    }

    // Calculate aggregate metrics
    const totalApiCalls = recentMetrics.reduce((sum, m) => 
      sum + m.aiServicesMetrics.reduce((serviceSum, s) => serviceSum + s.apiCalls, 0), 0
    );
    
    const totalTokensUsed = recentMetrics.reduce((sum, m) => 
      sum + m.aiServicesMetrics.reduce((serviceSum, s) => serviceSum + s.totalTokensUsed, 0), 0
    );

    const averageCacheHitRate = this.calculateAverageCacheHitRate(recentMetrics);
    const performanceScore = this.calculatePerformanceScore(recentMetrics, recentAlerts);
    const overallHealth = this.determineOverallHealth(performanceScore, recentAlerts);

    // Generate service reports
    const serviceReports = this.generateServiceReports(recentMetrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(recentMetrics, recentAlerts, performanceScore);

    return {
      overallHealth,
      totalApiCalls,
      totalTokensUsed,
      averageCacheHitRate,
      performanceScore,
      alerts: recentAlerts.slice(-10), // Last 10 alerts
      serviceReports,
      recommendations
    };
  }

  /**
   * Get timing metrics for specific operations
   */
  getTimingMetrics(): {
    averageGenerationTime: number;
    averageIntensityOptimizationTime: number;
    averageQualityValidationTime: number;
    averageEnhancedRationaleTime: number;
  } {
    const recentMetrics = this.performanceHistory.slice(-20);
    
    if (recentMetrics.length === 0) {
      return {
        averageGenerationTime: 0,
        averageIntensityOptimizationTime: 0,
        averageQualityValidationTime: 0,
        averageEnhancedRationaleTime: 0
      };
    }

    return {
      averageGenerationTime: recentMetrics.reduce((sum, m) => sum + m.totalGenerationTime, 0) / recentMetrics.length,
      averageIntensityOptimizationTime: recentMetrics
        .filter(m => m.intensityOptimizationTime)
        .reduce((sum, m) => sum + (m.intensityOptimizationTime || 0), 0) / 
        Math.max(1, recentMetrics.filter(m => m.intensityOptimizationTime).length),
      averageQualityValidationTime: recentMetrics
        .filter(m => m.qualityValidationTime)
        .reduce((sum, m) => sum + (m.qualityValidationTime || 0), 0) / 
        Math.max(1, recentMetrics.filter(m => m.qualityValidationTime).length),
      averageEnhancedRationaleTime: recentMetrics
        .filter(m => m.enhancedRationaleTime)
        .reduce((sum, m) => sum + (m.enhancedRationaleTime || 0), 0) / 
        Math.max(1, recentMetrics.filter(m => m.enhancedRationaleTime).length)
    };
  }

  /**
   * Log performance alerts
   */
  logPerformanceAlerts(alerts: PerformanceAlert[]): void {
    if (alerts.length === 0) return;

    console.log(`🚨 Performance Alerts (${alerts.length}):`);
    alerts.forEach(alert => {
      const icon = alert.type === 'ERROR' ? '❌' : alert.type === 'WARNING' ? '⚠️' : 'ℹ️';
      console.log(`   ${icon} ${alert.service}: ${alert.message}`);
    });
  }

  /**
   * Reset monitoring data (for testing)
   */
  reset(): void {
    this.performanceHistory = [];
    this.alertHistory = [];
    console.log('🔄 Monitoring data reset');
  }

  /**
   * Generate performance alerts based on metrics
   */
  private generatePerformanceAlerts(metrics: ExpansionPerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Check generation time
    if (metrics.totalGenerationTime > this.THRESHOLDS.MAX_RESPONSE_TIME_MS) {
      alerts.push({
        type: 'WARNING',
        service: 'Expansion Generation',
        metric: 'generation_time',
        value: metrics.totalGenerationTime,
        threshold: this.THRESHOLDS.MAX_RESPONSE_TIME_MS,
        message: `Slow generation: ${metrics.totalGenerationTime}ms (threshold: ${this.THRESHOLDS.MAX_RESPONSE_TIME_MS}ms)`,
        timestamp: new Date()
      });
    }

    // Check memory usage
    if (metrics.memoryUsageMB > this.THRESHOLDS.MAX_MEMORY_MB) {
      alerts.push({
        type: 'WARNING',
        service: 'System',
        metric: 'memory_usage',
        value: metrics.memoryUsageMB,
        threshold: this.THRESHOLDS.MAX_MEMORY_MB,
        message: `High memory usage: ${metrics.memoryUsageMB}MB (threshold: ${this.THRESHOLDS.MAX_MEMORY_MB}MB)`,
        timestamp: new Date()
      });
    }

    // Check candidates per second
    if (metrics.candidatesPerSecond < this.THRESHOLDS.MIN_CANDIDATES_PER_SECOND) {
      alerts.push({
        type: 'WARNING',
        service: 'Expansion Generation',
        metric: 'candidates_per_second',
        value: metrics.candidatesPerSecond,
        threshold: this.THRESHOLDS.MIN_CANDIDATES_PER_SECOND,
        message: `Low throughput: ${metrics.candidatesPerSecond.toFixed(1)} candidates/sec (threshold: ${this.THRESHOLDS.MIN_CANDIDATES_PER_SECOND})`,
        timestamp: new Date()
      });
    }

    // Store alerts
    this.alertHistory.push(...alerts);
  }

  /**
   * Calculate average cache hit rate across all services
   */
  private calculateAverageCacheHitRate(metrics: ExpansionPerformanceMetrics[]): number {
    const allServices = metrics.flatMap(m => m.aiServicesMetrics);
    if (allServices.length === 0) return 0;

    const totalRequests = allServices.reduce((sum, s) => sum + s.cacheHits + s.cacheMisses, 0);
    const totalHits = allServices.reduce((sum, s) => sum + s.cacheHits, 0);

    return totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(
    metrics: ExpansionPerformanceMetrics[], 
    alerts: PerformanceAlert[]
  ): number {
    if (metrics.length === 0) return 0.5;

    // Base score from performance metrics
    const avgGenerationTime = metrics.reduce((sum, m) => sum + m.totalGenerationTime, 0) / metrics.length;
    const avgCandidatesPerSecond = metrics.reduce((sum, m) => sum + m.candidatesPerSecond, 0) / metrics.length;
    const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsageMB, 0) / metrics.length;

    // Normalize scores (0-1)
    const timeScore = Math.max(0, 1 - (avgGenerationTime / (this.THRESHOLDS.MAX_RESPONSE_TIME_MS * 2)));
    const throughputScore = Math.min(1, avgCandidatesPerSecond / (this.THRESHOLDS.MIN_CANDIDATES_PER_SECOND * 2));
    const memoryScore = Math.max(0, 1 - (avgMemoryUsage / (this.THRESHOLDS.MAX_MEMORY_MB * 2)));

    // Alert penalty
    const recentAlerts = alerts.filter(a => 
      new Date().getTime() - a.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    );
    const errorCount = recentAlerts.filter(a => a.type === 'ERROR').length;
    const warningCount = recentAlerts.filter(a => a.type === 'WARNING').length;
    const alertPenalty = (errorCount * 0.1) + (warningCount * 0.05);

    const baseScore = (timeScore + throughputScore + memoryScore) / 3;
    return Math.max(0, Math.min(1, baseScore - alertPenalty));
  }

  /**
   * Determine overall health based on performance score and alerts
   */
  private determineOverallHealth(
    performanceScore: number, 
    alerts: PerformanceAlert[]
  ): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    const recentErrors = alerts.filter(a => 
      a.type === 'ERROR' && 
      new Date().getTime() - a.timestamp.getTime() < 60 * 60 * 1000
    ).length;

    if (recentErrors > 0) return 'POOR';
    if (performanceScore >= 0.9) return 'EXCELLENT';
    if (performanceScore >= 0.7) return 'GOOD';
    if (performanceScore >= 0.5) return 'FAIR';
    return 'POOR';
  }

  /**
   * Generate service-specific performance reports
   */
  private generateServiceReports(metrics: ExpansionPerformanceMetrics[]): CachePerformanceReport[] {
    const serviceMap = new Map<string, AIServiceMetrics[]>();
    
    // Group metrics by service
    metrics.forEach(m => {
      m.aiServicesMetrics.forEach(service => {
        if (!serviceMap.has(service.serviceName)) {
          serviceMap.set(service.serviceName, []);
        }
        serviceMap.get(service.serviceName)!.push(service);
      });
    });

    // Generate reports
    return Array.from(serviceMap.entries()).map(([serviceName, serviceMetrics]) => {
      const totalRequests = serviceMetrics.reduce((sum, s) => sum + (s.cacheHits || 0) + (s.cacheMisses || 0), 0);
      const totalHits = serviceMetrics.reduce((sum, s) => sum + (s.cacheHits || 0), 0);
      const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
      
      // Calculate average response time with proper null/undefined handling
      const validResponseTimes = serviceMetrics
        .map(s => s.averageResponseTime)
        .filter(time => typeof time === 'number' && !isNaN(time));
      const avgResponseTime = validResponseTimes.length > 0 
        ? validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length 
        : 0;

      let recommendation = 'Performance is optimal';
      if (hitRate < 60) {
        recommendation = 'Consider increasing cache TTL or optimizing cache keys';
      } else if (avgResponseTime > 2000) {
        recommendation = 'Response time is high - consider optimizing prompts or using faster model';
      } else if (hitRate > 90) {
        recommendation = 'Excellent cache performance - consider expanding cache scope';
      }

      return {
        service: serviceName,
        hitRate,
        totalRequests,
        cacheHits: totalHits,
        cacheMisses: totalRequests - totalHits,
        averageResponseTime: avgResponseTime,
        recommendation
      };
    });
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    metrics: ExpansionPerformanceMetrics[],
    alerts: PerformanceAlert[],
    performanceScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (performanceScore < 0.7) {
      recommendations.push('Overall performance is below optimal - review system configuration');
    }

    const recentErrors = alerts.filter(a => a.type === 'ERROR').length;
    if (recentErrors > 0) {
      recommendations.push(`${recentErrors} errors detected - investigate service reliability`);
    }

    const lowCacheHitRates = alerts.filter(a => a.metric === 'cache_hit_rate').length;
    if (lowCacheHitRates > 0) {
      recommendations.push('Multiple services have low cache hit rates - optimize caching strategy');
    }

    const highTokenUsage = alerts.filter(a => a.metric === 'token_usage').length;
    if (highTokenUsage > 0) {
      recommendations.push('High token usage detected - optimize prompts to reduce costs');
    }

    if (metrics.length > 0) {
      const avgMemory = metrics.reduce((sum, m) => sum + m.memoryUsageMB, 0) / metrics.length;
      if (avgMemory > this.THRESHOLDS.MAX_MEMORY_MB * 0.8) {
        recommendations.push('Memory usage approaching limits - consider optimization');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is optimal - no immediate actions required');
    }

    return recommendations;
  }
}