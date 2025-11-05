# Implementation Plan

- [x] 1. Set up database schema and migrations
  - Create Prisma schema for expansion_scenarios table with all required fields
  - Create Prisma schema for expansion_suggestions table with foreign key relationship
  - Add optional fields to Store model (annualTurnover, openedAt, cityPopulationBand)
  - Generate and apply database migration
  - _Requirements: 1.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 2. Implement core spatial analysis service
  - [x] 2.1 Create ExpansionGenerationService class with hex grid generation
    - Install and configure Turf.js for spatial operations
    - Implement createHexGrid method using Turf.js hexGrid with ~500m cell size
    - Implement bounding box computation from store coordinates
    - _Requirements: 5.2_
  
  - [x] 2.2 Implement multi-factor scoring algorithm
    - Create scoreCell method with population, proximity, and turnover scoring
    - Implement computePopulationScore using city population bands
    - Implement computeProximityScore with distance-based sigmoid function
    - Implement computeTurnoverScore with nearby store analysis
    - Implement weighted score combination using bias parameters
    - _Requirements: 5.3, 5.4_
  
  - [x] 2.3 Implement Non-Maximum Suppression (NMS)
    - Create applyNMS method to enforce minimum distance constraints
    - Sort scored cells by total score descending
    - Implement spatial suppression logic using Turf.js distance calculations
    - _Requirements: 5.4_
  
  - [x] 2.4 Implement confidence computation and band assignment
    - Create computeConfidence method combining score and data completeness
    - Implement assignBand method with threshold-based classification
    - Calculate data completeness based on available store metrics
    - _Requirements: 5.6_
  
  - [x] 2.5 Implement deterministic generation with seed-based randomness
    - Create SeededRandom class with linear congruential generator
    - Ensure consistent store sorting by ID for determinism
    - Apply seed to any random sampling operations
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. Implement OpenAI rationale generation service
  - [x] 3.1 Create OpenAIRationaleService class
    - Install OpenAI SDK
    - Implement generateRationale method with GPT-4o-mini
    - Create buildPrompt method with context formatting
    - Configure API key from environment variables
    - _Requirements: 7.6, 7.7_
  
  - [x] 3.2 Implement fallback rationale generation
    - Create generateFallbackRationale method with template-based logic
    - Implement factor identification for template selection
    - Add error handling to gracefully fall back on OpenAI failures
    - _Requirements: 7.6, 7.7_
  
  - [x] 3.3 Add rationale caching
    - Create RationaleCache class with location-based key generation
    - Implement cache get/set methods
    - Integrate caching into rationale generation flow
    - _Requirements: 5.6_

- [x] 4. Create API routes for expansion generation
  - [x] 4.1 Implement POST /api/expansion/generate endpoint
    - Create route handler with request body parsing
    - Implement parameter validation and sanitization
    - Call ExpansionGenerationService.generate method
    - Return suggestions with metadata
    - Add error handling for validation and generation failures
    - _Requirements: 5.1, 5.7_
  
  - [x] 4.2 Add authentication and authorization middleware
    - Verify user session using next-auth
    - Check user role for expansion feature access
    - Return 401/403 for unauthorized requests
    - _Requirements: 14.4_
  
  - [x] 4.3 Implement rate limiting
    - Add rate limiting middleware (10 requests per 15 minutes)
    - Return 429 error when limit exceeded
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_


- [x] 5. Implement scenario management service and API routes
  - [x] 5.1 Create ScenarioManagementService class
    - Implement saveScenario method to persist scenarios and suggestions
    - Implement loadScenario method to retrieve scenario with suggestions
    - Implement refreshScenario method to regenerate with current data
    - Implement updateSuggestionStatus method for status changes
    - Implement listScenarios method with pagination support
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 5.2 Implement POST /api/expansion/scenarios endpoint
    - Create route handler for saving scenarios
    - Validate scenario label and parameters
    - Call ScenarioManagementService.saveScenario
    - Return scenario ID and creation timestamp
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [x] 5.3 Implement GET /api/expansion/scenarios/:id endpoint
    - Create route handler for loading scenarios
    - Verify user ownership of scenario
    - Call ScenarioManagementService.loadScenario
    - Return scenario with suggestions
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 5.4 Implement POST /api/expansion/scenarios/:id/refresh endpoint
    - Create route handler for refreshing scenarios
    - Verify user ownership
    - Call ScenarioManagementService.refreshScenario
    - Return updated scenario with change summary
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 5.5 Implement PATCH /api/expansion/suggestions/:id/status endpoint
    - Create route handler for status updates
    - Validate status value (APPROVED, REJECTED, REVIEWED)
    - Call ScenarioManagementService.updateSuggestionStatus
    - Return updated suggestion
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 5.6 Implement GET /api/expansion/scenarios endpoint
    - Create route handler for listing scenarios
    - Parse pagination and filter parameters
    - Call ScenarioManagementService.listScenarios
    - Return paginated scenario list
    - _Requirements: 9.1_

- [x] 6. Create frontend expansion controls component
  - [x] 6.1 Create ExpansionControls component
    - Create component file with TypeScript interface
    - Implement region filter dropdown (country/state)
    - Implement aggression slider (0-100) with label
    - Implement bias sliders (population, proximity, turnover) with defaults
    - Implement minimum distance input with validation
    - Add Generate button with loading state
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 6.2 Add scenario management controls
    - Implement Save Scenario button with label prompt
    - Implement Load Scenario dropdown with scenario list
    - Implement Refresh Scenario button
    - Add loading states for all actions
    - _Requirements: 8.1, 9.1, 13.1_
  
  - [x] 6.3 Implement parameter validation
    - Add client-side validation for all inputs
    - Display validation errors inline
    - Disable Generate button when invalid
    - _Requirements: 3.5_

- [x] 7. Create suggestion marker and info card components
  - [x] 7.1 Create SuggestionMarker component
    - Create component with Mapbox marker integration
    - Implement color coding based on confidence band (teal/purple/brown/black)
    - Add click handler to show info card
    - Implement selected state styling
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 7.2 Create SuggestionInfoCard component
    - Create card component with suggestion data display
    - Display confidence score as percentage
    - Display distance to nearest store
    - Display population density band
    - Display turnover gap summary
    - Render factor breakdown with scores
    - Display rationale text
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [x] 7.3 Add status action buttons to info card
    - Implement Approve button with status update
    - Implement Reject button with status update
    - Implement Mark as Reviewed button with status update
    - Add loading states during status updates
    - Show success/error feedback
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 8. Create map legend component
  - Create MapLegend component with color coding explanation
  - Display HIGH (teal), MEDIUM (purple), LOW (brown), INSUFFICIENT_DATA (black) bands
  - Add tooltip with AI attribution message
  - Position legend in bottom-left corner of map
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_


- [x] 9. Integrate expansion mode into existing map page
  - [x] 9.1 Add expansion mode toggle to map page
    - Add toggle button to map interface
    - Implement state management for expansion mode
    - Ensure map instance is not remounted on toggle
    - Preserve viewport and zoom level during toggle
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 9.2 Implement conditional rendering based on expansion mode
    - Show ExpansionControls sidebar when expansion mode is active
    - Show suggestion markers when suggestions are loaded
    - Show store markers in both modes
    - Hide/show appropriate UI elements based on mode
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 9.3 Add expansion state management
    - Create state for suggestions array
    - Create state for selected suggestion
    - Create state for current scenario
    - Create state for loading and error states
    - _Requirements: 5.1, 7.1, 8.1, 9.1_
  
  - [x] 9.4 Implement generation flow
    - Create handleGenerate callback function
    - Call POST /api/expansion/generate with parameters
    - Update suggestions state with results
    - Handle loading and error states
    - Display success/error toast notifications
    - _Requirements: 5.1, 5.7_
  
  - [x] 9.5 Implement scenario save/load flow
    - Create handleSaveScenario callback with label prompt
    - Call POST /api/expansion/scenarios with data
    - Create handleLoadScenario callback
    - Call GET /api/expansion/scenarios/:id
    - Update map state with loaded scenario
    - _Requirements: 8.1, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 10. Implement performance optimizations
  - [x] 10.1 Add marker clustering for stores
    - Install and configure supercluster library
    - Implement useMarkerClustering hook
    - Apply clustering to store markers
    - Ensure clusters update on viewport change
    - _Requirements: 11.1, 11.2_
  
  - [x] 10.2 Implement lazy loading for visible region
    - Create loadVisibleStores function with bounding box
    - Debounce viewport change events (300ms)
    - Load stores only for visible map area
    - _Requirements: 11.3_
  
  - [x] 10.3 Optimize component rendering
    - Wrap SuggestionMarker with React.memo
    - Implement proper equality checks for memo
    - Use useMemo for expensive computations
    - Use useCallback for event handlers
    - _Requirements: 11.1_
  
  - [x] 10.4 Add database query optimizations
    - Verify indexes are created for spatial queries
    - Use Prisma select to fetch only needed fields
    - Implement query result caching where appropriate
    - _Requirements: 11.5_

- [x] 11. Add environment configuration and feature flags
  - Create .env.example with all required variables
  - Add NEXT_PUBLIC_MAPBOX_TOKEN for client-side tiles
  - Add MAPBOX_SECRET_TOKEN for server-side API calls
  - Add OPENAI_API_KEY for rationale generation
  - Add NEXT_PUBLIC_ENABLE_EXPANSION_PREDICTOR feature flag
  - Update FeatureFlags class to check expansion predictor flag
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 12. Implement telemetry and logging
  - [x] 12.1 Add expansion telemetry events
    - Create expansion_generated event tracking
    - Create scenario_saved event tracking
    - Create suggestion_approved event tracking
    - Track generation time and suggestion count
    - _Requirements: 14.3_
  
  - [x] 12.2 Add error logging
    - Implement structured error logging for generation failures
    - Log OpenAI API failures with fallback usage
    - Log validation errors with context
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [x] 12.3 Add data lineage tracking
    - Store source_data_version timestamp with scenarios
    - Display dataset timestamps in UI
    - Log generation metrics (count, avg confidence, top factors)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 13. Create documentation
  - Create README.md for expansion predictor feature
  - Document API endpoints with request/response examples
  - Document environment variable configuration
  - Document deployment and migration steps
  - Create user guide with screenshots
  - _Requirements: All_

- [x] 14. Write integration tests
  - [x] 14.1 Test POST /api/expansion/generate endpoint
    - Test successful generation with valid parameters
    - Test validation errors with invalid parameters
    - Test empty region handling
    - Test determinism with same seed
    - _Requirements: 4.1, 4.2, 5.1, 5.7_
  
  - [x] 14.2 Test scenario management endpoints
    - Test scenario save and load round-trip
    - Test scenario refresh updates data
    - Test suggestion status updates
    - Test scenario list pagination
    - _Requirements: 8.1, 9.1, 10.1, 13.1_
  
  - [x] 14.3 Test spatial algorithms
    - Test hex grid generation coverage
    - Test multi-factor scoring calculations
    - Test NMS enforcement of minimum distance
    - Test confidence computation ranges
    - _Requirements: 5.2, 5.3, 5.4, 5.6_

- [x] 15. Write component tests
  - [x] 15.1 Test ExpansionControls component
    - Test slider state updates
    - Test generate button callback
    - Test validation prevents invalid submissions
    - Test loading state disables controls
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 15.2 Test SuggestionInfoCard component
    - Test displays all suggestion data
    - Test status buttons trigger callbacks
    - Test close button functionality
    - Test factor breakdowns render correctly
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 16. Perform manual QA testing
  - [x] 16.1 Test expansion mode toggle
    - Verify no map reload on toggle
    - Verify viewport preservation
    - Verify controls appear/disappear correctly
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 16.2 Test suggestion generation
    - Test Germany with aggression=60
    - Verify minimum distance is respected
    - Verify color coding matches confidence
    - Verify rationales are coherent
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 7.6, 7.7_
  
  - [x] 16.3 Test scenario management
    - Test save scenario with label
    - Test load scenario restores state
    - Test refresh updates suggestions
    - Test status updates persist
    - _Requirements: 8.1, 9.1, 10.1, 13.1_
  
  - [x] 16.4 Test performance with large datasets
    - Verify map responsive with 30k stores
    - Verify generation completes in <10s
    - Verify no Mapbox extra loads
    - Monitor memory usage
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.3, 12.4, 12.5_
