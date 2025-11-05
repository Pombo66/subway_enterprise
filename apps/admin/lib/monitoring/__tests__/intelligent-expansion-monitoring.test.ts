/**
 * Unit tests for Intelligent Expansion Monitoring Service
 */

import { IntelligentExpansionMonitoringService } from '../intelligent-expansion-monitoring.service';

describe('IntelligentExpansionMonitoringService', () => {
  let monitoringService: IntelligentExpansionMonitoringService;

  beforeEach(() => {
    monitoringService = IntelligentExpansionMonitoringService.getInstance();
    monitoringService.reset();
  });

  describe('Performance Metrics Recording', () => {
    it('should record and retrieve performance metrics', () => {
      const metrics = {
        totalGenerationTime: 5000,
        candidatesAnalyzed: 100,
        candidatesPerSecond: 20,
        memoryUsageMB: 256,
        aiServicesMetrics: [
          {
            serviceName: 'Context Analysis',
            apiCalls: 5,
            cacheHits: 3,
            cacheMisses: 2,
            totalTokensUsed: 1000,
            averageResponseTime: 1000,
            errorCount: 0,
            successRate: 1.0
          }
        ]
      };

      monitoringService.recordExpansionPerformance(metrics);
      
      const dashboard = monitoringService.generatePerformanceDashboard();
      
      expect(dashboard.totalApiCalls).toBe(5);
      expect(dashboard.totalTokensUsed).toBe(1000);
      expect(dashboard.overallHealth).toBeDefined();
      expect(dashboard.performanceScore).toBeGreaterThan(0);
    });

    it('should calculate average cache hit rate correctly', () => {
      const metrics1 = {
        totalGenerationTime: 3000,
        candidatesAnalyzed: 50,
        candidatesPerSecond: 16.7,
        memoryUsageMB: 200,
        aiServicesMetrics: [
          {
            serviceName: 'Service1',
            apiCalls: 10,
            cacheHits: 8,
            cacheMisses: 2,
            totalTokensUsed: 500,
            averageResponseTime: 500,
            errorCount: 0,
            successRate: 1.0
          }
        ]
      };

      const metrics2 = {
        totalGenerationTime: 4000,
        candidatesAnalyzed: 75,
        candidatesPerSecond: 18.75,
        memoryUsageMB: 300,
        aiServicesMetrics: [
          {
            serviceName: 'Service2',
            apiCalls: 5,
            cacheHits: 3,
            cacheMisses: 2,
            totalTokensUsed: 250,
            averageResponseTime: 800,
            errorCount: 0,
            successRate: 1.0
          }
        ]
      };

      monitoringService.recordExpansionPerformance(metrics1);
      monitoringService.recordExpansionPerformance(metrics2);

      const dashboard = monitoringService.generatePerformanceDashboard();
      
      // Cache hit rate should be (8 + 3) / (10 + 5) * 100 = 73.33%
      expect(dashboard.averageCacheHitRate).toBeCloseTo(73.33, 1);
    });
  });

  describe('AI Service Monitoring', () => {
    it('should generate alerts for poor performance', () => {
      const mockServices = {
        contextService: {
          getCacheStats: () => ({
            apiCalls: 10,
            cacheHits: 1,
            cacheMisses: 9,
            totalTokensUsed: 5000,
            hitRate: 10 // Low hit rate
          })
        },
        diversificationService: {
          getCacheStats: () => ({
            apiCalls: 5,
            cacheHits: 4,
            cacheMisses: 1,
            totalTokensUsed: 1000,
            hitRate: 80 // Good hit rate
          })
        },
        intensityService: {
          getCacheStats: () => ({
            apiCalls: 100, // High API usage
            cacheHits: 50,
            cacheMisses: 50,
            totalTokensUsed: 10000,
            hitRate: 50
          })
        },
        placementService: {
          getCacheStats: () => ({
            apiCalls: 3,
            cacheHits: 2,
            cacheMisses: 1,
            totalTokensUsed: 600,
            hitRate: 66.7
          })
        }
      };

      const alerts = monitoringService.monitorAIServicePerformance(
        mockServices.contextService,
        mockServices.diversificationService,
        mockServices.intensityService,
        mockServices.placementService
      );

      expect(alerts.length).toBeGreaterThan(0);
      
      // Should have alert for low cache hit rate
      const cacheAlert = alerts.find(alert => alert.metric === 'cache_hit_rate');
      expect(cacheAlert).toBeDefined();
      expect(cacheAlert?.service).toBe('Context Analysis');
      
      // Should have alert for high API usage
      const apiAlert = alerts.find(alert => alert.metric === 'api_calls');
      expect(apiAlert).toBeDefined();
      expect(apiAlert?.service).toBe('Expansion Intensity');
    });

    it('should handle missing service gracefully', () => {
      const alerts = monitoringService.monitorAIServicePerformance(
        null,
        undefined,
        { getCacheStats: () => ({ apiCalls: 0, cacheHits: 0, cacheMisses: 0, totalTokensUsed: 0, hitRate: 0 }) },
        { invalidService: true } // Invalid service
      );

      expect(alerts.length).toBeGreaterThan(0);
      
      // Should have alerts for unavailable services
      const unavailableAlerts = alerts.filter(alert => alert.metric === 'service_availability');
      expect(unavailableAlerts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Performance Dashboard', () => {
    it('should generate comprehensive dashboard', () => {
      // Record some performance data
      const metrics = {
        totalGenerationTime: 4000,
        candidatesAnalyzed: 80,
        candidatesPerSecond: 20,
        memoryUsageMB: 400,
        aiServicesMetrics: [
          {
            serviceName: 'Context Analysis',
            apiCalls: 8,
            cacheHits: 6,
            cacheMisses: 2,
            totalTokensUsed: 1600,
            averageResponseTime: 500,
            errorCount: 1,
            successRate: 0.875
          },
          {
            serviceName: 'Placement Intelligence',
            apiCalls: 3,
            cacheHits: 3,
            cacheMisses: 0,
            totalTokensUsed: 600,
            averageResponseTime: 400,
            errorCount: 0,
            successRate: 1.0
          }
        ]
      };

      monitoringService.recordExpansionPerformance(metrics);

      const dashboard = monitoringService.generatePerformanceDashboard();

      expect(dashboard.overallHealth).toMatch(/^(EXCELLENT|GOOD|FAIR|POOR)$/);
      expect(dashboard.totalApiCalls).toBe(11);
      expect(dashboard.totalTokensUsed).toBe(2200);
      expect(dashboard.performanceScore).toBeGreaterThanOrEqual(0);
      expect(dashboard.performanceScore).toBeLessThanOrEqual(1);
      expect(dashboard.serviceReports).toHaveLength(2);
      expect(dashboard.recommendations).toBeInstanceOf(Array);
    });

    it('should handle empty performance history', () => {
      const dashboard = monitoringService.generatePerformanceDashboard();

      expect(dashboard.overallHealth).toBe('FAIR');
      expect(dashboard.totalApiCalls).toBe(0);
      expect(dashboard.totalTokensUsed).toBe(0);
      expect(dashboard.averageCacheHitRate).toBe(0);
      expect(dashboard.performanceScore).toBe(0.5);
      expect(dashboard.serviceReports).toHaveLength(0);
      expect(dashboard.recommendations).toContain('No performance data available - run expansion generation to collect metrics');
    });
  });

  describe('Timing Metrics', () => {
    it('should calculate timing metrics correctly', () => {
      const metrics1 = {
        totalGenerationTime: 5000,
        candidatesAnalyzed: 100,
        candidatesPerSecond: 20,
        memoryUsageMB: 256,
        aiServicesMetrics: [],
        intensityOptimizationTime: 1000,
        qualityValidationTime: 500,
        enhancedRationaleTime: 2000
      };

      const metrics2 = {
        totalGenerationTime: 3000,
        candidatesAnalyzed: 60,
        candidatesPerSecond: 20,
        memoryUsageMB: 200,
        aiServicesMetrics: [],
        intensityOptimizationTime: 800,
        qualityValidationTime: 300,
        enhancedRationaleTime: 1500
      };

      monitoringService.recordExpansionPerformance(metrics1);
      monitoringService.recordExpansionPerformance(metrics2);

      const timingMetrics = monitoringService.getTimingMetrics();

      expect(timingMetrics.averageGenerationTime).toBe(4000);
      expect(timingMetrics.averageIntensityOptimizationTime).toBe(900);
      expect(timingMetrics.averageQualityValidationTime).toBe(400);
      expect(timingMetrics.averageEnhancedRationaleTime).toBe(1750);
    });

    it('should handle missing timing data', () => {
      const metrics = {
        totalGenerationTime: 3000,
        candidatesAnalyzed: 50,
        candidatesPerSecond: 16.7,
        memoryUsageMB: 200,
        aiServicesMetrics: []
        // No optional timing fields
      };

      monitoringService.recordExpansionPerformance(metrics);

      const timingMetrics = monitoringService.getTimingMetrics();

      expect(timingMetrics.averageGenerationTime).toBe(3000);
      expect(timingMetrics.averageIntensityOptimizationTime).toBe(0);
      expect(timingMetrics.averageQualityValidationTime).toBe(0);
      expect(timingMetrics.averageEnhancedRationaleTime).toBe(0);
    });
  });

  describe('Service Reports', () => {
    it('should generate service-specific reports', () => {
      const metrics = {
        totalGenerationTime: 4000,
        candidatesAnalyzed: 80,
        candidatesPerSecond: 20,
        memoryUsageMB: 300,
        aiServicesMetrics: [
          {
            serviceName: 'Context Analysis',
            apiCalls: 10,
            cacheHits: 9,
            cacheMisses: 1,
            totalTokensUsed: 2000,
            averageResponseTime: 400,
            errorCount: 0,
            successRate: 1.0
          },
          {
            serviceName: 'Rationale Diversification',
            apiCalls: 5,
            cacheHits: 2,
            cacheMisses: 3,
            totalTokensUsed: 1000,
            averageResponseTime: 600,
            errorCount: 0,
            successRate: 1.0
          }
        ]
      };

      monitoringService.recordExpansionPerformance(metrics);

      const dashboard = monitoringService.generatePerformanceDashboard();
      const reports = dashboard.serviceReports;

      expect(reports).toHaveLength(2);

      const contextReport = reports.find(r => r.service === 'Context Analysis');
      expect(contextReport).toBeDefined();
      expect(contextReport?.hitRate).toBe(90);
      expect(contextReport?.totalRequests).toBe(10);
      expect(contextReport?.recommendation).toContain('Excellent cache performance');

      const rationaleReport = reports.find(r => r.service === 'Rationale Diversification');
      expect(rationaleReport).toBeDefined();
      expect(rationaleReport?.hitRate).toBe(40);
      expect(rationaleReport?.recommendation).toContain('Consider increasing cache TTL');
    });
  });
});