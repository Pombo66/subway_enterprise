# Living Map Performance Monitoring

This document describes the comprehensive performance monitoring and analytics system implemented for the Living Map feature.

## Overview

The performance monitoring system tracks key metrics across all map operations to ensure optimal user experience and identify potential bottlenecks. All metrics are collected through the existing telemetry infrastructure for consistency.

## Architecture

### Core Components

1. **MapPerformanceMonitor** - Singleton class that manages all performance tracking
2. **MapPerformanceHelpers** - Utility functions for common performance tracking patterns
3. **usePerformanceTracking** - React hook for component-level performance tracking
4. **Integration with existing telemetry** - All metrics flow through TelemetryHelpers

### Performance Observer Integration

The system automatically collects browser performance metrics using the Performance Observer API when available:

- Navigation timing
- Resource loading times
- Custom performance marks and measures
- Memory usage (Chrome only)

## Tracked Metrics

### API Performance

All API calls are wrapped with performance monitoring:

```typescript
// Automatic tracking of response times and success rates
const result = await MapPerformanceHelpers.wrapAPICall(
  '/stores',
  'GET',
  () => bffWithErrorHandling('/stores', StoresResponseSchema)
);
```

**Metrics collected:**
- Response time (ms)
- Success/failure status
- HTTP status codes
- Error messages
- Retry counts

### Map Operations

Key map operations are tracked for performance:

```typescript
// Track clustering performance
performanceTracker.trackOperation('clustering_initialization', () => {
  const cluster = new Supercluster(config);
  cluster.load(points);
}, { storeCount: stores.length });
```

**Operations tracked:**
- Viewport culling
- Clustering initialization
- Marker rendering
- Filter application
- Map viewport changes

### Memory Usage

Memory usage is monitored at key points:

```typescript
// Track memory after expensive operations
performanceTracker.trackMemory('marker_update_complete');
```

**Memory metrics:**
- Used JS heap size
- Total JS heap size
- Memory usage percentage
- Component-specific usage

### Component Errors

All component errors are tracked with context:

```typescript
performanceTracker.trackError(error, 'marker_rendering', true);
```

**Error data:**
- Error message and stack trace
- Component name
- Operation context
- Recovery status
- Component props (sanitized)

## Usage Examples

### Component Performance Tracking

```typescript
export default function MapView(props) {
  const performanceTracker = usePerformanceTracking('MapView');
  
  // Track synchronous operations
  const result = performanceTracker.trackOperation('viewport_culling', () => {
    return ViewportCuller.cullStores(stores, bounds);
  }, { totalStores: stores.length });
  
  // Track async operations
  const data = await performanceTracker.trackAsyncOperation('data_fetch', 
    () => fetchStoreData(),
    { filters: currentFilters }
  );
  
  // Track errors
  try {
    // risky operation
  } catch (error) {
    performanceTracker.trackError(error, 'risky_operation', true);
  }
}
```

### API Call Monitoring

```typescript
// In useStores hook
const fetchStores = useCallback(async (filters) => {
  const result = await MapPerformanceHelpers.wrapAPICall(
    '/stores',
    'GET',
    () => bffWithErrorHandling('/stores', StoresResponseSchema)
  );
  return result;
}, []);
```

### Manual Performance Tracking

```typescript
const monitor = MapPerformanceHelpers.getMonitor();

// Track custom metrics
monitor.trackPerformanceMetric({
  name: 'custom_operation_time',
  value: 150,
  unit: 'ms',
  context: 'user_interaction',
  metadata: { userAction: 'filter_change' }
});

// Track API calls manually
monitor.startAPITimer('/custom-endpoint');
// ... make API call
monitor.endAPITimer('/custom-endpoint', 'POST', true, 200);
```

## Performance Metrics Dashboard

All metrics are sent to the existing telemetry system and can be analyzed through:

### Key Performance Indicators

1. **Map Load Time** - Time from page load to interactive map
2. **API Response Times** - Average response times for all endpoints
3. **Memory Usage** - Peak and average memory consumption
4. **Error Rates** - Component and API error frequencies
5. **User Interaction Performance** - Response times for user actions

### Telemetry Events

The following events are tracked:

- `map_performance_metric` - Generic performance metrics
- `map_api_performance` - API call performance data
- `map_component_error` - Component error tracking
- `map_operation_performance` - Map operation timing
- `map_memory_usage` - Memory usage snapshots

## Performance Optimization

### Automatic Optimizations

1. **Viewport Culling** - Only render markers in visible area
2. **Marker Pooling** - Reuse DOM elements for better performance
3. **Clustering** - Reduce marker count at low zoom levels
4. **Debounced Updates** - Prevent excessive re-renders

### Performance Budgets

The system tracks against these performance budgets:

- **Map Load Time**: < 2 seconds
- **API Response Time**: < 500ms average
- **Memory Usage**: < 100MB for typical usage
- **Marker Rendering**: < 100ms for 500 markers
- **Clustering**: < 50ms for 1000 stores

### Alerts and Monitoring

Performance issues are automatically detected and reported:

```typescript
// Automatic performance budget checking
if (responseTime > PERFORMANCE_BUDGET.API_RESPONSE_TIME) {
  monitor.trackPerformanceMetric({
    name: 'performance_budget_exceeded',
    value: responseTime,
    unit: 'ms',
    context: 'api_performance_budget',
    metadata: { 
      budget: PERFORMANCE_BUDGET.API_RESPONSE_TIME,
      endpoint: '/stores'
    }
  });
}
```

## Browser Compatibility

### Performance Observer Support

- **Chrome 52+**: Full support including memory metrics
- **Firefox 57+**: Basic performance metrics
- **Safari 14+**: Limited support
- **Edge 79+**: Full support

### Graceful Degradation

The system gracefully handles missing APIs:

```typescript
// Safe performance tracking
if (typeof window !== 'undefined' && window.PerformanceObserver) {
  // Use Performance Observer
} else {
  // Fallback to manual timing
}
```

## Testing

### Unit Tests

Performance monitoring is thoroughly tested:

```bash
npm test -- performance.test.ts
```

### Integration Tests

End-to-end performance tracking is tested:

```bash
npm test -- performance-integration.test.tsx
```

### Performance Testing

Load testing with various data sizes:

```bash
npm run test:performance
```

## Configuration

### Environment Variables

```env
# Enable debug logging for performance monitoring
NEXT_PUBLIC_DEBUG_PERFORMANCE=true

# Set performance monitoring sample rate (0.0 to 1.0)
NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE=1.0

# Enable memory monitoring (Chrome only)
NEXT_PUBLIC_ENABLE_MEMORY_MONITORING=true
```

### Performance Budgets

Configure performance budgets in `performance.ts`:

```typescript
const PERFORMANCE_BUDGETS = {
  MAP_LOAD_TIME: 2000, // 2 seconds
  API_RESPONSE_TIME: 500, // 500ms
  MEMORY_USAGE_MB: 100, // 100MB
  MARKER_RENDER_TIME: 100, // 100ms
  CLUSTERING_TIME: 50, // 50ms
};
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check for memory leaks in marker cleanup
   - Verify clustering is working properly
   - Monitor component unmounting

2. **Slow API Responses**
   - Check network conditions
   - Verify API endpoint performance
   - Review retry logic

3. **Performance Observer Errors**
   - Ensure browser compatibility
   - Check for CSP restrictions
   - Verify HTTPS context

### Debug Mode

Enable debug mode for detailed logging:

```typescript
// In browser console
localStorage.setItem('debug-performance', 'true');
```

### Performance Profiling

Use browser dev tools with performance marks:

```typescript
// Custom performance marks are automatically created
performance.mark('map-operation-start');
// ... operation
performance.mark('map-operation-end');
performance.measure('map-operation', 'map-operation-start', 'map-operation-end');
```

## Future Enhancements

### Planned Features

1. **Real-time Performance Dashboard** - Live performance metrics
2. **Performance Regression Detection** - Automatic alerts for performance degradation
3. **User Experience Metrics** - Core Web Vitals integration
4. **Performance Recommendations** - Automated optimization suggestions

### Metrics Expansion

1. **Network Performance** - Connection quality tracking
2. **Device Performance** - CPU and GPU utilization
3. **User Behavior** - Interaction patterns and performance correlation
4. **Geographic Performance** - Performance by user location

## Best Practices

### For Developers

1. **Always wrap API calls** with performance monitoring
2. **Track expensive operations** like clustering and rendering
3. **Monitor memory usage** after bulk operations
4. **Handle errors gracefully** and track recovery
5. **Use performance budgets** to maintain standards

### For Operations

1. **Monitor key metrics** regularly
2. **Set up alerts** for performance degradation
3. **Review error patterns** for optimization opportunities
4. **Track performance trends** over time
5. **Correlate performance** with user satisfaction metrics

## Related Documentation

- [Living Map Feature Overview](./living-map.md)
- [Living Map Performance & Accessibility](./living-map-performance-accessibility.md)
- [Telemetry System Documentation](../lib/telemetry.ts)
- [Error Handling Guidelines](../lib/error-handler.ts)