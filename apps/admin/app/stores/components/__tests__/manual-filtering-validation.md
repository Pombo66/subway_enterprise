# Manual Filtering Functionality Validation

This document provides a comprehensive manual testing checklist to validate all aspects of the stores filtering functionality.

## Test Environment Setup

1. Start the admin application:
   ```bash
   pnpm -C apps/admin dev
   ```

2. Navigate to: http://localhost:3002/stores

## Test Cases

### 1. Individual Filter Types

#### 1.1 Region Filter (Requirement 1.1)
- [ ] **Test**: Select "EMEA" from region dropdown
- [ ] **Expected**: Only EMEA stores shown (Riverside Mall, Berlin Hauptbahnhof, Paris Nord, Madrid Centro)
- [ ] **Expected**: Store count shows "Store Locations (4)"
- [ ] **Expected**: Country dropdown becomes enabled with EMEA countries

- [ ] **Test**: Select "AMER" from region dropdown  
- [ ] **Expected**: Only AMER stores shown (Central Station, Downtown Plaza, Los Angeles Downtown)
- [ ] **Expected**: Store count shows "Store Locations (3)"

- [ ] **Test**: Select "APAC" from region dropdown
- [ ] **Expected**: Only APAC stores shown (Tokyo Central, Sydney Harbour, Singapore Marina)
- [ ] **Expected**: Store count shows "Store Locations (3)"

- [ ] **Test**: Select "All Regions"
- [ ] **Expected**: All 10 stores shown
- [ ] **Expected**: Store count shows "Store Locations (10)"
- [ ] **Expected**: Country and city dropdowns become disabled

#### 1.2 Country Filter (Requirement 2.1)
- [ ] **Test**: Select "EMEA" region, then "United Kingdom" country
- [ ] **Expected**: Only UK store shown (Riverside Mall)
- [ ] **Expected**: Store count shows "Store Locations (1)"
- [ ] **Expected**: City dropdown becomes enabled with UK cities

- [ ] **Test**: Select "AMER" region, then "United States" country
- [ ] **Expected**: Only US stores shown (Central Station, Los Angeles Downtown)
- [ ] **Expected**: Store count shows "Store Locations (2)"

- [ ] **Test**: Select "All Countries" while region is selected
- [ ] **Expected**: All stores in selected region shown
- [ ] **Expected**: City dropdown becomes disabled

#### 1.3 City Filter (Requirement 3.1)
- [ ] **Test**: Select "EMEA" → "United Kingdom" → "London"
- [ ] **Expected**: Only London store shown (Riverside Mall)
- [ ] **Expected**: Store count shows "Store Locations (1)"

- [ ] **Test**: Select "AMER" → "United States" → "New York"
- [ ] **Expected**: Only New York store shown (Central Station)
- [ ] **Expected**: Store count shows "Store Locations (1)"

- [ ] **Test**: Select "All Cities" while country is selected
- [ ] **Expected**: All stores in selected country shown

### 2. Filter Combinations

#### 2.1 Multiple Filter Combinations
- [ ] **Test**: EMEA + Germany + Berlin
- [ ] **Expected**: Only Berlin Hauptbahnhof shown
- [ ] **Expected**: Store count shows "Store Locations (1)"

- [ ] **Test**: AMER + Canada + Toronto  
- [ ] **Expected**: Only Downtown Plaza shown
- [ ] **Expected**: Store count shows "Store Locations (1)"

- [ ] **Test**: APAC + Japan + Tokyo
- [ ] **Expected**: Only Tokyo Central shown
- [ ] **Expected**: Store count shows "Store Locations (1)"

### 3. Cascading Filter Behavior

#### 3.1 Region Change Resets Dependent Filters
- [ ] **Test**: Set EMEA → United Kingdom → London, then change region to AMER
- [ ] **Expected**: Country dropdown resets to "All Countries"
- [ ] **Expected**: City dropdown resets to "All Cities" and becomes disabled
- [ ] **Expected**: Only AMER stores shown

#### 3.2 Country Change Resets City Filter
- [ ] **Test**: Set AMER → United States → New York, then change country to Canada
- [ ] **Expected**: City dropdown resets to "All Cities"
- [ ] **Expected**: Only Canadian stores shown

### 4. Store Count Updates (Requirements 5.1, 5.2, 5.3, 5.4)

#### 4.1 Dynamic Count Updates
- [ ] **Test**: Apply various filter combinations
- [ ] **Expected**: Store count updates immediately with each filter change
- [ ] **Expected**: Count accurately reflects filtered results

#### 4.2 No Results Scenario
- [ ] **Test**: Select filters that result in no matches (e.g., APAC → South Korea)
- [ ] **Expected**: "No stores found matching your criteria" message shown
- [ ] **Expected**: Store count shows "Store Locations (0)"

### 5. "All" Options Clear Filters

#### 5.1 All Regions Clears Everything
- [ ] **Test**: Set filters, then select "All Regions"
- [ ] **Expected**: All stores shown (10 total)
- [ ] **Expected**: Country and city dropdowns disabled and reset
- [ ] **Expected**: URL parameters cleared

#### 5.2 All Countries Clears Country and City
- [ ] **Test**: Set region + country + city, then select "All Countries"
- [ ] **Expected**: All stores in selected region shown
- [ ] **Expected**: City dropdown disabled and reset
- [ ] **Expected**: Country parameter removed from URL

#### 5.3 All Cities Clears City Only
- [ ] **Test**: Set all filters, then select "All Cities"
- [ ] **Expected**: All stores in selected country shown
- [ ] **Expected**: City parameter removed from URL

### 6. URL Parameter Handling (Requirements 4.1, 4.2, 4.3, 4.4)

#### 6.1 URL Updates with Filters
- [ ] **Test**: Apply filters and check URL
- [ ] **Expected**: URL contains query parameters (e.g., ?region=EMEA&country=United%20Kingdom&city=London)

#### 6.2 URL Persistence on Refresh
- [ ] **Test**: Apply filters, then refresh page
- [ ] **Expected**: Filters remain applied after refresh
- [ ] **Expected**: Same stores shown as before refresh

#### 6.3 Direct URL Navigation
- [ ] **Test**: Navigate directly to URL with filter parameters
- [ ] **Expected**: Filters applied automatically
- [ ] **Expected**: Correct stores shown

#### 6.4 URL Clearing
- [ ] **Test**: Clear all filters
- [ ] **Expected**: URL returns to /stores (no parameters)

### 7. Integration with Search

#### 7.1 Search + Filter Combination
- [ ] **Test**: Apply region filter (EMEA), then search for "London"
- [ ] **Expected**: Only London store from EMEA region shown
- [ ] **Expected**: Store count shows "Store Locations (1)"

- [ ] **Test**: Apply filters, then search for non-existent term
- [ ] **Expected**: "No stores found matching your criteria" shown
- [ ] **Expected**: Store count shows "Store Locations (0)"

### 8. Data Consistency Validation

#### 8.1 Filter Data Matches Store Data
- [ ] **Test**: Verify all countries in filter dropdowns exist in store data
- [ ] **Expected**: No filter options that don't match actual store data
- [ ] **Expected**: All store countries have corresponding filter options

#### 8.2 Case Sensitivity
- [ ] **Test**: Verify city filtering works with different cases
- [ ] **Expected**: City filtering is case-insensitive
- [ ] **Expected**: "London" matches "london" in store data

## Validation Results

### Test Summary
- [ ] All individual filter types work correctly
- [ ] Filter combinations work as expected
- [ ] Store count updates accurately
- [ ] "All" options clear filters properly
- [ ] Cascading behavior works correctly
- [ ] URL parameters are handled properly
- [ ] Search integration works with filters
- [ ] Data consistency is maintained

### Issues Found
(Document any issues discovered during testing)

### Overall Status
- [ ] ✅ All tests passed - filtering functionality is working correctly
- [ ] ❌ Issues found - see issues section above

## Performance Notes
- [ ] Filters respond immediately to user input
- [ ] No noticeable lag when switching between filters
- [ ] Store count updates without delay
- [ ] URL updates happen smoothly without page refresh