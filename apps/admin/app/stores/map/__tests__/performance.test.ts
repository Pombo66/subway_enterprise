/**
 * Unit tests for the map performance monitoring system
 */

import { MapPerformanceMonitor, MapPerformanceHelpers } from '../performance';
import { TelemetryHelpers } from '../../../../lib/telemetry';

// Mock the telemetry helpers
jest.mock('../../../../lib/telemetry', () => ({
  TelemetryHelpers: {
    trackUserAction: jest.fn(),
    trackError: jest.fn(),
  },
}));

// Mock the telemetry module
jest.mock('../telemetry', () => ({
  getCurrentUserId: jest.fn(() => 'test-user-id'),
  getMapTelemetryContext: jest.fn(() => ({
    sessionId: 'test-session',
    component: 'living_map',
    feature: 'stores_map',
    timestamp: '2023-01-01T00:00:00.000Z',
  })),
  safeTrackEvent: jest.fn((fn) => fn()),
}));

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => 1000),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

describe('MapPerformanceMonitor', () => {
  let monitor: MapPerformanceMonitor;
  
  beforeEach(() => {
    jest.clearAllMocks();
    monitor = MapPerformanceMonitor.getInstance();
  });

  afterEach(() => {
    monitor.cleanup();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MapPerformanceMonitor.getInstance();
      const instance2 = MapPerformanceMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('trackPerformanceMetric', () => {
    it('should track performance metrics with telemetry', () => {
      const metric = {
        name: 'test_metric',
        value: 100,
        unit: 'ms' as const,
        context: 'test_context',
        metadata: { test: 'data' },
      };

      monitor.trackPerformanceMetric(metric);

      expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
        'map_performance_metric',
        'performance_monitoring',
        'test-user-id',
        expect.objectContaining({
          metricName: 'test_metric',
          metricValue: 100,
          metricUnit: 'ms',
          metricContext: 'test_context',
          metadata: { test: 'data' },
          eventType: 'performance_metric',
        })
      );
    });
  });

  describe('trackAPICall', () => {
    it('should track successful API calls', () => {
      const apiData = {
        endpoint: '/test-endpoint',
        method: 'GET',
        responseTime: 250,
        success: true,
        statusCode: 200,
      };

      monitor.trackAPICall(apiData);

      expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
        'map_api_performance',
        'api_monitoring',
        'test-user-id',
        expect.objectContaining({
          endpoint: '/test-endpoint',
          method: 'GET',
          responseTime: 250,
          success: true,
          statusCode: 200,
          eventType: 'api_performance',
        })
      );
    });

    it('should track failed API calls with error details', () => {
      const apiData = {
        endpoint: '/test-endpoint',
        method: 'POST',
        responseTime: 5000,
        success: false,
        statusCode: 500,
        errorMessage: 'Internal Server Error',
        retryCount: 2,
      };

      monitor.trackAPICall(apiData);

      expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
        'map_api_performance',
        'api_monitoring',
        'test-user-id',
        expect.objectContaining({
          endpoint: '/test-endpoint',
          method: 'POST',
          responseTime: 5000,
          success: false,
          statusCode: 500,
          errorMessage: 'Internal Server Error',
          retryCount: 2,
          eventType: 'api_performance',
        })
      );
    });
  });

  describe('trackComponentError', () => {
    it('should track component errors with context', () => {
      const error = new Error('Test error');
      const errorData = {
        component: 'MapView',
        error,
        context: 'marker_rendering',
        recoverable: true,
        props: { storeCount: 100 },
      };

      monitor.trackComponentError(errorData);

      expect(TelemetryHelpers.trackError).toHaveBeenCalledWith(
        error,
        'map_component_error_MapView',
        'test-user-id',
        expect.objectContaining({
          component: 'MapView',
          errorMessage: 'Test error',
          context: 'marker_rendering',
          recoverable: true,
          props: { storeCount: 100 },
          eventType: 'component_error',
        })
      );
    });
  });

  describe('trackMapOperation', () => {
    it('should track map operations with performance data', () => {
      const operationData = {
        operation: 'clustering',
        duration: 150,
        markerCount: 500,
        clusterCount: 25,
        zoomLevel: 10,
        viewportBounds: {
          north: 40.7831,
          south: 40.7489,
          east: -73.9441,
          west: -73.9927,
        },
      };

      monitor.trackMapOperation(operationData);

      expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
        'map_operation_performance',
        'map_operations',
        'test-user-id',
        expect.objectContaining({
          operation: 'clustering',
          duration: 150,
          markerCount: 500,
          clusterCount: 25,
          zoomLevel: 10,
          viewportBounds: operationData.viewportBounds,
          eventType: 'map_operation',
        })
      );
    });
  });

  describe('trackMemoryUsage', () => {
    it('should track memory usage when performance.memory is available', () => {
      monitor.trackMemoryUsage('MapView', 'marker_update');

      expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
        'map_memory_usage',
        'memory_monitoring',
        'test-user-id',
        expect.objectContaining({
          usedJSHeapSize: 1000000,
          totalJSHeapSize: 2000000,
          jsHeapSizeLimit: 4000000,
          memoryUsagePercentage: 50,
          component: 'MapView',
          operation: 'marker_update',
          eventType: 'memory_usage',
        })
      );
    });

    it('should not track memory usage when performance.memory is unavailable', () => {
      const originalMemory = (performance as any).memory;
      delete (performance as any).memory;

      monitor.trackMemoryUsage('MapView');

      expect(TelemetryHelpers.trackUserAction).not.toHaveBeenCalled();

      // Restore memory
      (performance as any).memory = originalMemory;
    });
  });

  describe('API timer functionality', () => {
    beforeEach(() => {
      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1250);
    });

    it('should track API call timing', () => {
      const endpoint = '/test-endpoint';
      
      monitor.startAPITimer(endpoint);
      monitor.endAPITimer(endpoint, 'GET', true, 200);

      expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
        'map_api_performance',
        'api_monitoring',
        'test-user-id',
        expect.objectContaining({
          endpoint,
          method: 'GET',
          responseTime: 250,
          success: true,
          statusCode: 200,
        })
      );
    });

    it('should handle missing start timer gracefully', () => {
      monitor.endAPITimer('/unknown-endpoint', 'GET', true, 200);
      
      // Should not throw or track anything
      expect(TelemetryHelpers.trackUserAction).not.toHaveBeenCalled();
    });
  });

  describe('component timer functionality', () => {
    beforeEach(() => {
      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1150);
    });

    it('should track component mount timing', () => {
      const component = 'MapView';
      
      monitor.startComponentTimer(component);
      monitor.endComponentTimer(component);

      expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
        'map_performance_metric',
        'performance_monitoring',
        'test-user-id',
        expect.objectContaining({
          metricName: 'component_mount_time_MapView',
          metricValue: expect.any(Number),
          metricUnit: 'ms',
          metricContext: 'component_lifecycle',
          component: 'living_map',
          feature: 'stores_map',
          sessionId: 'test-session',
          timestamp: '2023-01-01T00:00:00.000Z',
          eventType: 'performance_metric',
        })
      );
    });
  });
});

describe('MapPerformanceHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1200);
  });

  describe('trackTimedOperation', () => {
    it('should track successful async operations', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const metadata = { testData: 'value' };

      const result = await MapPerformanceHelpers.trackTimedOperation(
        'test_operation',
        operation,
        metadata
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
        'map_operation_performance',
        'map_operations',
        'test-user-id',
        expect.objectContaining({
          operation: 'test_operation',
          duration: expect.any(Number),
          component: 'living_map',
          feature: 'stores_map',
          sessionId: 'test-session',
          timestamp: '2023-01-01T00:00:00.000Z',
          eventType: 'map_operation',
        })
      );
    });

    it('should track failed async operations', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        MapPerformanceHelpers.trackTimedOperation('test_operation', operation)
      ).rejects.toThrow('Operation failed');

      expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
        'map_operation_performance',
        'map_operations',
        'test-user-id',
        expect.objectContaining({
          operation: 'test_operation_failed',
          duration: 200,
        })
      );
    });
  });

  describe('trackTimedSync', () => {
    it('should track successful sync operations', () => {
      const operation = jest.fn().mockReturnValue('success');
      const metadata = { testData: 'value' };

      const result = MapPerformanceHelpers.trackTimedSync(
        'test_sync_operation',
        operation,
        metadata
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
        'map_operation_performance',
        'map_operations',
        'test-user-id',
        expect.objectContaining({
          operation: 'test_sync_operation',
          duration: expect.any(Number),
          component: 'living_map',
          feature: 'stores_map',
          sessionId: 'test-session',
          timestamp: '2023-01-01T00:00:00.000Z',
          eventType: 'map_operation',
        })
      );
    });

    it('should track failed sync operations', () => {
      const error = new Error('Sync operation failed');
      const operation = jest.fn().mockImplementation(() => {
        throw error;
      });

      expect(() =>
        MapPerformanceHelpers.trackTimedSync('test_sync_operation', operation)
      ).toThrow('Sync operation failed');

      expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
        'map_operation_performance',
        'map_operations',
        'test-user-id',
        expect.objectContaining({
          operation: 'test_sync_operation_failed',
          duration: 200,
        })
      );
    });
  });

  describe('wrapAPICall', () => {
    it('should track successful API calls', async () => {
      const apiCall = jest.fn().mockResolvedValue('api_result');
      
      const result = await MapPerformanceHelpers.wrapAPICall(
        '/test-endpoint',
        'GET',
        apiCall
      );

      expect(result).toBe('api_result');
      expect(apiCall).toHaveBeenCalled();
    });

    it('should track failed API calls', async () => {
      const error = { response: { status: 404 }, message: 'Not found' };
      const apiCall = jest.fn().mockRejectedValue(error);

      await expect(
        MapPerformanceHelpers.wrapAPICall('/test-endpoint', 'GET', apiCall)
      ).rejects.toEqual(error);

      expect(apiCall).toHaveBeenCalled();
    });
  });

  describe('trackComponentLifecycle', () => {
    it('should provide lifecycle tracking interface', () => {
      const lifecycle = MapPerformanceHelpers.trackComponentLifecycle('TestComponent');
      
      expect(lifecycle).toHaveProperty('end');
      expect(typeof lifecycle.end).toBe('function');
      
      // Test that end function works
      lifecycle.end();
      
      expect(TelemetryHelpers.trackUserAction).toHaveBeenCalled();
    });
  });
});