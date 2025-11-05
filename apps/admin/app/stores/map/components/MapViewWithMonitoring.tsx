/**
 * Example integration of MapView with enhanced monitoring and debugging capabilities
 * This demonstrates how to integrate all the monitoring features
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMapPerformanceMonitoring } from '../../../../lib/monitoring/useMapPerformanceMonitoring';
import { useMapErrorTracking, MapErrorContext } from '../../../../lib/monitoring/useMapErrorTracking';
import { MapPerformanceDashboard } from './MapPerformanceDashboard';
import { MapErrorBoundary } from './MapErrorBoundary';
import MapView from './MapView';
import { MapViewProps } from '../types';

interface MapViewWithMonitoringProps extends MapViewProps {
  enablePerformanceDashboard?: boolean;
  enableDetailedMonitoring?: boolean;
  onPerformanceAlert?: (alert: any) => void;
  onError?: (error: any) => void;
}

export default function MapViewWithMonitoring({
  stores,
  onStoreSelect,
  viewport,
  onViewportChange,
  loading = false,
  enablePerformanceDashboard = process.env.NODE_ENV === 'development',
  enableDetailedMonitoring = false,
  onPerformanceAlert,
  onError,
  ...props
}: MapViewWithMonitoringProps) {
  const [showDashboard, setShowDashboard] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Performance monitoring
  const performanceMonitoring = useMapPerformanceMonitoring({
    metricsCollectionInterval: enableDetailedMonitoring ? 2000 : 5000,
    memoryCheckInterval: enableDetailedMonitoring ? 5000 : 10000,
    enableAlerts: true,
    onAlert: onPerformanceAlert,
    trackOperations: true,
    trackMemory: true,
    trackAPI: true,
    componentName: 'MapViewWithMonitoring',
  });

  // Error tracking
  const errorTracking = useMapErrorTracking({
    component: 'MapViewWithMonitoring',
    enableAutoTracking: true,
    trackUserInteractions: true,
    onError: (errorContext: MapErrorContext) => {
      console.warn('Map error tracked:', errorContext);
      if (onError) {
        onError(errorContext);
      }
    },
  });

  // Update contexts when data changes
  useEffect(() => {
    if (stores && stores.length > 0) {
      const visibleStores = stores.length; // Simplified - in real implementation, calculate visible stores
      const clusteredStores = Math.floor(visibleStores * 0.3); // Simplified clustering estimate

      errorTracking.setStoreContext({
        totalStores: stores.length,
        visibleStores,
        clusteredStores,
        selectedStore: undefined, // Would be set when a store is selected
      });

      // Record marker metrics for performance monitoring
      performanceMonitoring.recordMarkerMetrics({
        totalMarkers: stores.length,
        visibleMarkers: visibleStores,
        clusteredMarkers: clusteredStores,
        renderTime: 0, // Would be measured during actual rendering
      });
    }
  }, [stores, errorTracking, performanceMonitoring]);

  // Update map state context
  useEffect(() => {
    errorTracking.setMapState({
      isReady: mapReady,
      center: { lat: viewport.latitude, lng: viewport.longitude },
      zoom: viewport.zoom,
    });
  }, [mapReady, viewport, errorTracking]);

  // Track viewport changes for performance monitoring
  const handleViewportChange = useCallback((newViewport: typeof viewport) => {
    // Track user interaction
    errorTracking.trackUserInteraction('viewport_change');

    // Record viewport metrics
    const boundsArea = Math.abs(
      (newViewport.latitude + 1) * (newViewport.longitude + 1) * newViewport.zoom
    ); // Simplified area calculation

    performanceMonitoring.recordViewportChange({
      zoomLevel: newViewport.zoom,
      boundsArea,
      changeCount: 1, // Would increment in real implementation
    });

    // Measure viewport change performance
    performanceMonitoring.measureOperation(
      'viewport_change',
      () => {
        onViewportChange(newViewport);
      },
      {
        zoomLevel: newViewport.zoom,
        source: 'user',
      }
    );
  }, [onViewportChange, errorTracking, performanceMonitoring]);

  // Track store selection
  const handleStoreSelect = useCallback((store: any) => {
    // Track user interaction
    errorTracking.trackUserInteraction('store_select');

    // Update store context
    errorTracking.setStoreContext({
      totalStores: stores?.length || 0,
      visibleStores: stores?.length || 0,
      clusteredStores: 0,
      selectedStore: store?.id,
    });

    // Measure store selection performance
    performanceMonitoring.measureOperation(
      'store_select',
      () => {
        onStoreSelect(store);
      },
      {
        storeId: store?.id,
        storeName: store?.name,
      }
    );
  }, [onStoreSelect, stores, errorTracking, performanceMonitoring]);

  // Memory cleanup callback for error boundary
  const handleMemoryCleanup = useCallback(() => {
    try {
      // Record memory usage before cleanup
      performanceMonitoring.recordMemoryUsage();

      // Trigger cleanup events
      window.dispatchEvent(new CustomEvent('map-cleanup-request'));

      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc();
      }

      console.log('Memory cleanup triggered');
    } catch (error) {
      console.warn('Error during memory cleanup:', error);
      errorTracking.trackError(error as Error, 'memory_cleanup');
    }
  }, [performanceMonitoring, errorTracking]);

  // Handle error boundary errors
  const handleErrorBoundaryError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    // Track the error
    errorTracking.trackError(error, 'error_boundary', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });

    // Update performance context with current metrics
    if (performanceMonitoring.currentMetrics) {
      errorTracking.setPerformanceContext({
        memoryUsage: performanceMonitoring.currentMetrics.memoryUsage.percentage,
        fps: performanceMonitoring.currentMetrics.fps,
        renderTime: performanceMonitoring.currentMetrics.totalRenderTime,
        apiResponseTime: performanceMonitoring.currentMetrics.apiResponseTime,
      });
    }
  }, [errorTracking, performanceMonitoring]);

  // Handle recovery
  const handleRecovery = useCallback(() => {
    console.log('Map recovery initiated');
    
    // Track recovery attempt
    errorTracking.trackUserInteraction('recovery_attempt');
    
    // Reset map ready state
    setMapReady(false);
    
    // Clear performance alerts
    performanceMonitoring.clearAlerts();
    
    // Trigger memory cleanup
    handleMemoryCleanup();
  }, [errorTracking, performanceMonitoring, handleMemoryCleanup]);

  return (
    <div className="relative">
      {/* Performance Dashboard (Development only) */}
      {enablePerformanceDashboard && (
        <MapPerformanceDashboard
          isVisible={showDashboard}
          onToggle={() => setShowDashboard(!showDashboard)}
          position="top-right"
        />
      )}

      {/* Error Boundary with enhanced monitoring */}
      <MapErrorBoundary
        onError={handleErrorBoundaryError}
        onRecovery={handleRecovery}
        memoryCleanupCallback={handleMemoryCleanup}
        circuitBreakerThreshold={5}
        stores={stores}
        loading={loading}
        onStoreSelect={handleStoreSelect}
        enableFallbackView={true}
      >
        <MapView
          stores={stores}
          onStoreSelect={handleStoreSelect}
          viewport={viewport}
          onViewportChange={handleViewportChange}
          loading={loading}
          {...props}
        />
      </MapErrorBoundary>

      {/* Performance Indicators (Development only) */}
      {enablePerformanceDashboard && performanceMonitoring.currentMetrics && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs font-mono">
          <div>FPS: {performanceMonitoring.currentMetrics.fps.toFixed(0)}</div>
          <div>Memory: {performanceMonitoring.currentMetrics.memoryUsage.percentage.toFixed(1)}%</div>
          <div>Markers: {performanceMonitoring.currentMetrics.visibleMarkers}/{performanceMonitoring.currentMetrics.totalMarkers}</div>
          {performanceMonitoring.isHighMemoryUsage && (
            <div className="text-orange-400">⚠️ High Memory</div>
          )}
          {performanceMonitoring.isSlowPerformance && (
            <div className="text-red-400">🐌 Slow Performance</div>
          )}
          {performanceMonitoring.hasRecentErrors && (
            <div className="text-red-400 animate-pulse">❌ Recent Errors</div>
          )}
        </div>
      )}
    </div>
  );
}

// Export monitoring hooks for external use
export {
  useMapPerformanceMonitoring,
  useMapErrorTracking,
};