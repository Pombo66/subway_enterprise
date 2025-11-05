# Implementation Plan

## Overview

This implementation plan breaks down the expansion suggestion quality improvements into discrete, manageable coding tasks. The plan follows a phased approach: (1) database and infrastructure setup, (2) core validation services, (3) H3 tiling and progressive batching, (4) OpenAI enhancement, (5) service integration, and (6) UI updates. Each task builds incrementally on previous work and includes specific file modifications.

---

## Phase 1: Database Schema and Infrastructure

- [x] 1. Create database migrations for new cache tables
  - Create Prisma migration for `LandValidationCache` table with fields: id, coordinateHash, lat, lng, isOnLand, distanceToCoastM, landPolygonId, rawResponse, expiresAt, createdAt
  - Create Prisma migration for `SnappingCache` table with fields: id, coordinateHash, originalLat, originalLng, snappedLat, snappedLng, snapTargetType, snapDistanceM, roadClass, buildingType, rawResponse, expiresAt, createdAt
  - Enhance `OpenAIRationaleCache` table with new fields: factors (Json), confidence (Float), dataCompleteness (Float), model (String), temperature (Float)
  - Add indexes on coordinateHash and expiresAt for all cache tables
  - Run migrations and generate Prisma client
  - _Requirements: 16, 17, 18, 21_

- [x] 2. Add environment variables for new configuration
  - Add `EXPANSION_COASTLINE_BUFFER_M=300` to .env.example
  - Add `EXPANSION_MAX_SNAP_DISTANCE_M=1500` to .env.example
  - Add `EXPANSION_H3_RESOLUTION=7` to .env.example
  - Add `EXPANSION_SAMPLES_PER_TILE=15` to .env.example
  - Add `EXPANSION_BATCH_SIZES=200,400,800,2000` to .env.example
  - Add `EXPANSION_TARGET_MIN=50` to .env.example
  - Add `EXPANSION_TARGET_MAX=150` to .env.example
  - Add `EXPANSION_NMS_MIN_DISTANCE_M=800` to .env.example
  - Add `EXPANSION_NMS_MAX_DISTANCE_M=1200` to .env.example
  - _Requirements: 16, 17, 19, 20_

---

## Phase 2: Core Validation Services

- [x] 3. Implement LandValidationService
  - [x] 3.1 Create service file and interface
    - Create `apps/admin/lib/services/land-validation.service.ts`
    - Define `LandValidationResult` interface with isOnLand, distanceToCoastM, landPolygonId, rejectionReason
    - Define `LandValidationService` class with COASTLINE_BUFFER_M and CACHE_TTL_DAYS constants
    - _Requirements: 16_
  
  - [x] 3.2 Implement land polygon validation
    - Implement `validateLand(lat, lng)` method that checks cache first
    - Implement `queryLandPolygon(lat, lng)` using Mapbox land layer or Natural Earth
    - Use Mapbox Tilequery API with 'landcover' layer to detect water vs land
    - Return true if land polygon found, false if water/ocean
    - _Requirements: 16_
  
  - [x] 3.3 Implement coastline distance calculation
    - Implement `calculateCoastlineDistance(lat, lng)` using Mapbox coastline features
    - Query Mapbox for nearest coastline/water boundary within 500m radius
    - Calculate distance using Turf.js distance function
    - Return null if no coastline found within query radius
    - _Requirements: 16_
  
  - [x] 3.4 Implement caching logic
    - Implement `cacheResult(hash, result)` to store in LandValidationCache table
    - Set expiresAt to 90 days from now
    - Implement `getFromCache(hash)` to retrieve cached results
    - Check expiration and delete expired entries
    - _Requirements: 16, 21_

- [x] 4. Implement SnappingService
  - [x] 4.1 Create service file and interfaces
    - Create `apps/admin/lib/services/snapping.service.ts`
    - Define `SnapTarget` interface with type, feature, distanceM, snappedLat, snappedLng, roadClass, buildingType
    - Define `SnappingResult` interface with success, originalLat, originalLng, snappedLat, snappedLng, snapTarget, rejectionReason
    - Define `SnappingService` class with MAX_SNAP_DISTANCE_M and ACCEPTED_ROAD_TYPES constants
    - _Requirements: 17_
  
  - [x] 4.2 Implement road snapping
    - Implement `findNearestRoad(lat, lng)` using Mapbox Tilequery API
    - Query for roads within 1.5km radius
    - Filter for accepted road types: motorway, trunk, primary, secondary, tertiary, residential
    - Calculate distance to each road using Turf.js
    - Return nearest road with distance and road class
    - _Requirements: 17, 22_
  
  - [x] 4.3 Implement building snapping
    - Implement `findNearestBuilding(lat, lng)` using Mapbox Tilequery API
    - Query for buildings within 1.5km radius
    - Accept any building type (building=* in OpenStreetMap)
    - Calculate distance to each building centroid using Turf.js
    - Return nearest building with distance and building type
    - _Requirements: 17, 22_
  
  - [x] 4.4 Implement snap point calculation
    - Implement `calculateSnapPoint(lat, lng, feature)` to compute snapped coordinates
    - For roads: snap to nearest point on road centerline
    - For buildings: snap to building centroid
    - Use Turf.js nearestPointOnLine for road snapping
    - Use Turf.js centroid for building snapping
    - _Requirements: 17_
  
  - [x] 4.5 Implement main snapping logic and caching
    - Implement `snapToInfrastructure(lat, lng)` that checks cache first
    - Call findNearestRoad and findNearestBuilding in parallel
    - Choose closest target (road or building)
    - Reject if no target within 1.5km
    - Calculate snap point and return SnappingResult
    - Implement caching in SnappingCache table with 90-day TTL
    - _Requirements: 17, 21, 22_

---

## Phase 3: H3 Tiling and Progressive Batching

- [x] 5. Implement H3TilingService
  - [x] 5.1 Install H3 library and create service file
    - Add `h3-js` package to apps/admin/package.json
    - Create `apps/admin/lib/services/h3-tiling.service.ts`
    - Define `H3TileConfig` interface with resolution, samplesPerTile, bounds
    - Define `H3Tile` interface with h3Index, center, bounds
    - Define `H3TilingService` class
    - _Requirements: 20_
  
  - [x] 5.2 Implement H3 tile generation
    - Implement `generateTiles(config)` using h3-js library
    - Convert bounding box to H3 hexagons at specified resolution
    - Use h3.polyfill to fill region with hexagons
    - Return array of H3Tile objects with centers and bounds
    - _Requirements: 20_
  
  - [x] 5.3 Implement resolution selection
    - Implement `determineResolution(areaKm2, storeCount)` to choose optimal H3 resolution
    - Use resolution 6 (~36 km² per hex) for very large regions (> 100,000 km²)
    - Use resolution 7 (~5 km² per hex) for large regions (10,000-100,000 km²)
    - Use resolution 8 (~0.7 km² per hex) for medium regions (< 10,000 km²)
    - Consider store density in resolution selection
    - _Requirements: 20_
  
  - [x] 5.4 Implement per-tile sampling
    - Implement `sampleCandidatesPerTile(tiles, candidates, samplesPerTile)` to distribute candidates evenly
    - Group candidates by their containing H3 tile
    - Sample fixed number of candidates per tile (e.g., 15)
    - Shuffle candidates within each tile for randomness
    - Prevent clustering by ensuring even geographic distribution
    - _Requirements: 20_

- [x] 6. Implement progressive batching in ExpansionGenerationService
  - [x] 6.1 Add progressive batch configuration
    - Add `ProgressiveBatchConfig` interface to expansion-generation.service.ts
    - Add `BatchYieldResult` interface for incremental results
    - Read batch sizes from EXPANSION_BATCH_SIZES environment variable
    - Read target min/max from EXPANSION_TARGET_MIN/MAX environment variables
    - Read NMS distance range from EXPANSION_NMS_MIN/MAX_DISTANCE_M
    - _Requirements: 19_
  
  - [x] 6.2 Implement async generator for progressive generation
    - Convert `generate()` method to `generateProgressive()` async generator
    - Yield `BatchYieldResult` after each batch completes
    - Include batchNumber, totalEvaluated, totalAccepted, isComplete in each yield
    - Allow UI to consume results incrementally
    - _Requirements: 19_
  
  - [x] 6.3 Implement batch processing loop
    - Implement `processBatch(candidates, batchSize)` to validate batch of candidates
    - Process batches in sequence: 200 → 400 → 800 → 2000
    - Stop when target max (150) suggestions reached
    - Stop when timeout (15 seconds) reached
    - Stop when all candidates exhausted
    - Track accepted, rejected, and rejection reasons per batch
    - _Requirements: 19_
  
  - [x] 6.4 Implement timeout and early termination
    - Add timeout check at start of each batch
    - Return partial results if timeout approaching (12 seconds elapsed)
    - Log warning when timeout reached
    - Include timeoutReached flag in metadata
    - _Requirements: 19_

---

## Phase 4: OpenAI Enhancement

- [x] 7. Enhance OpenAIRationaleService for mandatory generation
  - [x] 7.1 Update rationale input interface
    - Update `RationaleInput` interface in openai-rationale.service.ts
    - Add fields: nearestStoreKm, tradeAreaPopulation, proximityGapPercentile, turnoverPercentile
    - Allow "unknown" as value for missing data fields
    - Add snapTarget field with SnapTarget type
    - _Requirements: 18_
  
  - [x] 7.2 Update prompt generation with "unknown" flags
    - Modify `buildPrompt(input)` to handle "unknown" values
    - Include explicit "unknown" flags in prompt when data missing
    - Example: "nearest store distance: unknown (data not available)"
    - Instruct model to acknowledge data gaps in rationale
    - Use gpt-4o-mini model with temperature 0.2
    - _Requirements: 18_
  
  - [x] 7.3 Remove fallback logic and enforce mandatory generation
    - Remove any fallback text generation when OpenAI unavailable
    - Throw error if OpenAI API call fails
    - Reject candidate if rationale generation fails
    - Log OpenAI errors with full context
    - Do NOT emit INSUFFICIENT_DATA band unless OpenAI returns error
    - _Requirements: 18_
  
  - [x] 7.4 Enhance caching with new fields
    - Update cache to store factors (population, proximity, turnover) as JSON
    - Store confidence and dataCompleteness scores
    - Store model name (gpt-4o-mini) and temperature (0.2)
    - Update cache key hash to include all input parameters
    - Set cache TTL to 90 days
    - _Requirements: 18, 21_

---

## Phase 5: Service Integration

- [x] 8. Integrate validation services into ExpansionGenerationService
  - [x] 8.1 Add service dependencies
    - Add h3Service, landService, snappingService as class properties
    - Initialize services in constructor
    - Pass PrismaClient to services for caching
    - _Requirements: 16, 17, 20_
  
  - [x] 8.2 Implement candidate validation pipeline
    - Create `validateCandidate(candidate)` method
    - Step 1: Call landService.validateLand(lat, lng)
    - Step 2: Check coastline buffer (reject if < 300m)
    - Step 3: Call snappingService.snapToInfrastructure(lat, lng)
    - Step 4: Update candidate coordinates to snapped location
    - Step 5: Call existing Mapbox filtering (optional)
    - Step 6: Call openaiService.generateRationale() (mandatory)
    - Return enhanced candidate with validation metadata
    - _Requirements: 16, 17, 18_
  
  - [x] 8.3 Update processBatch to use validation pipeline
    - Modify `processBatch()` to call validateCandidate for each candidate
    - Track rejection reasons: in_water, too_close_to_coast, no_snap_target, openai_error
    - Accumulate accepted candidates with enhanced metadata
    - Log rejection statistics after each batch
    - _Requirements: 16, 17, 18_
  
  - [x] 8.4 Replace hex grid with H3 tiling
    - Replace `createHexGrid()` with h3Service.generateTiles()
    - Use h3Service.determineResolution() to select optimal resolution
    - Use h3Service.sampleCandidatesPerTile() for even distribution
    - Remove old hex grid generation code
    - _Requirements: 20_
  
  - [x] 8.5 Update suggestion data model
    - Add validation field to ExpansionSuggestionData with isOnLand, distanceToCoastM, snapTarget, originalLat, originalLng
    - Add aiRationale field with text, factors, dataCompleteness
    - Update createSuggestion() to include new fields
    - Ensure all suggestions have complete validation metadata
    - _Requirements: 16, 17, 18_

- [x] 9. Update API route for progressive generation
  - [x] 9.1 Modify POST handler to use async generator
    - Update `/api/expansion/generate/route.ts` to consume generateProgressive()
    - Iterate through batches using for-await-of loop
    - Accumulate suggestions from all batches
    - Return final result with all suggestions
    - _Requirements: 19_
  
  - [x] 9.2 Add streaming response support (optional)
    - Consider implementing Server-Sent Events (SSE) for real-time updates
    - Stream BatchYieldResult to client after each batch
    - Allow UI to render suggestions incrementally
    - Fall back to single response if streaming not supported
    - _Requirements: 19_

---

## Phase 6: UI Updates

- [x] 10. Update marker colors to teal
  - [x] 10.1 Update marker rendering logic
    - Modify `apps/admin/app/stores/map/components/MapView.tsx` (or equivalent map component)
    - Change AI suggestion marker color from current color to #06b6d4 (teal)
    - Ensure teal color applied to all expansion suggestion markers
    - Test marker visibility at different zoom levels
    - _Requirements: 15_
  
  - [x] 10.2 Update marker hover and selection states
    - Update hover state to use lighter teal (#22d3ee)
    - Update selected state to use darker teal (#0891b2)
    - Ensure teal markers remain distinct from existing store markers
    - _Requirements: 15_

- [x] 11. Update expansion legend
  - [x] 11.1 Update legend in ExpansionControls
    - Modify `apps/admin/app/stores/map/components/ExpansionControls.tsx`
    - Change legend entry from current color to teal (#06b6d4)
    - Update legend text to "AI suggestion (NEW)"
    - Remove old purple/gray legend entries for AI suggestions
    - _Requirements: 15_
  
  - [x] 11.2 Update legend styling
    - Ensure teal color swatch matches marker color exactly
    - Add "(NEW)" badge or indicator to highlight the change
    - Update legend layout if needed for clarity
    - _Requirements: 15_

- [x] 12. Enhance SuggestionPopover with validation metadata
  - [x] 12.1 Add validation details section
    - Modify `apps/admin/app/stores/map/components/expansion/SuggestionPopover.tsx`
    - Add "Validation Details" section after score breakdown
    - Display "On land" status with checkmark or X icon
    - Display coastline distance if available (e.g., "🌊 Coast distance: 450m")
    - Display snap target info (e.g., "📍 Snapped to: road (250m away)")
    - _Requirements: 16, 17_
  
  - [x] 12.2 Add AI rationale factors
    - Display factor-based rationale from OpenAI
    - Show population factor explanation
    - Show proximity factor explanation
    - Show turnover factor explanation
    - Highlight "unknown" data flags if present
    - _Requirements: 18_
  
  - [x] 12.3 Update popover styling
    - Ensure validation section has clear visual hierarchy
    - Use icons for quick scanning (✅, 🌊, 📍)
    - Add tooltips for technical terms
    - Test popover layout with all metadata fields
    - _Requirements: 15, 16, 17, 18_

---

## Phase 7: Logging and Monitoring

- [x] 13. Add comprehensive logging for new features
  - [x] 13.1 Add land validation logging
    - Add `logLandValidationRejection()` to ExpansionLogger
    - Log rejection reason (in_water or too_close_to_coast)
    - Log distance to coastline when available
    - Include coordinates in log for debugging
    - _Requirements: 16_
  
  - [x] 13.2 Add snapping logging
    - Add `logSnappingRejection()` to ExpansionLogger
    - Log nearest road distance and nearest building distance
    - Log snap target type and distance when successful
    - Include original and snapped coordinates
    - _Requirements: 17_
  
  - [x] 13.3 Add OpenAI logging
    - Add `logOpenAIRejection()` to ExpansionLogger
    - Log OpenAI error details
    - Log input parameters that caused error
    - Track OpenAI API call count and cache hit rate
    - _Requirements: 18_
  
  - [x] 13.4 Add progressive batching logging
    - Add `logProgressiveBatchComplete()` to ExpansionLogger
    - Log batch number, size, accepted count, rejected count
    - Log elapsed time per batch
    - Log cumulative statistics across batches
    - _Requirements: 19_
  
  - [x] 13.5 Add H3 tiling logging
    - Add `logH3TilingStats()` to ExpansionLogger
    - Log H3 resolution selected
    - Log tile count and samples per tile
    - Log total candidates generated
    - Log geographic distribution metrics
    - _Requirements: 20_

---

## Phase 8: Testing and Documentation

- [x] 14. Write unit tests for new services
  - [x] 14.1 Test LandValidationService
    - Test land vs water detection with mock Mapbox responses
    - Test coastline buffer calculation
    - Test cache hit and miss scenarios
    - Test expiration handling
    - _Requirements: 16_
  
  - [x] 14.2 Test SnappingService
    - Test road snapping with various road types
    - Test building snapping with various building types
    - Test rejection when no target found
    - Test snap distance calculations
    - Test cache behavior
    - _Requirements: 17_
  
  - [x] 14.3 Test H3TilingService
    - Test resolution selection for different region sizes
    - Test tile generation for various bounding boxes
    - Test per-tile sampling for even distribution
    - Test edge cases (very small/large regions)
    - _Requirements: 20_
  
  - [x] 14.4 Test OpenAIRationaleService enhancements
    - Test prompt generation with complete data
    - Test prompt generation with "unknown" flags
    - Test error handling (no fallback)
    - Test cache behavior with new fields
    - _Requirements: 18_
  
  - [x] 14.5 Test ExpansionGenerationService integration
    - Test progressive batching logic
    - Test validation pipeline execution
    - Test timeout handling
    - Test rejection reason tracking
    - _Requirements: 16, 17, 18, 19, 20_

- [x] 15. Write integration tests
  - [x] 15.1 Test full generation pipeline
    - Generate suggestions for test region (e.g., Belgium)
    - Verify all validation steps executed
    - Verify OpenAI rationale generated for all suggestions
    - Verify suggestions have validation metadata
    - _Requirements: 16, 17, 18_
  
  - [x] 15.2 Test progressive batching
    - Verify batches yield incrementally
    - Verify final count within target range (50-150)
    - Verify timeout handling
    - Verify early termination when target reached
    - _Requirements: 19_
  
  - [x] 15.3 Test cache performance
    - Run generation twice with same parameters
    - Verify cache hit rate > 80% on second run
    - Verify cache expiration after 90 days
    - Verify cache key uniqueness
    - _Requirements: 21_

- [x] 16. Update documentation
  - [x] 16.1 Update expansion predictor README
    - Document new validation pipeline
    - Document H3 tiling approach
    - Document progressive batching
    - Document environment variables
    - _Requirements: 16, 17, 18, 19, 20_
  
  - [x] 16.2 Update API documentation
    - Document new response fields (validation metadata)
    - Document progressive generation behavior
    - Document error codes for validation failures
    - Document cache behavior
    - _Requirements: 16, 17, 18, 19, 21_
  
  - [x] 16.3 Create troubleshooting guide
    - Document common validation failures
    - Document OpenAI error handling
    - Document cache debugging
    - Document performance tuning
    - _Requirements: 16, 17, 18, 21_

---

## Notes

- All tasks are required for comprehensive implementation
- Core implementation tasks (1-13) provide the main functionality
- Progressive batching (Phase 3) can be implemented in parallel with validation services (Phase 2)
- UI updates (Phase 6) can be done independently once API changes are complete
- All cache tables use 90-day TTL for consistency
- Server-side caching minimizes API costs and improves performance
- Teal color (#06b6d4) must be used consistently across all UI components
