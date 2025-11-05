/**
 * React hook for MapView performance monitoring
 * Provides easy integration with MapPerformanceMonitor
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { mapPerformanceMonitor, MapPerformanceMetrics, MapPerformanceAlert } from './MapPerformanceMonitor';

export interface UseMapPerformanceMonitoringOptions {
  // Monitoring intervals
  metricsCollectionInterval?: number; // ms
  memoryCheckInterval?: number; // ms
  
  // Alert handling
  enableAlerts?: boolean;
  onAlert?: (alert: MapPerformanceAlert) => void;
  
  // Performance tracking
  trackOperations?: boolean;
  trackMemory?: boolean;
  trackAPI?: boolean;
  
  // Component identification
  componentName?: string;
}

export interface MapPerformanceHook {
  // Current metrics
  currentMetrics: MapPerformanceMetrics | null;
  alerts: MapPerformanceAlert[];
  
  // Performance tracking methods
  startOperation: (operation: string) => void;
  endOperation: (operation: string, tags?: Record<string, any>) => number;
  measureOperation: <T>(operation: string, fn: () => T, tags?: Record<string, any>) => T;
  measureAsyncOperation: <T>(operation: string, fn: () => Promise<T>, tags?: Record<string, any>) => Promise<T>;
  
  // Memory tracking
  recordMemoryUsage: () => void;
  
  // Marker performance
  recordMarkerMetrics: (metrics: {
    totalMarkers: number;
    visibleMarkers: number;
    clusteredMarkers: number;
    renderTime: number;
    poolSize?: number;
    cacheSize?: number;
  }) => void;
  
  // API performance
  recordAPICall: (operation: string, responseTime: number, success: boolean) => void;
  
  // Viewport performance
  recordViewportChange: (metrics: {
    zoomLevel: number;
    boundsArea: number;
    changeCount: number;
  }) => void;
  
  // Utility methods
  clearAlerts: () => void;
  exportMetrics: () => string;
  getMetricsSummary: () => any;
  
  // Performance state
  isHighMemoryUsage: boolean;
  isSlowPerformance: boolean;
  hasRecentErrors: boolean;
}

export function useMapPerformanceMonitoring(
  options: UseMapPerformanceMonitoringOptions = {}
): MapPerformanceHook {
  const {
    metricsCollectionInterval = 5000, // 5 seconds
    memoryCheckInterval = 10000, // 10 seconds
    enableAlerts = true,
    onAlert,
    trackOperations = true,
    trackMemory = true,
    trackAPI = true,
    componentName = 'MapView',
  } = options;

  const [currentMetrics, setCurrentMetrics] = useState<MapPerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<MapPerformanceAlert[]>([]);
  const [isHighMemoryUsage, setIsHighMemoryUsage] = useState(false);
  const [isSlowPerformance, setIsSlowPerformance] = useState(false);
  const [hasRecentErrors, setHasRecentErrors] = useState(false);

  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const memoryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertUnsubscribeRef = useRef<(() => void) | null>(null);
  const operationCounterRef = useRef(0);

  // Initialize monitoring
  useEffect(() => {
    // Set up metrics collection
    if (metricsCollectionInterval > 0) {
      metricsIntervalRef.current = setInterval(() => {
        try {
          const metrics = mapPerformanceMonitor.collectMetrics();
          setCurrentMetrics(metrics);
          
          // Update performance state indicators
          setIsHighMemoryUsage(metrics.memoryUsage.percentage > 75);
          setIsSlowPerformance(
            metrics.fps < 20 || 
            metrics.totalRenderTime > 100 || 
            metrics.apiResponseTime > 2000
          );
        } catch (error) {
          console.warn('Error collecting performance metrics:', error);
        }
      }, metricsCollectionInterval);
    }

    // Set up memory monitoring
    if (trackMemory && memoryCheckInterval > 0) {
      memoryIntervalRef.current = setInterval(() => {
        try {
          mapPerformanceMonitor.recordMemoryUsage();
        } catch (error) {
          console.warn('Error recording memory usage:', error);
        }
      }, memoryCheckInterval);
    }

    // Set up alert handling
    if (enableAlerts) {
      alertUnsubscribeRef.current = mapPerformanceMonitor.onAlert((alert) => {
        setAlerts(prev => [...prev.slice(-99), alert]); // Keep last 100 alerts
        
        // Update error state
        if (alert.type === 'error' || alert.severity === 'critical') {
          setHasRecentErrors(true);
          // Clear error state after 30 seconds
          setTimeout(() => setHasRecentErrors(false), 30000);
        }
        
        // Call custom alert handler
        if (onAlert) {
          try {
            onAlert(alert);
          } catch (error) {
            console.warn('Error in custom alert handler:', error);
          }
        }
      });
    }

    // Cleanup function
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
      
      if (memoryIntervalRef.current) {
        clearInterval(memoryIntervalRef.current);
        memoryIntervalRef.current = null;
      }
      
      if (alertUnsubscribeRef.current) {
        alertUnsubscribeRef.current();
        alertUnsubscribeRef.current = null;
      }
    };
  }, [
    metricsCollectionInterval,
    memoryCheckInterval,
    enableAlerts,
    onAlert,
    trackMemory,
  ]);

  // Performance tracking methods
  const startOperation = useCallback((operation: string) => {
    if (!trackOperations) return;
    
    try {
      mapPerformanceMonitor.startTimer(`${componentName}.${operation}`);
    } catch (error) {
      console.warn(`Error starting operation timer for ${operation}:`, error);
    }
  }, [trackOperations, componentName]);

  const endOperation = useCallback((operation: string, tags?: Record<string, any>) => {
    if (!trackOperations) return 0;
    
    try {
      return mapPerformanceMonitor.endTimer(`${componentName}.${operation}`, {
        component: componentName,
        operationId: ++operationCounterRef.current,
        ...tags,
      });
    } catch (error) {
      console.warn(`Error ending operation timer for ${operation}:`, error);
      return 0;
    }
  }, [trackOperations, componentName]);

  const measureOperation = useCallback(<T>(
    operation: string,
    fn: () => T,
    tags?: Record<string, any>
  ): T => {
    if (!trackOperations) return fn();
    
    startOperation(operation);
    try {
      const result = fn();
      endOperation(operation, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      endOperation(operation, { ...tags, status: 'error', error: (error as Error).message });
      throw error;
    }
  }, [startOperation, endOperation, trackOperations]);

  const measureAsyncOperation = useCallback(async <T>(
    operation: string,
    fn: () => Promise<T>,
    tags?: Record<string, any>
  ): Promise<T> => {
    if (!trackOperations) return fn();
    
    startOperation(operation);
    try {
      const result = await fn();
      endOperation(operation, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      endOperation(operation, { ...tags, status: 'error', error: (error as Error).message });
      throw error;
    }
  }, [startOperation, endOperation, trackOperations]);

  // Memory tracking
  const recordMemoryUsage = useCallback(() => {
    if (!trackMemory) return;
    
    try {
      mapPerformanceMonitor.recordMemoryUsage();
    } catch (error) {
      console.warn('Error recording memory usage:', error);
    }
  }, [trackMemory]);

  // Marker performance tracking
  const recordMarkerMetrics = useCallback((metrics: {
    totalMarkers: number;
    visibleMarkers: number;
    clusteredMarkers: number;
    renderTime: number;
    poolSize?: number;
    cacheSize?: number;
  }) => {
    if (!trackOperations) return;
    
    try {
      mapPerformanceMonitor.recordMarkerMetrics(metrics);
    } catch (error) {
      console.warn('Error recording marker metrics:', error);
    }
  }, [trackOperations]);

  // API performance tracking
  const recordAPICall = useCallback((operation: string, responseTime: number, success: boolean) => {
    if (!trackAPI) return;
    
    try {
      mapPerformanceMonitor.recordAPIMetrics(operation, responseTime, success);
    } catch (error) {
      console.warn('Error recording API metrics:', error);
    }
  }, [trackAPI]);

  // Viewport performance tracking
  const recordViewportChange = useCallback((metrics: {
    zoomLevel: number;
    boundsArea: number;
    changeCount: number;
  }) => {
    if (!trackOperations) return;
    
    try {
      mapPerformanceMonitor.recordViewportMetrics(metrics);
    } catch (error) {
      console.warn('Error recording viewport metrics:', error);
    }
  }, [trackOperations]);

  // Utility methods
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const exportMetrics = useCallback(() => {
    try {
      const summary = mapPerformanceMonitor.getMetricsSummary();
      return JSON.stringify(summary, null, 2);
    } catch (error) {
      console.warn('Error exporting metrics:', error);
      return '{}';
    }
  }, []);

  const getMetricsSummary = useCallback(() => {
    try {
      return mapPerformanceMonitor.getMetricsSummary();
    } catch (error) {
      console.warn('Error getting metrics summary:', error);
      return {};
    }
  }, []);

  return {
    // Current state
    currentMetrics,
    alerts,
    
    // Performance tracking
    startOperation,
    endOperation,
    measureOperation,
    measureAsyncOperation,
    
    // Specific tracking methods
    recordMemoryUsage,
    recordMarkerMetrics,
    recordAPICall,
    recordViewportChange,
    
    // Utility methods
    clearAlerts,
    exportMetrics,
    getMetricsSummary,
    
    // Performance indicators
    isHighMemoryUsage,
    isSlowPerformance,
    hasRecentErrors,
  };
}

// Convenience hook for basic performance monitoring
export function useBasicMapPerformanceMonitoring() {
  return useMapPerformanceMonitoring({
    metricsCollectionInterval: 10000, // 10 seconds
    memoryCheckInterval: 15000, // 15 seconds
    enableAlerts: true,
    trackOperations: true,
    trackMemory: true,
    trackAPI: true,
  });
}

// Hook for development/debugging with more frequent monitoring
export function useDetailedMapPerformanceMonitoring() {
  return useMapPerformanceMonitoring({
    metricsCollectionInterval: 2000, // 2 seconds
    memoryCheckInterval: 5000, // 5 seconds
    enableAlerts: true,
    trackOperations: true,
    trackMemory: true,
    trackAPI: true,
  });
}