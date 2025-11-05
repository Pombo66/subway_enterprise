import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceMonitorService } from '../performance/performance-monitor.service';

describe('PerformanceMonitorService', () => {
  let service: PerformanceMonitorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceMonitorService],
    }).compile();

    service = module.get<PerformanceMonitorService>(PerformanceMonitorService);
  });

  describe('Event Tracking', () => {
    it('should start and stop tracking performance events', () => {
      const trackingId = service.startTracking('testOperation', { param: 'value' });

      expect(trackingId).toBeDefined();
      expect(typeof trackingId).toBe('string');

      // Simulate some processing time
      const startTime = Date.now();
      setTimeout(() => {
        service.stopTracking(trackingId, true, undefined, { result: 'success' });
        
        const summary = service.getPerformanceSummary(1);
        expect(summary.totalRequests).toBe(1);
        expect(summary.averageResponseTime).toBeGreaterThan(0);
      }, 100);
    });

    it('should handle failed operations', () => {
      const trackingId = service.startTracking('failedOperation');
      service.stopTracking(trackingId, false, 'Operation failed');

      const summary = service.getPerformanceSummary(1);
      expect(summary.totalRequests).toBe(1);
      expect(summary.errorRate).toBe(1.0);
    });

    it('should handle missing tracking IDs gracefully', () => {
      // Should not throw when stopping non-existent tracking
      expect(() => {
        service.stopTracking('non-existent-id', true);
      }).not.toThrow();
    });
  });

  describe('Direct Event Recording', () => {
    it('should record performance events directly', () => {
      const event = {
        id: 'test-event-1',
        timestamp: Date.now(),
        operation: 'directOperation',
        duration: 500,
        success: true,
        metadata: { type: 'test' }
      };

      service.recordEvent(event);

      const summary = service.getPerformanceSummary(1);
      expect(summary.totalRequests).toBe(1);
      expect(summary.averageResponseTime).toBe(500);
    });

    it('should maintain event history within limits', () => {
      // Record more events than the limit
      for (let i = 0; i < 15000; i++) {
        service.recordEvent({
          id: `event-${i}`,
          timestamp: Date.now(),
          operation: 'bulkOperation',
          duration: 100,
          success: true
        });
      }

      const summary = service.getPerformanceSummary(60);
      // Should maintain only the most recent events (maxEventsToKeep = 10000)
      expect(summary.totalRequests).toBeLessThanOrEqual(10000);
    });
  });

  describe('Alert Generation', () => {
    it('should create performance alerts', () => {
      service.createAlert('high', 'Test alert', 'responseTime', 5000, 3000);

      const alerts = service.getRecentAlerts(10);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('high');
      expect(alerts[0].message).toBe('Test alert');
      expect(alerts[0].metric).toBe('responseTime');
      expect(alerts[0].value).toBe(5000);
      expect(alerts[0].threshold).toBe(3000);
    });

    it('should maintain alert history within limits', () => {
      // Create more alerts than the limit
      for (let i = 0; i < 1200; i++) {
        service.createAlert('low', `Alert ${i}`, 'testMetric', i, 100);
      }

      const alerts = service.getRecentAlerts(2000);
      // Should maintain only the most recent alerts (maxAlertsToKeep = 1000)
      expect(alerts.length).toBeLessThanOrEqual(1000);
    });

    it('should log alerts with appropriate severity levels', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      service.createAlert('low', 'Low severity', 'metric', 10, 5);
      service.createAlert('medium', 'Medium severity', 'metric', 20, 15);
      service.createAlert('high', 'High severity', 'metric', 30, 25);
      service.createAlert('critical', 'Critical severity', 'metric', 40, 35);

      expect(logSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(2); // medium and high
      expect(errorSpy).toHaveBeenCalled();

      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('Performance Summary', () => {
    beforeEach(() => {
      // Clear any existing data
      service['events'] = [];
      service['alerts'] = [];
    });

    it('should generate accurate performance summary', () => {
      const now = Date.now();
      
      // Add some test events
      service.recordEvent({
        id: 'event-1',
        timestamp: now - 1000,
        operation: 'operation1',
        duration: 500,
        success: true
      });

      service.recordEvent({
        id: 'event-2',
        timestamp: now - 500,
        operation: 'operation2',
        duration: 1000,
        success: false,
        error: 'Test error'
      });

      service.recordEvent({
        id: 'event-3',
        timestamp: now,
        operation: 'operation1',
        duration: 300,
        success: true
      });

      const summary = service.getPerformanceSummary(5); // 5 minute window

      expect(summary.totalRequests).toBe(3);
      expect(summary.averageResponseTime).toBe((500 + 1000 + 300) / 3);
      expect(summary.errorRate).toBe(1 / 3);
      expect(summary.topSlowOperations).toHaveLength(2);
      expect(summary.topSlowOperations[0].operation).toBe('operation2'); // Slowest first
    });

    it('should filter events by time window', () => {
      const now = Date.now();
      
      // Add events outside time window
      service.recordEvent({
        id: 'old-event',
        timestamp: now - (2 * 60 * 60 * 1000), // 2 hours ago
        operation: 'oldOperation',
        duration: 100,
        success: true
      });

      // Add events within time window
      service.recordEvent({
        id: 'recent-event',
        timestamp: now - (30 * 60 * 1000), // 30 minutes ago
        operation: 'recentOperation',
        duration: 200,
        success: true
      });

      const summary = service.getPerformanceSummary(60); // 1 hour window

      expect(summary.totalRequests).toBe(1); // Only recent event
      expect(summary.averageResponseTime).toBe(200);
    });

    it('should handle empty data gracefully', () => {
      const summary = service.getPerformanceSummary(60);

      expect(summary.totalRequests).toBe(0);
      expect(summary.averageResponseTime).toBe(0);
      expect(summary.errorRate).toBe(0);
      expect(summary.topSlowOperations).toHaveLength(0);
    });
  });

  describe('Active Request Tracking', () => {
    it('should track active requests', () => {
      const id1 = service.startTracking('operation1');
      const id2 = service.startTracking('operation2');

      const activeRequests = service.getActiveRequests();

      expect(activeRequests).toHaveLength(2);
      expect(activeRequests.find(r => r.id === id1)?.operation).toBe('operation1');
      expect(activeRequests.find(r => r.id === id2)?.operation).toBe('operation2');

      // Stop one request
      service.stopTracking(id1, true);

      const remainingRequests = service.getActiveRequests();
      expect(remainingRequests).toHaveLength(1);
      expect(remainingRequests[0].id).toBe(id2);
    });

    it('should calculate active request durations', (done) => {
      const id = service.startTracking('longOperation');

      setTimeout(() => {
        const activeRequests = service.getActiveRequests();
        expect(activeRequests).toHaveLength(1);
        expect(activeRequests[0].duration).toBeGreaterThan(90);
        done();
      }, 100);
    });
  });

  describe('Threshold Management', () => {
    it('should update performance thresholds', () => {
      const newThresholds = {
        maxResponseTime: 10000,
        maxErrorRate: 0.1,
        minCacheHitRate: 0.8
      };

      service.updateThresholds(newThresholds);

      const currentThresholds = service.getThresholds();
      expect(currentThresholds.maxResponseTime).toBe(10000);
      expect(currentThresholds.maxErrorRate).toBe(0.1);
      expect(currentThresholds.minCacheHitRate).toBe(0.8);
    });

    it('should trigger alerts when thresholds are exceeded', () => {
      service.updateThresholds({
        maxResponseTime: 1000,
        maxErrorRate: 0.1
      });

      // Record a slow event
      service.recordEvent({
        id: 'slow-event',
        timestamp: Date.now(),
        operation: 'slowOperation',
        duration: 2000, // Exceeds threshold
        success: true
      });

      const alerts = service.getRecentAlerts(10);
      const responseTimeAlert = alerts.find(a => a.metric === 'responseTime');
      expect(responseTimeAlert).toBeDefined();
      expect(responseTimeAlert?.severity).toBe('medium');
    });
  });

  describe('Data Cleanup', () => {
    it('should clean up old events and alerts', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const recentTimestamp = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago

      // Add old events and alerts
      service.recordEvent({
        id: 'old-event',
        timestamp: oldTimestamp,
        operation: 'oldOperation',
        duration: 100,
        success: true
      });

      service.createAlert('low', 'Old alert', 'metric', 10, 5);
      service['alerts'][0].timestamp = oldTimestamp;

      // Add recent events and alerts
      service.recordEvent({
        id: 'recent-event',
        timestamp: recentTimestamp,
        operation: 'recentOperation',
        duration: 200,
        success: true
      });

      service.createAlert('low', 'Recent alert', 'metric', 20, 15);

      // Cleanup data older than 24 hours
      service.cleanup(24 * 60); // 24 hours in minutes

      const summary = service.getPerformanceSummary(48 * 60); // 48 hour window
      expect(summary.totalRequests).toBe(1); // Only recent event

      const alerts = service.getRecentAlerts(100);
      expect(alerts).toHaveLength(1); // Only recent alert
      expect(alerts[0].message).toBe('Recent alert');
    });
  });

  describe('Data Export', () => {
    it('should export performance data for analysis', () => {
      const now = Date.now();
      
      service.recordEvent({
        id: 'export-event',
        timestamp: now,
        operation: 'exportOperation',
        duration: 300,
        success: true
      });

      service.createAlert('medium', 'Export alert', 'metric', 30, 20);

      const exportData = service.exportPerformanceData(60);

      expect(exportData.events).toHaveLength(1);
      expect(exportData.alerts).toHaveLength(1);
      expect(exportData.summary).toBeDefined();
      expect(exportData.summary.totalRequests).toBe(1);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status under normal conditions', () => {
      // Add some normal events
      service.recordEvent({
        id: 'normal-event',
        timestamp: Date.now(),
        operation: 'normalOperation',
        duration: 500,
        success: true
      });

      const health = service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.eventsTracked).toBe(1);
      expect(health.details.criticalAlerts).toBe(0);
    });

    it('should return unhealthy status with critical alerts', () => {
      service.createAlert('critical', 'Critical issue', 'metric', 100, 50);

      const health = service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.criticalAlerts).toBe(1);
    });

    it('should return degraded status with high error rate', () => {
      service.updateThresholds({ maxErrorRate: 0.1 });

      // Add events with high error rate
      for (let i = 0; i < 10; i++) {
        service.recordEvent({
          id: `error-event-${i}`,
          timestamp: Date.now(),
          operation: 'errorOperation',
          duration: 100,
          success: i < 8 // 80% error rate
        });
      }

      const health = service.healthCheck();

      expect(health.status).toBe('degraded');
    });

    it('should handle health check errors gracefully', () => {
      // Mock an error in the health check process
      const originalGetPerformanceSummary = service.getPerformanceSummary;
      service.getPerformanceSummary = jest.fn().mockImplementation(() => {
        throw new Error('Health check error');
      });

      const health = service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.error).toBe('Health check error');

      // Restore original method
      service.getPerformanceSummary = originalGetPerformanceSummary;
    });
  });

  describe('Concurrent Request Monitoring', () => {
    it('should monitor concurrent request levels', () => {
      const id1 = service.startTracking('concurrent1');
      const id2 = service.startTracking('concurrent2');
      const id3 = service.startTracking('concurrent3');

      // Should track concurrent requests
      const activeRequests = service.getActiveRequests();
      expect(activeRequests).toHaveLength(3);

      // Stop some requests
      service.stopTracking(id1, true);
      service.stopTracking(id2, true);

      const remainingRequests = service.getActiveRequests();
      expect(remainingRequests).toHaveLength(1);
    });

    it('should create alerts for high concurrent request count', () => {
      service.updateThresholds({ maxConcurrentRequests: 2 });

      // Start more requests than threshold
      const id1 = service.startTracking('concurrent1');
      const id2 = service.startTracking('concurrent2');
      const id3 = service.startTracking('concurrent3'); // Should trigger alert

      const alerts = service.getRecentAlerts(10);
      const concurrentAlert = alerts.find(a => a.metric === 'concurrentRequests');
      expect(concurrentAlert).toBeDefined();
      expect(concurrentAlert?.severity).toBe('high');
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should monitor memory usage and create alerts', () => {
      service.updateThresholds({ maxMemoryUsage: 1024 }); // Very low threshold

      // Record an event to trigger memory check
      service.recordEvent({
        id: 'memory-event',
        timestamp: Date.now(),
        operation: 'memoryOperation',
        duration: 100,
        success: true
      });

      // Memory usage should exceed the low threshold and create an alert
      const alerts = service.getRecentAlerts(10);
      const memoryAlert = alerts.find(a => a.metric === 'memoryUsage');
      expect(memoryAlert).toBeDefined();
    });
  });
});