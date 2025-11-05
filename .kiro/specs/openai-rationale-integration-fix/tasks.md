# Implementation Plan

- [x] 1. Fix parameter defaults and configuration validation
  - Change `enableAIRationale` default from opt-in (false) to opt-out (true) in expansion generation service
  - Add OpenAI configuration validation at service initialization to fail fast when API key is missing
  - Update parameter documentation to reflect new default behavior
  - _Requirements: 1.1, 1.2, 5.1, 5.2_

- [x] 2. Enhance logging and statistics tracking
  - Add detailed logging for each OpenAI API call attempt and result in generateRationales method
  - Separate statistics reporting between OpenAI Strategy Layer and OpenAI Rationale Service
  - Add validation that reported API call counts match actual service usage
  - Log specific rationale text snippets to verify AI generation vs fallback usage
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Improve error handling and validation
  - Add proper error handling in generateRationales method to log specific API failures
  - Implement configuration validation to check API key format and availability
  - Add statistics validation to detect when AI is enabled but no API calls are made
  - Remove silent fallback behavior and ensure errors are properly surfaced
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Verify rationale quality and uniqueness
  - Add validation that generated rationales contain location-specific details and context
  - Implement checks to ensure AI rationales differ significantly from deterministic templates
  - Add rationale length and keyword validation to confirm AI generation
  - Log rationale quality metrics in generation metadata
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Fix service initialization and dependency injection
  - Verify OpenAI rationale service is properly injected into expansion generation service
  - Add initialization validation to test API connectivity during service startup
  - Ensure proper async handling of OpenAI API calls without blocking generation pipeline
  - Add service health checks to validate OpenAI integration before generation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Ensure consistent rationale generation across candidate types
  - Verify rationale generation works for both settlement-based and H3-based candidates
  - Add proper data handling for missing fields by passing "unknown" flags to OpenAI
  - Ensure all suggestion types receive rationale generation calls regardless of data completeness
  - Test rationale generation with various data availability scenarios
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7. Fix caching integration with statistics tracking
  - Ensure cache hits don't increment API call counters incorrectly
  - Separate cache hit rate reporting from actual API usage statistics
  - Verify cached rationales are properly retrieved and used without affecting API call counts
  - Add cache performance metrics to distinguish between cache usage and API usage
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 8. Write comprehensive tests for OpenAI integration
  - Create unit tests to verify API calls are made when rationale generation is enabled
  - Add integration tests to validate full generation flow with OpenAI rationales
  - Write tests for error scenarios including missing API keys and API failures
  - Create tests to verify statistics tracking accuracy and cache behavior
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1_

- [x] 9. Add monitoring and alerting for OpenAI integration
  - Implement monitoring for OpenAI API usage patterns and error rates
  - Add alerts for when AI rationales are enabled but no API calls are made
  - Create dashboards to track rationale generation success rates and costs
  - Add logging for API rate limiting and quota usage
  - _Requirements: 2.1, 2.2, 3.1, 3.2_