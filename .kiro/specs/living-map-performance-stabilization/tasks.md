# Implementation Plan

- [x] 1. Implement single map instance management with proper cleanup
  - Replace current map initialization with singleton pattern to prevent multiple instances
  - Add proper cleanup on component unmount to prevent memory leaks
  - Use refs instead of state for map instance to prevent re-renders
  - Implement single useEffect for map initialization that only runs once per container
  - _Requirements: 2.5, 5.3, 6.1_

- [x] 1.1 Create SingletonMapManager class
  - Implement map instance caching to ensure only one map per page lifecycle
  - Add proper initialization with timeout handling and error recovery
  - Create cleanup method that removes map and clears all event listeners
  - _Requirements: 2.5, 5.3_

- [x] 1.2 Replace useState with useRef for map instance
  - Change map state management to use refs to prevent render triggers
  - Implement stable map initialization effect that doesn't depend on changing values
  - Add proper TypeScript typing for map instance refs
  - _Requirements: 6.1, 6.2_

- [x] 1.3 Add comprehensive cleanup on unmount
  - Implement cleanup function that removes all event listeners
  - Add map instance removal and memory cleanup
  - Clear all timers and animation frames on component unmount
  - _Requirements: 2.5, 5.3_

- [x] 2. Replace DOM markers with map-native GeoJSON implementation
  - Remove current DOM-based marker overlays that cause floating issues
  - Implement GeoJSON data source for true geographic anchoring
  - Add map-native layers for clusters and individual store points
  - Ensure markers remain perfectly positioned during zoom and pan operations
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 2.1 Implement GeoJSON data source for stores
  - Create GeoJSON FeatureCollection from store data with proper coordinate validation
  - Add clustering configuration directly to the GeoJSON source
  - Filter out stores with invalid coordinates and log warnings for missing data
  - _Requirements: 1.5, 5.2_

- [x] 2.2 Add map-native cluster layer
  - Implement cluster circles using MapLibre circle layer with step expressions
  - Add cluster count labels using symbol layer
  - Configure cluster colors and sizes using existing design tokens
  - _Requirements: 1.1, 3.1, 7.1_

- [x] 2.3 Add map-native individual store layer
  - Implement individual store points using circle layer
  - Add conditional styling for active vs inactive stores using existing colors
  - Create activity pulse layer for stores with recent activity
  - _Requirements: 1.1, 3.2, 7.3_

- [x] 2.4 Implement click handling for map-native features
  - Add click event handlers that query rendered features at click point
  - Handle cluster clicks with zoom-to-expand functionality
  - Handle individual store clicks to open StoreDrawer with correct store data
  - _Requirements: 1.4, 7.2, 7.4_

- [x] 3. Eliminate render loops and unnecessary re-renders
  - Identify and fix effects that update their own dependencies
  - Remove setState calls from animation frames and render cycles
  - Add memoization for expensive data transformations
  - Implement throttled and debounced event handlers using refs
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 3.1 Fix effects that cause render loops
  - Audit all useEffect dependencies to prevent circular updates
  - Separate data fetching effects from rendering effects
  - Use shallow equality checks for object dependencies
  - _Requirements: 6.1, 6.2_

- [x] 3.2 Add memoization for data transformations
  - Memoize store data processing and GeoJSON generation
  - Add useMemo for expensive coordinate validation and filtering
  - Implement shallow equality checks for filter and viewport changes
  - _Requirements: 6.3, 6.5_

- [x] 3.3 Implement throttled event handlers with refs
  - Create throttled click handlers to prevent excessive marker interactions
  - Add debounced viewport change handlers for smooth performance
  - Use refs to store event handlers and prevent recreation on every render
  - _Requirements: 6.4, 2.2_

- [x] 3.4 Remove setState from animation frames
  - Audit code for setState calls within requestAnimationFrame or timers
  - Replace with ref-based updates or direct DOM manipulation where appropriate
  - Ensure no state updates occur during render cycles
  - _Requirements: 6.1, 2.1_

- [x] 4. Implement unified data source for consistent counts
  - Create single source of truth for store data that feeds both map and list panels
  - Ensure atomic updates so all UI components show consistent information
  - Add immutable data updates with shallow equality checks
  - Implement proper data flow from API to all UI components
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4.1 Create unified store data hook
  - Implement useUnifiedStoreData hook that processes raw store data once
  - Add activity computation, filtering, and coordinate validation in single pipeline
  - Return processed data with consistent counts for all UI components
  - _Requirements: 4.1, 4.2_

- [x] 4.2 Implement atomic data updates
  - Ensure all data transformations happen in single memoized operation
  - Add immutable update patterns to prevent reference equality issues
  - Use shallow equality checks to prevent unnecessary re-renders
  - _Requirements: 4.2, 4.5_

- [x] 4.3 Synchronize map and list panel counts
  - Ensure map marker count exactly matches info panel display
  - Add validation to verify data consistency between components
  - Implement debug logging to track count discrepancies
  - _Requirements: 4.3, 4.4_

- [x] 5. Add comprehensive error handling and graceful degradation
  - Implement error boundaries to prevent map crashes from affecting entire page
  - Add fallback UI when map initialization fails
  - Handle coordinate validation errors gracefully
  - Provide clear user feedback and recovery options for all error scenarios
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 5.1 Implement map initialization error handling
  - Add try-catch around map initialization with clear error messages
  - Implement fallback to list view when map library fails to load
  - Add retry mechanism for transient initialization failures
  - _Requirements: 5.1, 5.2_

- [x] 5.2 Add coordinate validation and filtering
  - Validate latitude and longitude ranges before adding to map
  - Filter out stores with invalid coordinates and log dev warnings
  - Ensure stores without coordinates remain visible in list view
  - _Requirements: 5.2, 5.5_

- [x] 5.3 Create error boundary for map component
  - Wrap MapView in error boundary to isolate map failures
  - Provide fallback UI that allows users to continue using other features
  - Add error reporting for debugging and monitoring
  - _Requirements: 5.3, 5.4_

- [x] 6. Implement lightweight telemetry and performance monitoring
  - Add minimal telemetry events for map readiness and user interactions
  - Implement performance monitoring that doesn't impact user experience
  - Use sampling to reduce telemetry overhead
  - Ensure no personally identifiable information is collected
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6.1 Add map readiness telemetry
  - Emit single "map_ready" event when map reaches stable state
  - Include store count and basic performance metrics
  - Add timestamp and basic browser information for debugging
  - _Requirements: 8.1, 8.5_

- [x] 6.2 Implement marker click telemetry
  - Add "marker_click" events with store ID for QA purposes
  - Use sampling to reduce event volume and performance impact
  - Truncate or hash store IDs to protect privacy
  - _Requirements: 8.2, 8.4_

- [x] 6.3 Add performance monitoring
  - Track map initialization time and render performance
  - Monitor memory usage with very low sampling rate
  - Log performance warnings for operations taking longer than 16ms
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 7. Optimize clustering with map-native implementation
  - Replace any DOM-based clustering with MapLibre native clustering
  - Ensure clustering toggle works smoothly without performance impact
  - Implement proper cluster expansion and contraction behavior
  - Maintain existing visual appearance while improving performance
  - _Requirements: 7.1, 7.2, 7.4, 7.5, 3.3_

- [x] 7.1 Configure native MapLibre clustering
  - Set up clustering parameters in GeoJSON source configuration
  - Configure cluster radius and maximum zoom levels for optimal performance
  - Ensure clustering behavior matches existing visual expectations
  - _Requirements: 7.1, 7.5_

- [x] 7.2 Implement cluster interaction handling
  - Add click handlers for cluster expansion using MapLibre's getClusterExpansionZoom
  - Implement smooth zoom transitions when clusters are clicked
  - Ensure cluster clicks don't interfere with individual marker clicks
  - _Requirements: 7.2, 7.4_

- [x] 7.3 Add clustering toggle functionality
  - Implement clustering enable/disable without recreating map layers
  - Update layer filters to show/hide clusters based on toggle state
  - Ensure toggle works smoothly without causing performance issues
  - _Requirements: 7.4, 3.3_

- [x] 8. Test and validate performance improvements
  - Verify markers remain anchored during all zoom and pan operations
  - Test CPU usage remains low during idle periods and smooth during interactions
  - Validate memory stability over extended usage periods
  - Ensure all existing functionality works with new implementation
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4_

- [x] 8.1 Test marker anchoring accuracy
  - Verify markers stay precisely positioned at geographic coordinates
  - Test marker positions remain stable during zoom operations from global to street level
  - Validate marker positions during pan operations across large distances
  - _Requirements: 1.1, 1.2_

- [x] 8.2 Validate performance targets
  - Test map initialization completes within 1 second on typical hardware
  - Verify CPU usage stays under 5% during 30-second idle periods
  - Test zoom/pan operations maintain under 16ms per frame
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 8.3 Test memory stability
  - Verify memory usage remains stable over 5 minutes of interaction
  - Test for memory leaks during component mount/unmount cycles
  - Validate cleanup properly removes all event listeners and map resources
  - _Requirements: 2.4, 2.5_

- [x] 8.4 Validate existing functionality preservation
  - Test clustering toggle works as before with improved performance
  - Verify StoreDrawer opens correctly when markers are clicked
  - Ensure info panel and list panel counts match map marker counts exactly
  - _Requirements: 3.1, 3.2, 3.3, 4.3_