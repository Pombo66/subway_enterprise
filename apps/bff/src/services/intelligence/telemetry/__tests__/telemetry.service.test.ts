import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryService, TelemetryEvent, TelemetryMetric, TelemetryAlert } from '../telemetry.service';
import { EnhancedIntelligenceConfigService } from '../../../../config/enhanced-intelligence.config';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let configService: jest.Mocked<EnhancedIntelligenceConfigService>;

  const mockConfig = {
    features: {
      enableTelemetry: true
    },
    monitoring: {
      enableMetrics: true,
      enableAlerts: true,
      metricsRetentionDays: 7,
      alertThresholds: {
        errorRate: 0.05,
        responseTime: 5000,
        memoryUsage: 512,
        cacheHitRate: 0.7
      }
    }
  };

  beforeEach(async () => {
    const mockConfigService = {
      isFeatureEnabled: jest.fn().mockReturnValue(true),
      getMonitoringConfig: jest.fn().mockReturnValue(mockConfig.monitoring)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryService,
        { provide: EnhancedIntelligenceConfigService, useValue: mockConfigService }
      ],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
    configService = module.get(EnhancedIntelligenceConfigService);
  });

  describe('Event Tracking', () => {
    it('should track events successfully', () => {
      const eventId = service.trackEvent({
        eventType: 'test_event',
        service: 'test_service',
        operation: 'test_operation',
        duration: 1000,
        success: true,
        metadata: { test: 'data' }
      });

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');

      const events = service.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('test_event');
      expect(events[0].service).toBe('test_service');
      expect(events[0].success).toBe(true);
      expect(events[0].metadata?.test).toBe('data');
    });

    it('should not track events when telemetry is disabled', () => {
      configService.isFeatureEnabled.mockReturnValue(false);

      const eventId = service.trackEvent({
        eventType: 'test_event',
        service: 'test_service',
        operation: 'test_operation',
        success: true
      });

      expect(eventId).toBe('');
      expect(service.getEvents()).toHaveLength(0);
    });

    it('should update service metrics when tracking events', () => {
      service.trackEvent({
        eventType: 'test_event',
        service: 'test_service',
        operation: 'test_operation',
        duration: 1000,
        success: true
      });

      service.trackEvent({
        eventType: 'test_event',
        service: 'test_service',
        operation: 'test_operation',
        duration: 2000,
        success: false
      });

      const serviceHealth = service.getServiceHealth('test_service');
      expect(serviceHealth).toHaveLength(1);
      expect(serviceHealth[0].requestCount).toBe(2);
      expect(serviceHealth[0].errorCount).toBe(1);
      expect(serviceHealth[0].errorRate).toBe(0.5);
      expect(serviceHealth[0].averageResponseTime).toBe(1500);
    });

    it('should maintain event limit', () => {
      // Track more events than the limit (assuming limit is reasonable for testing)
      for (let i = 0; i < 100; i++) {
        service.trackEvent({
          eventType: 'test_event',
          service: 'test_service',
          operation: `operation_${i}`,
          success: true
        });
      }

      const events = service.getEvents();
      expect(events.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Metric Recording', () => {
    it('should record metrics successfully', () => {
      service.recordMetric({
        name: 'test_metric',
        value: 42,
        unit: 'count',
        tags: { environment: 'test' }
      });

      const metrics = service.getMetrics('test_metric');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test_metric');
      expect(metrics[0].value).toBe(42);
      expect(metrics[0].unit).toBe('count');
      expect(metrics[0].tags?.environment).toBe('test');
    });

    it('should not record metrics when telemetry is disabled', () => {
      configService.isFeatureEnabled.mockReturnValue(false);

      service.recordMetric({
        name: 'test_metric',
        value: 42,
        unit: 'count'
      });

      expect(service.getMetrics()).toHaveLength(0);
    });

    it('should record batch metrics', () => {
      const metrics = [
        { name: 'metric1', value: 10, unit: 'count' },
        { name: 'metric2', value: 20, unit: 'milliseconds' },
        { name: 'metric3', value: 30, unit: 'bytes' }
      ];

      service.recordMetrics(metrics);

      const allMetrics = service.getMetrics();
      expect(allMetrics).toHaveLength(3);
      expect(allMetrics.map(m => m.name)).toContain('metric1');
      expect(allMetrics.map(m => m.name)).toContain('metric2');
      expect(allMetrics.map(m => m.name)).toContain('metric3');
    });

    it('should maintain metric limit', () => {
      // Record more metrics than a reasonable limit
      for (let i = 0; i < 200; i++) {
        service.recordMetric({
          name: `metric_${i}`,
          value: i,
          unit: 'count'
        });
      }

      const metrics = service.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(200);
    });
  });

  describe('Alert Management', () => {
    it('should create alerts successfully', () => {
      const alertId = service.createAlert({
        severity: 'error',
        title: 'Test Alert',
        description: 'This is a test alert',
        service: 'test_service',
        metric: 'error_rate',
        threshold: 0.05,
        actualValue: 0.1
      });

      expect(alertId).toBeDefined();
      expect(typeof alertId).toBe('string');

      const alerts = service.getAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].title).toBe('Test Alert');
      expect(alerts[0].severity).toBe('error');
      expect(alerts[0].resolved).toBe(false);
    });

    it('should resolve alerts', () => {
      const alertId = service.createAlert({
        severity: 'warning',
        title: 'Test Alert',
        description: 'Test description',
        service: 'test_service'
      });

      const resolved = service.resolveAlert(alertId);
      expect(resolved).toBe(true);

      const alerts = service.getAlerts();
      expect(alerts[0].resolved).toBe(true);
      expect(alerts[0].resolvedAt).toBeInstanceOf(Date);
    });

    it('should not resolve non-existent alerts', () => {
      const resolved = service.resolveAlert('non_existent_id');
      expect(resolved).toBe(false);
    });

    it('should not resolve already resolved alerts', () => {
      const alertId = service.createAlert({
        severity: 'info',
        title: 'Test Alert',
        description: 'Test description',
        service: 'test_service'
      });

      service.resolveAlert(alertId);
      const resolvedAgain = service.resolveAlert(alertId);
      expect(resolvedAgain).toBe(false);
    });

    it('should filter alerts by resolved status', () => {
      const alertId1 = service.createAlert({
        severity: 'error',
        title: 'Alert 1',
        description: 'Description 1',
        service: 'service1'
      });

      const alertId2 = service.createAlert({
        severity: 'warning',
        title: 'Alert 2',
        description: 'Description 2',
        service: 'service2'
      });

      service.resolveAlert(alertId1);

      const unresolvedAlerts = service.getAlerts(false);
      const resolvedAlerts = service.getAlerts(true);

      expect(unresolvedAlerts).toHaveLength(1);
      expect(unresolvedAlerts[0].title).toBe('Alert 2');
      expect(resolvedAlerts).toHaveLength(1);
      expect(resolvedAlerts[0].title).toBe('Alert 1');
    });
  });

  describe('Intelligence-Specific Tracking', () => {
    it('should track demographic analysis', () => {
      service.trackDemographicAnalysis(40.7128, -74.0060, 1500, true, 'external_api', 0.8);

      const events = service.getEvents({ eventType: 'demographic_analysis' });
      expect(events).toHaveLength(1);
      expect(events[0].metadata?.location).toEqual({ lat: 40.7128, lng: -74.0060 });
      expect(events[0].metadata?.dataSource).toBe('external_api');
      expect(events[0].metadata?.confidence).toBe(0.8);

      const metrics = service.getMetrics('demographic_analysis.confidence');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(0.8);
    });

    it('should track viability assessment', () => {
      service.trackViabilityAssessment(40.7128, -74.0060, 2000, true, 0.75);

      const events = service.getEvents({ eventType: 'viability_assessment' });
      expect(events).toHaveLength(1);
      expect(events[0].metadata?.overallScore).toBe(0.75);

      const metrics = service.getMetrics('viability_assessment.score');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(0.75);
    });

    it('should track competitive analysis', () => {
      service.trackCompetitiveAnalysis(40.7128, -74.0060, 1800, true, 3, 0.6);

      const events = service.getEvents({ eventType: 'competitive_analysis' });
      expect(events).toHaveLength(1);
      expect(events[0].metadata?.competitorCount).toBe(3);
      expect(events[0].metadata?.marketSaturation).toBe(0.6);

      const competitorMetrics = service.getMetrics('competitive_analysis.competitor_count');
      const saturationMetrics = service.getMetrics('competitive_analysis.market_saturation');
      expect(competitorMetrics).toHaveLength(1);
      expect(saturationMetrics).toHaveLength(1);
    });

    it('should track strategic rationale generation', () => {
      service.trackStrategicRationale(40.7128, -74.0060, 3000, true, 500, 'gpt-5-mini');

      const events = service.getEvents({ eventType: 'strategic_rationale' });
      expect(events).toHaveLength(1);
      expect(events[0].metadata?.rationaleLength).toBe(500);
      expect(events[0].metadata?.aiModel).toBe('gpt-5-mini');

      const metrics = service.getMetrics('strategic_rationale.length');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].tags?.ai_model).toBe('gpt-5-mini');
    });

    it('should track pattern detection', () => {
      service.trackPatternDetection(10, 2500, true, 2, 0.8);

      const events = service.getEvents({ eventType: 'pattern_detection' });
      expect(events).toHaveLength(1);
      expect(events[0].metadata?.locationCount).toBe(10);
      expect(events[0].metadata?.patternsDetected).toBe(2);

      const patternMetrics = service.getMetrics('pattern_detection.patterns_found');
      const scoreMetrics = service.getMetrics('pattern_detection.pattern_score');
      expect(patternMetrics).toHaveLength(1);
      expect(scoreMetrics).toHaveLength(1);
    });

    it('should track cache operations', () => {
      service.trackCacheOperation('get', 'demographic', true, 50, 1);
      service.trackCacheOperation('set', 'viability', true, 100, 1);

      const events = service.getEvents({ eventType: 'cache_operation' });
      expect(events).toHaveLength(2);

      const hitMetrics = service.getMetrics('cache.get.hit');
      const durationMetrics = service.getMetrics('cache.set.duration');
      expect(hitMetrics).toHaveLength(1);
      expect(durationMetrics).toHaveLength(1);
    });
  });

  describe('Query Methods', () => {
    beforeEach(() => {
      // Set up test data
      service.trackEvent({
        eventType: 'test_event_1',
        service: 'service_a',
        operation: 'operation_1',
        success: true
      });

      service.trackEvent({
        eventType: 'test_event_2',
        service: 'service_b',
        operation: 'operation_2',
        success: false
      });

      service.recordMetric({
        name: 'test_metric_1',
        value: 10,
        unit: 'count',
        tags: { env: 'test' }
      });

      service.recordMetric({
        name: 'test_metric_2',
        value: 20,
        unit: 'milliseconds'
      });
    });

    it('should filter events by service', () => {
      const serviceAEvents = service.getEvents({ service: 'service_a' });
      const serviceBEvents = service.getEvents({ service: 'service_b' });

      expect(serviceAEvents).toHaveLength(1);
      expect(serviceBEvents).toHaveLength(1);
      expect(serviceAEvents[0].service).toBe('service_a');
      expect(serviceBEvents[0].service).toBe('service_b');
    });

    it('should filter events by success status', () => {
      const successfulEvents = service.getEvents({ success: true });
      const failedEvents = service.getEvents({ success: false });

      expect(successfulEvents).toHaveLength(1);
      expect(failedEvents).toHaveLength(1);
      expect(successfulEvents[0].success).toBe(true);
      expect(failedEvents[0].success).toBe(false);
    });

    it('should filter events by time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const recentEvents = service.getEvents({
        startTime: oneHourAgo,
        endTime: oneHourFromNow
      });

      expect(recentEvents.length).toBeGreaterThan(0);

      const futureEvents = service.getEvents({
        startTime: oneHourFromNow
      });

      expect(futureEvents).toHaveLength(0);
    });

    it('should filter metrics by name', () => {
      const metric1 = service.getMetrics('test_metric_1');
      const metric2 = service.getMetrics('test_metric_2');

      expect(metric1).toHaveLength(1);
      expect(metric2).toHaveLength(1);
      expect(metric1[0].name).toBe('test_metric_1');
      expect(metric2[0].name).toBe('test_metric_2');
    });

    it('should filter metrics by tags', () => {
      const taggedMetrics = service.getMetrics(undefined, undefined, undefined, { env: 'test' });
      
      expect(taggedMetrics).toHaveLength(1);
      expect(taggedMetrics[0].tags?.env).toBe('test');
    });

    it('should limit query results', () => {
      // Add more events
      for (let i = 0; i < 10; i++) {
        service.trackEvent({
          eventType: `event_${i}`,
          service: 'test_service',
          operation: 'test_operation',
          success: true
        });
      }

      const limitedEvents = service.getEvents({}, 5);
      expect(limitedEvents).toHaveLength(5);
    });
  });

  describe('Analytics Methods', () => {
    beforeEach(() => {
      // Set up test data for analytics
      const now = Date.now();
      
      for (let i = 0; i < 10; i++) {
        service.trackEvent({
          eventType: 'test_event',
          service: 'analytics_service',
          operation: 'test_operation',
          duration: 1000 + (i * 100),
          success: i < 8 // 8 successful, 2 failed
        });
      }
    });

    it('should calculate service statistics', () => {
      const stats = service.getServiceStatistics('analytics_service');

      expect(stats.requestCount).toBe(10);
      expect(stats.errorCount).toBe(2);
      expect(stats.errorRate).toBe(0.2);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(stats.throughput).toBeGreaterThan(0);
    });

    it('should calculate metric aggregations', () => {
      // Add some metrics for aggregation
      service.recordMetric({ name: 'test_aggregation', value: 10, unit: 'count' });
      service.recordMetric({ name: 'test_aggregation', value: 20, unit: 'count' });
      service.recordMetric({ name: 'test_aggregation', value: 30, unit: 'count' });

      const sum = service.getMetricAggregation('test_aggregation', 'sum');
      const avg = service.getMetricAggregation('test_aggregation', 'avg');
      const min = service.getMetricAggregation('test_aggregation', 'min');
      const max = service.getMetricAggregation('test_aggregation', 'max');
      const count = service.getMetricAggregation('test_aggregation', 'count');

      expect(sum).toBe(60);
      expect(avg).toBe(20);
      expect(min).toBe(10);
      expect(max).toBe(30);
      expect(count).toBe(3);
    });

    it('should handle empty metric aggregations', () => {
      const result = service.getMetricAggregation('non_existent_metric', 'avg');
      expect(result).toBe(0);
    });
  });

  describe('Alert Conditions', () => {
    it('should create alerts for high error rates', () => {
      // Generate events with high error rate
      for (let i = 0; i < 10; i++) {
        service.trackEvent({
          eventType: 'test_event',
          service: 'error_service',
          operation: 'test_operation',
          success: i < 2 // Only 2 successful out of 10 (80% error rate)
        });
      }

      const alerts = service.getAlerts(false);
      const errorRateAlert = alerts.find(a => a.metric === 'error_rate');
      
      expect(errorRateAlert).toBeDefined();
      expect(errorRateAlert?.severity).toBe('error');
      expect(errorRateAlert?.service).toBe('error_service');
    });

    it('should create alerts for slow response times', () => {
      service.trackEvent({
        eventType: 'slow_event',
        service: 'slow_service',
        operation: 'slow_operation',
        duration: 10000, // 10 seconds (exceeds threshold)
        success: true
      });

      const alerts = service.getAlerts(false);
      const responseTimeAlert = alerts.find(a => a.metric === 'response_time');
      
      expect(responseTimeAlert).toBeDefined();
      expect(responseTimeAlert?.severity).toBe('warning');
      expect(responseTimeAlert?.actualValue).toBe(10000);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status under normal conditions', () => {
      const health = service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.eventCount).toBeGreaterThanOrEqual(0);
      expect(health.metricCount).toBeGreaterThanOrEqual(0);
      expect(health.alertCount).toBeGreaterThanOrEqual(0);
      expect(health.activeAlerts).toBeGreaterThanOrEqual(0);
      expect(health.services).toBeGreaterThanOrEqual(0);
    });

    it('should return degraded status with many alerts', () => {
      // Create multiple alerts
      for (let i = 0; i < 7; i++) {
        service.createAlert({
          severity: 'warning',
          title: `Alert ${i}`,
          description: 'Test alert',
          service: 'test_service'
        });
      }

      const health = service.healthCheck();
      expect(health.status).toBe('degraded');
    });

    it('should return unhealthy status with critical alerts', () => {
      // Create many alerts
      for (let i = 0; i < 12; i++) {
        service.createAlert({
          severity: 'critical',
          title: `Critical Alert ${i}`,
          description: 'Critical test alert',
          service: 'test_service'
        });
      }

      const health = service.healthCheck();
      expect(health.status).toBe('unhealthy');
    });
  });

  describe('Service Health Tracking', () => {
    it('should update service health metrics', () => {
      service.updateServiceHealth('test_service', {
        status: 'healthy',
        uptime: 3600,
        requestCount: 100,
        errorCount: 5,
        errorRate: 0.05,
        averageResponseTime: 500,
        dependencies: [
          { name: 'database', status: 'healthy', responseTime: 50 },
          { name: 'cache', status: 'degraded', responseTime: 200 }
        ]
      });

      const serviceHealth = service.getServiceHealth('test_service');
      expect(serviceHealth).toHaveLength(1);
      expect(serviceHealth[0].status).toBe('healthy');
      expect(serviceHealth[0].uptime).toBe(3600);
      expect(serviceHealth[0].dependencies).toHaveLength(2);
    });

    it('should record health metrics when updating service health', () => {
      service.updateServiceHealth('metrics_service', {
        requestCount: 50,
        errorCount: 2,
        errorRate: 0.04,
        averageResponseTime: 300,
        uptime: 1800
      });

      const requestMetrics = service.getMetrics('metrics_service.request_count');
      const errorMetrics = service.getMetrics('metrics_service.error_count');
      const responseMetrics = service.getMetrics('metrics_service.response_time');

      expect(requestMetrics).toHaveLength(1);
      expect(errorMetrics).toHaveLength(1);
      expect(responseMetrics).toHaveLength(1);
      expect(requestMetrics[0].value).toBe(50);
      expect(errorMetrics[0].value).toBe(2);
      expect(responseMetrics[0].value).toBe(300);
    });
  });

  describe('Maintenance and Cleanup', () => {
    it('should perform maintenance without errors', () => {
      // Add some old data
      for (let i = 0; i < 10; i++) {
        service.trackEvent({
          eventType: 'old_event',
          service: 'old_service',
          operation: 'old_operation',
          success: true
        });
      }

      // Manually trigger maintenance (normally done by timer)
      expect(() => {
        (service as any).performMaintenance();
      }).not.toThrow();
    });
  });
});