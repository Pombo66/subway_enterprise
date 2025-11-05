# Implementation Plan

- [x] 1. Fix store coordinate generation for realistic global distribution
  - Replace the current tiny offset coordinate generation with realistic global city coordinates
  - Create a comprehensive list of major cities across North America, Europe, and Asia Pacific
  - Implement weighted distribution algorithm to place stores in realistic metropolitan areas
  - Add proper region and country assignment based on city locations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.1 Create global city coordinate database
  - Define major cities with accurate latitude/longitude coordinates for each region
  - Include proper region (AMER/EMEA/APAC) and country assignments
  - Add city names and population weights for realistic distribution
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 1.2 Implement realistic coordinate generation algorithm
  - Replace the current hash-based tiny offset system with city-based placement
  - Add small random offsets around city centers to simulate multiple stores per city
  - Ensure coordinates represent actual metropolitan areas where stores would exist
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 1.3 Update mock store data with realistic information
  - Assign proper city, region, and country information to each generated store
  - Ensure store names reflect their geographic locations appropriately
  - Add flag to indicate when coordinates are generated vs from API
  - _Requirements: 1.5, 3.3, 3.4_

- [x] 2. Simplify and fix viewport culling logic
  - Replace aggressive viewport culling with generous buffer zones
  - Increase the maximum visible store limit to handle global distribution
  - Add comprehensive debug logging to show which stores are visible/hidden
  - Implement prioritized sampling that always shows active stores first
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.1 Implement relaxed viewport culling
  - Increase buffer zones around viewport to 50% of viewport size
  - Raise maximum visible store limit from 500 to 1000 stores
  - Simplify the culling algorithm to be more predictable and debuggable
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 2.2 Add comprehensive viewport debugging
  - Log which stores are being shown or hidden during culling
  - Display viewport bounds and buffer zones in debug mode
  - Show culling statistics in development environment
  - _Requirements: 2.5, 5.5_

- [x] 2.3 Implement activity-prioritized sampling
  - Always include stores with recent activity in visible set
  - Only apply distance-based sampling to inactive stores when necessary
  - Ensure active stores are never hidden by culling logic
  - _Requirements: 2.1, 4.1_

- [x] 3. Simplify map initialization and error handling
  - Remove complex memory monitoring and performance tracking that causes crashes
  - Implement straightforward map initialization with basic error handling
  - Add simple retry mechanisms without complex circuit breakers
  - Provide clear fallback options when map fails to load
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3.1 Streamline MapView component initialization
  - Remove complex memory monitoring and cleanup that can cause crashes
  - Simplify the map initialization process to basic MapLibre setup
  - Add straightforward error boundaries with clear user messages
  - _Requirements: 5.1, 5.2_

- [x] 3.2 Implement robust error handling and recovery
  - Add simple retry mechanism for map initialization failures
  - Provide clear error messages and recovery options for users
  - Implement graceful fallback to list view when map is unusable
  - _Requirements: 5.3, 5.4_

- [x] 3.3 Simplify marker rendering and management
  - Remove complex marker caching and pooling that can cause memory issues
  - Implement direct marker creation and management
  - Add basic clustering without complex performance optimizations
  - _Requirements: 5.1, 4.3_

- [ ] 4. Enhance visual feedback and user experience
  - Ensure activity indicators are clearly visible on global scale
  - Improve clustering behavior for global store distribution
  - Add clear indication when mock data is being used
  - Implement proper loading states and error messages
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4.1 Improve activity indicators and store markers
  - Make activity pulse animations more prominent and visible
  - Use distinct colors for active vs inactive stores
  - Ensure markers are visible at global zoom levels
  - _Requirements: 4.1, 4.3_

- [x] 4.2 Enhance clustering for global distribution
  - Adjust clustering parameters for global scale store distribution
  - Ensure cluster expansion works properly across different zoom levels
  - Add proper cluster count display and interaction
  - _Requirements: 4.3_

- [x] 4.3 Add clear data source indicators
  - Show when mock data is being used vs real API data
  - Add debug information about coordinate generation
  - Provide clear loading states during data fetching
  - _Requirements: 4.2, 4.4_

- [x] 5. Update map viewport and navigation
  - Set initial map view to global scale to show all store regions
  - Adjust default zoom level to display worldwide store distribution
  - Ensure navigation controls work properly at global scale
  - Add proper bounds fitting when stores are loaded
  - _Requirements: 1.3, 2.1_

- [x] 5.1 Set global initial viewport
  - Change default map center to show global view (0°, 20°N)
  - Set initial zoom level to 2 to display worldwide distribution
  - Implement automatic bounds fitting to show all stores when loaded
  - _Requirements: 1.3_

- [x] 5.2 Enhance map navigation for global scale
  - Ensure zoom controls work smoothly from global to city level
  - Add proper viewport change handling for global distribution
  - Test navigation performance with worldwide store spread
  - _Requirements: 2.1_

- [x] 6. Test and validate fixes
  - Verify stores appear in realistic global locations
  - Test viewport culling shows appropriate stores at different zoom levels
  - Validate error handling and recovery mechanisms work correctly
  - Ensure performance remains acceptable with global store distribution
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 5.1, 5.2_

- [x] 6.1 Validate global store distribution
  - Test that stores appear in major cities across all regions
  - Verify coordinates are realistic and stores are properly distributed
  - Check that region and country assignments are correct
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 6.2 Test viewport and culling behavior
  - Verify stores are visible at appropriate zoom levels
  - Test that culling doesn't hide stores that should be visible
  - Validate that active stores are always prioritized and shown
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 6.3 Validate error handling and performance
  - Test map initialization and error recovery mechanisms
  - Verify performance remains acceptable with global distribution
  - Check that fallback mechanisms work when needed
  - _Requirements: 5.1, 5.2, 5.3_