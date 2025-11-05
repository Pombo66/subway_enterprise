# Implementation Plan

- [x] 1. Codebase Analysis and Expansion System Audit
  - Implement comprehensive scanning of all expansion-related code
  - Identify duplicate services and overlapping functionality
  - Generate detailed simplification report with consolidation opportunities
  - Analyze service dependencies and detect circular dependencies
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 1.1 Create Expansion System Auditor
  - Implement IExpansionSystemAuditor interface to scan entire codebase
  - Create file scanning logic to identify all expansion-related files
  - Add pattern detection algorithms to find duplicate logic
  - Build complexity analysis tools to measure code complexity metrics
  - _Requirements: 10.1, 10.2_

- [x] 1.2 Implement Redundancy Detector
  - Create IRedundancyDetector interface to identify service duplicates
  - Add functionality overlap analysis between admin and BFF services
  - Implement code duplication detection across service boundaries
  - Build similarity scoring algorithms for service comparison
  - _Requirements: 10.3, 10.4_

- [x] 1.3 Generate comprehensive audit report
  - Create detailed analysis of all OpenAI services in admin/lib and bff/src
  - Identify specific duplicate implementations and overlapping methods
  - Document consolidation opportunities with impact assessments
  - Generate migration strategy for service consolidation
  - _Requirements: 10.5_

- [x] 2. Service Consolidation and Code Cleanup
  - Merge duplicate OpenAI services between admin and BFF applications
  - Consolidate AI services and remove redundant implementations
  - Eliminate unused interfaces and deprecated code
  - Standardize service patterns across the codebase
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 2.1 Consolidate OpenAI rationale services
  - Merge apps/admin/lib/services/openai-rationale.service.ts and apps/bff/src/services/openai-rationale.service.ts
  - Create single shared OpenAI rationale service in packages/
  - Remove duplicate method implementations and interfaces
  - Update all imports and dependencies to use consolidated service
  - _Requirements: 11.1, 11.2_

- [x] 2.2 Merge AI services across applications
  - Consolidate apps/admin/lib/services/ai/* and apps/bff/src/services/ai/* directories
  - Remove duplicate market analysis, strategic scoring, and location discovery services
  - Create shared AI service package with single implementations
  - Update service registrations and dependency injection
  - _Requirements: 11.3, 11.4_

- [x] 2.3 Clean up expansion generation services
  - Merge duplicate expansion generation logic between admin and BFF
  - Remove redundant expansion-related utility functions
  - Consolidate expansion interfaces and type definitions
  - Eliminate unused expansion service methods and classes
  - _Requirements: 11.5_

- [x] 3. Output Text Parser Implementation
  - Implement robust text extraction using output_text field with fallback parsing
  - Create comprehensive error handling for response parsing failures
  - Add validation for extracted text content before processing
  - Build diagnostic tools for troubleshooting parsing issues
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3.1 Create Output Text Parser with fallback logic
  - Implement IOutputTextParser interface with primary output_text extraction
  - Add fallback parsing for message.content arrays when output_text is missing
  - Create robust error handling with detailed diagnostic information
  - Add text validation to ensure non-empty content before processing
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 3.2 Add comprehensive parsing error handling
  - Implement descriptive error messages including response status and output types
  - Create diagnostic logging for parsing failures and edge cases
  - Add fallback strategies for different response format variations
  - Build monitoring and alerting for parsing failure rates
  - _Requirements: 1.3, 1.4_

- [x] 4. Structured Message Input Implementation
  - Replace concatenated string inputs with proper structured message arrays
  - Implement separate system and user role messages with content arrays
  - Add input_text type specifications for API compliance
  - Ensure all message content follows Responses API format
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4.1 Convert to structured message format
  - Replace string concatenation with structured message arrays
  - Implement proper role separation for system and user messages
  - Add content array formatting with input_text type specifications
  - Update all OpenAI service calls to use structured format
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4.2 Ensure API compliance and validation
  - Validate message structure against Responses API specification
  - Add message format validation before sending requests
  - Create unit tests for message structure compliance
  - Document proper message formatting patterns for future development
  - _Requirements: 2.4, 2.5_

- [x] 5. Deterministic Controls Implementation
  - Replace temperature parameters with seed values for consistent outputs
  - Remove temperature from API calls and database storage
  - Add seed management for cache keys and reproducibility
  - Implement seed-based deterministic response generation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5.1 Implement seed-based deterministic controls
  - Replace temperature parameters with seed values in API requests
  - Remove temperature: 1.0 from database storage and service configurations
  - Add seed parameter generation and management logic
  - Update cache key generation to include seed values
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5.2 Add seed management for reproducibility
  - Store seed values alongside cached rationales for debugging
  - Implement seed-based cache invalidation logic
  - Add seed tracking for performance monitoring and analysis
  - Create seed management utilities for testing and validation
  - _Requirements: 3.4, 3.5_

- [x] 6. Token Usage Optimization
  - Reduce max_output_tokens from 1000 to 150-250 for rationale generation
  - Optimize prompts to use concise instructions and minimize context
  - Replace verbose placeholder text with explicit sentinels
  - Implement plain text output instructions without formatting
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6.1 Optimize token limits and prompt efficiency
  - Reduce max_output_tokens to 150-250 for 2-3 sentence rationales
  - Create concise system instructions and minimize unnecessary context
  - Replace "unknown" strings with null values and 'NA' sentinels
  - Add plain text output instructions to prevent formatting overhead
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 6.2 Implement context optimization strategies
  - Send null values instead of verbose placeholder text
  - Use explicit sentinels like 'NA' for missing data
  - Optimize prompt structure to reduce token usage
  - Add token usage monitoring and optimization recommendations
  - _Requirements: 4.3, 4.4_

- [x] 7. Timeout and Retry Implementation
  - Implement 25-second hard timeouts using AbortController for rationale service
  - Add 90-second timeouts for market analysis service
  - Create retry logic with jittered exponential backoff
  - Honor Retry-After headers from rate limit responses
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 7.1 Implement timeout handling with AbortController
  - Add 25-second timeouts for rationale generation API calls
  - Implement 90-second timeouts for market analysis operations
  - Create AbortController-based timeout management
  - Add timeout event logging for monitoring and debugging
  - _Requirements: 5.1, 12.1, 12.5_

- [x] 7.2 Create retry logic with exponential backoff
  - Implement jittered exponential backoff for failed requests
  - Add Retry-After header handling for 429 rate limit responses
  - Create retry configuration with maximum attempt limits
  - Add fallback behavior when retries are exhausted
  - _Requirements: 5.2, 5.3, 5.4, 12.2, 12.3, 12.4_

- [x] 8. Concurrency Management Implementation
  - Process multiple rationale requests in parallel with 4-request limit
  - Implement batching for multiple candidate rationale generation
  - Add rate limiting to stay within OpenAI API limits
  - Create queue management for handling API rate limits
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8.1 Implement parallel processing with concurrency limits
  - Create Concurrency Manager with 4 simultaneous request limit
  - Add parallel processing for multiple rationale generation
  - Implement request batching to maximize throughput
  - Add queue status monitoring and reporting
  - _Requirements: 6.1, 6.2_

- [x] 8.2 Add rate limiting and queue management
  - Implement rate limiting to stay within OpenAI API constraints
  - Add request queuing when rate limits are hit
  - Create automatic retry with appropriate delays for rate-limited requests
  - Achieve seconds-level completion for 10 rationales through parallel processing
  - _Requirements: 6.3, 6.4, 6.5_

- [x] 9. Cache Key Stability and Management
  - Use explicit sentinels for null values in cache keys
  - Distinguish between real zeros and missing values using 'NA' markers
  - Ensure cache key stability across different null/undefined combinations
  - Validate cache key uniqueness to prevent collisions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 9.1 Implement stable cache key generation
  - Use explicit 'NA' sentinels for null values instead of collapsing them
  - Distinguish between real zeros and missing values in cache keys
  - Create consistent string representations for all context values
  - Add cache key validation to prevent collisions
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 9.2 Create functional caching system
  - Implement actual cache storage and retrieval (fix getCachedAnalysis returning null)
  - Add region bounds hash and dataset version to cache keys
  - Store complete AI JSON responses with model configuration metadata
  - Use 7-day TTL for cached market analysis results
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 10. JSON Schema Enforcement for Market Analysis
  - Implement response_format with json_schema and strict: true
  - Define complete JSON schemas for MarketAnalysis responses
  - Remove "Always respond with valid JSON" from prompts
  - Add schema validation error handling
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 10.1 Create enforced JSON schemas
  - Implement response_format with strict JSON schema enforcement
  - Define complete MarketAnalysis schema with all required fields
  - Remove prompt-based JSON instructions in favor of API enforcement
  - Add comprehensive schema validation for all response fields
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 10.2 Add schema validation and error handling
  - Create clear error messages for schema validation failures
  - Add fallback parsing when schema enforcement fails
  - Validate that all required fields are present in responses
  - Implement schema compliance monitoring and reporting
  - _Requirements: 10.4, 10.5_

- [x] 11. Market Analysis Performance Optimization
  - Reduce max_output_tokens from 16000 to 3000-4000
  - Change reasoning.effort from 'high' to 'medium'
  - Use text.verbosity: 'medium' for balanced output
  - Pre-aggregate input data to minimize token usage
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 11.1 Optimize token limits and reasoning settings
  - Reduce max_output_tokens from 16000 to 3000-4000 for market analysis
  - Change reasoning.effort from 'high' to 'medium' for faster processing
  - Set text.verbosity to 'medium' for balanced detail and performance
  - Add fallback options with lower token limits for timeout scenarios
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 11.2 Implement data pre-aggregation
  - Pre-aggregate store and competitor data before sending to AI model
  - Provide summary statistics instead of raw coordinate arrays
  - Include maximum 10 representative coordinates per category
  - Send IDs only when full data arrays are needed
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 12. Comprehensive Logging and Monitoring
  - Log response text length and first 80 characters instead of full responses
  - Track token usage, cost, and response time metrics
  - Monitor performance improvements from optimization changes
  - Add detailed error context logging without exposing sensitive data
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12.1 Implement optimized logging system
  - Log response text length and first 80 characters only
  - Track token usage, cost, and response time for all API calls
  - Add performance monitoring with before/after comparisons
  - Create monitoring metrics for timeout rates and retry counts
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 12.2 Add error logging and monitoring
  - Log detailed error context without exposing sensitive information
  - Track and report success rates, timeout rates, and retry statistics
  - Add performance degradation alerts and monitoring
  - Create dashboards for optimization impact tracking
  - _Requirements: 8.4, 8.5_

- [x] 13. Configuration Cleanup and Optimization
  - Remove unused TEMPERATURE constants from service files
  - Use reasoning.effort and text.verbosity as primary controls
  - Clean up deprecated configuration parameters
  - Standardize configuration patterns across services
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 13.1 Remove deprecated temperature configurations
  - Remove unused TEMPERATURE constants from all service files
  - Update services to rely on reasoning.effort and text.verbosity
  - Document that temperature is advisory only for GPT-5 models
  - Clean up configuration interfaces to remove deprecated parameters
  - _Requirements: 15.1, 15.2, 15.3, 15.5_

- [x] 13.2 Optimize reasoning controls for quality and performance
  - Use reasoning.effort: 'low' for rationale generation
  - Use text.verbosity: 'low' for concise rationale outputs
  - Validate that low-effort reasoning maintains acceptable quality
  - Add escalation to higher effort levels when quality thresholds not met
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 14. Integration Testing and Validation
  - Create comprehensive unit tests for all optimization components
  - Add integration tests for end-to-end performance improvements
  - Implement quality assurance tests to ensure optimization doesn't degrade output
  - Create performance benchmarking suite with before/after comparisons
  - _Requirements: All requirements validation_

- [x] 14.1 Unit testing for optimization components
  - Write unit tests for Output Text Parser with fallback scenarios
  - Create tests for JSON Schema Enforcer and validation logic
  - Add unit tests for Token Optimizer and cache key generation
  - Test timeout handling and retry mechanisms
  - _Requirements: 1.*, 2.*, 4.*, 5.*_

- [x] 14.2 Integration testing for performance improvements
  - Create end-to-end tests measuring execution time improvements
  - Add integration tests for service consolidation and cleanup
  - Test concurrent processing and rate limiting functionality
  - Validate cache functionality and hit rate improvements
  - _Requirements: 6.*, 7.*, 11.*, 13.*_

- [x] 14.3 Quality assurance and performance benchmarking
  - Compare output quality before and after optimizations
  - Validate that cost savings don't compromise recommendation quality
  - Create performance benchmarks showing 3-6x speed improvements
  - Test deterministic output consistency with seed values
  - _Requirements: 3.*, 8.*, 9.*, 12.*_