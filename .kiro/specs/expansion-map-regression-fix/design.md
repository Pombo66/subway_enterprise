# Design Document

## Overview

This design addresses the critical regression where the ExpansionIntegratedMapPage component renders a placeholder instead of the actual map. The solution integrates expansion mode functionality into the existing working map implementation, ensuring stores load correctly while adding expansion capabilities as an overlay feature.

### Key Design Principles

1. **Reuse Existing Components**: Leverage WorkingMapView/EnhancedMapView instead of creating new map instances
2. **Minimal Changes**: Modify ExpansionIntegratedMapPage to wrap existing components rather than replace them
3. **Preserve Functionality**: Maintain all existing map features (filters, clustering, store selection)
4. **Clean Integration**: Add expansion mode as a non-intrusive overlay on the working map

## Architecture

### Component Hierarchy

```
ExpansionIntegratedMapPage (Modified)
├── Map Header Section
│   ├── Title & Description
│   └── Expansion Mode Toggle Button
├── TabNavigation
├── MapFilters (existing)
├── Map Panel
│   ├── WorkingMapView (existing - renders stores)
│   ├── ExpansionControls (conditional - sidebar)
│   ├── SuggestionMarkers (conditional - overlaid on map)
│   └── MapLegend (conditional)
├── StorePerformanceTable (existing)
├── StoreDrawer (existing)
└── SuggestionInfoCard (conditional)
```

### State Management

The component will use existing hooks plus expansion-specific state:

```typescript
// Existing hooks (reused)
const { viewport, filters, selectedStoreId, setViewport, setFilters, setSelectedStoreId } = useMapState();
const { stores, loading, error, availableOptions, refetch } = useStores(filters);

// New expansion state
const [expansionMode, setExpansionMode] = useState(false);
const [suggestions, setSuggestions] = useState<ExpansionSuggestion[]>([]);
const [selectedSuggestion, setSelectedSuggestion] = useState<ExpansionSuggestion | null>(null);
const [scenarios, setScenarios] = useState<Scenario[]>([]);
```

## Components and Interfaces

### 1. ExpansionIntegratedMapPage (Modified)

**Location**: `apps/admin/app/stores/map/components/ExpansionIntegratedMapPage.tsx`

**Changes**:
- Import and use existing hooks: `useMapState`, `useStores`
- Import and render existing components: `WorkingMapView`, `MapFilters`, `TabNavigation`, `StoreDrawer`, `StorePerformanceTable`
- Add expansion mode toggle button in the header
- Conditionally render `ExpansionControls` as a sidebar when `expansionMode === true`
- Pass expansion props to `WorkingMapView` or use `EnhancedMapView` if it supports expansion
- Render `SuggestionMarker` components overlaid on the map
- Maintain existing page layout and styling

**Key Implementation**:
```typescript
export default function ExpansionIntegratedMapPage() {
  // Existing hooks
  const { viewport, filters, selectedStoreId, setViewport, setFilters, setSelectedStoreId } = useMapState();
  const { stores, loading, error, availableOptions, refetch } = useStores(filters);
  
  // Expansion state
  const [expansionMode, setExpansionMode] = useState(false);
  const [suggestions, setSuggestions] = useState<ExpansionSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ExpansionSuggestion | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  // ... existing handlers and expansion handlers ...
  
  return (
    <div className="s-wrap">
      <div className="menu-header-section">
        <div>
          <h1 className="s-h1">Store Management</h1>
          <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
            Interactive map view of all store locations
          </p>
        </div>
        <button
          onClick={() => setExpansionMode(!expansionMode)}
          className="s-btn s-btnPrimary"
        >
          {expansionMode ? '✓ Expansion Mode' : 'Enable Expansion Mode'}
        </button>
      </div>

      <TabNavigation activeTab="map" />

      <MapFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableOptions={availableOptions}
        loading={loading}
      />

      <div className="s-panel" style={{ position: 'relative' }}>
        <div className="s-panelCard">
          <div className="s-panelHeader">
            <div className="s-panelT">Store Locations ({stores.length})</div>
          </div>
          
          <div style={{ height: '600px', position: 'relative' }}>
            <WorkingMapView
              stores={stores}
              onStoreSelect={handleStoreSelect}
              viewport={viewport}
              onViewportChange={setViewport}
              loading={loading}
            />
            
            {/* Expansion overlay components */}
            {expansionMode && (
              <>
                {/* Render suggestion markers on map */}
                {/* Render legend */}
              </>
            )}
          </div>
        </div>
        
        {/* Expansion controls sidebar */}
        {expansionMode && (
          <ExpansionControls
            onGenerate={handleGenerate}
            onSaveScenario={handleSaveScenario}
            onLoadScenario={handleLoadScenario}
            loading={loading}
            scenarios={scenarios}
          />
        )}
      </div>

      <StorePerformanceTable stores={stores} onStoreSelect={handleStoreSelect} />
      
      <StoreDrawer
        store={selectedStore}
        isOpen={!!selectedStoreId}
        onClose={handleCloseDrawer}
        onNavigateToDetails={handleNavigateToDetails}
      />
      
      {selectedSuggestion && (
        <SuggestionInfoCard
          suggestion={selectedSuggestion}
          onClose={() => setSelectedSuggestion(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
```

### 2. ExpansionControls Positioning

**Approach**: Render as an absolutely positioned sidebar

```typescript
// In ExpansionControls component or wrapper
<div style={{
  position: 'absolute',
  right: '16px',
  top: '16px',
  width: '320px',
  maxHeight: 'calc(100% - 32px)',
  overflowY: 'auto',
  background: 'var(--s-panel)',
  border: '1px solid var(--s-border)',
  borderRadius: '8px',
  padding: '16px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  zIndex: 10
}}>
  <ExpansionControls {...props} />
</div>
```

### 3. Suggestion Marker Rendering

**Approach**: Use Mapbox markers or overlay divs positioned based on lat/lng

If `WorkingMapView` exposes the map instance:
```typescript
// In ExpansionIntegratedMapPage
const mapRef = useRef<MapLibreMap | null>(null);

// Pass ref to WorkingMapView
<WorkingMapView
  ref={mapRef}
  // ... other props
/>

// Render markers using Mapbox API
useEffect(() => {
  if (!mapRef.current || !expansionMode) return;
  
  suggestions.forEach(suggestion => {
    const marker = new mapboxgl.Marker({
      color: getBandColor(suggestion.band)
    })
      .setLngLat([suggestion.lng, suggestion.lat])
      .addTo(mapRef.current);
  });
  
  // Cleanup on unmount
}, [suggestions, expansionMode]);
```

Alternatively, if using React components:
```typescript
// Render as overlay divs with absolute positioning
{expansionMode && suggestions.map(suggestion => (
  <SuggestionMarker
    key={suggestion.id}
    suggestion={suggestion}
    onClick={() => setSelectedSuggestion(suggestion)}
    selected={selectedSuggestion?.id === suggestion.id}
    mapInstance={mapRef.current}
  />
))}
```

### 4. EnhancedMapView Integration (Alternative)

If `EnhancedMapView` already supports expansion mode:

```typescript
<EnhancedMapView
  stores={stores}
  onStoreSelect={handleStoreSelect}
  viewport={viewport}
  onViewportChange={setViewport}
  loading={loading}
  isExpansionMode={expansionMode}
  expansionData={suggestions}
  onExpansionMarkerClick={setSelectedSuggestion}
/>
```

This approach is cleaner if `EnhancedMapView` is designed for this purpose.

## Data Flow

### Expansion Mode Toggle
```
User clicks toggle button
  → setExpansionMode(!expansionMode)
  → Component re-renders
  → ExpansionControls sidebar appears
  → Map remains unchanged (no reload)
```

### Generate Suggestions
```
User configures parameters in ExpansionControls
  → User clicks Generate
  → handleGenerate(params) called
  → POST /api/expansion/generate
  → Response with suggestions
  → setSuggestions(result.suggestions)
  → SuggestionMarkers render on map
  → MapLegend appears
```

### Select Suggestion
```
User clicks SuggestionMarker
  → setSelectedSuggestion(suggestion)
  → SuggestionInfoCard renders
  → User can approve/reject/review
  → handleStatusChange updates backend
  → Local state updates
```

## Error Handling

### Map Loading Errors
- Reuse existing error handling from `useStores` hook
- Display `ErrorStateWithRetry` component if stores fail to load
- Expansion mode should be disabled if map fails to load

### Expansion API Errors
- Wrap API calls in try-catch blocks
- Display error messages using toast notifications or inline alerts
- Maintain existing suggestions if generation fails
- Log errors to console for debugging

### Missing Map Instance
- Check if `mapRef.current` exists before rendering markers
- Gracefully handle cases where map hasn't initialized yet
- Use `useEffect` with proper dependencies to wait for map ready state

## Testing Strategy

### Manual Testing Checklist
1. **Map Loads Correctly**
   - Enable expansion feature flag
   - Navigate to /stores/map
   - Verify stores render on map (not gray placeholder)
   - Verify clustering works
   - Verify filters work

2. **Expansion Mode Toggle**
   - Click "Enable Expansion Mode" button
   - Verify ExpansionControls sidebar appears
   - Verify map doesn't reload
   - Verify viewport is preserved
   - Toggle off and verify sidebar disappears

3. **Generate Suggestions**
   - Enable expansion mode
   - Configure parameters
   - Click Generate
   - Verify suggestions appear as markers on map
   - Verify legend appears
   - Verify markers are color-coded correctly

4. **Suggestion Interaction**
   - Click a suggestion marker
   - Verify info card appears
   - Verify all data displays correctly
   - Test approve/reject/review buttons
   - Verify status updates

5. **Scenario Management**
   - Save a scenario
   - Load a saved scenario
   - Verify suggestions restore correctly
   - Verify parameters restore correctly

### Integration Testing
- Test with expansion feature flag enabled and disabled
- Test with 0 stores, 100 stores, 1000+ stores
- Test with different viewport sizes
- Test with different filter combinations
- Test error scenarios (API failures, network errors)

## Migration Plan

### Phase 1: Fix Critical Regression
1. Modify `ExpansionIntegratedMapPage.tsx` to import and use existing components
2. Add expansion mode toggle to header
3. Render `WorkingMapView` instead of placeholder
4. Test that stores load correctly

### Phase 2: Integrate Expansion Controls
1. Position `ExpansionControls` as sidebar
2. Wire up generate/save/load handlers
3. Test parameter configuration

### Phase 3: Render Suggestions
1. Implement suggestion marker rendering on map
2. Add legend and info card
3. Test marker interactions

### Phase 4: Polish and Testing
1. Refine styling and positioning
2. Add loading states and error handling
3. Perform comprehensive testing
4. Update documentation

## Alternative Approaches Considered

### Approach 1: Modify WorkingMapView to Support Expansion
**Pros**: Single component handles both modes
**Cons**: Adds complexity to existing working component, risk of breaking current functionality

### Approach 2: Create Separate ExpansionMapView
**Pros**: Clean separation of concerns
**Cons**: Duplicates map rendering logic, harder to maintain

### Approach 3: Use EnhancedMapView (Selected if Available)
**Pros**: Already designed for expansion mode, cleaner integration
**Cons**: Need to verify it exists and works correctly

**Decision**: Use Approach 3 if `EnhancedMapView` is functional, otherwise use the wrapper approach described in this design (wrapping `WorkingMapView` with expansion overlays).

## Performance Considerations

- Reuse existing map instance (no reload on toggle)
- Leverage existing clustering for stores
- Limit suggestion markers to visible viewport if count is high
- Use React.memo for marker components to prevent unnecessary re-renders
- Debounce viewport changes when filtering suggestions

## Accessibility

- Ensure expansion mode toggle is keyboard accessible
- Add ARIA labels to expansion controls
- Ensure suggestion markers are focusable and have descriptive labels
- Maintain existing accessibility features of the map

## Browser Compatibility

- Test in Chrome, Firefox, Safari, Edge
- Ensure Mapbox works correctly in all browsers
- Test responsive layout on mobile devices (though expansion mode may be desktop-only)
