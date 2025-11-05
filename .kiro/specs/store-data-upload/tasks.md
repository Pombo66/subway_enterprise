# Implementation Plan

- [x] 1. Set up core infrastructure and validation schemas
  - Create shared validation schemas using Zod for store upload data
  - Set up TypeScript interfaces for all upload-related data structures
  - Create error handling utilities and response types
  - Add environment variable configuration and feature flag checks
  - _Requirements: 6.1, 6.2, 6.3, 10.1, 10.2_

- [x] 2. Implement file parsing and upload API route
  - Create file parser service supporting Excel (.xlsx) and CSV formats
  - Implement header detection and column mapping suggestion algorithms
  - Build POST /api/stores/upload route with multipart file handling
  - Add file validation, size limits, and error handling
  - _Requirements: 1.5, 2.1, 2.2, 2.4, 8.1, 8.2_

- [x] 3. Build geocoding service with provider fallback
  - Implement geocoding service with Mapbox, Google Maps, and Nominatim providers
  - Add rate limiting, throttling, and batch processing capabilities
  - Create provider fallback logic and error handling
  - Implement address normalization and coordinate validation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2_

- [x] 4. Create data validation and deduplication service
  - Build validation service with Zod schema integration
  - Implement data normalization functions (trim, title case, country codes)
  - Create duplicate detection logic using multiple matching strategies
  - Add validation error reporting and status tracking
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Implement database integration and ingest API route
  - Create POST /api/stores/ingest route with feature flag validation
  - Implement database upsert operations using Prisma client
  - Add transaction management and error handling for database operations
  - Create import summary generation and response formatting
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 8.3, 8.4_

- [x] 6. Build upload button and file selection UI
  - Create UploadStoreData component with feature flag integration
  - Implement file selection dialog and drag-and-drop functionality
  - Add file type validation and user feedback for invalid files
  - Integrate with existing List View header layout
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 7. Create preview modal with column mapping interface
  - Build PreviewModal component with column mapping dropdowns
  - Implement data preview table showing first 10 rows
  - Add validation status indicators and duplicate detection display
  - Create mapping correction interface with flexible header support
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 8. Implement progress tracking and user feedback
  - Create ProgressIndicator component with step-by-step progress
  - Add real-time progress updates during geocoding and import
  - Implement batch processing with progress callbacks
  - Create success/error toast notifications with detailed summaries
  - _Requirements: 5.3, 5.4, 5.5, 7.1, 8.3_

- [x] 9. Integrate with existing data refresh mechanisms
  - Modify useStores hook to expose refresh functionality
  - Implement List View data refresh without page reload
  - Add Living Map data refresh trigger after successful import
  - Ensure no performance regression or infinite loops in refresh logic
  - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 10. Add comprehensive error handling and edge cases
  - Implement graceful error handling for all failure scenarios
  - Add user-friendly error messages and recovery suggestions
  - Create proper error boundaries and fallback UI states
  - Add server-side logging and error tracking
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 11. Write comprehensive test suite
  - Create unit tests for file parsing, validation, and geocoding services
  - Write integration tests for API routes and database operations
  - Add component tests for upload UI and modal interactions
  - Create end-to-end tests for complete upload workflow
  - _Requirements: All requirements validation_

- [x] 12. Add performance monitoring and optimization
  - Implement performance metrics collection for import operations
  - Add memory usage monitoring for large file processing
  - Create geocoding success rate tracking
  - Add database operation timing and optimization
  - _Requirements: 5.1, 5.2, 5.3_