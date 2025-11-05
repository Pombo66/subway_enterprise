/**
 * React hook for MapView error tracking integration
 * Provides easy access to error tracking functionality
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { mapErrorTracker, MapErrorContext, ErrorMetrics } from './MapErrorTracker';

// Re-export types for convenience
export type { MapErrorContext, ErrorMetrics };

export interface UseMapErrorTrackingOptions {
  component: string;
  enableAutoTracking?: boolean;
  onError?: (error: MapErrorContext) => void;
  trackUserInteractions?: boolean;
}

export interface MapErrorTrackingHook {
  // Error tracking methods
  trackError: (error: Error, operation: string, additionalContext?: Partial<MapErrorContext>) => MapErrorContext;
  
  // Context setters
  setMapState: (mapState: MapErrorContext['mapState']) => void;
  setStoreContext: (storeContext: MapErrorContext['storeContext']) => void;
  setPerformanceContext: (performanceContext: MapErrorContext['performanceContext']) => void;
  
  // User interaction tracking
  trackUserInteraction: (type: string) => void;
  
  // Error metrics and analysis
  getErrorMetrics: (timeRange?: { start: number; end: number }) => ErrorMetrics;
  getRecentErrors: (count?: number) => MapErrorContext[];
  
  // Error patterns
  detectErrorPatterns: () => {
    frequentErrors: Array<{ error: string; count: number; component: string }>;
    errorSpikes: Array<{ timestamp: number; count: number }>;
    recoveryFailures: Array<{ strategy: string; failureRate: number }>;
  };
  
  // State
  hasRecentErrors: boolean;
  errorCount: number;
  lastError: MapErrorContext | null;
}

export function useMapErrorTracking(options: UseMapErrorTrackingOptions): MapErrorTrackingHook {
  const {
    component,
    enableAutoTracking = true,
    onError,
    trackUserInteractions = true,
  } = options;

  const [hasRecentErrors, setHasRecentErrors] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState<MapErrorContext | null>(null);

  const errorCallbackRef = useRef<(() => void) | null>(null);
  const recentErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize error tracking
  useEffect(() => {
    if (!enableAutoTracking) return;

    // Set up error callback
    errorCallbackRef.current = mapErrorTracker.onError((error) => {
      // Update state
      setErrorCount(prev => prev + 1);
      setLastError(error);
      setHasRecentErrors(true);

      // Clear recent error flag after 30 seconds
      if (recentErrorTimeoutRef.current) {
        clearTimeout(recentErrorTimeoutRef.current);
      }
      recentErrorTimeoutRef.current = setTimeout(() => {
        setHasRecentErrors(false);
      }, 30000);

      // Call custom error handler
      if (onError) {
        try {
          onError(error);
        } catch (callbackError) {
          console.warn('Error in custom error callback:', callbackError);
        }
      }
    });

    // Set up global error handlers for this component
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && typeof event.reason === 'object' && event.reason.component === component) {
        trackError(
          new Error(event.reason.message || 'Unhandled promise rejection'),
          'unhandled-rejection'
        );
      }
    };

    const handleGlobalError = (event: ErrorEvent) => {
      // Only track errors that seem related to our component
      if (event.filename && (
        event.filename.includes('map') || 
        event.filename.includes(component.toLowerCase())
      )) {
        trackError(
          event.error || new Error(event.message),
          'global-error'
        );
      }
    };

    if (trackUserInteractions) {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', handleGlobalError);
    }

    // Cleanup function
    return () => {
      if (errorCallbackRef.current) {
        errorCallbackRef.current();
        errorCallbackRef.current = null;
      }

      if (recentErrorTimeoutRef.current) {
        clearTimeout(recentErrorTimeoutRef.current);
        recentErrorTimeoutRef.current = null;
      }

      if (trackUserInteractions) {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('error', handleGlobalError);
      }
    };
  }, [component, enableAutoTracking, onError, trackUserInteractions]);

  // Error tracking method
  const trackError = useCallback((
    error: Error,
    operation: string,
    additionalContext?: Partial<MapErrorContext>
  ): MapErrorContext => {
    try {
      return mapErrorTracker.trackError(error, component, operation, additionalContext);
    } catch (trackingError) {
      console.warn('Error tracking failed:', trackingError);
      // Return a minimal error context
      return {
        component,
        operation,
        timestamp: Date.now(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }
  }, [component]);

  // Context setters
  const setMapState = useCallback((mapState: MapErrorContext['mapState']) => {
    try {
      mapErrorTracker.setMapState(mapState);
    } catch (error) {
      console.warn('Error setting map state context:', error);
    }
  }, []);

  const setStoreContext = useCallback((storeContext: MapErrorContext['storeContext']) => {
    try {
      mapErrorTracker.setStoreContext(storeContext);
    } catch (error) {
      console.warn('Error setting store context:', error);
    }
  }, []);

  const setPerformanceContext = useCallback((performanceContext: MapErrorContext['performanceContext']) => {
    try {
      mapErrorTracker.setPerformanceContext(performanceContext);
    } catch (error) {
      console.warn('Error setting performance context:', error);
    }
  }, []);

  // User interaction tracking
  const trackUserInteraction = useCallback((type: string) => {
    if (!trackUserInteractions) return;
    
    try {
      mapErrorTracker.trackUserInteraction(type);
    } catch (error) {
      console.warn('Error tracking user interaction:', error);
    }
  }, [trackUserInteractions]);

  // Error metrics and analysis
  const getErrorMetrics = useCallback((timeRange?: { start: number; end: number }): ErrorMetrics => {
    try {
      return mapErrorTracker.getErrorMetrics(timeRange);
    } catch (error) {
      console.warn('Error getting error metrics:', error);
      return {
        totalErrors: 0,
        errorsByType: {},
        errorsByComponent: {},
        recoverySuccessRate: 0,
        averageRecoveryTime: 0,
        criticalErrors: 0,
        recentErrors: [],
      };
    }
  }, []);

  const getRecentErrors = useCallback((count: number = 10): MapErrorContext[] => {
    try {
      const metrics = mapErrorTracker.getErrorMetrics();
      return metrics.recentErrors.slice(-count);
    } catch (error) {
      console.warn('Error getting recent errors:', error);
      return [];
    }
  }, []);

  const detectErrorPatterns = useCallback(() => {
    try {
      return mapErrorTracker.detectErrorPatterns();
    } catch (error) {
      console.warn('Error detecting error patterns:', error);
      return {
        frequentErrors: [],
        errorSpikes: [],
        recoveryFailures: [],
      };
    }
  }, []);

  return {
    // Error tracking methods
    trackError,
    
    // Context setters
    setMapState,
    setStoreContext,
    setPerformanceContext,
    
    // User interaction tracking
    trackUserInteraction,
    
    // Error metrics and analysis
    getErrorMetrics,
    getRecentErrors,
    detectErrorPatterns,
    
    // State
    hasRecentErrors,
    errorCount,
    lastError,
  };
}

// Convenience hook for basic error tracking
export function useBasicMapErrorTracking(component: string) {
  return useMapErrorTracking({
    component,
    enableAutoTracking: true,
    trackUserInteractions: true,
  });
}

// Hook for development/debugging with enhanced tracking
export function useDetailedMapErrorTracking(component: string, onError?: (error: MapErrorContext) => void) {
  return useMapErrorTracking({
    component,
    enableAutoTracking: true,
    trackUserInteractions: true,
    onError,
  });
}