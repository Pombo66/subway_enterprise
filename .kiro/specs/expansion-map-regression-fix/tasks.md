# Implementation Plan

- [x] 1. Import existing components and hooks into ExpansionIntegratedMapPage
  - Import useMapState and useStores hooks from existing map page
  - Import WorkingMapView, MapFilters, TabNavigation, StoreDrawer, StorePerformanceTable components
  - Import SimpleErrorBoundary and loading skeleton components
  - Remove placeholder map div and replace with actual component structure
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3_

- [x] 2. Implement expansion mode state management
  - Add expansionMode state with useState (default false)
  - Add suggestions state for ExpansionSuggestion array
  - Add selectedSuggestion state for currently selected suggestion
  - Add scenarios state for saved scenario list
  - Add loading state for expansion operations
  - _Requirements: 2.1, 2.2, 2.3, 3.2_

- [x] 3. Rebuild page layout with existing components
  - Replace placeholder with s-wrap container structure
  - Add menu-header-section with title and description
  - Add expansion mode toggle button in header
  - Render TabNavigation component with activeTab="map"
  - Render MapFilters component with filters and availableOptions
  - Render s-panel with s-panelCard containing map
  - Render StorePerformanceTable below map
  - Render StoreDrawer for store details
  - _Requirements: 1.1, 1.2, 1.3, 3.3, 6.1, 6.2, 6.3_

- [x] 4. Integrate WorkingMapView component
  - Render WorkingMapView inside map panel with 600px height
  - Pass stores prop from useStores hook
  - Pass viewport and onViewportChange from useMapState
  - Pass onStoreSelect handler for store selection
  - Pass loading state from useStores
  - Wrap in SimpleErrorBoundary for error handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.3_

- [x] 5. Implement expansion mode toggle functionality
  - Style toggle button using s-btn classes
  - Update button text based on expansionMode state
  - Add onClick handler to toggle expansionMode
  - Ensure map doesn't remount when toggling (use key prop carefully)
  - Verify viewport is preserved during toggle
  - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2, 6.3, 6.4_

- [x] 6. Position ExpansionControls as sidebar
  - Conditionally render ExpansionControls when expansionMode is true
  - Position as absolutely positioned sidebar (right: 16px, top: 16px)
  - Set width to 320px with max-height and overflow-y: auto
  - Style with background, border, border-radius, padding, box-shadow
  - Set z-index to 10 to appear above map
  - Pass onGenerate, onSaveScenario, onLoadScenario handlers
  - Pass loading state and scenarios array
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Implement expansion API handlers
  - Create handleGenerate function to call POST /api/expansion/generate
  - Create handleSaveScenario function to call POST /api/expansion/scenarios
  - Create handleLoadScenario function to call GET /api/expansion/scenarios/:id
  - Create loadScenarios function to fetch scenario list on mount
  - Add error handling with try-catch and user feedback
  - Update suggestions state with API responses
  - _Requirements: 4.3_

- [x] 8. Implement suggestion marker rendering
  - Check if EnhancedMapView supports isExpansionMode prop
  - If yes, pass isExpansionMode, expansionData, and onExpansionMarkerClick props
  - If no, implement overlay approach with SuggestionMarker components
  - Position markers based on lat/lng coordinates
  - Color-code markers based on confidence band
  - Add onClick handler to set selectedSuggestion
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 9. Render MapLegend and SuggestionInfoCard
  - Conditionally render MapLegend when expansionMode is true and suggestions exist
  - Position legend in bottom-left corner
  - Conditionally render SuggestionInfoCard when selectedSuggestion is not null
  - Pass suggestion data and onClose handler
  - Pass onStatusChange handler for approve/reject/review actions
  - _Requirements: 5.4_

- [x] 10. Implement suggestion status update handler
  - Create handleStatusChange function to call PATCH /api/expansion/suggestions/:id/status
  - Update local suggestions state after successful status change
  - Update selectedSuggestion state if it matches the updated suggestion
  - Add error handling and user feedback
  - _Requirements: 5.3_

- [x] 11. Add error handling and loading states
  - Handle error state from useStores hook
  - Display ErrorStateWithRetry component if stores fail to load
  - Show loading indicators during expansion operations
  - Display toast notifications or alerts for API errors
  - Disable expansion mode toggle if map fails to load
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 12. Test map loads correctly with expansion feature enabled
  - Enable NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR=true in .env
  - Navigate to /stores/map
  - Verify stores render on map (not gray placeholder)
  - Verify clustering works
  - Verify filters work
  - Verify store selection and drawer work
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 13. Test expansion mode toggle
  - Click "Enable Expansion Mode" button
  - Verify ExpansionControls sidebar appears
  - Verify map doesn't reload or flicker
  - Verify viewport and zoom level are preserved
  - Toggle off and verify sidebar disappears
  - Verify stores remain visible throughout
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 14. Test suggestion generation and rendering
  - Enable expansion mode
  - Configure parameters in ExpansionControls
  - Click Generate button
  - Verify suggestions appear as markers on map
  - Verify markers are color-coded by confidence band
  - Verify MapLegend appears
  - Click a suggestion marker
  - Verify SuggestionInfoCard displays with correct data
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 15. Test scenario management
  - Generate suggestions
  - Save scenario with a label
  - Verify scenario appears in dropdown
  - Load saved scenario
  - Verify suggestions restore correctly
  - Verify parameters restore in controls
  - _Requirements: 4.3_

- [x] 16. Polish styling and responsive layout
  - Ensure expansion toggle button matches existing button styles
  - Verify ExpansionControls sidebar doesn't obscure map on smaller screens
  - Test responsive layout with different viewport sizes
  - Ensure all components follow existing design system
  - Add smooth transitions for expansion mode toggle
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
