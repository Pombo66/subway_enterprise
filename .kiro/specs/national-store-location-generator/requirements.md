# Requirements Document

## Introduction

The National Store Location Generator is a deterministic, cost-effective system for generating nationally comprehensive and fair Subway store location recommendations for any specified country. The system prioritizes correctness, coverage, and cost control while minimizing AI usage through caching and bounded operations.

## Glossary

- **Location_Generator**: The core system that processes geographic data and generates store location recommendations
- **Grid_Cell**: A uniform geographic cell (H3 r8-r9 or ~2-5 km²) used for national coverage analysis
- **Anchor_Point**: Points of interest such as malls, stations, or grocery stores that influence location scoring
- **Coverage_Gap**: Areas with insufficient brand presence relative to demand and competition
- **Fairness_Constraint**: Rules ensuring balanced distribution across country administrative regions
- **Spacing_Constraint**: Minimum distance requirements between store locations
- **AI_Module**: Optional component for weight adjustment and rationale generation with strict token limits
- **Target_Country**: The specific country for which store locations are being generated
- **Administrative_Region**: First-level administrative divisions within the target country (states, provinces, regions, etc.)

## Requirements

### Requirement 1

**User Story:** As a Subway expansion strategist, I want to generate a deterministic list of optimal store locations for any specified country, so that I can make data-driven expansion decisions with consistent results.

#### Acceptance Criteria

1. WHEN the Location_Generator processes Target_Country boundary data, THE Location_Generator SHALL create a uniform grid covering the entire country using H3 resolution 8-9 cells
2. THE Location_Generator SHALL compute coverage gap scores for each grid cell based on distance to nearest brand store, population demand, and competitor density
3. THE Location_Generator SHALL produce identical results when given the same input parameters and data versions
4. THE Location_Generator SHALL complete processing within 10 minutes for up to 300 target locations
5. THE Location_Generator SHALL maintain a reproducibility hash including seed, data versions, and scenario parameters

### Requirement 2

**User Story:** As a regional manager, I want fair distribution of new stores across administrative regions, so that no single region dominates the expansion plan.

#### Acceptance Criteria

1. THE Location_Generator SHALL enforce a configurable maximum share limit (default 40%) for any single Administrative_Region
2. THE Location_Generator SHALL apply population-weighted fairness calculations across all Administrative_Region divisions within Target_Country
3. WHEN shortlisting candidates, THE Location_Generator SHALL select top 1-3% nationally plus top slice per Administrative_Region
4. THE Location_Generator SHALL include major metropolitan areas in results unless explicitly suppressed with documented reasons
5. THE Location_Generator SHALL maintain minimum 15% acceptance rate with warnings if lower

### Requirement 3

**User Story:** As a site selection analyst, I want configurable spacing constraints between stores, so that I can prevent cannibalization while maximizing market coverage.

#### Acceptance Criteria

1. THE Location_Generator SHALL enforce minimum spacing of 800 meters between selected locations by default
2. THE Location_Generator SHALL allow configurable minimum spacing through minSpacingM parameter
3. THE Location_Generator SHALL apply spacing constraints between new candidates and existing brand stores
4. THE Location_Generator SHALL apply spacing constraints between selected candidate locations
5. THE Location_Generator SHALL reject candidates that violate spacing constraints during portfolio building

### Requirement 4

**User Story:** As a data analyst, I want the system to handle sparse or estimated data gracefully, so that location generation remains robust despite data quality variations.

#### Acceptance Criteria

1. WHEN population data is estimated, THE Location_Generator SHALL reduce population weight by 50% and redistribute to gap score
2. WHEN anchor data is estimated, THE Location_Generator SHALL reduce anchor weight by 50% and redistribute to gap score
3. THE Location_Generator SHALL compute data completeness scores for each location
4. THE Location_Generator SHALL reject locations with completeness scores below 0.5
5. THE Location_Generator SHALL include data quality indicators in output diagnostics

### Requirement 5

**User Story:** As a cost-conscious manager, I want minimal AI usage with strict cost controls, so that location generation remains economically viable for frequent use.

#### Acceptance Criteria

1. THE Location_Generator SHALL operate with AI_Module disabled by default
2. WHEN AI_Module is enabled, THE Location_Generator SHALL limit token usage to maximum 20,000 tokens per run
3. THE Location_Generator SHALL cache AI results for 24 hours using hash of Target_Country, candidate features, and mode
4. THE Location_Generator SHALL use only gpt-4o-mini model for weight adjustments and rationale generation
5. IF AI_Module fails or exceeds budget, THEN THE Location_Generator SHALL continue with deterministic weights and cached rationales

### Requirement 6

**User Story:** As a business analyst, I want comprehensive scoring that considers population, competition, and anchor points, so that location recommendations reflect real market dynamics.

#### Acceptance Criteria

1. THE Location_Generator SHALL compute normalized sub-scores for population, gap, anchor, performance, and saturation
2. THE Location_Generator SHALL apply default weights of population:0.25, gap:0.35, anchor:0.20, performance:0.20, saturation:0.15
3. THE Location_Generator SHALL implement diminishing returns for anchor points using formula Σ 1/√rank with maximum 25 anchors
4. THE Location_Generator SHALL apply anchor deduplication with type-specific merge radii: mall-tenant 120m, station-shops 100m, grocer-grocer 60m, retail-retail 60m
5. THE Location_Generator SHALL combine sub-scores into final weighted score for ranking

### Requirement 7

**User Story:** As a GIS specialist, I want windowed refinement for computational efficiency, so that detailed analysis is performed only on promising candidates.

#### Acceptance Criteria

1. THE Location_Generator SHALL partition Target_Country into 25-50 km windows with buffer zones for refinement
2. THE Location_Generator SHALL perform cheap feature computation on all grid cells during national sweep
3. THE Location_Generator SHALL perform refined feature computation only on shortlisted candidates within windows
4. THE Location_Generator SHALL use cached travel-time catchments when available, with radial fallback for missing data
5. THE Location_Generator SHALL maintain processing efficiency by limiting refined analysis to top 1-3% of candidates

### Requirement 8

**User Story:** As a quality assurance manager, I want comprehensive output validation and diagnostics, so that I can verify the integrity of location recommendations.

#### Acceptance Criteria

1. THE Location_Generator SHALL include constraint validation status for spacing and state share limits in each location output
2. THE Location_Generator SHALL provide portfolio summary with selected count, rejected count, and state distribution
3. THE Location_Generator SHALL generate diagnostics including weights used, anchor deduplication report, and rejection breakdown
4. THE Location_Generator SHALL include scoring distribution analysis in diagnostic output
5. THE Location_Generator SHALL validate that major metropolitan areas appear in results unless suppressed with documented reasons