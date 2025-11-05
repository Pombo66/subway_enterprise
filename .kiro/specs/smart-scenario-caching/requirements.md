# Requirements Document

## Introduction

This specification defines requirements for enhancing the Expansion Predictor with scenario caching, deterministic generation, progressive expansion, and Mapbox-based urban suitability filtering. The system will use Mapbox Tilequery API for spatial validation and OpenAI for rationale generation, with aggressive caching to minimize API costs. This ensures executives can iteratively build validated expansion plans with consistency, credibility, and realistic urban locations.

## Glossary

- **Scenario**: A saved set of expansion suggestions with parameters, seed, and metadata
- **Seed**: Deterministic random seed ensuring reproducible generation results
- **Progressive Expansion**: Incremental addition of suggestions to existing scenario (10 → 30 → 50 → 200)
- **Mapbox Tilequery**: API for querying map features (land use, roads, buildings) at specific coordinates
- **Urban Suitability**: Validation that a location is in urban/commercial area with road and building access
- **Rationale**: AI-generated explanation for why a location was selected
- **Review State**: User feedback on suggestion (pending, approved, rejected, hold)
- **Cache**: Stored API responses (Tilequery, OpenAI) keyed by coordinate hash to prevent duplicate calls

## Requirements

### Requirement 1: Scenario Save & Load System

**User Story:** As a business analyst, I want to save expansion scenarios with all suggestions and metadata, so that I can review them later or share with stakeholders.

#### Acceptance Criteria

1. THE System SHALL provide POST `/api/expansion/scenarios/save` endpoint
2. THE System SHALL store scenario with id, label, region, seed, timestamp, parameters
3. THE System SHALL store all suggestions with coordinates, metadata, rationale, confidence, status
4. THE System SHALL store cached Mapbox Tilequery results per suggestion
5. THE System SHALL provide GET `/api/expansion/scenarios/:id` endpoint to load saved scenario
6. THE System SHALL provide GET `/api/expansion/scenarios` endpoint to list all scenarios
7. THE System SHALL return identical map layout when loading saved scenario
8. THE System SHALL use existing ExpansionScenario and ExpansionSuggestion Prisma models

### Requirement 2: Deterministic Generation with Seed

**User Story:** As a business analyst, I want expansion generation to be reproducible, so that running the same parameters always produces the same results.

#### Acceptance Criteria

1. THE System SHALL accept a `seed` parameter in generation requests
2. WHERE seed is not provided, THE System SHALL generate seed from hash of (region + aggression + populationBias + proximityBias + turnoverBias)
3. THE System SHALL use seed for all random operations (hex grid sampling, NMS tie-breaking)
4. THE System SHALL return identical suggestions when re-run with same seed and parameters
5. THE System SHALL store seed with each scenario
6. THE System SHALL display seed in UI for transparency

### Requirement 3: Progressive Expansion Flow

**User Story:** As a business analyst, I want to incrementally expand a scenario from 10 to 50 to 200 suggestions, so that I can validate small batches before generating more.

#### Acceptance Criteria

1. THE System SHALL provide "Expand Model" button in UI
2. THE System SHALL support target counts: 10, 30, 50, 100, 200
3. WHEN expanding, THE System SHALL use same seed and parameters as original generation
4. THE System SHALL add new suggestions without replacing existing ones
5. THE System SHALL render new markers layered on previous markers
6. THE System SHALL maintain spatial continuity (no gaps or overlaps)
7. THE System SHALL update scenario with new suggestions
8. THE System SHALL disable "Expand" button when at maximum count (200)

### Requirement 4: Review & Approval Workflow

**User Story:** As a business analyst, I want to approve or reject individual suggestions, so that I can build a validated expansion plan.

#### Acceptance Criteria

1. THE System SHALL support suggestion statuses: NEW, APPROVED, REJECTED, HOLD
2. THE System SHALL provide PATCH `/api/expansion/suggestions/:id/status` endpoint
3. THE System SHALL display status badges on suggestion markers (✅ ⚠️ ❌)
4. THE System SHALL filter approved suggestions to separate layer
5. THE System SHALL exclude approved locations from future expansion in same scenario
6. THE System SHALL persist status changes to database
7. THE System SHALL display status counts in scenario summary

### Requirement 5: Mapbox Tilequery Urban Suitability Filtering

**User Story:** As a business analyst, I want all suggestions to be in viable urban locations with road and building access, so that recommendations are realistic and actionable.

#### Acceptance Criteria

1. BEFORE displaying suggestions, THE System SHALL validate each coordinate with Mapbox Tilequery API
2. THE System SHALL query for land use, roads, and buildings within 150m radius
3. THE System SHALL accept locations with land use: residential, commercial, retail, industrial
4. THE System SHALL reject locations with land use: farmland, forest, water, wetland, park
5. THE System SHALL require location to be within 150m of primary or secondary road
6. THE System SHALL require location to be within 80m of existing building polygon
7. THE System SHALL enrich each suggestion with: urban_density_index, road_distance_m, building_distance_m, landuse_type
8. THE System SHALL reject candidates failing urban suitability checks before AI rationale generation
9. THE System SHALL cache Tilequery results per coordinate (rounded to 5 decimals)
10. THE System SHALL log Tilequery API usage and cache hit rate

### Requirement 6: OpenAI Rationale Generation

**User Story:** As a business analyst, I want AI-generated explanations for each suggestion, so that I can understand and communicate why locations were selected.

#### Acceptance Criteria

1. AFTER Mapbox filtering, THE System SHALL generate rationale for each suggestion using OpenAI API
2. THE System SHALL include in prompt: location coordinates, population density, proximity to stores, road access, building density
3. THE System SHALL request concise rationale (2-3 sentences) explaining selection
4. THE System SHALL cache rationale per coordinate hash to minimize API costs
5. THE System SHALL store rationale in ExpansionSuggestion.rationaleText field
6. THE System SHALL display rationale in SuggestionInfoCard
7. THE System SHALL handle OpenAI API errors gracefully with fallback generic rationale
8. THE System SHALL log OpenAI API usage and cache hit rate

### Requirement 7: Aggressive Caching Strategy

**User Story:** As a developer, I want to minimize Mapbox and OpenAI API costs through aggressive caching, so that we can scale the system economically.

#### Acceptance Criteria

1. THE System SHALL cache Mapbox Tilequery responses keyed by coordinate hash (lat/lng rounded to 5 decimals)
2. THE System SHALL cache OpenAI rationale responses keyed by coordinate hash + context hash
3. THE System SHALL use Redis or database table for cache storage
4. THE System SHALL set cache TTL to 30 days for Tilequery results
5. THE System SHALL set cache TTL to 90 days for OpenAI rationales
6. THE System SHALL check cache before making external API calls
7. THE System SHALL log cache hit rate for monitoring
8. THE System SHALL expect ≤ 10-20 Tilequery calls per generation due to caching

### Requirement 8: UI Scenario Controls

**User Story:** As a business analyst, I want intuitive controls for managing scenarios, so that I can easily generate, save, load, and expand expansion plans.

#### Acceptance Criteria

1. THE System SHALL add "Scenario Controls" section to expansion toolbar
2. THE System SHALL provide buttons: Generate, Save, Expand, Load Scenario
3. THE System SHALL display current scenario metadata: seed, timestamp, suggestion count
4. THE System SHALL provide scenario selector dropdown
5. THE System SHALL display status counts: X approved, Y pending, Z rejected
6. THE System SHALL show seed value for transparency
7. THE System SHALL disable "Expand" when at max count (200)
8. THE System SHALL show loading states during generation/expansion

### Requirement 9: Visual Status Indicators

**User Story:** As a business analyst, I want to see suggestion status at a glance on the map, so that I can quickly identify approved, pending, and rejected locations.

#### Acceptance Criteria

1. THE System SHALL color-code suggestion markers by status:
   - NEW/PENDING: Purple (🟣 AI Recommended)
   - APPROVED: Green (🟢 Approved)
   - REJECTED: Red/Gray (❌ Rejected)
   - HOLD: Yellow (⚠️ Hold)
2. THE System SHALL update marker color when status changes
3. THE System SHALL add status badges to SuggestionInfoCard
4. THE System SHALL update map legend with status colors
5. THE System SHALL filter markers by status (show/hide approved, rejected, etc.)

### Requirement 10: Performance & Scalability

**User Story:** As a developer, I want the system to handle 200 suggestions efficiently, so that generation and expansion remain fast.

#### Acceptance Criteria

1. THE System SHALL cap suggestions at 50 during initial testing
2. THE System SHALL support up to 200 suggestions in production
3. THE System SHALL complete generation with Mapbox filtering in < 30 seconds for 50 suggestions
4. THE System SHALL batch Tilequery requests where possible
5. THE System SHALL use parallel processing for Mapbox and OpenAI calls
6. THE System SHALL log performance metrics (generation time, API call count, cache hit rate)
7. THE System SHALL handle API rate limits gracefully with retry logic

### Requirement 11: Telemetry & Monitoring

**User Story:** As a developer, I want to monitor API usage and cache effectiveness, so that I can optimize costs and performance.

#### Acceptance Criteria

1. THE System SHALL log Mapbox Tilequery API calls (count, cache hits, cache misses)
2. THE System SHALL log OpenAI API calls (count, cache hits, cache misses, tokens used)
3. THE System SHALL log generation performance (duration, suggestions generated, suggestions filtered)
4. THE System SHALL provide GET `/api/expansion/telemetry` endpoint for metrics
5. THE System SHALL display cache hit rates in admin UI
6. THE System SHALL alert if cache hit rate < 50%
7. THE System SHALL alert if API costs exceed budget threshold

### Requirement 12: Backward Compatibility

**User Story:** As a user, I want existing expansion generation to continue working, so that new features don't break current functionality.

#### Acceptance Criteria

1. THE System SHALL make Mapbox filtering optional via `enableMapboxFiltering` parameter (default true)
2. THE System SHALL make OpenAI rationale optional via `enableAIRationale` parameter (default true)
3. WHERE Mapbox filtering is disabled, THE System SHALL use existing generation logic
4. THE System SHALL maintain existing ExpansionParams interface with new optional fields
5. THE System SHALL NOT change response format for existing clients
6. THE System SHALL support loading old scenarios without Mapbox/OpenAI data
