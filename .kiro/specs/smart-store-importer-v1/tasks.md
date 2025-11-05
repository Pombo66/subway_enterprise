# Implementation Plan

- [x] 1. Set up core infrastructure and types
  - Create TypeScript interfaces for auto-mapping, country inference, and geocoding
  - Set up environment configuration for geocoding providers and feature flags
  - Create base error classes for import and geocoding operations
  - _Requirements: 1.1, 3.1, 6.1_

- [x] 1.1 Create enhanced import types and interfaces
  - Define FieldMapping, AutoMapResult, CountryInference, and GeocodeProgress interfaces
  - Create ImportRow and ImportSession types with geocoding status fields
  - Set up confidence level enums and error type definitions
  - _Requirements: 1.1, 1.4, 4.4_

- [x] 1.2 Set up environment configuration system
  - Create configuration loader for geocoding provider settings
  - Implement feature flag system for address normalization
  - Set up rate limiting and timeout configuration
  - _Requirements: 6.1, 6.2, 7.5_

- [x] 1.3 Create base error handling classes
  - Implement GeocodeError and ImportError classes with retry logic
  - Create error categorization system for retryable vs non-retryable errors
  - Set up error logging and telemetry integration
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 2. Implement auto-mapping functionality
  - Build field detection algorithms using header analysis and sample data validation
  - Create confidence scoring system based on header matches and content patterns
  - Implement mapping suggestion engine with common field aliases
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.1 Build field detection engine
  - Create header analysis system with common field aliases dictionary
  - Implement sample data validation for different field types (postcode patterns, coordinates)
  - Build scoring algorithm combining header match and content validation
  - _Requirements: 1.1, 1.3_

- [x] 2.2 Implement confidence scoring system
  - Create confidence calculation based on header match strength and sample validation
  - Implement reason generation for confidence ratings with tooltip explanations
  - Build confidence summary aggregation for UI display
  - _Requirements: 1.2, 1.4_

- [x] 2.3 Create mapping suggestion engine
  - Build field alias dictionary for name, address, city, postcode, country, coordinates
  - Implement fuzzy matching for header recognition with typo tolerance
  - Create mapping result generation with unmapped column identification
  - _Requirements: 1.1, 1.3, 1.5_

- [x] 3. Implement country inference system
  - Build filename analysis for country detection from file names
  - Create data pattern analyzer for postcode formats and regional indicators
  - Implement fallback system using user region preferences
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.1 Build filename country detection
  - Create country name and code recognition from filenames
  - Implement pattern matching for common filename formats
  - Build confidence scoring for filename-based inference
  - _Requirements: 2.2, 2.5_

- [x] 3.2 Implement data pattern analysis
  - Create postcode format recognition for different countries
  - Build state code analysis for regional identification
  - Implement pattern confidence scoring and validation
  - _Requirements: 2.3, 2.5_

- [x] 3.3 Create region fallback system
  - Implement user region preference integration
  - Build fallback confidence scoring and display formatting
  - Create editable country selection with inference display
  - _Requirements: 2.4, 2.5_

- [x] 4. Build geocoding provider system
  - Implement Nominatim provider with proper headers and rate limiting
  - Create Google Maps provider with API key authentication
  - Build provider abstraction layer with error handling and retry logic
  - _Requirements: 3.2, 3.4, 3.5, 7.2, 7.5_

- [x] 4.1 Implement Nominatim geocoding provider
  - Create Nominatim API client with proper User-Agent headers
  - Implement address formatting and request construction
  - Build response parsing and error handling for Nominatim-specific errors
  - _Requirements: 3.5, 7.5_

- [x] 4.2 Create Google Maps geocoding provider
  - Implement Google Maps Geocoding API client with authentication
  - Build request formatting and response parsing for Google format
  - Create quota and error handling specific to Google Maps API
  - _Requirements: 3.5_

- [x] 4.3 Build provider abstraction and selection
  - Create GeocodeProvider abstract class with common interface
  - Implement provider selection logic based on configuration and availability
  - Build provider fallback system when primary provider fails
  - _Requirements: 3.5, 7.2_

- [x] 5. Implement rate limiting and batch processing
  - Create token bucket rate limiter for geocoding requests
  - Build batch processing system for handling multiple addresses
  - Implement exponential backoff with jitter for failed requests
  - _Requirements: 3.3, 3.4, 7.2, 7.3_

- [x] 5.1 Create token bucket rate limiter
  - Implement token bucket algorithm with configurable rates per provider
  - Build async token acquisition with proper queuing
  - Create rate limit monitoring and adjustment capabilities
  - _Requirements: 3.4, 7.5_

- [x] 5.2 Build batch processing system
  - Create batch size configuration and chunking logic
  - Implement parallel processing with concurrency limits
  - Build progress tracking and reporting for batch operations
  - _Requirements: 3.3, 4.1, 4.2_

- [x] 5.3 Implement retry logic with exponential backoff
  - Create retry decision logic for different error types
  - Build exponential backoff with jitter to prevent thundering herd
  - Implement maximum retry limits and failure handling
  - _Requirements: 7.2, 7.3_

- [x] 6. Create BFF geocoding API endpoints
  - Build POST /import/geocode endpoint for batch address processing
  - Implement request validation and response formatting
  - Create error handling and status reporting for API responses
  - _Requirements: 3.1, 3.2, 4.1, 7.1_

- [x] 6.1 Build geocoding API endpoint
  - Create POST /import/geocode route with request/response validation
  - Implement batch processing orchestration and provider coordination
  - Build response formatting with success/error status per row
  - _Requirements: 3.1, 3.2, 4.1_

- [x] 6.2 Implement API request validation
  - Create Zod schemas for geocoding request and response validation
  - Build address component validation and sanitization
  - Implement request size limits and timeout protection
  - _Requirements: 7.1, 7.4_

- [x] 6.3 Create API error handling and logging
  - Build comprehensive error response formatting
  - Implement request logging for audit and debugging
  - Create telemetry integration for API usage tracking
  - _Requirements: 4.3, 7.1, 7.4_

- [x] 7. Build frontend geocoding integration
  - Create useGeocodeImport hook for orchestrating geocoding operations
  - Implement progress tracking and cancellation capabilities
  - Build error handling and recovery UI components
  - _Requirements: 4.1, 4.2, 4.4, 7.1, 7.3_

- [x] 7.1 Create geocoding orchestration hook
  - Build useGeocodeImport hook with progress state management
  - Implement batch submission and progress tracking
  - Create cancellation support with AbortController integration
  - _Requirements: 4.1, 4.2_

- [x] 7.2 Implement progress tracking and UI updates
  - Create real-time progress bar with completed/failed/total counts
  - Build responsive UI that remains interactive during geocoding
  - Implement progress toast notifications and status updates
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 7.3 Build error handling and recovery UI
  - Create error summary display with downloadable CSV export
  - Implement tooltip error explanations for failed geocoding attempts
  - Build retry mechanisms for failed batches
  - _Requirements: 4.4, 7.1, 7.3, 7.4_

- [x] 8. Enhance Import Modal with new features
  - Integrate auto-mapping with confidence badge display
  - Add country inference with editable detection results
  - Implement geocoding progress and error handling UI
  - _Requirements: 1.2, 1.4, 1.5, 2.5, 4.1, 4.2, 5.4_

- [x] 8.1 Integrate auto-mapping UI components
  - Add confidence badges (🟢🟡🔴) to field mapping selectors
  - Implement tooltip explanations for confidence ratings
  - Create mapping review and adjustment interface
  - _Requirements: 1.2, 1.4, 1.5_

- [x] 8.2 Add country inference display and editing
  - Create country inference display with "Detected: Country 🇩🇪 (editable)" format
  - Implement editable country selection with inference explanation
  - Build country inference confidence indication
  - _Requirements: 2.5_

- [x] 8.3 Implement geocoding progress and control UI
  - Add "Import & Geocode" primary button with progress indication
  - Create progress bar and status display during geocoding operations
  - Build error summary and recovery options display
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 9. Add optional address normalization feature
  - Implement OpenAI-based address standardization with feature flag
  - Create fallback handling when normalization fails or is unavailable
  - Build normalization integration that never blocks import operations
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9.1 Create address normalization service
  - Build OpenAI integration for address standardization
  - Implement feature flag checking and graceful degradation
  - Create normalization request formatting and response parsing
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 9.2 Integrate normalization with geocoding pipeline
  - Add normalization step before geocoding with error handling
  - Implement fallback to original addresses when normalization fails
  - Create normalization status tracking and reporting
  - _Requirements: 6.3, 6.4, 6.5_

- [x] 10. Implement telemetry and monitoring
  - Add telemetry events for auto-mapping, country inference, and geocoding progress
  - Create performance monitoring for geocoding operations and UI responsiveness
  - Build error tracking and alerting for geocoding failures
  - _Requirements: 4.3, 4.4_

- [x] 10.1 Create telemetry event system
  - Implement telemetry events for importer_automap_done, importer_country_inferred, importer_geocode_started/progress/complete
  - Build event data collection with confidence counts and method tracking
  - Create telemetry integration with existing monitoring systems
  - _Requirements: 4.3_

- [x] 10.2 Build performance and error monitoring
  - Create geocoding response time tracking by provider
  - Implement UI responsiveness monitoring during background operations
  - Build error rate tracking and alerting for geocoding failures
  - _Requirements: 4.4_

- [x] 11. Create comprehensive test suite
  - Write unit tests for auto-mapping, country inference, and geocoding components
  - Build integration tests for end-to-end import workflow
  - Create E2E tests for Germany spreadsheet auto-import scenario
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 11.1 Write unit tests for core components
  - Test auto-mapping field detection and confidence scoring
  - Test country inference from filename, data patterns, and fallbacks
  - Test geocoding provider implementations and rate limiting
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 11.2 Build integration tests
  - Test complete import flow from file upload through geocoding completion
  - Test error scenarios including network failures and invalid data
  - Test performance with large files and memory usage
  - _Requirements: 4.1, 5.1, 7.1_

- [x] 11.3 Create E2E test scenarios
  - Test Germany spreadsheet upload with auto-mapping and country inference
  - Test geocoding progress and completion with map updates
  - Test error handling and recovery workflows
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 12. Ensure backward compatibility and performance
  - Verify existing Living Map functionality remains unchanged
  - Maintain current data preview and validation features
  - Ensure CPU performance levels and prevent tight re-render loops
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 12.1 Verify Living Map compatibility
  - Test that map rendering, tiles, layers, and clustering are unaffected
  - Verify newly imported stores appear without additional reloads
  - Ensure no regression in existing map performance or functionality
  - _Requirements: 5.1, 5.4_

- [x] 12.2 Maintain existing import functionality
  - Preserve all current data preview and validation features
  - Ensure existing import workflows continue to work unchanged
  - Verify no breaking changes to current API contracts
  - _Requirements: 5.2, 5.3_

- [x] 12.3 Optimize performance and prevent regressions
  - Implement debounced preview updates and memoized calculations
  - Add AbortController for canceling in-flight requests
  - Monitor and maintain current CPU performance levels
  - _Requirements: 5.5_