/**
 * Enhanced monitoring and debugging capabilities for MapView
 * Exports all monitoring utilities and components
 */

// Performance monitoring
export { 
  MapPerformanceMonitor,
  mapPerformanceMonitor,
  type MapPerformanceMetrics,
  type MapPerformanceAlert,
  type MapPerformanceThresholds,
} from './MapPerformanceMonitor';

export {
  useMapPerformanceMonitoring,
  useBasicMapPerformanceMonitoring,
  useDetailedMapPerformanceMonitoring,
  type UseMapPerformanceMonitoringOptions,
  type MapPerformanceHook,
} from './useMapPerformanceMonitoring';

// Error tracking
export {
  MapErrorTracker,
  mapErrorTracker,
  type MapErrorContext,
  type ErrorRecoveryStrategy,
  type ErrorMetrics,
} from './MapErrorTracker';

export {
  useMapErrorTracking,
  useBasicMapErrorTracking,
  useDetailedMapErrorTracking,
  type UseMapErrorTrackingOptions,
  type MapErrorTrackingHook,
} from './useMapErrorTracking';

// Base performance monitoring (existing)
export {
  performanceMonitor,
  measurePerformance,
  type PerformanceMetric,
  type TimingMetric,
} from './performance';

// Re-export MapView components with monitoring
export { default as MapViewWithMonitoring } from '../../app/stores/map/components/MapViewWithMonitoring';
export { MapPerformanceDashboard } from '../../app/stores/map/components/MapPerformanceDashboard';