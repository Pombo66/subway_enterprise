# Implementation Plan

- [x] 1. Set up database schema and cache infrastructure
  - Create Prisma migration for MapboxTilequeryCache and OpenAIRationaleCache tables
  - Add new fields to ExpansionSuggestion model (urban_density_index, road_distance_m, building_distance_m, landuse_type, mapbox_validated, ai_rationale_cached)
  - Create database indexes for cache lookups (coordinate_hash, context_hash, expires_at)
  - Add environment variables for MAPBOX_ACCESS_TOKEN and OPENAI_API_KEY
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Implement Mapbox Tilequery service with caching
  - Create MapboxTilequeryService class in apps/bff/src/services/mapbox-tilequery.service.ts
  - Implement coordinate hashing function (round to 5 decimals, MD5 hash)
  - Implement cache lookup and storage methods using Prisma
  - Implement Mapbox Tilequery API client with proper error handling
  - Implement urban suitability validation logic (landuse whitelist, road distance ≤150m, building distance ≤80m)
  - Add cache TTL management (30 days)
  - Add logging for API calls and cache hit rate
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 7.1, 7.6, 7.7_

- [x] 3. Implement OpenAI rationale service with caching
  - Create OpenAIRationaleService class in apps/bff/src/services/openai-rationale.service.ts
  - Implement context hashing function (coordinate + scores)
  - Implement cache lookup and storage methods using Prisma
  - Implement OpenAI API client with prompt template
  - Add error handling with fallback generic rationale
  - Add cache TTL management (90 days)
  - Add logging for API calls, cache hit rate, and token usage
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.2, 7.6, 7.7_

- [x] 4. Add deterministic seed generation to expansion service
  - Update GenerationParams interface to include seed, targetCount, scenarioId, enableMapboxFiltering, enableAIRationale
  - Implement seed generation from hash of (region + aggression + populationBias + proximityBias + turnoverBias)
  - Update hex grid generation to use seed for deterministic random sampling
  - Update NMS tie-breaking to use seed for deterministic ordering
  - Add seed to generation response metadata
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 5. Integrate Mapbox filtering into expansion generation pipeline
  - Update ExpansionGenerationService to inject MapboxTilequeryService
  - Add applyMapboxFiltering method that validates each candidate
  - Filter out candidates that fail urban suitability checks
  - Enrich passing candidates with Mapbox metadata (urban_density_index, road_distance_m, building_distance_m, landuse_type)
  - Add enableMapboxFiltering parameter to allow disabling (backward compatibility)
  - Add logging for filtering metrics (candidates before/after, cache hit rate)
  - _Requirements: 5.1, 5.8, 5.9, 10.3, 10.4, 10.5, 12.1, 12.3_

- [x] 6. Integrate OpenAI rationale generation into expansion pipeline
  - Update ExpansionGenerationService to inject OpenAIRationaleService
  - Add generateRationales method that creates rationale for each validated candidate
  - Store rationale in ExpansionSuggestion.rationaleText field
  - Add enableAIRationale parameter to allow disabling (backward compatibility)
  - Add error handling to continue generation if OpenAI fails
  - Add logging for rationale generation metrics (API calls, cache hits, tokens used)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 12.2, 12.3_

- [x] 7. Implement scenario save API endpoint
  - Create POST /api/expansion/scenarios route in apps/admin/app/api/expansion/scenarios/route.ts
  - Accept scenario label, parameters, seed, and suggestions array
  - Create ExpansionScenario record with metadata
  - Create ExpansionSuggestion records for all suggestions
  - Return scenario ID and confirmation
  - Add error handling and validation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.8_

- [x] 8. Implement scenario load and list API endpoints
  - Create GET /api/expansion/scenarios/:id route to load single scenario
  - Create GET /api/expansion/scenarios route to list all scenarios
  - Include all suggestions with status and metadata
  - Add filtering by region and date range
  - Return scenario in format compatible with frontend rendering
  - _Requirements: 1.5, 1.6, 1.7_

- [x] 9. Implement progressive expansion API endpoint
  - Create POST /api/expansion/scenarios/:id/expand route
  - Load existing scenario with seed and parameters
  - Generate additional suggestions using same seed but higher targetCount
  - Filter out coordinates that already exist in scenario
  - Apply Mapbox and OpenAI processing to new candidates only
  - Add new suggestions to scenario in database
  - Return new suggestions for frontend rendering
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 10. Implement suggestion status update API endpoint
  - Create PATCH /api/expansion/suggestions/:id/status route
  - Accept status values: NEW, APPROVED, REJECTED, HOLD
  - Update ExpansionSuggestion.status field
  - Return updated suggestion
  - Add validation to ensure valid status transitions
  - _Requirements: 4.1, 4.2, 4.6_

- [x] 11. Update ExpansionControls component with scenario controls
  - Add "Scenario Controls" section to toolbar
  - Add target count selector (10, 30, 50, 100, 200)
  - Add "Expand Model" button with loading state
  - Add scenario metadata display (seed, count, status breakdown)
  - Add "Save Scenario" button with label input
  - Add scenario selector dropdown for loading saved scenarios
  - Wire up API calls for save, load, and expand operations
  - Add loading states and error handling
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 12. Add status-based marker rendering to map view
  - Update WorkingMapView to color-code markers by status (NEW: purple, APPROVED: green, REJECTED: gray, HOLD: yellow)
  - Add status badges to suggestion markers (✅ ⚠️ ❌)
  - Update marker color when status changes
  - Add status filter controls (show/hide by status)
  - Update map legend with status colors
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 13. Add review workflow to SuggestionInfoCard
  - Add status action buttons (Approve, Reject, Hold, Reset)
  - Wire up PATCH /api/expansion/suggestions/:id/status API call
  - Update marker color immediately on status change
  - Add visual feedback for status changes
  - Display current status badge in card header
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 14. Add rationale display to SuggestionInfoCard
  - Display AI-generated rationale text in card
  - Add "Why this location?" section header
  - Format rationale with proper typography
  - Add loading state while rationale is being generated
  - Add fallback message if rationale is unavailable
  - _Requirements: 6.5, 6.6_

- [x] 15. Implement telemetry and monitoring endpoints
  - Create GET /api/expansion/telemetry route
  - Track and return Mapbox API usage (calls, cache hits/misses, hit rate)
  - Track and return OpenAI API usage (calls, cache hits/misses, tokens, hit rate)
  - Track and return generation performance metrics (duration, suggestions generated/filtered)
  - Add cache hit rate display to admin UI
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 16. Add performance optimizations and rate limiting
  - Implement parallel processing for Mapbox and OpenAI calls (Promise.all with batching)
  - Add request queuing for Mapbox API (max 600/min)
  - Add request queuing for OpenAI API (max 3500/min)
  - Add retry logic with exponential backoff for API failures
  - Add performance logging (generation time, API call count, cache hit rate)
  - Cap initial testing at 50 suggestions, support up to 200 in production
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 17. Add cache cleanup and maintenance
  - Create cron job or scheduled task to delete expired cache entries
  - Implement cleanup query for MapboxTilequeryCache (WHERE expires_at < NOW())
  - Implement cleanup query for OpenAIRationaleCache (WHERE expires_at < NOW())
  - Add logging for cleanup operations
  - _Requirements: 7.5_

- [x] 18. Write integration tests for full generation flow
  - Test generation with Mapbox filtering enabled
  - Test generation with OpenAI rationale enabled
  - Test generation with both disabled (backward compatibility)
  - Test cache hit/miss scenarios
  - Test progressive expansion maintains spatial continuity
  - Test scenario save/load roundtrip
  - _Requirements: 2.4, 5.8, 6.4, 12.3, 12.4, 12.5, 12.6_
