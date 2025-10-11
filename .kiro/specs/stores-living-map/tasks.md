# Implementation Plan

- [x] 1. Set up project dependencies and routing infrastructure
  - Add MapLibre GL and Supercluster dependencies to apps/admin/package.json
  - Create /stores/map route with proper Next.js App Router structure
  - Set up conditional CSS loading for MapLibre to avoid global bloat
  - Configure environment variables for map functionality
  - _Requirements: 1.1, 1.5, 6.4, 7.3_

- [x] 2. Implement core map state management
  - [x] 2.1 Create useMapState hook with URL synchronization
    - Implement viewport state (latitude, longitude, zoom) management
    - Add filter state management (franchiseeId, region, country)
    - Implement URL parameter reading and writing with debouncing
    - Add selectedStoreId state for drawer management
    - _Requirements: 3.3, 3.4_

  - [x] 2.2 Create map-specific TypeScript interfaces
    - Define MapViewport, FilterState, and StoreWithActivity interfaces
    - Create KPI and activity-related type definitions
    - Add telemetry event type definitions for map interactions
    - _Requirements: 1.1, 2.1, 5.1_

  - [x] 2.3 Write unit tests for useMapState hook
    - Test URL parameter initialization and synchronization
    - Test state updates and debouncing behavior
    - Test default value handling for missing parameters
    - _Requirements: 8.5_

- [x] 3. Implement store data fetching and activity computation
  - [x] 3.1 Create useStores hook for data management
    - Implement store fetching from existing /stores endpoint with filter support
    - Add 15-second polling mechanism with debounced filter changes
    - Implement error handling and retry logic for store data
    - _Requirements: 1.2, 3.2, 7.3_

  - [x] 3.2 Implement activity computation with fallback logic
    - Attempt to fetch recent orders via /orders/recent endpoint for activity indicators
    - Implement mock activity fallback for ~10% of stores when orders unavailable
    - Add NEXT_PUBLIC_DEBUG flag support for mock activity debugging
    - Add activity data caching and refresh logic
    - _Requirements: 2.1, 2.2, 2.3, 7.5_

  - [x] 3.3 Write unit tests for useStores hook
    - Test store data fetching with various filter combinations
    - Test activity computation and fallback mechanisms
    - Test polling behavior and error handling
    - _Requirements: 8.1_

- [x] 4. Create main map visualization component
  - [x] 4.1 Implement MapView component with MapLibre integration
    - Set up MapLibre GL map instance with proper viewport management
    - Implement store marker rendering with base colors from design tokens
    - Add click handling for store marker selection
    - Implement map viewport change handling and state updates
    - _Requirements: 1.2, 1.4, 6.1, 6.2_

  - [x] 4.2 Implement marker clustering with Supercluster
    - Configure Supercluster for marker aggregation at low zoom levels
    - Implement cluster expansion on zoom-in interactions
    - Add cluster count display and styling consistent with design tokens
    - Optimize clustering performance for large store datasets
    - _Requirements: 1.3, 1.4_

  - [x] 4.3 Add activity pulse animations for active stores
    - Implement CSS animations for activity pulse rings around markers
    - Add conditional rendering based on recentActivity flag
    - Ensure animations respect user motion preferences
    - Style pulse animations using existing color tokens
    - _Requirements: 2.1, 6.1_

  - [x] 4.4 Write integration tests for MapView component
    - Test marker rendering and clustering behavior
    - Test activity pulse display and animations
    - Test marker click interactions and state updates
    - _Requirements: 8.2_

- [x] 5. Implement filter controls and drawer interface
  - [x] 5.1 Create MapFilters component
    - Implement franchisee, region, and country select controls
    - Add filter change handling with debounced API requests
    - Style filter controls using existing design tokens
    - Implement filter reset and clear functionality
    - _Requirements: 3.1, 3.2, 6.1_

  - [x] 5.2 Create StoreDrawer component for detailed store information
    - Implement slide-out drawer with store metadata display
    - Add KPI fetching and display (orders today, revenue today, last order)
    - Implement "Open in Stores → Details" navigation action
    - Add drawer close handling and keyboard navigation support
    - Style drawer using existing card and shadow design tokens
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1_

  - [x] 5.3 Write component tests for filters and drawer
    - Test filter control interactions and state updates
    - Test drawer opening, closing, and content display
    - Test KPI data loading and error handling
    - _Requirements: 8.3, 8.4_

- [x] 6. Integrate telemetry tracking for user interactions
  - [x] 6.1 Implement map-specific telemetry events
    - Add map_view_opened event on initial map load
    - Add map_filter_changed event with changed filter keys
    - Add map_store_opened event when store markers are clicked
    - Add map_refresh_tick event during data polling cycles
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 6.2 Wire telemetry events to existing telemetry infrastructure
    - Integrate with existing TelemetryHelpers for consistent event submission
    - Add proper error handling for telemetry failures
    - Include appropriate timestamps and context data in events
    - _Requirements: 5.5_

- [x] 7. Add comprehensive error handling and loading states
  - [x] 7.1 Implement error boundaries and graceful degradation
    - Add error boundary around MapView to prevent page crashes
    - Implement fallback UI for map loading failures
    - Add retry mechanisms for failed API requests
    - _Requirements: 7.1, 7.2_

  - [x] 7.2 Add loading states and skeleton UI
    - Implement loading skeletons for map and drawer components
    - Add loading indicators during data fetching operations
    - Implement progressive loading for better perceived performance
    - _Requirements: 4.2_

- [x] 8. Create main map page and integrate with stores navigation
  - [x] 8.1 Create /stores/map page component
    - Implement main page layout with proper Next.js App Router structure
    - Integrate MapView, MapFilters, and StoreDrawer components
    - Add proper page metadata and SEO considerations
    - Implement redirect logic for ?view=map query parameter
    - _Requirements: 1.1, 1.5_

  - [x] 8.2 Add Map tab to existing Stores section
    - Modify stores page layout to include Map tab alongside existing tabs
    - Implement tab navigation and active state management
    - Ensure consistent styling with existing Stores interface
    - _Requirements: 1.1, 6.2_

- [x] 9. Add end-to-end testing and documentation
  - [x] 9.1 Create Playwright end-to-end tests
    - Test map loading and initial render at /stores/map
    - Test cluster rendering and expansion behavior
    - Test filter interactions and marker count changes
    - Test store marker clicks and drawer content display
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 9.2 Create documentation and usage guide
    - Write apps/admin/docs/living-map.md with feature overview
    - Document known fallbacks and debugging procedures
    - Include screenshots of key functionality
    - Add troubleshooting guide for common issues
    - _Requirements: 7.4_

- [x] 10. Performance optimization and final polish
  - [x] 10.1 Optimize map rendering performance
    - Implement viewport-based marker culling for large datasets
    - Add marker icon caching and reuse strategies
    - Optimize clustering calculations for smooth interactions
    - _Requirements: 1.3, 1.4_

  - [x] 10.2 Add accessibility improvements
    - Implement keyboard navigation for map controls
    - Add ARIA labels and screen reader support
    - Ensure high contrast mode compatibility
    - Test with assistive technologies
    - _Requirements: 6.1_

  - [x] 10.3 Add performance monitoring and analytics
    - Implement performance metrics collection for map operations
    - Add error tracking for component failures
    - Monitor API response times and success rates
    - _Requirements: 5.4_