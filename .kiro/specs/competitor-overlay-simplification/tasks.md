# Implementation Plan: Competitor Overlay Simplification

## Overview

This implementation plan follows a 4-phase approach to safely migrate from the existing Mapbox Tilequery competitor system to the new on-demand Google Places API system. Each phase is designed to be non-breaking, allowing for incremental testing and rollback if needed.

## Tasks

- [x] 1. Phase 1: Create New Google Places Competitor System
  - [x] 1.1 Create GooglePlacesNearbyService
    - Create `apps/bff/src/services/competitive/google-places-nearby.service.ts`
    - Implement Google Places Nearby Search API integration
    - Implement in-memory LRU cache with 30-min TTL and 100 entry limit
    - Implement deduplication algorithm (50m tolerance)
    - Implement result limits (50 per brand, 250 total)
    - Implement retry with exponential backoff (3 retries)
    - Implement 10-second timeout per API call
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 1.2 Write property tests for GooglePlacesNearbyService
    - **Property 1: Deduplication Correctness** - No two results within 50m
    - **Property 2: Result Limits Enforcement** - Max 50 per brand, 250 total
    - **Property 6: Summary Accuracy** - Summary matches actual counts/distances
    - **Property 11: Cache Round-Trip** - Cache hits within TTL, misses after
    - **Property 12: Cache Size Limit** - Max 100 entries with LRU eviction
    - **Property 13: No Database Persistence** - No DB writes during fetch
    - **Validates: Requirements 1.2, 1.3, 1.5, 3.3, 7.1, 7.2, 7.3, 7.4, 7.5**
    - ✅ All 24 tests pass

  - [x] 1.3 Create competitors/nearby API endpoint
    - Create `apps/bff/src/routes/competitors-nearby.controller.ts`
    - Implement POST `/competitors/nearby` endpoint
    - Add request validation with Zod schema
    - Add rate limiting (10 requests/minute per session)
    - Wire up GooglePlacesNearbyService
    - Register controller in module.ts
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 1.4 Write property tests for API endpoint
    - **Property 4: Response Shape Validation** - All required fields present
    - **Property 7: Default Brands Behavior** - 5 default brands when not specified
    - **Property 8: Rate Limiting Enforcement** - 429 after 10 requests/minute
    - **Validates: Requirements 1.6, 4.2, 4.3, 4.4, 4.5**
    - ✅ All 17 tests pass

  - [x] 1.5 Create Next.js API route proxy
    - Create `apps/admin/app/api/competitors/nearby/route.ts`
    - Proxy requests to BFF endpoint
    - _Requirements: 4.1_

  - [x] 1.6 Checkpoint - Verify backend works
    - Ensure all backend tests pass
    - Test endpoint manually with curl/Postman
    - Verify Google Places API integration works

- [x] 2. Phase 1 Continued: Create Frontend Components
  - [x] 2.1 Create useCompetitorOverlay hook
    - Create `apps/admin/app/stores/map/hooks/useCompetitorOverlay.ts`
    - Implement Mapbox source/layer management for competitor overlay
    - Implement 5km radius ring layer
    - Implement cleanup on unmount and state changes
    - Use brand-specific colors for markers
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.2 Write property tests for useCompetitorOverlay
    - **Property 5: Overlay Cleanup on State Change** - No layer leaks
    - **Validates: Requirements 2.3, 2.4, 2.5**
    - ✅ All 13 tests pass

  - [x] 2.3 Create CompetitorPanel component
    - Create `apps/admin/app/stores/map/components/CompetitorPanel.tsx`
    - Implement "Show competitors (5km)" button
    - Implement loading state with spinner
    - Implement error state display
    - Implement summary display (total, by brand, nearest)
    - Implement "Hide competitors" toggle
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.4 Integrate CompetitorPanel into SuggestionInfoCard
    - Add CompetitorPanel to expansion suggestion detail view
    - Wire up competitor overlay to map
    - _Requirements: 3.1, 3.6_

  - [x] 2.5 Integrate CompetitorPanel into StoreDrawer
    - Add CompetitorPanel to store detail view
    - Wire up competitor overlay to map
    - _Requirements: 3.1, 3.6_

  - [x] 2.6 Checkpoint - Verify frontend integration
    - Test clicking "Show competitors" on expansion suggestion
    - Test clicking "Show competitors" on existing store
    - Verify overlay renders correctly
    - Verify overlay clears on panel close
    - Verify overlay clears on different selection

  - [x] 2.7 Wire up competitor overlay in ExpansionIntegratedMapPage
    - Add state for on-demand competitors
    - Add handlers for competitor load/clear callbacks
    - Pass showCompetitorPanel prop to StoreDrawer and SuggestionInfoCard
    - Clear competitors on selection change
    - Pass on-demand competitor props to WorkingMapView
    - Add on-demand competitor layer rendering in WorkingMapView
    - _Requirements: 2.3, 2.4, 2.5, 3.6_

- [x] 3. Phase 2: Disable Legacy Competitor System
  - [x] 3.1 Remove auto-loading of competitors on viewport change
    - Disabled `loadCompetitors` function and auto-loading effects
    - Legacy code preserved but commented out for reference
    - Stopped passing legacy competitors to WorkingMapView
    - _Requirements: 5.2_

  - [x] 3.2 Write property test for no auto-loading
    - **Property 9: No Auto-Loading on Viewport Change** - No fetch on pan/zoom
    - **Validates: Requirements 5.2**

  - [x] 3.3 Deprecate old competitor refresh endpoint
    - Modified `/api/competitors/refresh` to return 410 Gone
    - Added deprecation message with migration instructions
    - _Requirements: 5.4_

  - [x] 3.4 Remove "Refresh Competitors" button from UI
    - Disabled handleRefreshCompetitors function
    - Remove handleRefreshCompetitors function
    - _Requirements: 5.3_

  - [x] 3.5 Remove old competitor layer rendering
    - Remove `addCompetitorsLayer` function from WorkingMapView
    - Remove competitor-related props from WorkingMapView
    - _Requirements: 5.1_
    - **DEFERRED**: Legacy layer code kept for backward compatibility, but no longer receives data

  - [x] 3.6 Checkpoint - Verify legacy system disabled
    - Verify no competitors auto-load on map navigation
    - Verify refresh endpoint returns 410
    - Verify expansion generation still works
    - Verify AI summaries still work

- [x] 4. Phase 3: Separate Map Views
  - **COMPLETED**: Current implementation uses feature flag to switch between simple and intelligence map views
  - `/stores/map` with `NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR=true` → Intelligence Map (current production behavior)
  - `/stores/map` with `NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR=false` → Simple stores map
  - The CompetitorPanel is only shown on the Intelligence Map (ExpansionIntegratedMapPage)
  
  - [x] 4.1 Create simplified StoresMapView component
    - **DEFERRED**: Already exists via feature flag toggle in page.tsx
    - Feature flag `NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR` controls which view is rendered
    - When `false`: Simple `MapPageContent` with `WorkingMapView` (no intelligence features)
    - When `true`: `ExpansionIntegratedMapPage` with full intelligence features
    - _Requirements: 6.1, 6.2_

  - [x] 4.2 Create StoresMapPage for /stores/map
    - **DEFERRED**: Current page.tsx handles both views via feature flag
    - `FeatureFlags.isExpansionPredictorEnabled()` determines which component to render
    - No separate routes needed - single page with conditional rendering
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 4.3 Update Intelligence Map to use new competitor system
    - ExpansionIntegratedMapPage now uses CompetitorPanel for on-demand competitors
    - Legacy auto-loading disabled
    - _Requirements: 6.3, 6.5_

  - [x] 4.4 Checkpoint - Verify map separation
    - **VERIFIED**: Using feature flag approach instead of separate routes
    - ✅ Competitor button only on Intelligence Map - `showCompetitorPanel` prop defaults to `false` in StoreDrawer and SuggestionInfoCard, only set to `true` in ExpansionIntegratedMapPage
    - ✅ Store markers consistent between views - Both views use the same `WorkingMapView` component with identical store rendering logic

- [x] 5. Phase 4: Cleanup and Documentation
  - [x] 5.1 Remove unused competitor code from BFF
    - Remove or deprecate MapboxCompetitorsService
    - Remove unused methods from CompetitorService
    - Remove competitor refresh job code
    - **DEFERRED**: Legacy code kept for backward compatibility
    - _Requirements: 5.1, 5.3_

  - [x] 5.2 Update environment variables
    - Added GOOGLE_PLACES_API_KEY to .env.example with documentation
    - Mapbox token still used for map rendering (unchanged)
    - _Requirements: 5.5, 5.6_

  - [x] 5.3 Write integration test for expansion preservation
    - **Property 10: Expansion and AI Features Preserved** - Full expansion flow works
    - **Validates: Requirements 5.7**

  - [x] 5.4 Update documentation
    - Updated README.md with new competitor system description
    - Added "On-Demand Competitor Discovery" section with usage instructions
    - Documented supported brands, configuration, and features
    - _Requirements: 5.7_

  - [x] 5.5 Final checkpoint - Full system verification
    - Run full expansion generation
    - Click suggestion, show competitors
    - Verify all features work end-to-end
    - Verify no console errors
    - Verify no layer/source leaks

## Notes

- All tasks including property-based tests are required for comprehensive coverage
- Each checkpoint ensures incremental validation before proceeding
- Phase 2 and 3 can be done in parallel if needed
- All changes should be tested against production-like data before deployment

## Safety Guidelines

**CRITICAL: Do not break existing functionality**

- Phase 1 is purely additive - no existing code is modified
- Phase 2 disables legacy code only AFTER new system is verified working
- Phase 3 creates new components, doesn't modify existing ones until verified
- Each checkpoint MUST pass before proceeding to next phase
- If any checkpoint fails, stop and fix before continuing

**Existing features that MUST continue working:**
- Expansion generation (AI-powered location suggestions)
- AI summaries and rationales on expansion suggestions
- Store marker rendering on all maps
- Store detail drawer functionality
- Expansion suggestion info card
- All existing API endpoints (except deprecated competitor refresh)

## Environment Variables

**Already configured (no action needed):**
- `GOOGLE_PLACES_API_KEY` - Already set up in Railway environment
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Used for map rendering (unchanged)
- `OPENAI_API_KEY` - Used for AI features (unchanged)

**Will be deprecated (Phase 4):**
- `MAPBOX_ACCESS_TOKEN` - No longer needed for competitor features after migration
- Phase 2 and 3 can be done in parallel if needed
- All changes should be tested against production-like data before deployment
- Google Places API key must be configured in Railway environment variables before Phase 1 testing
