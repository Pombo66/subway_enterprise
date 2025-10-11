/**
 * Performance monitoring and analytics for the Living Map feature
 * 
 * This module provides comprehensive performance tracking for map operations including:
 * - Map rendering performance metrics
 * - API response time monitoring
 * - Component error tracking
 * - Memory usage monitoring
 * - User interaction performance
 * 
 * All metrics are collected and sent through the existing telemetry infrastructure
 * to ensure consistency with the rest of the application.
 */

import { TelemetryHelpers } from '../../../lib/telemetry';
import { getCurrentUserId, getMapTelemetryContext, safeTrackEvent } from './telemetry';

/**
 * Performance metric types for type safety
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  context?: string;
  metadata?: Record<string, any>;
}

/**
 * API performance tracking data
 */
export interface APIPerformanceData {
  endpoint: string;
  method: string;
  responseTime: number;
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
  retryCount?: number;
}

/**
 * Component error tracking data
 */
export interface ComponentErrorData {
  component: string;
  error: Error;
  context?: string;
  props?: Record<string, any>;
  recoverable: boolean;
}

/**
 * Map operation performance tracking data
 */
export interface MapOperationData {
  operation: string;
  duration: number;
  markerCount?: number;
  clusterCount?: number;
  viewportBounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoomLevel?: number;
}

/**
 * Memory usage tracking data
 */
export interface MemoryUsageData {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  component: string;
  operation?: string;
}

/**
 * Performance monitoring class for the Living Map
 */
export class MapPerformanceMonitor {
  private static instance: MapPerformanceMonitor;
  private performanceObserver?: PerformanceObserver;
  private memoryCheckInterval?: NodeJS.Timeout;
  private apiCallTimes = new Map<string, number>();
  private componentMountTimes = new Map<string, number>();
  
  private constructor() {
    this.initializePerformanceObserver();
    this.startMemoryMonitoring();
  }

  public static getInstance(): MapPerformanceMonitor {
    if (!MapPerformanceMonitor.instance) {
      MapPerformanceMonitor.instance = new MapPerformanceMonitor();
    }
    return MapPerformanceMonitor.instance;
  }

  /**
   * Initialize performance observer for automatic metric collection
   */
  private initializePerformanceObserver(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        try {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'measure' && entry.name.startsWith('map-')) {
              this.trackPerformanceMetric({
                name: entry.name,
                value: entry.duration,
                unit: 'ms',
                context: 'performance_observer',
              });
            }
          });
        } catch (error) {
          console.warn('Error processing performance entries:', error);
        }
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource'] 
      });
    } catch (error) {
      console.warn('Failed to initialize performance observer:', error);
    }
  }

  /**
   * Start memory usage monitoring
   */
  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return;
    }

    // Wait 5 seconds before starting memory monitoring to let the page settle
    setTimeout(() => {
      // Check memory usage every 30 seconds
      this.memoryCheckInterval = setInterval(() => {
        try {
          this.trackMemoryUsage('periodic_check');
        } catch (error) {
          console.warn('Error in periodic memory check:', error);
          // Clear the interval if there are repeated errors
          if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
            this.memoryCheckInterval = undefined;
          }
        }
      }, 30000);
    }, 5000);
  }

  /**
   * Clean up monitoring resources
   */
  public cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
  }

  /**
   * Track a generic performance metric
   */
  public trackPerformanceMetric(metric: PerformanceMetric): void {
    safeTrackEvent(() => {
      TelemetryHelpers.trackUserAction(
        'map_performance_metric',
        'performance_monitoring',
        getCurrentUserId(),
        {
          ...getMapTelemetryContext(),
          metricName: metric.name,
          metricValue: metric.value,
          metricUnit: metric.unit,
          metricContext: metric.context,
          metadata: metric.metadata,
          eventType: 'performance_metric',
        }
      );
    }, `performance_metric_${metric.name}`);
  }

  /**
   * Track API call performance
   */
  public trackAPICall(data: APIPerformanceData): void {
    safeTrackEvent(() => {
      TelemetryHelpers.trackUserAction(
        'map_api_performance',
        'api_monitoring',
        getCurrentUserId(),
        {
          ...getMapTelemetryContext(),
          endpoint: data.endpoint,
          method: data.method,
          responseTime: data.responseTime,
          success: data.success,
          statusCode: data.statusCode,
          errorMessage: data.errorMessage,
          retryCount: data.retryCount || 0,
          eventType: 'api_performance',
        }
      );
    }, `api_call_${data.endpoint}`);

    // Track performance metric for response time
    this.trackPerformanceMetric({
      name: `api_response_time_${data.endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
      value: data.responseTime,
      unit: 'ms',
      context: 'api_call',
      metadata: {
        success: data.success,
        method: data.method,
      },
    });
  }

  /**
   * Track component errors
   */
  public trackComponentError(data: ComponentErrorData): void {
    safeTrackEvent(() => {
      TelemetryHelpers.trackError(
        data.error,
        `map_component_error_${data.component}`,
        getCurrentUserId(),
        {
          ...getMapTelemetryContext(),
          component: data.component,
          errorMessage: data.error.message,
          errorStack: data.error.stack,
          context: data.context,
          recoverable: data.recoverable,
          props: data.props,
          eventType: 'component_error',
        }
      );
    }, `component_error_${data.component}`);
  }

  /**
   * Track map operation performance
   */
  public trackMapOperation(data: MapOperationData): void {
    safeTrackEvent(() => {
      TelemetryHelpers.trackUserAction(
        'map_operation_performance',
        'map_operations',
        getCurrentUserId(),
        {
          ...getMapTelemetryContext(),
          operation: data.operation,
          duration: data.duration,
          markerCount: data.markerCount,
          clusterCount: data.clusterCount,
          viewportBounds: data.viewportBounds,
          zoomLevel: data.zoomLevel,
          eventType: 'map_operation',
        }
      );
    }, `map_operation_${data.operation}`);

    // Track as performance metric
    this.trackPerformanceMetric({
      name: `map_operation_${data.operation}`,
      value: data.duration,
      unit: 'ms',
      context: 'map_operation',
      metadata: {
        markerCount: data.markerCount,
        clusterCount: data.clusterCount,
        zoomLevel: data.zoomLevel,
      },
    });
  }

  /**
   * Track memory usage
   */
  public trackMemoryUsage(component: string, operation?: string): void {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return;
    }

    const memory = (performance as any).memory;
    const data: MemoryUsageData = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      component,
      operation,
    };

    safeTrackEvent(() => {
      TelemetryHelpers.trackUserAction(
        'map_memory_usage',
        'memory_monitoring',
        getCurrentUserId(),
        {
          ...getMapTelemetryContext(),
          usedJSHeapSize: data.usedJSHeapSize,
          totalJSHeapSize: data.totalJSHeapSize,
          jsHeapSizeLimit: data.jsHeapSizeLimit,
          memoryUsagePercentage: (data.usedJSHeapSize / data.totalJSHeapSize) * 100,
          component: data.component,
          operation: data.operation,
          eventType: 'memory_usage',
        }
      );
    }, `memory_usage_${component}`);

    // Track as performance metric
    this.trackPerformanceMetric({
      name: 'memory_usage_percentage',
      value: (data.usedJSHeapSize / data.totalJSHeapSize) * 100,
      unit: 'percentage',
      context: component,
      metadata: {
        operation,
        usedBytes: data.usedJSHeapSize,
        totalBytes: data.totalJSHeapSize,
      },
    });
  }

  /**
   * Start timing an API call
   */
  public startAPITimer(endpoint: string): void {
    this.apiCallTimes.set(endpoint, performance.now());
  }

  /**
   * End timing an API call and track the result
   */
  public endAPITimer(
    endpoint: string, 
    method: string, 
    success: boolean, 
    statusCode?: number, 
    errorMessage?: string,
    retryCount?: number
  ): void {
    const startTime = this.apiCallTimes.get(endpoint);
    if (startTime) {
      const responseTime = performance.now() - startTime;
      this.apiCallTimes.delete(endpoint);
      
      this.trackAPICall({
        endpoint,
        method,
        responseTime,
        success,
        statusCode,
        errorMessage,
        retryCount,
      });
    }
  }

  /**
   * Start timing a component mount
   */
  public startComponentTimer(component: string): void {
    this.componentMountTimes.set(component, performance.now());
  }

  /**
   * End timing a component mount and track the result
   */
  public endComponentTimer(component: string): void {
    const startTime = this.componentMountTimes.get(component);
    if (startTime) {
      const mountTime = performance.now() - startTime;
      this.componentMountTimes.delete(component);
      
      this.trackPerformanceMetric({
        name: `component_mount_time_${component}`,
        value: mountTime,
        unit: 'ms',
        context: 'component_lifecycle',
      });
    }
  }

  /**
   * Track map rendering performance
   */
  public trackMapRender(
    renderTime: number,
    markerCount: number,
    clusterCount: number,
    zoomLevel: number
  ): void {
    this.trackMapOperation({
      operation: 'render',
      duration: renderTime,
      markerCount,
      clusterCount,
      zoomLevel,
    });
  }

  /**
   * Track clustering performance
   */
  public trackClustering(
    clusteringTime: number,
    totalMarkers: number,
    resultingClusters: number,
    zoomLevel: number
  ): void {
    this.trackMapOperation({
      operation: 'clustering',
      duration: clusteringTime,
      markerCount: totalMarkers,
      clusterCount: resultingClusters,
      zoomLevel,
    });
  }

  /**
   * Track filter application performance
   */
  public trackFilterApplication(
    filterTime: number,
    totalStores: number,
    filteredStores: number,
    appliedFilters: Record<string, any>
  ): void {
    this.trackMapOperation({
      operation: 'filter_application',
      duration: filterTime,
      markerCount: filteredStores,
    });

    this.trackPerformanceMetric({
      name: 'filter_efficiency',
      value: (filteredStores / totalStores) * 100,
      unit: 'percentage',
      context: 'filtering',
      metadata: {
        totalStores,
        filteredStores,
        appliedFilters,
      },
    });
  }
}

/**
 * Convenience functions for common performance tracking
 */
export const MapPerformanceHelpers = {
  /**
   * Get the singleton performance monitor instance
   */
  getMonitor: () => MapPerformanceMonitor.getInstance(),

  /**
   * Track a timed operation
   */
  trackTimedOperation: async <T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const monitor = MapPerformanceMonitor.getInstance();
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      monitor.trackMapOperation({
        operation: operationName,
        duration,
        ...metadata,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      monitor.trackMapOperation({
        operation: `${operationName}_failed`,
        duration,
        ...metadata,
      });
      
      throw error;
    }
  },

  /**
   * Track a synchronous timed operation
   */
  trackTimedSync: <T>(
    operationName: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T => {
    const monitor = MapPerformanceMonitor.getInstance();
    const startTime = performance.now();
    
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      
      monitor.trackMapOperation({
        operation: operationName,
        duration,
        ...metadata,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      monitor.trackMapOperation({
        operation: `${operationName}_failed`,
        duration,
        ...metadata,
      });
      
      throw error;
    }
  },

  /**
   * Create a performance-aware API wrapper
   */
  wrapAPICall: <T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const monitor = MapPerformanceMonitor.getInstance();
    monitor.startAPITimer(endpoint);
    
    return apiCall()
      .then((result) => {
        monitor.endAPITimer(endpoint, method, true, 200);
        return result;
      })
      .catch((error) => {
        const statusCode = error?.response?.status || 500;
        const errorMessage = error?.message || 'Unknown error';
        monitor.endAPITimer(endpoint, method, false, statusCode, errorMessage);
        throw error;
      });
  },

  /**
   * Track component lifecycle performance
   */
  trackComponentLifecycle: (component: string) => {
    const monitor = MapPerformanceMonitor.getInstance();
    monitor.startComponentTimer(component);
    
    return {
      end: () => monitor.endComponentTimer(component),
    };
  },

  /**
   * Track memory usage for a component
   */
  trackComponentMemory: (component: string, operation?: string) => {
    const monitor = MapPerformanceMonitor.getInstance();
    monitor.trackMemoryUsage(component, operation);
  },

  /**
   * Clean up performance monitoring
   */
  cleanup: () => {
    const monitor = MapPerformanceMonitor.getInstance();
    monitor.cleanup();
  },
};

/**
 * React hook for component performance tracking
 */
export function usePerformanceTracking(componentName: string) {
  const monitor = MapPerformanceMonitor.getInstance();
  
  return {
    trackOperation: <T>(operationName: string, operation: () => T, metadata?: Record<string, any>): T => {
      return MapPerformanceHelpers.trackTimedSync(
        `${componentName}_${operationName}`,
        operation,
        metadata
      );
    },
    
    trackAsyncOperation: async <T>(
      operationName: string, 
      operation: () => Promise<T>, 
      metadata?: Record<string, any>
    ): Promise<T> => {
      return MapPerformanceHelpers.trackTimedOperation(
        `${componentName}_${operationName}`,
        operation,
        metadata
      );
    },
    
    trackError: (error: Error, context?: string, recoverable: boolean = true) => {
      monitor.trackComponentError({
        component: componentName,
        error,
        context,
        recoverable,
      });
    },
    
    trackMemory: (operation?: string) => {
      monitor.trackMemoryUsage(componentName, operation);
    },
  };
}