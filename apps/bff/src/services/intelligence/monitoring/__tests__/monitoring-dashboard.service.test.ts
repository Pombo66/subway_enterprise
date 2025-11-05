import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringDashboardService } from '../monitoring-dashboard.service';
import { TelemetryService } from '../../telemetry/telemetry.service';
import { PerformanceMonitorService } from '../../performance/performance-monitor.service';
import { CacheManagerService } from '../../cache/cache-manager.service';
import { EnhancedIntelligenceConfigService } from '../../../../config/enhanced-intelligence.config';

describe('MonitoringDashboardService', () => {
  let service: MonitoringDashboardService;
  let telemetryService: jest.Mocked<TelemetryService>;
  let performanceMonitor: jest.Mocked<PerformanceMonitorService>;
  let cacheManager: jest.Mocked<CacheManagerService>;
  let configService: jest.Mocked<EnhancedIntelligenceConfigService>;

  const mockTelemetryEvents = [
    {
      id: 'event1',
      timestamp: new Date(),
      eventType: 'demographic_analysis',
      service: 'demographic_service',
      operation: 'analyze',
      duration: 1500,
      success: true,
      metadata: { confidence: 0.8 }
    },
    {
      id: 'event2',
      timestamp: new Date(),
      eventType: 'viability_assessment',
      service: 'viability_service',
      operation: 'assess',
      duration: 2000,
      success: false,
      error: { message: 'API timeout' }
    }
  ];

  const mockServiceHealth = [
    {
      service: 'demographic_service',
      status: 'healthy' as const,
      uptime: 3600,
      requestCount: 100,
      errorCount: 5,
      errorRate: 0.05,
      averageResponseTime: 500,
      lastHealthCheck: new Date(),
      dependencies: []
    },
    {
      service: 'viability_service',
      status: 'degraded' as const,
      uptime: 3600,
      requestCount: 50,
      errorCount: 10,
      errorRate: 0.2,
      averageResponseTime: 1200,
      lastHealthCheck: new Date(),
      dependencies: []
    }
  ];

  const mockAlerts = [
    {
      id: 'alert1',
      timestamp: new Date(),
      severity: 'error' as const,
      title: 'High Error Rate',
      description: 'Error rate exceeds threshold',
      service: 'viability_service',
      metric: 'error_rate',
      threshold: 0.1,
      actualValue: 0.2,
      resolved: false
    },
    {
      id: 'alert2',
      timestamp: new Date(),
      severity: 'warning' as const,
      title: 'Slow Response Time',
      description: 'Response time is high',
      service: 'demographic_service',
      metric: 'response_time',
      threshold: 1000,
      actualValue: 1500,
      resolved: true,
      resolvedAt: new Date()
    }
  ];

  beforeEach(async () => {
    const mockTelemetryService = {
      getEvents: jest.fn().mockReturnValue(mockTelemetryEvents),
      getServiceHealth: jest.fn().mockReturnValue(mockServiceHealth),
      getAlerts: jest.fn().mockReturnValue(mockAlerts),
      getServiceStatistics: jest.fn().mockReturnValue({
        requestCount: 100,
        errorCount: 5,
        errorRate: 0.05,
        averageResponseTime: 500,
        p95ResponseTime: 750,
        throughput: 10
      }),
      healthCheck: jest.fn().mockReturnValue({
        status: 'healthy',
        eventCount: 1000,
        metricCount: 500,
        alertCount: 10,
        activeAlerts: 2,
        services: 5
      })
    };

    const mockPerformanceMonitor = {
      getPerformanceSummary: jest.fn().mockReturnValue({
        timeWindow: '60 minutes',
        totalRequests: 150,
        averageResponseTime: 800,
        errorRate: 0.08,
        cacheHitRate: 0.75,
        memoryUsage: 100 * 1024 * 1024,
        concurrentRequests: 5,
        alerts: [],
        topSlowOperations: []
      }),
      getActiveRequests: jest.fn().mockReturnValue([
        { id: 'req1', operation: 'analyze', duration: 1000 },
        { id: 'req2', operation: 'assess', duration: 2000 }
      ]),
      healthCheck: jest.fn().mockReturnValue({
        status: 'healthy',
        details: { eventsTracked: 1000 }
      })
    };

    const mockCacheManager = {
      getCacheStats: jest.fn().mockReturnValue({
        provider: 'memory' as const,
        memory: {
          hits: 750,
          misses: 250,
          hitRate: 0.75,
          totalRequests: 1000,
          cacheSize: 500,
          memoryUsage: 50 * 1024 * 1024
        },
        hotspots: 10,
        maintenanceRuns: 5,
        fallbackEvents: 0
      }),
      healthCheck: jest.fn().mockResolvedValue({
        status: 'healthy',
        details: { test: 'passed' }
      })
    };

    const mockConfigService = {
      getConfigurationHealth: jest.fn().mockReturnValue({
        status: 'healthy',
        lastReload: new Date(),
        validationErrors: [],
        loadedSources: ['environment', 'defaults']
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringDashboardService,
        { provide: TelemetryService, useValue: mockTelemetryService },
        { provide: PerformanceMonitorService, useValue: mockPerformanceMonitor },
        { provide: CacheManagerService, useValue: mockCacheManager },
        { provide: EnhancedIntelligenceConfigService, useValue: mockConfigService }
      ],
    }).compile();

    service = module.get<MonitoringDashboardService>(MonitoringDashboardService);
    telemetryService = module.get(TelemetryService);
    performanceMonitor = module.get(PerformanceMonitorService);
    cacheManager = module.get(CacheManagerService);
    configService = module.get(EnhancedIntelligenceConfigService);
  });

  describe('Dashboard Metrics', () => {
    it('should generate comprehensive dashboard metrics', async () => {
      const dashboard = await service.getDashboardMetrics();

      expect(dashboard).toBeDefined();
      expect(dashboard.timestamp).toBeInstanceOf(Date);
      
      // Overview metrics
      expect(dashboard.overview).toBeDefined();
      expect(dashboard.overview.totalRequests).toBe(2);
      expect(dashboard.overview.errorRate).toBe(0.5); // 1 error out of 2 requests
      expect(dashboard.overview.averageResponseTime).toBe(1750); // (1500 + 2000) / 2
      expect(dashboard.overview.activeServices).toBe(1); // Only healthy services
      expect(dashboard.overview.activeAlerts).toBe(1); // Unresolved alerts

      // Services
      expect(dashboard.services).toEqual(mockServiceHealth);

      // Performance
      expect(dashboard.performance).toBeDefined();
      expect(dashboard.performance.requestsPerSecond).toBeGreaterThan(0);
      expect(dashboard.performance.memoryUsage).toBeGreaterThan(0);

      // Intelligence metrics
      expect(dashboard.intelligence).toBeDefined();
      expect(dashboard.intelligence.demographicAnalysisCount).toBe(1);
      expect(dashboard.intelligence.viabilityAssessmentCount).toBe(1);

      // Cache metrics
      expect(dashboard.cache).toBeDefined();
      expect(dashboard.cache.hitRate).toBeGreaterThan(0);

      // Alerts
      expect(dashboard.alerts).toHaveLength(1); // Only unresolved alerts
    });

    it('should cache dashboard metrics', async () => {
      const dashboard1 = await service.getDashboardMetrics();
      const dashboard2 = await service.getDashboardMetrics();

      // Should return the same cached result
      expect(dashboard1.timestamp).toEqual(dashboard2.timestamp);
      
      // Telemetry should only be called once due to caching
      expect(telemetryService.getEvents).toHaveBeenCalledTimes(1);
    });

    it('should handle empty data gracefully', async () => {
      telemetryService.getEvents.mockReturnValue([]);
      telemetryService.getServiceHealth.mockReturnValue([]);
      telemetryService.getAlerts.mockReturnValue([]);

      const dashboard = await service.getDashboardMetrics();

      expect(dashboard.overview.totalRequests).toBe(0);
      expect(dashboard.overview.errorRate).toBe(0);
      expect(dashboard.overview.averageResponseTime).toBe(0);
      expect(dashboard.services).toHaveLength(0);
      expect(dashboard.alerts).toHaveLength(0);
    });
  });

  describe('Service Dashboard', () => {
    it('should generate service-specific dashboard', async () => {
      const serviceDashboard = await service.getServiceDashboard('demographic_service');

      expect(serviceDashboard).toBeDefined();
      expect(serviceDashboard.service).toBe('demographic_service');
      expect(serviceDashboard.status).toBe('healthy');
      
      // Metrics
      expect(serviceDashboard.metrics).toBeDefined();
      expect(serviceDashboard.metrics.requestCount).toBe(100);
      expect(serviceDashboard.metrics.errorRate).toBe(0.05);

      // Recent events
      expect(serviceDashboard.recentEvents).toBeDefined();
      expect(serviceDashboard.recentEvents.length).toBeGreaterThan(0);

      // Trends
      expect(serviceDashboard.trends).toBeDefined();
      expect(serviceDashboard.trends.requestTrend).toBeInstanceOf(Array);
      expect(serviceDashboard.trends.errorTrend).toBeInstanceOf(Array);
      expect(serviceDashboard.trends.responseTrend).toBeInstanceOf(Array);
    });

    it('should handle non-existent service', async () => {
      telemetryService.getServiceHealth.mockReturnValue([]);
      telemetryService.getServiceStatistics.mockReturnValue({
        requestCount: 0,
        errorCount: 0,
        errorRate: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        throughput: 0
      });

      const serviceDashboard = await service.getServiceDashboard('non_existent_service');

      expect(serviceDashboard.service).toBe('non_existent_service');
      expect(serviceDashboard.status).toBe('unhealthy');
      expect(serviceDashboard.metrics.requestCount).toBe(0);
    });

    it('should cache service dashboard data', async () => {
      const dashboard1 = await service.getServiceDashboard('test_service');
      const dashboard2 = await service.getServiceDashboard('test_service');

      // Should use cached data
      expect(telemetryService.getServiceStatistics).toHaveBeenCalledTimes(1);
    });
  });

  describe('Alert Dashboard', () => {
    it('should generate alert dashboard with summary', async () => {
      const alertDashboard = await service.getAlertDashboard();

      expect(alertDashboard).toBeDefined();
      
      // Summary
      expect(alertDashboard.summary).toBeDefined();
      expect(alertDashboard.summary.total).toBe(2);
      expect(alertDashboard.summary.error).toBe(1);
      expect(alertDashboard.summary.warning).toBe(1);
      expect(alertDashboard.summary.resolved).toBe(1);
      expect(alertDashboard.summary.unresolved).toBe(1);

      // Recent alerts (unresolved only)
      expect(alertDashboard.recentAlerts).toHaveLength(1);
      expect(alertDashboard.recentAlerts[0].resolved).toBe(false);

      // Alerts by service
      expect(alertDashboard.alertsByService).toBeInstanceOf(Array);
      expect(alertDashboard.alertsByService.length).toBeGreaterThan(0);

      // Trends
      expect(alertDashboard.trends).toBeInstanceOf(Array);
      expect(alertDashboard.trends.length).toBe(24); // 24 hours of data
    });

    it('should handle no alerts', async () => {
      telemetryService.getAlerts.mockReturnValue([]);

      const alertDashboard = await service.getAlertDashboard();

      expect(alertDashboard.summary.total).toBe(0);
      expect(alertDashboard.summary.unresolved).toBe(0);
      expect(alertDashboard.recentAlerts).toHaveLength(0);
      expect(alertDashboard.alertsByService).toHaveLength(0);
    });
  });

  describe('Performance Dashboard', () => {
    it('should generate performance dashboard', async () => {
      const performanceDashboard = await service.getPerformanceDashboard();

      expect(performanceDashboard).toBeDefined();

      // System metrics
      expect(performanceDashboard.systemMetrics).toBeDefined();
      expect(performanceDashboard.systemMetrics.memoryUsage).toBeGreaterThan(0);

      // Application metrics
      expect(performanceDashboard.applicationMetrics).toBeDefined();
      expect(performanceDashboard.applicationMetrics.requestsPerSecond).toBeGreaterThan(0);
      expect(performanceDashboard.applicationMetrics.averageResponseTime).toBe(800);
      expect(performanceDashboard.applicationMetrics.errorRate).toBe(0.08);
      expect(performanceDashboard.applicationMetrics.activeConnections).toBe(2);

      // Intelligence metrics
      expect(performanceDashboard.intelligenceMetrics).toBeDefined();
      expect(performanceDashboard.intelligenceMetrics.cacheEfficiency).toBe(0.75);

      // Trends
      expect(performanceDashboard.trends).toBeDefined();
      expect(performanceDashboard.trends.responseTime).toBeInstanceOf(Array);
      expect(performanceDashboard.trends.throughput).toBeInstanceOf(Array);
      expect(performanceDashboard.trends.errorRate).toBeInstanceOf(Array);
      expect(performanceDashboard.trends.cacheHitRate).toBeInstanceOf(Array);
    });

    it('should generate trend data for 24 hours', async () => {
      const performanceDashboard = await service.getPerformanceDashboard();

      expect(performanceDashboard.trends.responseTime).toHaveLength(24);
      expect(performanceDashboard.trends.throughput).toHaveLength(24);
      expect(performanceDashboard.trends.errorRate).toHaveLength(24);
      expect(performanceDashboard.trends.cacheHitRate).toHaveLength(24);

      // Verify trend data structure
      const responseTimeTrend = performanceDashboard.trends.responseTime[0];
      expect(responseTimeTrend).toHaveProperty('timestamp');
      expect(responseTimeTrend).toHaveProperty('avg');
      expect(responseTimeTrend).toHaveProperty('p95');
      expect(responseTimeTrend).toHaveProperty('p99');
    });
  });

  describe('System Health', () => {
    it('should generate comprehensive system health report', async () => {
      const systemHealth = await service.getSystemHealth();

      expect(systemHealth).toBeDefined();
      expect(systemHealth.status).toBe('healthy');
      expect(systemHealth.services).toBeInstanceOf(Array);
      expect(systemHealth.services.length).toBe(4); // telemetry, performance, cache, config
      expect(systemHealth.alerts).toBe(2);
      expect(systemHealth.lastUpdate).toBeInstanceOf(Date);

      // Verify service health details
      const telemetryHealth = systemHealth.services.find(s => s.name === 'telemetry');
      expect(telemetryHealth).toBeDefined();
      expect(telemetryHealth?.status).toBe('healthy');
      expect(telemetryHealth?.details).toBeDefined();
    });

    it('should determine degraded status when multiple services are degraded', async () => {
      // Mock degraded services
      telemetryService.healthCheck.mockReturnValue({
        status: 'degraded',
        eventCount: 1000,
        metricCount: 500,
        alertCount: 10,
        activeAlerts: 2,
        services: 5
      });

      performanceMonitor.healthCheck.mockReturnValue({
        status: 'degraded',
        details: { eventsTracked: 1000 }
      });

      const systemHealth = await service.getSystemHealth();

      expect(systemHealth.status).toBe('degraded');
    });

    it('should determine unhealthy status when services are unhealthy', async () => {
      telemetryService.healthCheck.mockReturnValue({
        status: 'unhealthy',
        eventCount: 1000,
        metricCount: 500,
        alertCount: 10,
        activeAlerts: 2,
        services: 5
      });

      const systemHealth = await service.getSystemHealth();

      expect(systemHealth.status).toBe('unhealthy');
    });

    it('should handle health check errors gracefully', async () => {
      telemetryService.healthCheck.mockImplementation(() => {
        throw new Error('Health check failed');
      });

      const systemHealth = await service.getSystemHealth();

      expect(systemHealth.status).toBe('unhealthy');
      expect(systemHealth.services).toHaveLength(0);
      expect(systemHealth.alerts).toBe(0);
    });
  });

  describe('Intelligence Metrics Calculation', () => {
    it('should calculate intelligence metrics correctly', async () => {
      const eventsWithIntelligence = [
        ...mockTelemetryEvents,
        {
          id: 'event3',
          timestamp: new Date(),
          eventType: 'competitive_analysis',
          service: 'competitive_service',
          operation: 'analyze',
          duration: 1800,
          success: true,
          metadata: { intelligenceScore: 0.85 }
        },
        {
          id: 'event4',
          timestamp: new Date(),
          eventType: 'strategic_rationale',
          service: 'rationale_service',
          operation: 'generate',
          duration: 3000,
          success: true,
          metadata: { intelligenceScore: 0.75 }
        }
      ];

      telemetryService.getEvents.mockReturnValue(eventsWithIntelligence);

      const dashboard = await service.getDashboardMetrics();

      expect(dashboard.intelligence.demographicAnalysisCount).toBe(1);
      expect(dashboard.intelligence.viabilityAssessmentCount).toBe(1);
      expect(dashboard.intelligence.competitiveAnalysisCount).toBe(1);
      expect(dashboard.intelligence.strategicRationaleCount).toBe(1);
      expect(dashboard.intelligence.averageIntelligenceScore).toBe(0.8); // (0.85 + 0.75) / 2
    });

    it('should handle missing intelligence scores', async () => {
      const eventsWithoutScores = mockTelemetryEvents.map(event => ({
        ...event,
        metadata: { ...event.metadata, intelligenceScore: undefined }
      }));

      telemetryService.getEvents.mockReturnValue(eventsWithoutScores);

      const dashboard = await service.getDashboardMetrics();

      expect(dashboard.intelligence.averageIntelligenceScore).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear dashboard cache', () => {
      service.clearCache();
      
      // After clearing cache, next call should fetch fresh data
      expect(() => service.clearCache()).not.toThrow();
    });

    it('should respect cache timeout', async () => {
      // Get dashboard to populate cache
      await service.getDashboardMetrics();
      
      // Immediately get again (should use cache)
      await service.getDashboardMetrics();
      
      expect(telemetryService.getEvents).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle telemetry service errors', async () => {
      telemetryService.getEvents.mockImplementation(() => {
        throw new Error('Telemetry service error');
      });

      await expect(service.getDashboardMetrics()).rejects.toThrow('Telemetry service error');
    });

    it('should handle performance monitor errors', async () => {
      performanceMonitor.getPerformanceSummary.mockImplementation(() => {
        throw new Error('Performance monitor error');
      });

      await expect(service.getPerformanceDashboard()).rejects.toThrow('Performance monitor error');
    });

    it('should handle cache manager errors', async () => {
      cacheManager.getCacheStats.mockImplementation(() => {
        throw new Error('Cache manager error');
      });

      await expect(service.getDashboardMetrics()).rejects.toThrow();
    });
  });

  describe('Trend Generation', () => {
    it('should generate consistent trend data', async () => {
      const dashboard1 = await service.getPerformanceDashboard();
      const dashboard2 = await service.getPerformanceDashboard();

      // Trends should be consistent when cached
      expect(dashboard1.trends.responseTime).toEqual(dashboard2.trends.responseTime);
    });

    it('should generate trends with proper time intervals', async () => {
      const performanceDashboard = await service.getPerformanceDashboard();
      const trends = performanceDashboard.trends.responseTime;

      // Verify timestamps are in descending order (most recent first)
      for (let i = 1; i < trends.length; i++) {
        expect(trends[i-1].timestamp.getTime()).toBeGreaterThan(trends[i].timestamp.getTime());
      }

      // Verify timestamps are approximately 1 hour apart
      const timeDiff = trends[0].timestamp.getTime() - trends[1].timestamp.getTime();
      expect(timeDiff).toBeCloseTo(60 * 60 * 1000, -4); // Within 10 seconds of 1 hour
    });
  });
});