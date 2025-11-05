# Requirements Document

## Introduction

The expansion suggestion system currently generates candidates in a geometric pattern (vertical column along constant longitude) rather than intelligently distributing across settlement centroids or weighted population clusters. While the intelligence layers (population, anchors, performance, fairness) function correctly, the initial candidate generation is too constrained or uniform, and the final selection phase is deterministic rather than strategic. The system achieves 100% success rate but low suggestion count (28 vs target ~600), indicating the filtering works but needs both a larger candidate pool and an intelligent AI-driven selection strategy to replace the current deterministic selection phase.

## Glossary

- **Expansion_System**: The system responsible for generating store expansion suggestions
- **Candidate_Generator**: The component that creates initial location candidates before intelligence filtering
- **Intelligence_Layers**: Population analysis, anchor scoring, performance prediction, and fairness validation components
- **Settlement_Centroids**: Geographic centers of populated areas used for intelligent candidate placement
- **H3_Grid**: Hexagonal grid system used for spatial sampling
- **Fairness_Cap**: Constraint limiting suggestions per geographic region to ensure balanced distribution
- **OpenAI_Strategy_Layer**: AI-driven selection system that analyzes all settlement candidates and makes strategic location decisions
- **Selection_Phase**: The final stage where candidates are chosen from the validated pool using AI analysis rather than deterministic filtering

## Requirements

### Requirement 1

**User Story:** As a business expansion analyst, I want the system to generate candidates based on settlement patterns and population clusters, so that expansion suggestions reflect real market opportunities rather than geometric patterns.

#### Acceptance Criteria

1. WHEN the Expansion_System generates initial candidates, THE Candidate_Generator SHALL distribute locations based on settlement centroids rather than geometric grid patterns
2. THE Candidate_Generator SHALL prioritize populated areas and existing settlement patterns over uniform spatial distribution
3. THE Expansion_System SHALL generate a diverse candidate pool of at least 500 potential locations before intelligence filtering
4. WHERE settlement data is available, THE Candidate_Generator SHALL weight candidate placement by population density and urban development patterns
5. THE Expansion_System SHALL avoid generating candidates in vertical or horizontal line patterns that suggest geometric sampling

### Requirement 2

**User Story:** As a system administrator, I want the candidate generation to provide sufficient input diversity for the intelligence layers, so that filtering and validation can select from a rich set of options.

#### Acceptance Criteria

1. THE Candidate_Generator SHALL create a minimum candidate pool size that supports the target suggestion count of 600 stores
2. WHEN H3_Grid sampling is used, THE Candidate_Generator SHALL ensure sufficient spatial density to cover all settlement areas
3. THE Expansion_System SHALL prevent early termination of candidate generation due to timeout or yield thresholds
4. THE Candidate_Generator SHALL expand bounding boxes or sampling areas when initial pools are insufficient
5. WHILE maintaining performance requirements, THE Expansion_System SHALL prioritize candidate diversity over generation speed

### Requirement 3

**User Story:** As a regional expansion manager, I want the fairness constraints to operate on a rich candidate pool, so that geographic distribution limits don't artificially reduce suggestion quality.

#### Acceptance Criteria

1. THE Fairness_Cap SHALL operate after sufficient candidates are generated rather than limiting initial generation
2. WHEN applying geographic distribution limits, THE Expansion_System SHALL select the highest-scoring candidates within each region
3. THE Expansion_System SHALL ensure fairness constraints don't suppress candidate generation before intelligence scoring occurs
4. WHERE multiple regions have viable candidates, THE Expansion_System SHALL balance suggestions across regions based on market potential
5. THE Fairness_Cap SHALL allow temporary over-generation in high-potential areas before final balancing

### Requirement 4

**User Story:** As a business strategist, I want the system to replace deterministic selection with an OpenAI-powered Subway Expansion Strategist AI that analyzes all settlement candidates and makes intelligent location decisions, so that expansion plans reflect comprehensive market intelligence and strategic thinking.

#### Acceptance Criteria

1. THE OpenAI_Strategy_Layer SHALL completely replace the deterministic selection phase with AI-driven decision making using OpenAI's language models
2. THE OpenAI_Strategy_Layer SHALL use a structured prompt that positions the AI as "Subway Expansion Strategist AI" with specific expertise in retail location analysis
3. THE OpenAI_Strategy_Layer SHALL analyze each settlement candidate using population size, growth potential, distance to nearest Subway stores, anchor density, peer store performance, and regional saturation data
4. THE OpenAI_Strategy_Layer SHALL act as both data analyst and retail strategist, balancing quantitative metrics with strategic market positioning
5. THE Selection_Phase SHALL use the exact prompt: "You are the Subway Expansion Strategist AI. Your goal is to identify the strongest new Subway store locations across Germany using structured market data..."

### Requirement 5

**User Story:** As a regional expansion manager, I want the OpenAI Strategist AI to output structured JSON responses with selected locations, detailed rationale, and strategic analysis, so that I can understand and validate the AI's decision-making process.

#### Acceptance Criteria

1. THE OpenAI_Strategy_Layer SHALL return responses in the exact JSON format: {"selected": [{"name": "Heidelberg", "lat": 49.3988, "lng": 8.6724, "rationale": "High population (160k), strong anchor network (12 POIs), 14km nearest store gap, and strong peer turnover performance."}], "summary": {"selectedCount": 600, "stateDistribution": {...}, "keyDrivers": [...]}}
2. THE OpenAI_Strategy_Layer SHALL provide specific rationale for each selected location including population data, anchor counts, store gap distances, and peer performance metrics
3. THE OpenAI_Strategy_Layer SHALL include summary statistics with selected count, state distribution breakdown, and key decision drivers
4. THE OpenAI_Strategy_Layer SHALL ensure geographic balance across German states while avoiding over-represented regions
5. THE OpenAI_Strategy_Layer SHALL target exactly 600 locations with realistic commercial clustering and urban/suburban mix aligned with Subway's footprint doubling objective

### Requirement 6

**User Story:** As a system architect, I want the OpenAI integration to be robust, configurable, and maintainable with proper error handling and fallback mechanisms, so that the AI-driven selection system is reliable in production.

#### Acceptance Criteria

1. THE OpenAI_Strategy_Layer SHALL integrate with OpenAI's API using configurable model parameters (model, temperature, max_tokens, etc.)
2. THE OpenAI_Strategy_Layer SHALL implement proper error handling for API failures, rate limits, and malformed responses
3. THE OpenAI_Strategy_Layer SHALL include fallback mechanisms to deterministic selection when OpenAI services are unavailable
4. THE OpenAI_Strategy_Layer SHALL validate JSON response format and handle parsing errors gracefully
5. THE OpenAI_Strategy_Layer SHALL log all AI interactions, decisions, and performance metrics for monitoring and debugging

### Requirement 7

**User Story:** As a data analyst, I want to validate that the combined enhanced candidate generation and OpenAI selection system produces intelligent, strategic patterns that outperform the previous deterministic approach, so that expansion suggestions reflect true market intelligence.

#### Acceptance Criteria

1. THE Expansion_System SHALL demonstrate that OpenAI selections vary strategically across multiple runs while maintaining consistent quality and geographic balance
2. THE OpenAI_Strategy_Layer SHALL produce location selections that show clear correlation with population density, anchor presence, and market gap analysis
3. THE Expansion_System SHALL achieve the target of 600 store suggestions with improved spatial distribution compared to deterministic selection
4. THE OpenAI_Strategy_Layer SHALL provide measurable improvements in selection rationale quality and strategic coherence
5. THE Expansion_System SHALL maintain all existing validation, snapping, and fairness guardrails as post-filters after OpenAI selection