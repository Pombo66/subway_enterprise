# Requirements Document

## Introduction

The Expansion Suggestion Generation system currently produces zero suggestions for large, sparse regions (e.g., Germany with 9 stores) due to overly strict urban suitability filters and insufficient candidate pool expansion. This spec addresses multiple quality and performance issues: (1) the Mapbox filtering logic rejects nearly all candidates because it requires primary roads and buildings within tight proximity thresholds, which is unrealistic for suburban and rural areas; (2) suggestions can appear in water or too close to coastlines; (3) suggestions aren't snapped to actual roads or buildings; (4) the UI marker colors are confusing; (5) OpenAI rationale generation has fallback logic that produces low-quality results; (6) the candidate generation is too slow and produces too few results for large regions. The system needs to dynamically expand the candidate pool with progressive batching, enforce land and coastline validation, snap to real infrastructure, require OpenAI rationale with proper error handling, use H3 tiling for better geographic distribution, and update UI markers to be more intuitive.

## Glossary

- **Expansion Generation System**: The backend service that generates store expansion suggestions using spatial analysis, Mapbox urban suitability validation, and OpenAI rationale generation
- **Mapbox Filtering**: The process of validating candidate locations using Mapbox Tilequery API to check for roads, buildings, landuse, and urban density
- **Candidate Pool**: The set of scored hexagonal grid cells that are considered for expansion suggestions before Mapbox filtering
- **Urban Suitability**: A measure of whether a location is appropriate for a retail store based on road access, building proximity, and landuse type
- **NMS**: Non-Maximum Suppression, a technique to enforce minimum distance between suggestions
- **Hex Grid**: A hexagonal grid overlay used for spatial analysis and scoring
- **H3 Tiling**: Uber's Hexagonal Hierarchical Spatial Index system for geographic tiling at resolution 6-7
- **Sparse Region**: A geographic area with low store density (< 0.01 stores per km²)
- **Rejection Reason**: A specific criterion that caused a candidate location to be filtered out (e.g., no_road, no_building, excluded_landuse, in_water, too_close_to_coast, no_snap_target)
- **Dynamic Expansion**: The process of iteratively increasing the candidate pool size until a minimum number of valid suggestions are found
- **Progressive Batching**: Generating candidates in increasing batch sizes (200→400→800→2000) with early yield to show results quickly
- **Deterministic Seed**: A value ensuring identical inputs produce identical outputs across multiple generation runs
- **Land Polygon**: A geographic polygon representing land areas (not water) from Mapbox land layer or Natural Earth dataset
- **Coastline Buffer**: A minimum distance (300m) that suggestions must be from coastlines or water bodies
- **Snapping**: The process of moving a candidate point to the nearest road or building centroid within a maximum distance
- **Tilequery**: Mapbox API for querying geographic features (roads, buildings, landuse) near a coordinate
- **AI Suggestion Marker**: A map marker indicating an AI-generated expansion suggestion, displayed in teal (#06b6d4)

## Requirements

### Requirement 1

**User Story:** As an expansion planner, I want the system to generate at least 50-100 viable expansion suggestions for large regions like Germany, so that I have sufficient options to evaluate for new store locations.

#### Acceptance Criteria

1. WHEN generating suggestions for a sparse region (< 0.01 stores per km²), THE Expansion Generation System SHALL dynamically expand the candidate pool until at least 50 valid suggestions are found
2. WHEN the initial candidate pool yields fewer than 50 suggestions after filtering, THE Expansion Generation System SHALL increase the candidate pool by 50% and retry
3. THE Expansion Generation System SHALL continue expanding the candidate pool up to a maximum of 2000 candidates
4. WHEN the maximum candidate limit is reached, THE Expansion Generation System SHALL return all valid suggestions found, even if fewer than 50
5. THE Expansion Generation System SHALL log each expansion iteration with candidate count and acceptance rate

### Requirement 2

**User Story:** As an expansion analyst, I want Mapbox filtering to accept reasonable populated areas including secondary and tertiary roads, so that suburban and rural locations are not incorrectly rejected.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL accept locations within 1000 meters of any road type (motorway, trunk, primary, secondary, tertiary, residential)
2. THE Expansion Generation System SHALL accept locations within 800 meters of buildings OR within 500 meters of populated places (locality, town, city, village)
3. THE Expansion Generation System SHALL accept locations with residential, commercial, retail, or industrial landuse types
4. THE Expansion Generation System SHALL reject locations with excluded landuse types (farmland, forest, water, wetland, park) only if no other valid landuse is present
5. THE Expansion Generation System SHALL accept locations that meet ANY of the following criteria: valid landuse OR (road access AND (building OR place))

### Requirement 3

**User Story:** As a system administrator, I want the expansion generation to complete within 15 seconds even for large regions, so that users receive timely results without timeout errors.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL enforce a maximum generation timeout of 15 seconds
2. WHEN the timeout is approaching (12 seconds elapsed), THE Expansion Generation System SHALL stop expanding the candidate pool and return current results
3. THE Expansion Generation System SHALL limit Mapbox API calls to a maximum of 2000 per generation request
4. THE Expansion Generation System SHALL use cached Mapbox results when available to reduce API calls
5. THE Expansion Generation System SHALL log performance metrics including total time, API calls, and cache hit rate

### Requirement 4

**User Story:** As a developer, I want detailed logging of rejection reasons for each filtering stage, so that I can debug why certain locations are being filtered out and tune the criteria accordingly.

#### Acceptance Criteria

1. WHEN a candidate is rejected by Mapbox filtering, THE Expansion Generation System SHALL log the specific rejection reason (no_road, no_building, excluded_landuse, no_valid_landuse)
2. THE Expansion Generation System SHALL log aggregate rejection statistics after each filtering pass
3. THE Expansion Generation System SHALL log the acceptance rate as a percentage for each iteration
4. THE Expansion Generation System SHALL log the final distribution of suggestions by confidence band (HIGH, MEDIUM, LOW, INSUFFICIENT_DATA)
5. THE Expansion Generation System SHALL include rejection reasons in the generation metadata returned to the client

### Requirement 5

**User Story:** As an expansion planner, I want expansion suggestions to be deterministic based on the seed parameter, so that I can reproduce identical results for the same region and parameters.

#### Acceptance Criteria

1. WHEN generating suggestions with the same seed and parameters, THE Expansion Generation System SHALL produce identical candidate locations
2. THE Expansion Generation System SHALL use the seed to deterministically shuffle and sample candidates
3. THE Expansion Generation System SHALL apply NMS (Non-Maximum Suppression) in a deterministic order based on score ranking
4. THE Expansion Generation System SHALL store the seed value with each scenario for reproducibility
5. WHEN Mapbox filtering is disabled, THE Expansion Generation System SHALL still produce deterministic results

### Requirement 6

**User Story:** As a cost-conscious administrator, I want the system to minimize Mapbox API usage through intelligent caching and batching, so that we control operational costs while maintaining functionality.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL cache Mapbox Tilequery results for 30 days based on coordinate hash
2. THE Expansion Generation System SHALL check the cache before making Mapbox API calls
3. THE Expansion Generation System SHALL log cache hit rate as a percentage in the generation metadata
4. THE Expansion Generation System SHALL reuse cached results across multiple generation requests for the same coordinates
5. THE Expansion Generation System SHALL gracefully degrade to accepting all candidates if Mapbox API is unavailable or rate-limited

### Requirement 7

**User Story:** As an expansion analyst, I want the system to prioritize high-quality suggestions while still providing lower-confidence options, so that I can focus on the best opportunities first while having backup options.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL sort suggestions by confidence score (descending) before applying final limits
2. THE Expansion Generation System SHALL assign confidence bands (HIGH >= 0.7, MEDIUM >= 0.5, LOW >= 0.3, INSUFFICIENT_DATA < 0.3)
3. THE Expansion Generation System SHALL include at least 30% HIGH or MEDIUM confidence suggestions when available
4. THE Expansion Generation System SHALL apply NMS to prevent clustering of suggestions within the minimum distance threshold
5. THE Expansion Generation System SHALL log the distribution of confidence bands in the generation metadata

### Requirement 8

**User Story:** As a developer, I want the Mapbox filtering logic to be configurable through environment variables, so that I can tune the filtering criteria without code changes.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL read MAX_ROAD_DISTANCE_M from environment variables (default 1000)
2. THE Expansion Generation System SHALL read MAX_BUILDING_DISTANCE_M from environment variables (default 800)
3. THE Expansion Generation System SHALL read TILEQUERY_RADIUS_M from environment variables (default 500)
4. THE Expansion Generation System SHALL read EXPANSION_MAX_CANDIDATES from environment variables (default 300)
5. THE Expansion Generation System SHALL read EXPANSION_MIN_SUGGESTIONS from environment variables (default 50)

### Requirement 9

**User Story:** As an expansion planner, I want the system to handle regions with varying store densities appropriately, so that both dense urban areas and sparse rural regions receive suitable suggestions.

#### Acceptance Criteria

1. WHEN store density is < 0.01 stores per km², THE Expansion Generation System SHALL use 5km hexagonal cells
2. WHEN store density is < 0.1 stores per km², THE Expansion Generation System SHALL use 2km hexagonal cells
3. WHEN store density is < 1 store per km², THE Expansion Generation System SHALL use 1km hexagonal cells
4. WHEN store density is >= 1 store per km², THE Expansion Generation System SHALL use 500m hexagonal cells
5. THE Expansion Generation System SHALL log the selected cell size and estimated cell count before generation

### Requirement 10

**User Story:** As a system administrator, I want the expansion generation to fail gracefully when external services are unavailable, so that users can still receive suggestions even if Mapbox or OpenAI are down.

#### Acceptance Criteria

1. WHEN Mapbox API is unavailable, THE Expansion Generation System SHALL skip filtering and return all scored candidates
2. WHEN OpenAI API is unavailable, THE Expansion Generation System SHALL use default rationale text without AI enhancement
3. THE Expansion Generation System SHALL log warnings when optional features are disabled due to service unavailability
4. THE Expansion Generation System SHALL include feature availability status in the generation metadata
5. THE Expansion Generation System SHALL NOT fail the entire generation request due to optional feature failures

### Requirement 11

**User Story:** As an expansion analyst, I want to understand why the system generated a specific number of suggestions, so that I can adjust parameters if needed to get more or fewer results.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL include totalCellsScored in the generation metadata
2. THE Expansion Generation System SHALL include totalGenerated (candidates before filtering) in the generation metadata
3. THE Expansion Generation System SHALL include mapboxFiltered (candidates after filtering) in the generation metadata
4. THE Expansion Generation System SHALL include finalCount (suggestions after NMS and limits) in the generation metadata
5. THE Expansion Generation System SHALL include rejectionStats (breakdown by reason) in the generation metadata

### Requirement 12

**User Story:** As a developer, I want the system to validate that sufficient candidates are being generated before applying expensive Mapbox filtering, so that I can identify issues with the scoring or grid generation logic.

#### Acceptance Criteria

1. WHEN the hex grid generates fewer than 100 cells, THE Expansion Generation System SHALL log a warning
2. WHEN NMS reduces candidates by more than 80%, THE Expansion Generation System SHALL log a warning
3. WHEN Mapbox filtering rejects more than 90% of candidates, THE Expansion Generation System SHALL log a warning with rejection breakdown
4. THE Expansion Generation System SHALL log the candidate count at each stage (grid, scored, NMS, filtered, final)
5. THE Expansion Generation System SHALL include stage-by-stage counts in the generation metadata

### Requirement 13

**User Story:** As an expansion planner, I want the system to respect the aggression parameter while ensuring minimum viable results, so that I can control the number of suggestions without getting zero results.

#### Acceptance Criteria

1. WHEN aggression is set to 100, THE Expansion Generation System SHALL attempt to return up to 200 suggestions
2. WHEN aggression is set to 50, THE Expansion Generation System SHALL attempt to return up to 100 suggestions
3. WHEN aggression is set to 0, THE Expansion Generation System SHALL attempt to return up to 50 suggestions
4. THE Expansion Generation System SHALL override the aggression-based target if it would result in fewer than 50 suggestions for sparse regions
5. THE Expansion Generation System SHALL log when the minimum suggestion override is applied

### Requirement 14

**User Story:** As a quality assurance engineer, I want the system to validate that generated suggestions meet basic quality criteria, so that users don't receive invalid or nonsensical recommendations.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL validate that all suggestions have valid latitude (-90 to 90) and longitude (-180 to 180)
2. THE Expansion Generation System SHALL validate that all suggestions have confidence scores between 0 and 1
3. THE Expansion Generation System SHALL validate that all suggestions are at least minDistanceM away from existing stores
4. THE Expansion Generation System SHALL validate that all suggestions are within the specified region bounds
5. THE Expansion Generation System SHALL log and exclude any suggestions that fail validation

### Requirement 15

**User Story:** As an expansion planner, I want AI-generated expansion suggestions to be displayed with teal markers on the map, so that I can easily distinguish them from existing stores and other marker types.

#### Acceptance Criteria

1. THE Map Display System SHALL render AI-generated expansion suggestions with teal color (#06b6d4)
2. THE Map Display System SHALL update the map legend to show "AI suggestion (NEW)" with teal color indicator
3. THE Map Display System SHALL ensure teal markers are visually distinct from existing store markers (purple/gray)
4. THE Map Display System SHALL apply teal color to both marker pins and any associated UI elements (popups, tooltips)
5. THE Map Display System SHALL maintain teal color consistency across all zoom levels and map states

### Requirement 16

**User Story:** As an expansion planner, I want all expansion suggestions to be validated as being on land and away from coastlines, so that I don't receive suggestions in water or too close to beaches where stores cannot be built.

#### Acceptance Criteria

1. WHEN validating a candidate location, THE Expansion Generation System SHALL verify the location is inside a land polygon using Mapbox land layer or Natural Earth dataset
2. THE Expansion Generation System SHALL reject candidates that fall within water bodies, oceans, or lakes
3. THE Expansion Generation System SHALL reject candidates within 300 meters of any coastline or water boundary
4. THE Expansion Generation System SHALL use cached land polygon data to minimize API calls
5. THE Expansion Generation System SHALL log rejection reason as "in_water" or "too_close_to_coast" when applicable

### Requirement 17

**User Story:** As an expansion planner, I want expansion suggestions to be snapped to the nearest road or building, so that suggestions represent realistic locations where stores can actually be built.

#### Acceptance Criteria

1. WHEN a candidate passes initial validation, THE Expansion Generation System SHALL query for the nearest road or building within 1.5 km using Mapbox Tilequery
2. THE Expansion Generation System SHALL snap the candidate to the nearest road centerline OR building centroid, whichever is closer
3. THE Expansion Generation System SHALL reject candidates if no road or building is found within 1.5 km
4. THE Expansion Generation System SHALL accept tertiary roads and higher (motorway, trunk, primary, secondary, tertiary, residential)
5. THE Expansion Generation System SHALL accept any building type (building=* in OpenStreetMap)
6. THE Expansion Generation System SHALL log the snap distance and feature type (road class or building) for each accepted candidate

### Requirement 18

**User Story:** As a system administrator, I want OpenAI rationale generation to be mandatory with proper error handling, so that all suggestions have high-quality AI-generated explanations without falling back to generic text.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL call OpenAI API for every accepted candidate to generate rationale
2. THE Expansion Generation System SHALL use gpt-4o-mini model with temperature 0.2 for consistent, concise rationales
3. WHEN input data is missing (nearest_store_km, trade_area_population, proximity_gap_percentile, turnover_percentile), THE Expansion Generation System SHALL pass "unknown" flags to OpenAI instead of skipping the call
4. THE Expansion Generation System SHALL NOT emit INSUFFICIENT_DATA confidence band unless OpenAI API returns an error
5. THE Expansion Generation System SHALL cache OpenAI rationale responses for 90 days based on input parameter hash
6. THE Expansion Generation System SHALL include factor-based rationale (population, proximity, turnover) in the response
7. WHEN OpenAI API is unavailable or returns an error, THE Expansion Generation System SHALL reject the candidate rather than using fallback text

### Requirement 19

**User Story:** As an expansion planner, I want the system to generate 50-150 accepted suggestions for large regions quickly, so that I have sufficient options to evaluate without waiting too long.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL target a minimum of 50 accepted suggestions and maximum of 150 per generation request
2. THE Expansion Generation System SHALL use progressive batching with sizes 200, 400, 800, and 2000 candidates
3. THE Expansion Generation System SHALL yield results to the UI after each batch completes, showing suggestions incrementally
4. THE Expansion Generation System SHALL stop generating additional batches once 150 accepted suggestions are reached
5. THE Expansion Generation System SHALL complete all batches within 15 seconds or return current results
6. THE Expansion Generation System SHALL maintain NMS minimum distance between 800-1200 meters to prevent clustering

### Requirement 20

**User Story:** As an expansion planner, I want the system to use H3 hexagonal tiling to ensure geographic distribution across countries, so that suggestions don't cluster in one area and I get coverage across the entire region.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL use H3 hexagonal tiling at resolution 6 or 7 for country-level regions
2. THE Expansion Generation System SHALL sample a fixed number of candidates per H3 tile to ensure geographic distribution
3. THE Expansion Generation System SHALL prevent "all in one stripe" clustering by enforcing per-tile sampling limits
4. THE Expansion Generation System SHALL log the H3 resolution and tile count used for each generation request
5. THE Expansion Generation System SHALL adjust H3 resolution based on region size (larger regions use lower resolution for broader coverage)

### Requirement 21

**User Story:** As a system administrator, I want all Mapbox API calls to be server-side with caching, so that we minimize costs, improve performance, and avoid exposing API keys to the client.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL execute all Mapbox Tilequery calls on the server side
2. THE Expansion Generation System SHALL cache Mapbox Tilequery responses for 90 days based on coordinate and query parameter hash
3. THE Expansion Generation System SHALL cache land polygon validation results for 90 days based on coordinate hash
4. THE Expansion Generation System SHALL log cache hit rate for Mapbox calls in generation metadata
5. THE Expansion Generation System SHALL NOT expose Mapbox API keys or tokens to the client browser

### Requirement 22

**User Story:** As an expansion planner, I want the system to accept a wider range of road types and any building, so that suburban and rural locations are not incorrectly rejected due to overly strict infrastructure requirements.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL accept candidates within 1.5 km of tertiary roads or higher (motorway, trunk, primary, secondary, tertiary, residential)
2. THE Expansion Generation System SHALL accept candidates within 1.5 km of any building type (building=* in OpenStreetMap)
3. THE Expansion Generation System SHALL accept candidates that have EITHER a road OR a building within 1.5 km (not both required)
4. THE Expansion Generation System SHALL prioritize snapping to roads over buildings when both are available at similar distances
5. THE Expansion Generation System SHALL log the accepted feature type (road class or building) for debugging and quality analysis
