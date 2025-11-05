# Advanced Expansion Strategies - Requirements Document

## Introduction

The current expansion suggestion system uses basic scoring (population, proximity, turnover) to identify potential locations. This spec introduces four advanced strategic approaches that align with real-world retail expansion methodologies: (1) White Space Strategy for coverage gap analysis, (2) Population-Density Bias incorporating growth and economic indicators, (3) Proximity to High-Traffic Anchors leveraging natural footfall generators, and (4) Performance Clustering to replicate successful patterns. These strategies will provide executives with data-driven, business-aligned expansion recommendations.

## Glossary

- **White Space**: Geographic areas with no store presence within a defined catchment radius
- **Coverage Radius**: The maximum distance a customer will travel to reach a store (varies by urban/rural)
- **Catchment Area**: The geographic area from which a store draws customers
- **High-Traffic Anchor**: A location that naturally generates significant footfall (stations, universities, malls)
- **Performance Clustering**: Geographic grouping of high-performing stores
- **Distance Decay**: The principle that influence decreases with distance from a point
- **OSM (OpenStreetMap)**: Open-source geographic database with POI categories
- **Turnover Percentile**: A store's sales performance relative to all stores in the network
- **Growth Rate**: Year-over-year population or economic growth percentage
- **Median Income**: The middle value of household income in an area
- **Footfall**: The number of people passing through or visiting a location
- **Radial Expansion**: Expanding outward in a circular pattern from a central point
- **Success Pattern**: A geographic or demographic configuration associated with high-performing stores

## Requirements

### Requirement 1: White Space Strategy - Coverage Gap Analysis

**User Story:** As an expansion planner, I want to identify geographic areas with no Subway presence within a defined catchment radius, so that I can fill obvious coverage gaps in underserved markets.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL calculate the distance to the nearest existing store for each candidate location
2. THE Expansion Generation System SHALL define coverage radius thresholds: 10-15 km for urban areas, 25 km for rural areas
3. WHEN a candidate is beyond the coverage radius from any existing store, THE Expansion Generation System SHALL classify it as "white space"
4. THE Expansion Generation System SHALL boost the score of white space candidates by 20-30%
5. WHEN a white space candidate is in a municipality with population > 10,000, THE Expansion Generation System SHALL apply an additional 15% boost
6. THE Expansion Generation System SHALL include white space classification in the suggestion metadata
7. THE Expansion Generation System SHALL log the number of white space opportunities identified per generation

### Requirement 2: White Space Strategy - Urban vs Rural Classification

**User Story:** As an expansion analyst, I want the system to automatically classify areas as urban or rural, so that appropriate coverage radius thresholds are applied.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL use population density to classify areas: urban (>400 people/km²), suburban (150-400), rural (<150)
2. THE Expansion Generation System SHALL apply 10-15 km coverage radius for urban areas
3. THE Expansion Generation System SHALL apply 15-20 km coverage radius for suburban areas
4. THE Expansion Generation System SHALL apply 25 km coverage radius for rural areas
5. THE Expansion Generation System SHALL include area classification in suggestion metadata
6. THE Expansion Generation System SHALL allow configuration of classification thresholds via environment variables

### Requirement 3: Population-Density Bias - Economic Indicators

**User Story:** As an expansion planner, I want suggestions weighted by population growth and median income, so that I prioritize areas with growing economic demand.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL integrate population data at municipality or postal code level
2. THE Expansion Generation System SHALL integrate population growth rate data (year-over-year %)
3. THE Expansion Generation System SHALL integrate median household income data
4. THE Expansion Generation System SHALL calculate economic score as: population × (1 + growth_rate) × (income_index)
5. THE Expansion Generation System SHALL normalize income using national median as baseline (income_index = local_income / national_median)
6. THE Expansion Generation System SHALL weight suggestions by economic score with configurable bias (default 0.3)
7. THE Expansion Generation System SHALL include economic indicators in suggestion rationale

### Requirement 4: Population-Density Bias - Growth Trajectory

**User Story:** As an expansion analyst, I want to prioritize areas with positive population growth, so that I invest in markets with expanding customer bases.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL identify areas with population growth > 2% annually as "high growth"
2. THE Expansion Generation System SHALL apply 25% score boost to high growth areas
3. THE Expansion Generation System SHALL identify areas with population decline as "declining markets"
4. THE Expansion Generation System SHALL apply 20% score penalty to declining markets
5. THE Expansion Generation System SHALL include growth trajectory classification in suggestion metadata
6. THE Expansion Generation System SHALL allow configuration of growth thresholds via environment variables

### Requirement 5: High-Traffic Anchors - Transport Hubs

**User Story:** As an expansion planner, I want to identify locations near rail stations and transport hubs, so that I can leverage natural footfall from commuters.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL query OpenStreetMap for railway stations within 500m of candidates
2. THE Expansion Generation System SHALL query OpenStreetMap for bus terminals within 300m of candidates
3. THE Expansion Generation System SHALL query OpenStreetMap for metro/subway stations within 400m of candidates
4. WHEN a candidate is within proximity threshold of a transport hub, THE Expansion Generation System SHALL apply anchor boost (+15 points)
5. THE Expansion Generation System SHALL classify transport hubs by size: major (>10k daily passengers), medium (2-10k), minor (<2k)
6. THE Expansion Generation System SHALL apply larger boosts for major hubs (20 points) vs minor hubs (10 points)
7. THE Expansion Generation System SHALL include nearest transport hub details in suggestion metadata

### Requirement 6: High-Traffic Anchors - Educational Institutions

**User Story:** As an expansion analyst, I want to identify locations near universities and colleges, so that I can target high-footfall student populations.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL query OpenStreetMap for universities within 600m of candidates
2. THE Expansion Generation System SHALL query OpenStreetMap for colleges within 500m of candidates
3. THE Expansion Generation System SHALL estimate student population using institution size indicators
4. WHEN a candidate is within proximity threshold of a university, THE Expansion Generation System SHALL apply anchor boost (+18 points)
5. THE Expansion Generation System SHALL apply larger boosts for institutions with >10,000 students (25 points)
6. THE Expansion Generation System SHALL include nearest educational institution details in suggestion metadata
7. THE Expansion Generation System SHALL consider academic calendar seasonality in rationale

### Requirement 7: High-Traffic Anchors - Retail Centers

**User Story:** As an expansion planner, I want to identify locations near shopping centers and retail parks, so that I can benefit from existing retail footfall.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL query OpenStreetMap for shopping malls within 400m of candidates
2. THE Expansion Generation System SHALL query OpenStreetMap for retail parks within 500m of candidates
3. THE Expansion Generation System SHALL query OpenStreetMap for supermarkets within 300m of candidates
4. WHEN a candidate is within proximity threshold of a retail center, THE Expansion Generation System SHALL apply anchor boost (+12 points)
5. THE Expansion Generation System SHALL classify retail centers by size: large (>50 shops), medium (20-50), small (<20)
6. THE Expansion Generation System SHALL apply larger boosts for large retail centers (18 points) vs small (8 points)
7. THE Expansion Generation System SHALL include nearest retail center details in suggestion metadata

### Requirement 8: High-Traffic Anchors - Motorway Service Stations

**User Story:** As an expansion analyst, I want to identify locations near motorway service stations, so that I can capture highway traveler demand.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL query OpenStreetMap for motorway service areas within 200m of candidates
2. THE Expansion Generation System SHALL query OpenStreetMap for petrol stations on major roads within 300m of candidates
3. WHEN a candidate is within proximity threshold of a service station, THE Expansion Generation System SHALL apply anchor boost (+20 points)
4. THE Expansion Generation System SHALL prioritize service stations on high-traffic motorways (>50k vehicles/day)
5. THE Expansion Generation System SHALL include nearest service station details in suggestion metadata
6. THE Expansion Generation System SHALL consider 24/7 accessibility in rationale

### Requirement 9: High-Traffic Anchors - Composite Scoring

**User Story:** As an expansion planner, I want candidates near multiple anchors to receive cumulative benefits, so that multi-anchor locations are prioritized.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL calculate total anchor score by summing individual anchor boosts
2. THE Expansion Generation System SHALL cap maximum anchor boost at 50 points to prevent over-weighting
3. THE Expansion Generation System SHALL apply diminishing returns: 2nd anchor = 80% boost, 3rd anchor = 60% boost
4. THE Expansion Generation System SHALL identify "super locations" with 3+ anchors within 500m
5. THE Expansion Generation System SHALL include anchor count and types in suggestion metadata
6. THE Expansion Generation System SHALL generate rationale highlighting multi-anchor advantage

### Requirement 10: Performance Clustering - High-Performer Identification

**User Story:** As an expansion analyst, I want to identify clusters of high-performing stores, so that I can understand what geographic patterns drive success.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL classify stores as "high performers" when turnover > 75th percentile
2. THE Expansion Generation System SHALL identify geographic clusters of 3+ high performers within 15 km
3. THE Expansion Generation System SHALL calculate cluster centroid and radius
4. THE Expansion Generation System SHALL assign cluster strength score based on average turnover and store count
5. THE Expansion Generation System SHALL include cluster identification in generation metadata
6. THE Expansion Generation System SHALL log cluster statistics (count, average turnover, geographic spread)

### Requirement 11: Performance Clustering - Radial Expansion

**User Story:** As an expansion planner, I want suggestions near high-performing clusters, so that I can replicate successful patterns in adjacent areas.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL identify candidates within 10 km of high-performer clusters
2. THE Expansion Generation System SHALL apply distance decay formula: boost = base_boost × (1 - distance/10km)
3. THE Expansion Generation System SHALL apply maximum cluster proximity boost of 30 points at cluster center
4. THE Expansion Generation System SHALL apply minimum cluster proximity boost of 5 points at 10 km boundary
5. THE Expansion Generation System SHALL include nearest cluster details in suggestion metadata
6. THE Expansion Generation System SHALL generate rationale: "Mirrors success pattern in high-performing corridor"

### Requirement 12: Performance Clustering - Pattern Recognition

**User Story:** As an expansion analyst, I want the system to identify common characteristics of high-performing clusters, so that I can apply these patterns to new markets.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL analyze demographic patterns in high-performer clusters
2. THE Expansion Generation System SHALL analyze anchor proximity patterns in high-performer clusters
3. THE Expansion Generation System SHALL identify common characteristics: average income, population density, anchor types
4. THE Expansion Generation System SHALL boost candidates matching cluster patterns by 15%
5. THE Expansion Generation System SHALL include pattern match score in suggestion metadata
6. THE Expansion Generation System SHALL generate rationale explaining pattern similarity

### Requirement 13: Strategy Selection and Weighting

**User Story:** As an expansion planner, I want to configure which strategies are active and their relative weights, so that I can customize the expansion approach for different markets.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL allow enabling/disabling each strategy via configuration
2. THE Expansion Generation System SHALL allow configuring strategy weights: white_space_weight, economic_weight, anchor_weight, cluster_weight
3. THE Expansion Generation System SHALL normalize weights to sum to 1.0
4. THE Expansion Generation System SHALL calculate final score as weighted sum of strategy scores
5. THE Expansion Generation System SHALL include active strategies and weights in generation metadata
6. THE Expansion Generation System SHALL validate that at least one strategy is enabled

### Requirement 14: Strategy-Specific Rationale

**User Story:** As an expansion analyst, I want AI-generated rationales to explain which strategies influenced each suggestion, so that I understand the recommendation logic.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL include strategy breakdown in OpenAI rationale prompt
2. THE Expansion Generation System SHALL request OpenAI to explain top 2-3 contributing strategies
3. THE Expansion Generation System SHALL include specific metrics: "15 km from nearest store (white space)", "Near university with 12k students"
4. THE Expansion Generation System SHALL generate executive-friendly language: "Fills coverage gap in growing market"
5. THE Expansion Generation System SHALL include strategy scores in suggestion metadata
6. THE Expansion Generation System SHALL allow filtering suggestions by dominant strategy

### Requirement 15: Data Source Integration

**User Story:** As a system administrator, I want to configure data sources for population, income, and growth data, so that the system can access required economic indicators.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL support CSV file import for population data
2. THE Expansion Generation System SHALL support API integration with national statistics services
3. THE Expansion Generation System SHALL cache demographic data for 90 days
4. THE Expansion Generation System SHALL validate data completeness and log missing areas
5. THE Expansion Generation System SHALL gracefully degrade when data unavailable (use "unknown" flags)
6. THE Expansion Generation System SHALL include data source and freshness in generation metadata

### Requirement 16: OpenStreetMap Integration

**User Story:** As a system administrator, I want the system to query OpenStreetMap for anchor locations, so that high-traffic locations are identified automatically.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL use Overpass API to query OSM data
2. THE Expansion Generation System SHALL query for: railway=station, amenity=university, shop=mall, highway=services
3. THE Expansion Generation System SHALL cache OSM queries for 30 days
4. THE Expansion Generation System SHALL handle OSM API rate limits gracefully
5. THE Expansion Generation System SHALL log OSM query statistics (queries, cache hits, features found)
6. THE Expansion Generation System SHALL allow fallback to Mapbox POI data if OSM unavailable

### Requirement 17: Performance Metrics and Reporting

**User Story:** As an expansion analyst, I want to see how many suggestions were influenced by each strategy, so that I can understand which approaches are most productive.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL track suggestion count per strategy
2. THE Expansion Generation System SHALL calculate average score contribution per strategy
3. THE Expansion Generation System SHALL identify top strategy for each suggestion
4. THE Expansion Generation System SHALL include strategy distribution in generation metadata
5. THE Expansion Generation System SHALL log strategy effectiveness metrics
6. THE Expansion Generation System SHALL generate summary: "45% white space, 30% anchor proximity, 25% cluster expansion"

### Requirement 18: Configuration and Tuning

**User Story:** As a system administrator, I want to configure strategy parameters via environment variables, so that I can tune the system for different markets without code changes.

#### Acceptance Criteria

1. THE Expansion Generation System SHALL read EXPANSION_WHITE_SPACE_WEIGHT from environment (default 0.25)
2. THE Expansion Generation System SHALL read EXPANSION_ECONOMIC_WEIGHT from environment (default 0.25)
3. THE Expansion Generation System SHALL read EXPANSION_ANCHOR_WEIGHT from environment (default 0.25)
4. THE Expansion Generation System SHALL read EXPANSION_CLUSTER_WEIGHT from environment (default 0.25)
5. THE Expansion Generation System SHALL read EXPANSION_URBAN_COVERAGE_KM from environment (default 12.5)
6. THE Expansion Generation System SHALL read EXPANSION_RURAL_COVERAGE_KM from environment (default 25)
7. THE Expansion Generation System SHALL read EXPANSION_ANCHOR_PROXIMITY_M from environment (default 400)
8. THE Expansion Generation System SHALL validate all configuration values on startup
