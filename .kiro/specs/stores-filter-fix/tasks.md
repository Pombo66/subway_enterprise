# Implementation Plan

- [x] 1. Update CascadingFilters component data structures
  - Update COUNTRIES_BY_REGION to use full country names instead of country codes
  - Update CITIES_BY_COUNTRY to use full country names as keys
  - Ensure all country names exactly match the store data format
  - _Requirements: 1.1, 2.1, 2.4, 3.1_

- [x] 2. Fix filtering logic in StoresPage component
  - Update fetchStores function to use exact string matching for region and country filters
  - Update city filtering to use case-insensitive exact matching
  - Remove the toLowerCase() and includes() logic that was causing partial matches
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 3. Verify URL parameter handling works correctly
  - Test that filter state is properly synchronized with URL query parameters
  - Ensure that page refresh maintains the filtered state
  - Verify that clearing filters removes parameters from URL
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3.1 Write unit tests for filter data consistency
  - Create tests to verify country names in filter data match store data
  - Test cascading filter behavior (region change resets country and city)
  - Test URL parameter synchronization
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 4. Test and validate the complete filtering functionality
  - Test each filter type individually (region, country, city)
  - Test filter combinations to ensure they work together correctly
  - Verify store count updates correctly with applied filters
  - Test "All" options to ensure they clear respective filters
  - _Requirements: 1.1, 2.1, 3.1, 5.1, 5.2, 5.3, 5.4_