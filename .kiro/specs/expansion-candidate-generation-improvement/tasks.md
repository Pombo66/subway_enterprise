# Implementation Plan

- [x] 1. Update configuration parameters and environment variables
  - Update default values in settlement-candidate-generator.service.ts for MAX_CANDIDATES_PER_REGION from 200 to 2000
  - Update default values in h3-tiling.service.ts for H3_RESOLUTION from 7 to 8 and SAMPLES_PER_TILE from 15 to 25
  - Update default values in expansion-generation.service.ts for MAX_CANDIDATES from 300 to 1500 and MAX_TOTAL_CANDIDATES from 3000 to 10000
  - Add new environment variables for settlement clustering, diversity weights, and H3 settlement-aware features
  - Update .env.example with new configuration parameters and documentation
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 2. Enhance settlement candidate generator with clustering and diversity
  - [x] 2.1 Implement settlement clustering logic to avoid over-sampling dense areas
    - Add clustering distance parameter (5000m default) to prevent candidates within same cluster
    - Implement spatial clustering algorithm using turf.js distance calculations
    - Add cluster size tracking to candidate metadata
    - _Requirements: 1.1, 1.3, 1.4_
  
  - [x] 2.2 Add settlement type diversity weighting system
    - Implement diversity weights for cities (0.4), towns (0.4), villages (0.2)
    - Add settlement type classification and weighting in candidate selection
    - Ensure balanced representation across settlement types in final candidate pool
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [x] 2.3 Implement population-weighted sampling for better distribution
    - Add population density weighting to settlement selection algorithm
    - Implement weighted random sampling based on population and settlement type
    - Add population confidence scoring to candidate metadata
    - _Requirements: 1.1, 1.2, 1.4_

- [ ] 3. Enhance H3 tiling service with settlement-aware intelligence
  - [x] 3.1 Implement settlement-aware H3 gap detection
    - Add logic to identify gaps between existing settlements rather than geometric coverage
    - Implement settlement proximity analysis to focus H3 sampling on underserved areas
    - Add gap focus radius parameter (10000m default) for settlement-aware sampling
    - _Requirements: 1.1, 1.5, 2.3_
  
  - [x] 3.2 Add adaptive H3 resolution based on settlement density
    - Implement density-based resolution adjustment (higher resolution in sparse areas)
    - Add settlement density calculation per H3 tile
    - Implement automatic resolution scaling based on settlement coverage
    - _Requirements: 1.3, 2.2, 2.4_

- [x] 4. Implement OpenAI Strategy Layer for intelligent location selection
  - [x] 4.1 Create OpenAI expansion strategy service
    - Create new service file `apps/admin/lib/services/openai-expansion-strategy.service.ts`
    - Implement OpenAI API client with proper authentication and configuration
    - Add structured prompt template for "Subway Expansion Strategist AI" with exact prompt text
    - Implement data preparation methods to format candidate data for AI analysis
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 4.2 Implement AI response parsing and validation
    - Add JSON response parsing with schema validation for selected locations and summary
    - Implement response validation to ensure required fields (name, lat, lng, rationale) are present
    - Add geographic validation to verify selected coordinates are within expected bounds
    - Implement rationale quality checks to ensure AI provides meaningful explanations
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 4.3 Add comprehensive error handling and fallback mechanisms
    - Implement retry logic with exponential backoff for API failures and rate limits
    - Add fallback to enhanced deterministic selection when OpenAI is unavailable
    - Implement timeout handling for API calls (30 second default)
    - Add comprehensive logging for all AI interactions, decisions, and errors
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Implement enhanced generation orchestration and candidate mixing
  - [x] 5.1 Add progressive candidate generation with timeout management
    - Implement iterative generation with expanding search parameters when pools are insufficient
    - Add timeout handling for large-scale country-wide generation (3 minutes default)
    - Implement automatic parameter relaxation when candidate targets aren't met
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 5.2 Implement intelligent settlement-H3 mixing logic
    - Add 80/20 settlement-to-H3 ratio enforcement in candidate pool
    - Implement candidate type tracking and balancing throughout generation process
    - Add diversity validation to ensure spatial distribution meets quality thresholds
    - _Requirements: 1.1, 1.3, 2.1, 3.1_
  
  - [x] 5.3 Integrate OpenAI Strategy Layer into generation pipeline
    - Modify expansion-generation.service.ts to call OpenAI Strategy Layer after intelligence filtering
    - Implement candidate data preparation for AI analysis including population, anchors, and performance data
    - Add configuration toggle to enable/disable OpenAI selection vs deterministic selection
    - Ensure all existing validation, snapping, and fairness guardrails remain as post-filters
    - _Requirements: 4.4, 4.5, 5.4, 5.5_

- [x] 6. Add candidate quality validation and diversity metrics
  - [x] 6.1 Implement spatial diversity validation
    - Add entropy calculation for spatial distribution of candidates
    - Implement minimum diversity threshold validation (0.3 default)
    - Add cluster detection to prevent geometric patterns like vertical columns
    - _Requirements: 1.5, 7.1, 7.3_
  
  - [x] 6.2 Add candidate pool exhaustion detection and recovery
    - Implement early detection when generation rate drops below threshold
    - Add automatic search radius expansion (20% increments) when pools are insufficient
    - Implement population threshold reduction (25% decrements) as fallback strategy
    - _Requirements: 2.2, 2.3, 2.4, 3.4_
  
  - [x] 6.3 Add OpenAI selection quality validation
    - Implement validation that AI selections meet geographic balance requirements
    - Add quality metrics to compare AI selections vs deterministic selections
    - Implement monitoring for AI selection consistency across multiple runs
    - Add validation that AI rationale quality meets minimum standards
    - _Requirements: 7.1, 7.2, 7.4_

- [x] 7. Implement enhanced error handling and diagnostics
  - [x] 7.1 Add comprehensive candidate generation diagnostics
    - Implement detailed logging for settlement vs H3 generation ratios
    - Add performance metrics tracking (candidates per second, memory usage)
    - Implement quality metrics logging (spatial entropy, cluster count, acceptance rates)
    - Add OpenAI API performance monitoring (response times, success rates, token usage)
    - _Requirements: 6.5, 7.2, 7.4_
  
  - [x] 7.2 Add boundary validation and geographic constraint handling
    - Implement multi-source boundary validation (country, state, bounding box)
    - Add coastal buffer zone handling for edge cases
    - Implement graceful handling of candidates near geographic boundaries
    - _Requirements: 3.2, 3.3, 3.5_

- [ ] 8. Create comprehensive test suite for enhanced generation system
  - [ ] 8.1 Write unit tests for settlement clustering and diversity logic
    - Test clustering distance validation and spatial grouping algorithms
    - Test settlement type diversity weighting and balanced selection
    - Test population-weighted sampling accuracy and distribution
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [ ] 8.2 Write unit tests for OpenAI Strategy Layer
    - Test prompt data preparation and formatting for AI analysis
    - Test JSON response parsing and validation with mock OpenAI responses
    - Test error handling for API failures, rate limits, and malformed responses
    - Test fallback mechanism activation when OpenAI is unavailable
    - _Requirements: 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 8.3 Write integration tests for end-to-end generation pipeline with OpenAI
    - Test full pipeline from region parameters to OpenAI analysis to final suggestions
    - Test performance under different region sizes with AI selection enabled
    - Test OpenAI response consistency and quality across multiple runs
    - Test fallback behavior when OpenAI services are unavailable
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.2_
  
  - [ ] 8.4 Write regression tests to prevent geometric pattern recurrence
    - Test spatial distribution validation to detect column/row patterns in AI selections
    - Test settlement coverage completeness across different regions with AI selection
    - Test suggestion count consistency and target achievement (600 stores)
    - Test that AI selections outperform deterministic selection in quality metrics
    - _Requirements: 1.5, 7.1, 7.3, 7.4, 7.5_

- [x] 9. Update documentation and configuration examples
  - Update README.md with new configuration parameters including OpenAI settings and their impact on generation
  - Add troubleshooting guide for candidate pool exhaustion, OpenAI API issues, and quality problems
  - Update API documentation with new candidate metadata fields, OpenAI response format, and generation diagnostics
  - Create configuration tuning guide for different region types, scales, and OpenAI model selection
  - Add OpenAI API key setup and security best practices documentation
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3_