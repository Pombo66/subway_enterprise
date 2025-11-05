import { Injectable, Logger } from '@nestjs/common';
import { TelemetryService, ServiceHealthMetrics, TelemetryAlert } from '../telemetry/telemetry.service';
import { PerformanceMonitorService } from '../performance/performance-monitor.service';
import { CacheManagerService } from '../cache/cache-manager.service';
import { EnhancedIntelligenceConfigService } from '../../../config/enhanced-intelligence.config';

export interface DashboardMetrics {
  timestamp: Date;
  overview: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    cacheHitRate: number;
    activeServices: number;
    activeAlerts: number;
  };
  services: ServiceHealthMetrics[];
  performance: {
    requestsPerSecond: number;
    p95ResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  intelligence: {
    demographicAnalysisCount: number;
    viabilityAssessmentCount: number;
    competitiveAnalysisCount: number;
    strategicRationaleCount: number;
    patternDetectionCount: number;
    averageIntelligenceScore: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    memoryUsage: number;
    keyCount: number;
  };
  alerts: TelemetryAlert[];
}

export interface ServiceDashboard {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: {
    requestCount: number;
    errorCount: number;
    errorRate: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    throughput: number;
  };
  recentEvents: Array<{
    timestamp: Date;
    operation: string;
    duration: number;
    success: boolean;
    error?: string;
  }>;
  trends: {
    requestTrend: Array<{ timestamp: Date; value: number }>;
    errorTrend: Array<{ timestamp: Date; value: number }>;
    responseTrend: Array<{ timestamp: Date; value: number }>;
  };
}

export interface AlertDashboard {
  summary: {
    total: number;
    critical: number;
    error: number;
    warning: number;
    info: number;
    resolved: number;
    unresolved: number;
  };
  recentAlerts: TelemetryAlert[];
  alertsByService: Array<{
    service: string;
    count: number;
    severity: 'critical' | 'error' | 'warning' | 'info';
  }>;
  trends: Array<{
    timestamp: Date;
    critical: number;
    error: number;
    warning: number;
    info: number;
  }>;
}

export interface PerformanceDashboard {
  systemMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkIO: number;
  };
  applicationMetrics: {
    requestsPerSecond: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    activeConnections: number;
  };
  intelligenceMetrics: {
    enhancementLatency: number;
    cacheEfficiency: number;
    aiApiLatency: number;
    batchProcessingEfficiency: number;
  };
  trends: {
    responseTime: Array<{ timestamp: Date; avg: number; p95: number; p99: number }>;
    throughput: Array<{ timestamp: Date; value: number }>;
    errorRate: Array<{ timestamp: Date; value: number }>;
    cacheHitRate: Array<{ timestamp: Date; value: number }>;
  };
}

@Injectable()
export class MonitoringDashboardService {
  private readonly logger = new Logger(MonitoringDashboardService.name);
  private dashboardCache = new Map<string, { data: any; timestamp: Date }>();
  private readonly cacheTimeoutMs = 30000; // 30 seconds

  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly cacheManager: CacheManagerService,
    private readonly configService: EnhancedIntelligenceConfigService
  ) {}

  // Main dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const cacheKey = 'dashboard_metrics';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get overview metrics
      const events = this.telemetryService.getEvents({}, 10000);
      const recentEvents = events.filter(e => e.timestamp >= oneHourAgo);
      
      const totalRequests = recentEvents.length;
      const errorCount = recentEvents.filter(e => !e.success).length;
      const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;
      
      const responseTimes = recentEvents
        .filter(e => e.duration !== undefined)
        .map(e => e.duration!);
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;

      // Get cache metrics
      const cacheStats = await this.cacheManager.getCacheStats();
      const cacheHitRate = cacheStats.memory?.hitRate || cacheStats.redis?.hitRate || 0;

      // Get service health
      const services = this.telemetryService.getServiceHealth();
      const activeServices = services.filter(s => s.status !== 'unhealthy').length;

      // Get alerts
      const alerts = this.telemetryService.getAlerts(false); // unresolved alerts
      const activeAlerts = alerts.length;

      // Get performance metrics
      const performanceSummary = this.performanceMonitor.getPerformanceSummary(60);

      // Get intelligence-specific metrics
      const intelligenceMetrics = this.getIntelligenceMetrics(recentEvents);

      // Get cache details
      const cacheMetrics = this.getCacheMetrics();

      const dashboardMetrics: DashboardMetrics = {
        timestamp: now,
        overview: {
          totalRequests,
          errorRate,
          averageResponseTime,
          cacheHitRate,
          activeServices,
          activeAlerts
        },
        services,
        performance: {
          requestsPerSecond: performanceSummary.totalRequests / 3600, // per hour to per second
          p95ResponseTime: averageResponseTime * 1.5, // Approximation
          memoryUsage: process.memoryUsage().heapUsed,
          cpuUsage: 0 // Would need additional monitoring for real CPU usage
        },
        intelligence: intelligenceMetrics,
        cache: cacheMetrics,
        alerts: alerts.slice(0, 20) // Most recent 20 alerts
      };

      this.setCachedData(cacheKey, dashboardMetrics);
      return dashboardMetrics;

    } catch (error) {
      this.logger.error('Failed to generate dashboard metrics:', error);
      throw error;
    }
  }

  // Service-specific dashboard
  async getServiceDashboard(serviceName: string): Promise<ServiceDashboard> {
    const cacheKey = `service_dashboard_${serviceName}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get service statistics
      const stats = this.telemetryService.getServiceStatistics(serviceName, 60 * 60 * 1000);
      
      // Get recent events for the service
      const recentEvents = this.telemetryService.getEvents({
        service: serviceName,
        startTime: oneHourAgo
      }, 100);

      // Get service health
      const serviceHealth = this.telemetryService.getServiceHealth(serviceName)[0];
      
      // Generate trends (simplified - in real implementation, you'd store historical data)
      const trends = this.generateServiceTrends(serviceName);

      const serviceDashboard: ServiceDashboard = {
        service: serviceName,
        status: serviceHealth?.status || 'unhealthy',
        metrics: stats,
        recentEvents: recentEvents.slice(0, 50).map(e => ({
          timestamp: e.timestamp,
          operation: e.operation,
          duration: e.duration || 0,
          success: e.success,
          error: e.error?.message
        })),
        trends
      };

      this.setCachedData(cacheKey, serviceDashboard);
      return serviceDashboard;

    } catch (error) {
      this.logger.error(`Failed to generate service dashboard for ${serviceName}:`, error);
      throw error;
    }
  }

  // Alert dashboard
  async getAlertDashboard(): Promise<AlertDashboard> {
    const cacheKey = 'alert_dashboard';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const allAlerts = this.telemetryService.getAlerts();
      const unresolvedAlerts = allAlerts.filter(a => !a.resolved);
      
      // Count alerts by severity
      const summary = {
        total: allAlerts.length,
        critical: allAlerts.filter(a => a.severity === 'critical').length,
        error: allAlerts.filter(a => a.severity === 'error').length,
        warning: allAlerts.filter(a => a.severity === 'warning').length,
        info: allAlerts.filter(a => a.severity === 'info').length,
        resolved: allAlerts.filter(a => a.resolved).length,
        unresolved: unresolvedAlerts.length
      };

      // Group alerts by service
      const alertsByService = new Map<string, { count: number; maxSeverity: string }>();
      unresolvedAlerts.forEach(alert => {
        const existing = alertsByService.get(alert.service) || { count: 0, maxSeverity: 'info' };
        existing.count++;
        
        const severityOrder = { info: 1, warning: 2, error: 3, critical: 4 };
        if (severityOrder[alert.severity] > severityOrder[existing.maxSeverity as keyof typeof severityOrder]) {
          existing.maxSeverity = alert.severity;
        }
        
        alertsByService.set(alert.service, existing);
      });

      const alertsByServiceArray = Array.from(alertsByService.entries()).map(([service, data]) => ({
        service,
        count: data.count,
        severity: data.maxSeverity as 'critical' | 'error' | 'warning' | 'info'
      }));

      // Generate alert trends (simplified)
      const trends = this.generateAlertTrends();

      const alertDashboard: AlertDashboard = {
        summary,
        recentAlerts: unresolvedAlerts.slice(0, 50),
        alertsByService: alertsByServiceArray,
        trends
      };

      this.setCachedData(cacheKey, alertDashboard);
      return alertDashboard;

    } catch (error) {
      this.logger.error('Failed to generate alert dashboard:', error);
      throw error;
    }
  }

  // Performance dashboard
  async getPerformanceDashboard(): Promise<PerformanceDashboard> {
    const cacheKey = 'performance_dashboard';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const memoryUsage = process.memoryUsage();
      const performanceSummary = this.performanceMonitor.getPerformanceSummary(60);
      
      // System metrics (simplified - would need additional monitoring)
      const systemMetrics = {
        memoryUsage: memoryUsage.heapUsed,
        cpuUsage: 0, // Would need CPU monitoring
        diskUsage: 0, // Would need disk monitoring
        networkIO: 0  // Would need network monitoring
      };

      // Application metrics
      const applicationMetrics = {
        requestsPerSecond: performanceSummary.totalRequests / 3600,
        averageResponseTime: performanceSummary.averageResponseTime,
        p95ResponseTime: performanceSummary.averageResponseTime * 1.5, // Approximation
        p99ResponseTime: performanceSummary.averageResponseTime * 2.0, // Approximation
        errorRate: performanceSummary.errorRate,
        activeConnections: this.performanceMonitor.getActiveRequests().length
      };

      // Intelligence-specific metrics
      const intelligenceMetrics = {
        enhancementLatency: this.getAverageIntelligenceLatency(),
        cacheEfficiency: performanceSummary.cacheHitRate,
        aiApiLatency: this.getAverageAILatency(),
        batchProcessingEfficiency: this.getBatchProcessingEfficiency()
      };

      // Generate trends
      const trends = this.generatePerformanceTrends();

      const performanceDashboard: PerformanceDashboard = {
        systemMetrics,
        applicationMetrics,
        intelligenceMetrics,
        trends
      };

      this.setCachedData(cacheKey, performanceDashboard);
      return performanceDashboard;

    } catch (error) {
      this.logger.error('Failed to generate performance dashboard:', error);
      throw error;
    }
  }

  // Health check endpoint
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Array<{
      name: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      details?: any;
    }>;
    alerts: number;
    lastUpdate: Date;
  }> {
    try {
      const services = [
        {
          name: 'telemetry',
          status: this.telemetryService.healthCheck().status,
          details: this.telemetryService.healthCheck()
        },
        {
          name: 'performance_monitor',
          status: this.performanceMonitor.healthCheck().status,
          details: this.performanceMonitor.healthCheck()
        },
        {
          name: 'cache_manager',
          status: (await this.cacheManager.healthCheck()).status,
          details: await this.cacheManager.healthCheck()
        },
        {
          name: 'configuration',
          status: this.configService.getConfigurationHealth().status,
          details: this.configService.getConfigurationHealth()
        }
      ];

      // Determine overall system status
      const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;
      const degradedServices = services.filter(s => s.status === 'degraded').length;
      
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (unhealthyServices > 0) {
        overallStatus = 'unhealthy';
      } else if (degradedServices > 1) {
        overallStatus = 'degraded';
      }

      const activeAlerts = this.telemetryService.getAlerts(false).length;

      return {
        status: overallStatus,
        services,
        alerts: activeAlerts,
        lastUpdate: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to get system health:', error);
      return {
        status: 'unhealthy',
        services: [],
        alerts: 0,
        lastUpdate: new Date()
      };
    }
  }

  // Private helper methods
  private getIntelligenceMetrics(events: any[]): DashboardMetrics['intelligence'] {
    const demographicEvents = events.filter(e => e.eventType === 'demographic_analysis');
    const viabilityEvents = events.filter(e => e.eventType === 'viability_assessment');
    const competitiveEvents = events.filter(e => e.eventType === 'competitive_analysis');
    const rationaleEvents = events.filter(e => e.eventType === 'strategic_rationale');
    const patternEvents = events.filter(e => e.eventType === 'pattern_detection');

    // Calculate average intelligence score (simplified)
    const intelligenceScores = events
      .filter(e => e.metadata?.intelligenceScore !== undefined)
      .map(e => e.metadata.intelligenceScore);
    
    const averageIntelligenceScore = intelligenceScores.length > 0
      ? intelligenceScores.reduce((sum, score) => sum + score, 0) / intelligenceScores.length
      : 0;

    return {
      demographicAnalysisCount: demographicEvents.length,
      viabilityAssessmentCount: viabilityEvents.length,
      competitiveAnalysisCount: competitiveEvents.length,
      strategicRationaleCount: rationaleEvents.length,
      patternDetectionCount: patternEvents.length,
      averageIntelligenceScore
    };
  }

  private getCacheMetrics(): DashboardMetrics['cache'] {
    // This would be enhanced with actual cache statistics
    return {
      hitRate: 0.75,
      missRate: 0.25,
      evictionRate: 0.05,
      memoryUsage: 50 * 1024 * 1024, // 50MB
      keyCount: 1000
    };
  }

  private generateServiceTrends(serviceName: string): ServiceDashboard['trends'] {
    // Simplified trend generation - in real implementation, store historical data
    const now = new Date();
    const trends = {
      requestTrend: [] as Array<{ timestamp: Date; value: number }>,
      errorTrend: [] as Array<{ timestamp: Date; value: number }>,
      responseTrend: [] as Array<{ timestamp: Date; value: number }>
    };

    // Generate sample trend data for the last 24 hours
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      trends.requestTrend.push({ timestamp, value: Math.floor(Math.random() * 100) + 50 });
      trends.errorTrend.push({ timestamp, value: Math.floor(Math.random() * 5) });
      trends.responseTrend.push({ timestamp, value: Math.floor(Math.random() * 1000) + 500 });
    }

    return trends;
  }

  private generateAlertTrends(): AlertDashboard['trends'] {
    const now = new Date();
    const trends: AlertDashboard['trends'] = [];

    // Generate sample trend data for the last 24 hours
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      trends.push({
        timestamp,
        critical: Math.floor(Math.random() * 2),
        error: Math.floor(Math.random() * 5),
        warning: Math.floor(Math.random() * 10),
        info: Math.floor(Math.random() * 15)
      });
    }

    return trends;
  }

  private generatePerformanceTrends(): PerformanceDashboard['trends'] {
    const now = new Date();
    const trends = {
      responseTime: [] as Array<{ timestamp: Date; avg: number; p95: number; p99: number }>,
      throughput: [] as Array<{ timestamp: Date; value: number }>,
      errorRate: [] as Array<{ timestamp: Date; value: number }>,
      cacheHitRate: [] as Array<{ timestamp: Date; value: number }>
    };

    // Generate sample trend data for the last 24 hours
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const avgResponse = Math.floor(Math.random() * 1000) + 500;
      
      trends.responseTime.push({
        timestamp,
        avg: avgResponse,
        p95: avgResponse * 1.5,
        p99: avgResponse * 2.0
      });
      
      trends.throughput.push({ timestamp, value: Math.floor(Math.random() * 100) + 50 });
      trends.errorRate.push({ timestamp, value: Math.random() * 0.1 });
      trends.cacheHitRate.push({ timestamp, value: 0.7 + (Math.random() * 0.2) });
    }

    return trends;
  }

  private getAverageIntelligenceLatency(): number {
    const events = this.telemetryService.getEvents({
      eventType: 'intelligence_enhancement'
    }, 100);
    
    const latencies = events
      .filter(e => e.duration !== undefined)
      .map(e => e.duration!);
    
    return latencies.length > 0
      ? latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length
      : 0;
  }

  private getAverageAILatency(): number {
    const events = this.telemetryService.getEvents({}, 1000);
    const aiEvents = events.filter(e => 
      e.eventType === 'demographic_analysis' || 
      e.eventType === 'strategic_rationale'
    );
    
    const latencies = aiEvents
      .filter(e => e.duration !== undefined)
      .map(e => e.duration!);
    
    return latencies.length > 0
      ? latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length
      : 0;
  }

  private getBatchProcessingEfficiency(): number {
    // Simplified calculation - would need more sophisticated metrics
    return 0.85; // 85% efficiency
  }

  private getCachedData(key: string): any {
    const cached = this.dashboardCache.get(key);
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeoutMs) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.dashboardCache.set(key, {
      data,
      timestamp: new Date()
    });
  }

  // Cleanup method
  clearCache(): void {
    this.dashboardCache.clear();
    this.logger.debug('Dashboard cache cleared');
  }
}