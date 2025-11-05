# Requirements Document

## Introduction

The Subway Expansion Predictor is an intelligent system that provides AI-driven store expansion recommendations based on spatial analysis, store performance data, and population metrics. The system enables users to generate, save, and compare expansion scenarios with reproducible, deterministic results while maintaining transparency through detailed rationale explanations.

## Glossary

- **Expansion System**: The complete feature set including map visualization, AI-driven suggestion generation, and scenario management
- **Mapbox**: Third-party mapping service used for map tiles and geocoding
- **Expansion Scenario**: A saved configuration of parameters and generated results that can be reproduced deterministically
- **Expansion Suggestion**: An AI-generated recommendation for a new store location with confidence score and rationale
- **Aggression Level**: A parameter (0-100) controlling how many expansion suggestions to generate
- **Confidence Score**: A normalized value (0-1) indicating the strength of an expansion recommendation
- **Rationale**: A structured explanation of why a location was recommended, including factor breakdowns
- **Seed**: A deterministic value ensuring identical inputs produce identical outputs
- **NMS**: Non-Maximum Suppression, a technique to enforce minimum distance between suggestions
- **Hex Grid**: A hexagonal grid overlay used for spatial analysis and scoring
- **Band**: A categorical classification (HIGH, MEDIUM, LOW, INSUFFICIENT_DATA) for suggestion quality

## Requirements

### Requirement 1

**User Story:** As a regional expansion manager, I want to view current stores on an interactive map, so that I can understand the existing store distribution before planning expansion.

#### Acceptance Criteria

1. WHEN the map page loads, THE Expansion System SHALL display all current stores as markers on a Mapbox map
2. WHILE viewing stores, THE Expansion System SHALL cluster markers to maintain performance with up to 30,000 stores
3. THE Expansion System SHALL load store data for the visible region to optimize performance
4. WHEN a user clicks on a store marker, THE Expansion System SHALL display store details including name, country, region, and performance metrics

### Requirement 2

**User Story:** As an expansion planner, I want to toggle expansion mode without reloading the map, so that I can seamlessly switch between viewing current stores and exploring expansion opportunities.

#### Acceptance Criteria

1. WHEN the user activates expansion mode, THE Expansion System SHALL display expansion controls without reloading the map
2. WHEN the user toggles expansion mode, THE Expansion System SHALL preserve the current map viewport and zoom level
3. WHEN expansion mode is active, THE Expansion System SHALL display a sidebar with region filters, aggression slider, bias controls, and minimum distance input
4. THE Expansion System SHALL NOT trigger additional Mapbox tile loads when toggling expansion mode

### Requirement 3

**User Story:** As an expansion analyst, I want to configure expansion parameters including region, aggression level, and bias weights, so that I can customize recommendations to match business strategy.

#### Acceptance Criteria

1. THE Expansion System SHALL provide a region selector supporting country, state, and bounding box filters
2. THE Expansion System SHALL provide an aggression slider with range 0-100 controlling suggestion quantity
3. THE Expansion System SHALL provide bias sliders for population (default 0.5), proximity (default 0.3), and turnover (default 0.2)
4. THE Expansion System SHALL provide a minimum distance input in meters (default 800)
5. WHEN parameters are modified, THE Expansion System SHALL validate that bias weights are between 0 and 1

### Requirement 4

**User Story:** As a data analyst, I want expansion suggestions to be generated deterministically, so that I can reproduce results and compare scenarios consistently.

#### Acceptance Criteria

1. WHEN generating suggestions with identical parameters, THE Expansion System SHALL produce identical results
2. THE Expansion System SHALL use a seed value to ensure deterministic random sampling
3. THE Expansion System SHALL store the seed value with each scenario for reproducibility
4. THE Expansion System SHALL record the source_data_version timestamp to track data freshness
5. WHEN refreshing a scenario, THE Expansion System SHALL regenerate suggestions using current store data while maintaining parameter consistency

### Requirement 5

**User Story:** As an expansion planner, I want to generate AI-driven expansion suggestions based on spatial density, store performance, and population data, so that I can identify optimal locations for new stores.

#### Acceptance Criteria

1. WHEN the user clicks generate, THE Expansion System SHALL execute server-side processing to compute expansion suggestions
2. THE Expansion System SHALL create a hexagonal grid overlay with approximately 500-meter cell size over the target region
3. THE Expansion System SHALL score each grid cell using the formula: score = w_pop × pop_norm + w_prox × proximity_gap + w_turnover × turnover_gap
4. THE Expansion System SHALL apply Non-Maximum Suppression to enforce minimum distance constraints between suggestions
5. THE Expansion System SHALL select top-N cells based on aggression level and computed scores
6. THE Expansion System SHALL compute confidence scores (0-1) for each suggestion based on data completeness and score strength
7. THE Expansion System SHALL NOT trigger additional Mapbox tile loads during generation

### Requirement 6

**User Story:** As an expansion manager, I want to see visual differentiation between suggestion quality levels, so that I can quickly identify high-confidence opportunities.

#### Acceptance Criteria

1. THE Expansion System SHALL display HIGH confidence suggestions with teal markers
2. THE Expansion System SHALL display MEDIUM confidence suggestions with purple markers
3. THE Expansion System SHALL display LOW confidence suggestions with brown markers
4. THE Expansion System SHALL display INSUFFICIENT_DATA suggestions with black markers
5. THE Expansion System SHALL provide a legend explaining the color coding and confidence bands
6. THE Expansion System SHALL include a tooltip stating "All expansion points are generated by Subway AI. Colour intensity reflects confidence and data completeness."

### Requirement 7

**User Story:** As a business stakeholder, I want to understand why each location was recommended, so that I can trust the AI recommendations and make informed decisions.

#### Acceptance Criteria

1. WHEN a user clicks on an expansion suggestion marker, THE Expansion System SHALL display a "Why here?" information card
2. THE Expansion System SHALL display the confidence score as a percentage in the information card
3. THE Expansion System SHALL display the distance to the nearest existing store in the information card
4. THE Expansion System SHALL display the population density band in the information card
5. THE Expansion System SHALL display a turnover gap summary in the information card
6. THE Expansion System SHALL display a structured rationale with factor breakdowns (population score, proximity gap, turnover gap)
7. THE Expansion System SHALL display human-readable rationale text explaining the recommendation

### Requirement 8

**User Story:** As an expansion planner, I want to save expansion scenarios with all parameters and results, so that I can compare different strategies and share findings with stakeholders.

#### Acceptance Criteria

1. WHEN the user clicks save scenario, THE Expansion System SHALL prompt for a scenario label
2. THE Expansion System SHALL persist the scenario to the expansion_scenarios table with all parameters
3. THE Expansion System SHALL persist all suggestions to the expansion_suggestions table linked to the scenario
4. THE Expansion System SHALL store the created_by user identifier with the scenario
5. THE Expansion System SHALL store the created_at timestamp with the scenario
6. THE Expansion System SHALL generate a unique scenario_id for retrieval

### Requirement 9

**User Story:** As an expansion analyst, I want to load previously saved scenarios, so that I can review past analyses and continue work from where I left off.

#### Acceptance Criteria

1. THE Expansion System SHALL provide a scenario selector listing all saved scenarios
2. WHEN a user selects a saved scenario, THE Expansion System SHALL load the scenario parameters into the controls
3. WHEN a user selects a saved scenario, THE Expansion System SHALL display the saved suggestions on the map
4. THE Expansion System SHALL display the scenario label, creation date, and creator in the interface
5. THE Expansion System SHALL display the source_data_version timestamp to indicate data freshness

### Requirement 10

**User Story:** As an expansion manager, I want to review and update the status of expansion suggestions, so that I can track which recommendations have been approved, rejected, or require further review.

#### Acceptance Criteria

1. WHEN viewing a suggestion information card, THE Expansion System SHALL display Approve, Reject, and Mark as Reviewed buttons
2. WHEN the user clicks Approve, THE Expansion System SHALL update the suggestion status to APPROVED
3. WHEN the user clicks Reject, THE Expansion System SHALL update the suggestion status to REJECTED
4. WHEN the user clicks Mark as Reviewed, THE Expansion System SHALL update the suggestion status to REVIEWED
5. THE Expansion System SHALL persist status changes to the expansion_suggestions table

### Requirement 11

**User Story:** As a system administrator, I want the expansion system to maintain performance with large datasets, so that users can analyze regions with tens of thousands of stores without degradation.

#### Acceptance Criteria

1. WHILE displaying up to 30,000 stores, THE Expansion System SHALL maintain responsive map interactions
2. THE Expansion System SHALL implement marker clustering for store visualization
3. THE Expansion System SHALL implement lazy loading for region-based store data
4. THE Expansion System SHALL implement pagination for scenario lists when more than 50 scenarios exist
5. THE Expansion System SHALL complete suggestion generation within 10 seconds for regions with up to 5,000 stores

### Requirement 12

**User Story:** As a cost-conscious administrator, I want to minimize Mapbox API usage, so that we can control operational costs while maintaining functionality.

#### Acceptance Criteria

1. THE Expansion System SHALL load map tiles once per page view
2. THE Expansion System SHALL NOT reload map tiles when toggling expansion mode
3. THE Expansion System SHALL NOT reload map tiles when generating suggestions
4. THE Expansion System SHALL perform all heavy computation server-side to avoid additional client-side map loads
5. THE Expansion System SHALL use server-side Mapbox API calls for geocoding operations only when necessary

### Requirement 13

**User Story:** As an expansion planner, I want to refresh existing scenarios with current store data, so that I can see how recommendations change as the store network evolves.

#### Acceptance Criteria

1. WHEN viewing a saved scenario, THE Expansion System SHALL provide a refresh button
2. WHEN the user clicks refresh, THE Expansion System SHALL regenerate suggestions using current store data
3. THE Expansion System SHALL maintain the original scenario parameters during refresh
4. THE Expansion System SHALL update the source_data_version timestamp to reflect the refresh date
5. THE Expansion System SHALL replace previous suggestions with newly generated suggestions

### Requirement 14

**User Story:** As a data governance officer, I want expansion scenarios to track data lineage, so that we can audit recommendations and ensure compliance with decision-making processes.

#### Acceptance Criteria

1. THE Expansion System SHALL store the source_data_version timestamp indicating when store data was last updated
2. THE Expansion System SHALL display dataset timestamps in the format "Stores updated: DD MMM YYYY"
3. THE Expansion System SHALL log generation metrics including suggestion count, average confidence, and top contributing factors
4. THE Expansion System SHALL associate each scenario with the creating user identifier
5. THE Expansion System SHALL maintain an immutable audit trail of scenario creation and refresh events
