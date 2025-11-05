# Implementation Plan

- [x] 1. Set up project structure and core interfaces
  - Create directory structure for models, services, and API components
  - Define TypeScript interfaces for all core data models (CountryConfig, LocationCandidate, etc.)
  - Set up configuration management for generation parameters
  - _Requirements: 1.1, 1.3, 1.5_

- [ ] 2. Implement H3 grid generation system
  - [x] 2.1 Create H3 grid service with country boundary processing
    - Install and configure H3 library for hexagonal indexing
    - Implement country boundary to H3 cell conversion
    - Add support for configurable grid resolution (8-9)
    - _Requirements: 1.1_

  - [x] 2.2 Add grid neighbor and spatial query capabilities
    - Implement H3 neighbor finding for buffer zones
    - Create spatial indexing for efficient cell lookups
    - Add grid validation and coverage verification
    - _Requirements: 7.1, 7.4_

  - [x] 2.3 Write unit tests for grid generation
    - Test H3 cell coverage for sample boundaries
    - Validate grid resolution and neighbor calculations
    - _Requirements: 1.1_

- [ ] 3. Build feature computation engine
  - [x] 3.1 Implement basic feature calculation for national sweep
    - Create population aggregation from census data
    - Calculate nearest brand store distances using Haversine formula
    - Compute competitor density within radius
    - Generate anchor proxy scores from OSM data
    - _Requirements: 1.2, 6.1_

  - [x] 3.2 Add refined feature computation for shortlisted candidates
    - Implement travel-time catchment analysis with fallback to radial
    - Create detailed anchor analysis with type-specific deduplication
    - Add performance proxy calculation with market estimates
    - _Requirements: 7.3, 7.4_

  - [x] 3.3 Implement anchor deduplication logic
    - Create type-specific merge radius handling (mall-tenant 120m, etc.)
    - Apply diminishing returns formula (Σ 1/√rank)
    - Enforce maximum 25 anchors per site limit
    - _Requirements: 6.4_

  - [x] 3.4 Write unit tests for feature computation
    - Test population aggregation accuracy
    - Validate distance calculations and anchor scoring
    - _Requirements: 6.1, 6.4_

- [ ] 4. Create scoring and ranking system
  - [x] 4.1 Implement multi-factor scoring engine
    - Create normalized sub-score calculations (population, gap, anchor, performance, saturation)
    - Apply configurable weights (default: population:0.25, gap:0.35, anchor:0.20, performance:0.20, saturation:0.15)
    - Implement final weighted score combination
    - _Requirements: 6.1, 6.2_

  - [x] 4.2 Add data quality adjustments
    - Reduce weights by 50% for estimated data (population, anchors)
    - Redistribute reduced weights to gap score
    - Calculate completeness scores for validation
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 4.3 Write unit tests for scoring system
    - Test score normalization and weight application
    - Validate data quality adjustments
    - _Requirements: 6.1, 6.2_

- [ ] 5. Implement constraint validation system
  - [x] 5.1 Create spacing constraint validator
    - Implement minimum distance checking between candidates
    - Add validation against existing brand stores
    - Support configurable spacing parameters (default 800m)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.2 Add fairness constraint enforcement
    - Implement regional share limit validation (default 40% max per region)
    - Create population-weighted fairness calculations
    - Add major metropolitan area validation
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 5.3 Implement data quality gates
    - Reject candidates with completeness < 0.5
    - Enforce minimum 15% acceptance rate with warnings
    - Add constraint violation tracking and reporting
    - _Requirements: 4.4, 2.5, 8.1_

  - [x] 5.4 Write unit tests for constraint validation
    - Test spacing calculations and regional distribution
    - Validate quality gate enforcement
    - _Requirements: 3.1, 2.1, 4.4_

- [ ] 6. Build shortlisting and windowed refinement
  - [x] 6.1 Implement national shortlisting algorithm
    - Select top 1-3% candidates nationally based on coverage gap scores
    - Add per-region top slice selection for fairness
    - Create shortlist ranking and filtering logic
    - _Requirements: 2.3, 7.5_

  - [x] 6.2 Create windowed refinement system
    - Partition country into 25-50km windows with buffers
    - Apply refined feature computation only to shortlisted candidates
    - Implement window-based processing for efficiency
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 6.3 Write unit tests for shortlisting
    - Test national and regional selection algorithms
    - Validate windowed processing efficiency
    - _Requirements: 2.3, 7.1_

- [ ] 7. Implement portfolio building and optimization
  - [x] 7.1 Create greedy portfolio selection algorithm
    - Implement ranked candidate iteration with constraint checking
    - Add spacing and fairness validation during selection
    - Support target K location selection with fallback handling
    - _Requirements: 3.5, 2.1, 8.2_

  - [x] 7.2 Add portfolio validation and diagnostics
    - Generate portfolio summary with counts and distribution
    - Create rejection reason tracking and reporting
    - Implement sanity check validation for major metropolitan areas
    - _Requirements: 8.2, 8.3, 8.5_

  - [x] 7.3 Write unit tests for portfolio building
    - Test greedy selection algorithm with various constraints
    - Validate portfolio diagnostics and reporting
    - _Requirements: 8.2, 8.3_

- [ ] 8. Implement AI router and cost guardrails
  - [x] 8.1 Create AI service interface and cost management
    - Implement OpenAI API integration with gpt-4o-mini
    - Add token counting and budget enforcement (20k max)
    - Create tiered AI usage levels (L0=Off, L1=Explanations, L2=Policy, L3=Learn)
    - Add bounded concurrency and model tiering
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 8.2 Add universal caching system for AI results
    - Implement 24-hour cache with hash-based keys for all AI services
    - Create cache hit/miss tracking for cost optimization
    - Add cache cleanup and TTL management
    - _Requirements: 5.3, 5.5_

  - [x] 8.3 Create AI router with intelligent triggering
    - Decide when to call LLMs (rationales only for finalists, policy only on mode change)
    - Implement fallback chains for AI service failures
    - Add AI usage level switching in configuration
    - _Requirements: 5.1, 5.5_

  - [x] 8.4 Write contract tests for AI services
    - Create golden JSON samples for schema validation
    - Test prompt hash consistency and determinism with seed
    - Validate fallback behavior on AI service failure
    - _Requirements: 5.2, 5.5_

- [ ] 9. Implement scenario policy service
  - [x] 9.1 Create scenario policy assistant (LLM)
    - Implement strict JSON system prompt for mode → weights/constraints mapping
    - Add numeric bounds enforcement and clamping (±20% per factor)
    - Support Defend/Balanced/Blitz modes with temperature 0
    - Cache by (mode + bounds_hash) for instant scenario changes
    - _Requirements: 6.2, 5.3_

  - [x] 9.2 Add policy validation and bounds checking
    - Implement numeric clamping in code after LLM response
    - Validate weights sum to 1.0 and constraints within bounds
    - Add fallback to deterministic mode multipliers on validation failure
    - _Requirements: 6.2, 5.5_

  - [x] 9.3 Write unit tests for scenario policy service
    - Test bounds enforcement and weight validation
    - Validate mode switching without feature recomputation
    - _Requirements: 6.2_

- [ ] 10. Implement site rationale service
  - [x] 10.1 Create site rationale generator (LLM)
    - Implement strict JSON system prompt using only provided numbers
    - Generate primary_reason (≤160 chars), risks, actions, confidence
    - Add batch processing for finalist sites only
    - Cache by (site_id + mode + numbers_hash)
    - _Requirements: 5.3, 8.1_

  - [x] 10.2 Add rationale validation and quality checks
    - Implement length limits and numeric echo validation
    - Ensure no invented numbers in rationale text
    - Add duplicate detection (<2% threshold)
    - Implement retry-on-parse with fallback to template rationales
    - _Requirements: 8.1, 5.5_

  - [x] 10.3 Create counterfactual generator
    - Compute deterministic thresholds for scenario flips
    - Generate "thresholds to flip" analysis (nearest_subway_km > X, pop_15min > Y)
    - Add optional LLM formatting or deterministic rendering
    - _Requirements: 8.1_

  - [x] 10.4 Write unit tests for rationale service
    - Test rationale uniqueness and numeric consistency
    - Validate counterfactual threshold calculations
    - _Requirements: 8.1_

- [ ] 11. Implement portfolio narrative service
  - [x] 11.1 Create portfolio narrative generator (LLM)
    - Implement strict JSON system prompt for portfolio KPIs
    - Generate 3-5 bullets covering ROI, risk, coverage, regional balance
    - Add scenario comparison and delta analysis
    - Cache by portfolio_hash for board-pack consistency
    - _Requirements: 8.3, 5.3_

  - [x] 11.2 Add portfolio KPI computation
    - Calculate portfolio-level metrics (coverage, balance, risk)
    - Generate frontier points for Pareto analysis
    - Add scenario delta tracking for narrative context
    - _Requirements: 8.2, 8.3_

  - [x] 11.3 Write unit tests for portfolio narrative
    - Test narrative consistency across runs
    - Validate KPI calculations and delta analysis
    - _Requirements: 8.3_

- [ ] 12. Add optional learning loop (offline)
  - [x] 12.1 Create backtest runner for weight optimization
    - Implement historical performance analysis
    - Generate weight tuning suggestions with confidence scores
    - Add "what changed/why" explanations for proposals
    - _Requirements: 5.5_

  - [x] 12.2 Add human review workflow for weight suggestions
    - Create versioned configuration management
    - Implement human accept/reject workflow for AI suggestions
    - Add dry run validation for proposed changes
    - _Requirements: 5.5_

  - [x] 12.3 Write integration tests for learning loop
    - Test backtest metric improvements over baseline
    - Validate suggestion stability and bounds compliance
    - _Requirements: 5.5_

- [ ] 13. Create API endpoints and request handling
  - [x] 13.1 Implement generation request API
    - Create REST endpoint for location generation requests
    - Add request validation for country config and parameters
    - Implement async processing for long-running operations
    - _Requirements: 1.4, 8.1_

  - [x] 13.2 Add result formatting and output generation
    - Create standardized JSON output with all required fields
    - Implement diagnostic information and reproducibility data
    - Add error handling and validation reporting
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 13.3 Write integration tests for API endpoints
    - Test end-to-end generation pipeline with sample data
    - Validate output format and diagnostic information
    - _Requirements: 1.4, 8.1_

- [ ] 14. Add data integration and preprocessing
  - [x] 14.1 Implement country boundary and administrative region loading
    - Create GeoJSON boundary processing for any country
    - Add administrative region parsing and validation
    - Implement major metropolitan area configuration
    - _Requirements: 1.1, 2.2, 2.4_

  - [x] 14.2 Add population and competitor data integration
    - Create population grid data loading and processing
    - Implement existing store and competitor location parsing
    - Add data validation and quality assessment
    - _Requirements: 1.2, 4.1, 4.2_

  - [x] 14.3 Implement anchor point data processing
    - Create OSM POI data integration for anchor points
    - Add anchor type classification and validation
    - Implement anchor data quality assessment
    - _Requirements: 6.4, 4.2_

  - [x] 14.4 Write unit tests for data integration
    - Test boundary processing and administrative region parsing
    - Validate population and anchor data loading
    - _Requirements: 1.1, 1.2_

- [-] 15. Add performance monitoring and optimization
  - [x] 15.1 Implement processing time tracking and limits
    - Add execution time monitoring for 10-minute target
    - Create performance bottleneck identification
    - Implement memory usage tracking and optimization
    - _Requirements: 1.4_

  - [x] 15.2 Add reproducibility and validation systems
    - Create reproducibility hash generation (seed + data versions + scenario)
    - Implement result validation against known test cases
    - Add system diagnostic reporting and health checks
    - _Requirements: 1.5, 8.4_

  - [x] 15.3 Add UX hooks for AI services
    - Implement "Explain this portfolio" button → Portfolio Narrative
    - Add "Why not here?" button → Counterfactuals
    - Create scenario slider using Policy Service with cached features
    - _Requirements: 8.1, 8.3_

  - [x] 15.4 Write performance and validation tests
    - Test processing time limits with large datasets
    - Validate reproducibility with identical inputs
    - Test executive demo acceptance checklist (instant scenario changes, Pareto frontier updates, site rationales)
    - _Requirements: 1.4, 1.5_