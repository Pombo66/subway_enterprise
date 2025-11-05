# Implementation Plan

- [x] 1. Create configuration validation module
  - Create new file `apps/admin/lib/config/expansion-config.ts`
  - Define ExpansionConfig interface with database, mapbox, openai, and features properties
  - Implement ExpansionConfigValidator class with singleton pattern
  - Add validate() method to check DATABASE_URL, test database connection, check optional tokens
  - Add getConfig() method to retrieve cached configuration
  - Add reset() method for testing purposes
  - Log warnings for missing optional dependencies using ExpansionLogger
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.3_

- [x] 2. Enhance ExpansionLogger with detailed error logging
  - Open `apps/admin/lib/logging/expansion-logger.ts`
  - Add logServiceInitialization() method to log service startup configuration
  - Add logDetailedError() method with error stack, context, params, userId, requestId
  - Add logDatabaseError() method to log Prisma-specific errors with error codes
  - Add logMissingDependency() method to log warnings for missing optional features
  - Ensure all log methods include timestamps and structured data
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Create health check API endpoint
  - Create new file `apps/admin/app/api/expansion/health/route.ts`
  - Implement GET handler that calls ExpansionConfigValidator.validate()
  - Return JSON with status, timestamp, services (database, mapbox, openai), and features
  - Return 200 OK when database is connected, 503 when database is down
  - Include service status (up/down/disabled) and required flag for each dependency
  - Include feature availability flags (coreGeneration, mapboxFiltering, aiRationale)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Update expansion generate API route with enhanced error handling
  - Open `apps/admin/app/api/expansion/generate/route.ts`
  - Add requestId generation using crypto.randomUUID() at start of POST handler
  - Add config validation check at start using ExpansionConfigValidator.validate()
  - Return 503 error if database is not connected
  - Wrap request.json() in try-catch to handle invalid JSON
  - Override enableMapboxFiltering and enableAIRationale based on config.features
  - Update catch block to use ExpansionLogger.logDetailedError() with full context
  - Add specific error handling for "No stores found" (400), Prisma errors (500), generic errors (500)
  - Include requestId in error responses for traceability
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.4_

- [x] 5. Add graceful degradation to Mapbox filtering
  - Open `apps/admin/lib/services/expansion-generation.service.ts`
  - Update applyMapboxFiltering() method to check ExpansionConfigValidator.getConfig()
  - If Mapbox is not enabled, log warning and return all candidates without filtering
  - Wrap validateLocation() calls in try-catch blocks
  - On error, include candidate with null Mapbox data (graceful degradation)
  - Log errors but don't fail the entire generation
  - _Requirements: 4.4, 6.1, 6.2, 6.3, 6.4_

- [x] 6. Add graceful degradation to AI rationale generation
  - Open `apps/admin/lib/services/expansion-generation.service.ts`
  - Update generateRationales() method to check ExpansionConfigValidator.getConfig()
  - If OpenAI is not enabled, log warning and return suggestions with default rationales
  - Wrap generateRationale() calls in try-catch blocks
  - On error, keep suggestion with existing template-based rationale
  - Log errors but don't fail the entire generation
  - _Requirements: 4.4, 6.1, 6.2, 6.3, 6.4_

- [x] 7. Enhance database error handling in loadStores
  - Open `apps/admin/lib/services/expansion-generation.service.ts`
  - Wrap loadStores() database query in try-catch block
  - Re-throw "No stores found in region" error as-is
  - For Prisma errors, call ExpansionLogger.logDatabaseError() and throw descriptive error
  - Add console.log to show number of stores loaded for debugging
  - Filter out stores with null coordinates before returning
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 8. Update frontend error handling in ExpansionIntegratedMapPage
  - Open `apps/admin/app/stores/map/components/ExpansionIntegratedMapPage.tsx`
  - Update handleGenerate() to parse error response and extract code, message, requestId
  - Add switch statement to handle specific error codes (NO_STORES, DATABASE_UNAVAILABLE, etc.)
  - Display user-friendly error messages based on error code
  - Show toast notifications for errors using toast.error()
  - Include requestId in error messages for support reference
  - Add error state to component and display inline error message
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 9. Add configuration initialization at module level
  - Open `apps/admin/app/api/expansion/generate/route.ts`
  - Add configInitialized flag at module level
  - Create ensureConfigInitialized() async function
  - Call ExpansionConfigValidator.validate() on first import
  - Handle initialization errors gracefully with console.error
  - Call ensureConfigInitialized() at module load time
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 10. Create environment variables documentation
  - Create or update `apps/admin/.env.example` file
  - Document DATABASE_URL as required
  - Document MAPBOX_ACCESS_TOKEN as optional with description
  - Document OPENAI_API_KEY as optional with description
  - Document NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR flag
  - Add comments explaining what happens when optional vars are missing
  - _Requirements: 3.5, 6.3_

- [x] 11. Add troubleshooting section to README
  - Open `apps/admin/README.md`
  - Add "Expansion Predictor" section with configuration requirements
  - Document required vs optional environment variables
  - Add health check endpoint documentation
  - Add troubleshooting guide for common errors (503, 500, missing features)
  - Include example health check response
  - _Requirements: 3.5, 5.1_

- [x] 12. Test with all dependencies available
  - Set DATABASE_URL, MAPBOX_ACCESS_TOKEN, OPENAI_API_KEY in .env
  - Start application and check startup logs for service initialization
  - Call GET /api/expansion/health and verify all services show "up"
  - Generate expansion suggestions with default parameters
  - Verify suggestions include Mapbox data and AI rationales
  - Check console logs for detailed generation metadata
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 5.4, 6.4_

- [x] 13. Test without Mapbox token
  - Remove or comment out MAPBOX_ACCESS_TOKEN from .env
  - Restart application and check logs for "Missing Dependency: MAPBOX_ACCESS_TOKEN" warning
  - Call GET /api/expansion/health and verify mapbox shows "disabled"
  - Generate expansion suggestions
  - Verify generation succeeds without Mapbox filtering
  - Verify suggestions don't include Mapbox data fields
  - Check logs confirm Mapbox filtering was skipped
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 14. Test without OpenAI key
  - Remove or comment out OPENAI_API_KEY from .env
  - Restart application and check logs for "Missing Dependency: OPENAI_API_KEY" warning
  - Call GET /api/expansion/health and verify openai shows "disabled"
  - Generate expansion suggestions
  - Verify generation succeeds with default rationales
  - Verify rationaleText uses template-based format
  - Check logs confirm AI rationale generation was skipped
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 15. Test with database unavailable
  - Stop database container (docker compose down)
  - Call GET /api/expansion/health and verify status is "unhealthy" with 503
  - Try to generate expansion suggestions
  - Verify 503 error with "Database connection failed" message
  - Verify error is logged with full context
  - Restart database and verify recovery
  - _Requirements: 3.3, 3.4, 4.4, 5.5_

- [x] 16. Test with invalid region (no stores)
  - Generate suggestions for a region with no stores (e.g., Antarctica)
  - Verify 400 error with "No stores found in region" message
  - Verify user-friendly error message displays in UI
  - Verify error is logged appropriately
  - Check that error includes code: "NO_STORES"
  - _Requirements: 2.1, 2.2, 2.3, 4.3_

- [x] 17. Test with invalid parameters
  - Send generation request with aggression = 150 (invalid)
  - Verify 400 error with validation details
  - Send request with missing region filter
  - Verify 400 error with "Region filter is required" message
  - Verify validation errors are logged
  - _Requirements: 1.5, 2.1, 2.2, 4.5_

- [x] 18. Test error display in frontend
  - Trigger various error scenarios (no stores, database down, invalid params)
  - Verify toast notifications appear with user-friendly messages
  - Verify inline error messages display in the UI
  - Verify error state doesn't break the page layout
  - Verify retry button works after transient errors
  - Verify requestId is included in error messages when available
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 19. Verify detailed error logging
  - Trigger a 500 error (simulate by temporarily breaking code)
  - Check server console logs for detailed error with stack trace
  - Verify logs include requestId, endpoint, params, userId, timestamp
  - Verify error stack trace is complete and readable
  - Verify sensitive data is not exposed in frontend error messages
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 20. Document the fix and update changelog
  - Create IMPLEMENTATION_SUMMARY.md in spec directory
  - Document root cause of original 500 error
  - Document all changes made (new files, modified files)
  - Document testing results for all scenarios
  - Add entry to CHANGELOG.txt describing the fix
  - Include instructions for checking service health
  - _Requirements: 3.5, 5.1_

