# Implementation Plan

- [x] 1. Add comprehensive logging to ingest API
  - Add logging for total rows received from upload cache
  - Add logging for validation results (valid vs invalid count)
  - Add logging for each geocoding request with full address details
  - Add logging for each geocoding result with coordinates and status
  - Add logging for each database save operation with actual saved coordinates
  - Add summary logging at the end showing total inserted/updated with coordinates
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Add coordinate validation and logging to database operations
  - Create `validateCoordinates()` helper function to check lat/lng ranges
  - Add validation before database save to ensure coordinates are valid numbers
  - Add detailed logging after each store is saved showing name and coordinates
  - Add logging for stores that fail coordinate validation
  - Add verification query after transaction to confirm saved coordinates
  - _Requirements: 1.5, 2.1, 2.2, 2.5, 5.4_

- [x] 3. Enhance geocoding service with detailed logging
  - Add logging for each geocoding request showing full address components
  - Add logging for geocoding provider responses (success/failure)
  - Add logging for retry attempts with exponential backoff
  - Add logging for provider fallback when primary provider fails
  - Add summary logging showing success rate and failure reasons
  - _Requirements: 1.3, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Add logging to stores API endpoint
  - Add logging for total stores fetched from BFF
  - Add logging for stores with valid coordinates vs without
  - Add logging for any filtering applied before returning to frontend
  - Add sample logging showing first few stores with their coordinates
  - _Requirements: 2.3, 5.4_

- [x] 5. Enhance map component coordinate filtering with logging
  - Add detailed logging for stores filtered out due to invalid coordinates
  - Log the specific reason each store is filtered (NaN, out of range, null, etc.)
  - Log total valid stores vs total stores received
  - Add logging for GeoJSON feature generation showing coordinate values
  - _Requirements: 3.3, 3.4, 5.4_

- [x] 6. Verify and fix geocoding service implementation
  - Review geocoding service code for silent failures
  - Ensure all geocoding errors are caught and logged
  - Verify retry logic is working correctly
  - Ensure geocoding results include provider and error details
  - Test with sample addresses to verify coordinates are returned
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 4.4_

- [x] 7. Verify database schema and coordinate persistence
  - Confirm Store model has latitude and longitude fields as Float
  - Verify database index on [latitude, longitude] exists
  - Test direct database query to confirm coordinates are being saved
  - Add database query logging to show actual saved values
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 8. Fix map refresh after upload by emitting stores-imported event
  - Import `emitStoresImported` function in ingest API route
  - Call `emitStoresImported()` after successful database operations
  - Pass summary data to event for debugging
  - Verify event is emitted in console logs
  - Test that map automatically refreshes after upload completes
  - _Requirements: 3.1, 3.2, 6.1, 6.2, 6.3_

- [x] 9. Add map tooltip with address information
  - Update map tooltip to show store address and postal code
  - Verify tooltip displays on hover over map pins
  - Test tooltip with stores that have complete address information
  - _Requirements: 3.6_

- [x] 10. Create debugging script to diagnose upload issues
  - Create script to upload test CSV with 10 stores
  - Script should log each step of the process
  - Script should query database after upload to verify coordinates
  - Script should fetch from API to verify stores are returned
  - Script should output summary showing where data is lost
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 11. Test complete upload flow with sample data
  - Create test CSV with 10 stores with valid addresses and postal codes
  - Upload CSV through UI and monitor console logs
  - Verify all 10 stores are geocoded successfully
  - Verify all 10 stores are saved to database with coordinates
  - Verify all 10 stores appear on map
  - Verify pins are at approximately correct locations
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

- [x] 12. Fix identified issues based on logging output
  - Review all logs from test upload
  - Identify exact point where stores are lost or coordinates are missing
  - Implement targeted fix for identified issue
  - Re-test to verify fix works
  - _Requirements: All requirements_

- [x] 13. Add error handling for geocoding failures
  - Ensure stores with failed geocoding are still saved to database
  - Mark stores with pending geocode status when geocoding fails
  - Add UI indication for stores that need manual geocoding
  - Log clear error messages for geocoding failures
  - _Requirements: 1.3, 1.4_

- [x] 14. Verify coordinate accuracy for uploaded stores
  - Test with known addresses and verify coordinates match expected locations
  - Verify postal codes are included in geocoding requests
  - Test with addresses from different countries
  - Verify map pins appear at correct geographic locations
  - _Requirements: 1.2, 1.7, 3.3, 3.6_
