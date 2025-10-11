# Living Map Feature Documentation

## Overview

The Living Map is an interactive map visualization feature that provides administrators with a real-time view of all store locations. It integrates seamlessly into the existing Stores section as a new tab, offering powerful filtering capabilities, activity indicators, and detailed store information through an intuitive drawer interface.

## Key Features

### 🗺️ Interactive Map Visualization
- **Vector Map**: High-quality vector tiles powered by MapLibre GL
- **Store Markers**: Visual indicators for each store location
- **Clustering**: Automatic marker clustering at low zoom levels for better performance
- **Navigation Controls**: Zoom, pan, and navigation controls for easy map interaction

### 📍 Real-time Activity Indicators
- **Activity Pulse**: Animated pulse rings around stores with recent activity (orders in last 60 minutes)
- **Fallback System**: Mock activity indicators when real-time data is unavailable
- **Debug Mode**: `NEXT_PUBLIC_DEBUG=true` enables mock activity with debug flags

### 🔍 Advanced Filtering
- **Franchisee Filter**: Filter stores by franchisee
- **Region Filter**: Filter by geographic region (EMEA, AMER, APAC)
- **Country Filter**: Filter by specific country
- **URL Persistence**: Filter state is maintained in URL for bookmarking and sharing

### 📊 Store Details Drawer
- **Store Information**: Name, region, country, and franchisee details
- **Key Performance Indicators (KPIs)**:
  - Orders today
  - Revenue today
  - Last order timestamp
- **Quick Navigation**: Direct link to detailed store view

### 📈 Telemetry & Analytics
- **Usage Tracking**: Comprehensive event tracking for user interactions
- **Performance Monitoring**: Map load times and interaction metrics
- **Error Tracking**: Automatic error reporting and recovery

## Getting Started

### Accessing the Living Map

1. **From Stores Section**: Navigate to `/stores` and click the "Map" tab
2. **Direct Access**: Go directly to `/stores/map`
3. **URL Parameter**: Use `/stores?view=map` (automatically redirects to `/stores/map`)

### Basic Usage

1. **View All Stores**: The map loads with all stores visible by default
2. **Apply Filters**: Use the filter controls above the map to narrow down stores
3. **Zoom and Pan**: Use mouse/touch gestures or navigation controls to explore
4. **Click Markers**: Click on store markers to open the details drawer
5. **Expand Clusters**: Click on cluster markers to zoom in and see individual stores

## Technical Architecture

### Frontend Components

```
/stores/map/
├── page.tsx                 # Main map page container
├── components/
│   ├── MapView.tsx         # Core map rendering with MapLibre
│   ├── MapFilters.tsx      # Filter controls
│   ├── StoreDrawer.tsx     # Store details drawer
│   ├── LoadingSkeletons.tsx # Loading states
│   └── MapErrorBoundary.tsx # Error handling
├── hooks/
│   ├── useMapState.ts      # Map state & URL synchronization
│   ├── useStores.ts        # Store data fetching
│   └── useStoreKPIs.ts     # KPI data fetching
├── types.ts                # TypeScript interfaces
└── telemetry.ts           # Event tracking
```

### Data Flow

1. **Initial Load**: URL parameters parsed into map state
2. **Store Fetching**: API calls to `/stores` endpoint with filters
3. **Activity Computation**: Attempts `/orders/recent`, falls back to mock data
4. **Map Rendering**: MapLibre renders stores with clustering
5. **User Interactions**: Updates state and triggers telemetry events
6. **URL Sync**: State changes reflected in URL for persistence

### API Integration

- **Store Data**: `GET /stores` with filter parameters
- **Activity Data**: `GET /orders/recent` (with fallback to mock data)
- **KPI Data**: `GET /kpis/{storeId}` for drawer information
- **No Database Changes**: Uses existing API endpoints only

## Configuration

### Environment Variables

```bash
# Enable debug mode for mock activity data
NEXT_PUBLIC_DEBUG=true

# MapLibre configuration (uses default public tiles)
# No additional API keys required
```

### Feature Flags

The Living Map respects the following system preferences:

- **Reduced Motion**: Disables animations when `prefers-reduced-motion: reduce` is set
- **High Contrast**: Compatible with high contrast mode
- **Screen Readers**: Full ARIA support for accessibility

## Known Fallbacks & Debugging

### Activity Data Fallbacks

1. **Primary**: Fetch recent orders from `/orders/recent` endpoint
2. **Fallback**: Generate mock activity for ~10% of visible stores
3. **Debug Mode**: When `NEXT_PUBLIC_DEBUG=true`, all mock data includes `__mockActivity: true` flag

### Error Handling

- **Map Load Failures**: Shows error message with retry option
- **API Failures**: Graceful degradation with cached data when available
- **Component Errors**: Error boundaries prevent page crashes

### Performance Optimizations

- **Lazy Loading**: MapLibre CSS loaded only on map pages
- **Clustering**: Reduces marker count at low zoom levels
- **Debounced Updates**: Filter changes debounced to prevent excessive API calls
- **Polling**: 15-second intervals for fresh data with exponential backoff on errors

## Troubleshooting Guide

### Common Issues

#### Map Not Loading

**Symptoms**: Blank map area or loading spinner that doesn't disappear

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify network connectivity
3. Try refreshing the page
4. Check if MapLibre CSS is loading properly

**Debug Steps**:
```javascript
// Check if MapLibre is loaded
console.log(window.maplibregl)

// Check for CSS loading
console.log(document.querySelector('link[href*="maplibre-gl.css"]'))
```

#### No Store Markers Visible

**Symptoms**: Map loads but no markers appear

**Solutions**:
1. Check if store data is loading (look for loading indicators)
2. Try clearing filters
3. Zoom out to see if markers are clustered
4. Check browser network tab for API errors

**Debug Steps**:
```javascript
// Check store data in React DevTools
// Look for useStores hook state

// Check API responses
// Network tab -> XHR/Fetch -> /stores endpoint
```

#### Filters Not Working

**Symptoms**: Filter changes don't update the map

**Solutions**:
1. Wait for debounced update (1-2 seconds)
2. Check if filter options are populated
3. Try refreshing the page
4. Clear browser cache

**Debug Steps**:
```javascript
// Check filter state in URL
console.log(window.location.search)

// Check useMapState hook in React DevTools
```

#### Activity Indicators Missing

**Symptoms**: No pulse animations on store markers

**Solutions**:
1. This is expected behavior when no recent orders exist
2. Enable debug mode: `NEXT_PUBLIC_DEBUG=true`
3. Check if reduced motion is enabled in browser settings

**Debug Steps**:
```javascript
// Check for mock activity in debug mode
// Look for __mockActivity: true in store data

// Check motion preferences
console.log(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
```

#### Drawer Not Opening

**Symptoms**: Clicking markers doesn't open store details

**Solutions**:
1. Ensure you're clicking on individual markers, not clusters
2. Try clicking on different markers
3. Check if drawer is opening but not visible (CSS issue)

**Debug Steps**:
```javascript
// Check selectedStoreId in useMapState hook
// Should change when marker is clicked

// Check drawer visibility in DOM
document.querySelector('[data-testid="store-drawer"]')
```

### Performance Issues

#### Slow Map Rendering

**Symptoms**: Map takes long time to load or is laggy

**Solutions**:
1. Check number of visible stores (clustering should help)
2. Close other browser tabs to free memory
3. Try zooming in to reduce marker count
4. Check browser performance in DevTools

#### High Memory Usage

**Symptoms**: Browser becomes slow or crashes

**Solutions**:
1. Refresh the page periodically during long sessions
2. Close the map tab when not in use
3. Check for memory leaks in browser DevTools

### Browser Compatibility

#### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

#### Unsupported Features
- Internet Explorer (not supported)
- Very old mobile browsers
- Browsers with WebGL disabled

## Testing

### Running E2E Tests

```bash
# Run all Playwright tests
pnpm -C apps/admin playwright test

# Run only Living Map tests
pnpm -C apps/admin playwright test stores-living-map

# Run tests in headed mode (see browser)
pnpm -C apps/admin playwright test stores-living-map --headed

# Generate test report
pnpm -C apps/admin playwright show-report
```

### Test Coverage

The E2E test suite covers:

- ✅ Map loading and initial render
- ✅ Cluster rendering and expansion
- ✅ Filter interactions and marker count changes
- ✅ Store marker clicks and drawer content
- ✅ URL state persistence
- ✅ Error handling and recovery
- ✅ Keyboard navigation
- ✅ Activity indicator display

### Manual Testing Checklist

- [ ] Map loads at `/stores/map`
- [ ] Markers are visible and clustered appropriately
- [ ] Filters work and update URL
- [ ] Clicking markers opens drawer with store details
- [ ] KPIs load in drawer (or show loading state)
- [ ] Activity pulse animations work (when data available)
- [ ] Error states show retry options
- [ ] Navigation between tabs works
- [ ] Page refresh maintains filter state
- [ ] Keyboard navigation works
- [ ] Mobile responsive design

## Monitoring & Analytics

### Telemetry Events

The Living Map tracks the following events:

- `map_view_opened`: When user opens the map
- `map_filter_changed`: When filters are modified
- `map_store_opened`: When store markers are clicked
- `map_refresh_tick`: During data polling cycles

### Performance Metrics

Monitor these metrics in production:

- Map load time (target: < 3 seconds)
- API response times (target: < 500ms)
- Error rates (target: < 1%)
- User engagement (clicks, filter usage)

### Error Monitoring

Errors are automatically tracked and reported:

- Component render errors
- API request failures
- Map initialization failures
- Browser compatibility issues

## Future Enhancements

### Planned Features

- **Heatmap View**: Density visualization of store performance
- **Route Planning**: Directions between stores
- **Bulk Operations**: Select multiple stores for batch actions
- **Custom Markers**: Different marker styles based on store type
- **Export Functionality**: Export filtered store lists

### Performance Improvements

- **Viewport Culling**: Only render markers in visible area
- **Marker Recycling**: Reuse marker instances for better memory usage
- **Progressive Loading**: Load markers as user zooms/pans
- **Service Worker**: Cache map tiles for offline usage

## Support

### Getting Help

1. **Documentation**: Check this guide first
2. **Troubleshooting**: Follow the troubleshooting steps above
3. **Browser Console**: Check for error messages
4. **Network Tab**: Verify API requests are successful
5. **React DevTools**: Inspect component state and props

### Reporting Issues

When reporting issues, please include:

- Browser version and operating system
- Steps to reproduce the issue
- Screenshots or screen recordings
- Browser console errors
- Network request details (if API-related)

### Development

For developers working on the Living Map:

- **Code Location**: `apps/admin/app/stores/map/`
- **Tests**: `apps/admin/e2e/stores-living-map.e2e.spec.ts`
- **Documentation**: This file (`apps/admin/docs/living-map.md`)
- **Design Tokens**: Uses existing Subway design system
- **API Integration**: BFF endpoints in `apps/bff/src/routes/`

---

*Last updated: November 2025*
*Version: 1.0.0*