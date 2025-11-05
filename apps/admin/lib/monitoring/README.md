# MapView Enhanced Monitoring and Debugging

This directory contains comprehensive monitoring and debugging capabilities for the MapView component, implementing task 4 from the map crash fix specification.

## Overview

The enhanced monitoring system provides:

1. **Detailed Performance Monitoring** - Real-time metrics collection for rendering, memory, and API performance
2. **Comprehensive Error Tracking** - Context-rich error logging with automatic recovery strategies
3. **Memory Usage Alerts** - Automatic detection and alerting for memory issues
4. **Development Debugging Tools** - Interactive dashboard for performance analysis

## Components

### Performance Monitoring

#### `MapPerformanceMonitor.ts`
Core performance monitoring class that tracks:
- Rendering metrics (marker rendering, clustering, viewport culling)
- Memory usage with automatic cleanup triggers
- API response times and success rates
- Frame rate and performance indicators
- Long task detection and layout shift monitoring

```typescript
import { mapPerformanceMonitor } from './MapPerformanceMonitor';

// Start timing an operation
mapPerformanceMonitor.startTimer('marker-rendering');

// End timing and get duration
const duration = mapPerformanceMonitor.endTimer('marker-rendering');

// Record memory usage
const memoryUsage = mapPerformanceMonitor.recordMemoryUsage();

// Get comprehensive metrics
const metrics = mapPerformanceMonitor.collectMetrics();
```

#### `useMapPerformanceMonitoring.ts`
React hook for easy integration with components:

```typescript
import { useMapPerformanceMonitoring } from './useMapPerformanceMonitoring';

function MapComponent() {
  const {
    currentMetrics,
    alerts,
    startOperation,
    endOperation,
    measureOperation,
    recordMarkerMetrics,
    isHighMemoryUsage,
    isSlowPerformance,
  } = useMapPerformanceMonitoring({
    metricsCollectionInterval: 5000,
    enableAlerts: true,
    trackOperations: true,
  });

  // Measure an operation
  const result = measureOperation('viewport-change', () => {
    // Your operation here
    return updateViewport();
  });

  return (
    <div>
      {isHighMemoryUsage && <div>⚠️ High memory usage detected</div>}
      {/* Your component JSX */}
    </div>
  );
}
```

### Error Tracking

#### `MapErrorTracker.ts`
Comprehensive error tracking with context collection:
- Browser context (user agent, viewport, online status)
- Component state (map state, store context, performance metrics)
- Recovery strategies with automatic execution
- Error pattern detection and analysis

```typescript
import { mapErrorTracker } from './MapErrorTracker';

// Track an error with context
const errorContext = mapErrorTracker.trackError(
  error,
  'MapView',
  'marker-rendering',
  {
    mapState: { isReady: true, center: { lat: 40.7, lng: -74.0 }, zoom: 10 },
    storeContext: { totalStores: 100, visibleStores: 50 },
  }
);

// Set context for future errors
mapErrorTracker.setMapState({ isReady: true, center: { lat: 40.7, lng: -74.0 }, zoom: 10 });
mapErrorTracker.setPerformanceContext({ memoryUsage: 75, fps: 30 });

// Get error metrics and patterns
const metrics = mapErrorTracker.getErrorMetrics();
const patterns = mapErrorTracker.detectErrorPatterns();
```

#### `useMapErrorTracking.ts`
React hook for error tracking integration:

```typescript
import { useMapErrorTracking } from './useMapErrorTracking';

function MapComponent() {
  const {
    trackError,
    setMapState,
    setStoreContext,
    hasRecentErrors,
    getErrorMetrics,
  } = useMapErrorTracking({
    component: 'MapView',
    enableAutoTracking: true,
    onError: (errorContext) => {
      console.log('Error tracked:', errorContext);
    },
  });

  // Track an error
  const handleError = (error: Error) => {
    trackError(error, 'user-interaction');
  };

  return (
    <div>
      {hasRecentErrors && <div>❌ Recent errors detected</div>}
      {/* Your component JSX */}
    </div>
  );
}
```

### Development Tools

#### `MapPerformanceDashboard.tsx`
Interactive performance dashboard for development:
- Real-time metrics display
- Memory usage visualization
- Performance alerts
- Error history
- Metrics export functionality

```typescript
import { MapPerformanceDashboard } from './MapPerformanceDashboard';

function MapPage() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div>
      <MapPerformanceDashboard
        isVisible={showDashboard}
        onToggle={() => setShowDashboard(!showDashboard)}
        position="top-right"
      />
      {/* Your map component */}
    </div>
  );
}
```

#### `MapViewWithMonitoring.tsx`
Complete integration example showing how to use all monitoring features:

```typescript
import MapViewWithMonitoring from './MapViewWithMonitoring';

function StoresPage() {
  return (
    <MapViewWithMonitoring
      stores={stores}
      onStoreSelect={handleStoreSelect}
      viewport={viewport}
      onViewportChange={handleViewportChange}
      enablePerformanceDashboard={true}
      enableDetailedMonitoring={true}
      onPerformanceAlert={(alert) => console.log('Performance alert:', alert)}
      onError={(error) => console.log('Error:', error)}
    />
  );
}
```

## Enhanced Error Boundary

The `MapErrorBoundary` component has been enhanced with:
- Integration with the error tracking system
- Comprehensive context collection
- Memory cleanup callbacks
- Circuit breaker pattern
- Progressive recovery strategies

```typescript
<MapErrorBoundary
  onError={(error, errorInfo) => console.log('Boundary error:', error)}
  onRecovery={() => console.log('Recovery attempted')}
  memoryCleanupCallback={() => triggerCleanup()}
  circuitBreakerThreshold={5}
  enableFallbackView={true}
>
  <MapView {...props} />
</MapErrorBoundary>
```

## Performance Thresholds

Default performance thresholds that trigger alerts:

```typescript
const thresholds = {
  memory: {
    warning: 75,    // 75% memory usage
    critical: 85,   // 85% memory usage
  },
  rendering: {
    maxRenderTime: 100,  // 100ms max render time
    maxMarkers: 500,     // 500 max visible markers
    targetFPS: 30,       // 30 FPS target
  },
  api: {
    maxResponseTime: 2000,  // 2 second max response time
    minSuccessRate: 95,     // 95% min success rate
  },
};
```

## Error Recovery Strategies

Built-in recovery strategies:

1. **Memory Cleanup** - Triggers garbage collection and cache clearing
2. **Map Reinitialization** - Reinitializes the map component
3. **API Retry** - Retries failed API calls with exponential backoff

Custom recovery strategies can be added:

```typescript
mapErrorTracker.addRecoveryStrategy({
  name: 'custom-recovery',
  priority: 90,
  condition: (error, context) => error.message.includes('custom'),
  execute: async (error, context) => {
    // Your recovery logic
    return true; // Return true if recovery was successful
  },
});
```

## Usage in Production

For production environments:
- Performance dashboard is automatically disabled
- Error tracking continues with reduced verbosity
- Metrics are collected for analysis
- Alerts can be sent to external monitoring services

```typescript
// Production configuration
const monitoring = useMapPerformanceMonitoring({
  metricsCollectionInterval: 30000, // 30 seconds
  enableAlerts: true,
  onAlert: (alert) => {
    // Send to external monitoring service
    sendToMonitoringService(alert);
  },
});
```

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Performance Dashboard | Enabled | Disabled |
| Metrics Collection Interval | 2-5 seconds | 30+ seconds |
| Error Logging | Verbose | Minimal |
| Memory Monitoring | Detailed | Basic |
| Alert Frequency | High | Reduced |

## Integration Checklist

To integrate monitoring into your MapView:

1. ✅ Import monitoring hooks
2. ✅ Wrap MapView with MapErrorBoundary
3. ✅ Add performance monitoring hooks
4. ✅ Set up error tracking
5. ✅ Configure alert handlers
6. ✅ Add development dashboard
7. ✅ Test error scenarios
8. ✅ Verify memory cleanup

## Troubleshooting

Common issues and solutions:

### High Memory Usage
- Check marker pool size and cache limits
- Verify cleanup functions are called
- Monitor for memory leaks in event listeners

### Slow Performance
- Review marker rendering optimization
- Check viewport culling configuration
- Analyze clustering performance

### Error Recovery Failures
- Verify recovery strategies are properly configured
- Check error context collection
- Review circuit breaker thresholds

## API Reference

See individual component files for detailed API documentation:
- [MapPerformanceMonitor API](./MapPerformanceMonitor.ts)
- [MapErrorTracker API](./MapErrorTracker.ts)
- [Performance Monitoring Hook API](./useMapPerformanceMonitoring.ts)
- [Error Tracking Hook API](./useMapErrorTracking.ts)