# Manual URL Parameter Testing Guide

This guide provides step-by-step instructions to manually verify that URL parameter handling works correctly for the stores filter functionality.

## Test Environment Setup

1. Start the admin application:
   ```bash
   cd apps/admin
   npm run dev
   ```

2. Navigate to the stores page: `http://localhost:3002/stores`

## Test Cases

### Requirement 4.1: URL parameters update when filters are applied

#### Test 4.1.1: Region Filter Updates URL
1. Navigate to `http://localhost:3002/stores`
2. Select "EMEA" from the region dropdown
3. **Expected**: URL should update to `http://localhost:3002/stores?region=EMEA`
4. **Expected**: Only EMEA stores should be displayed
5. **Expected**: Country dropdown should be enabled with EMEA countries

#### Test 4.1.2: Country Filter Updates URL
1. Continue from Test 4.1.1 (EMEA region selected)
2. Select "United Kingdom" from the country dropdown
3. **Expected**: URL should update to `http://localhost:3002/stores?region=EMEA&country=United+Kingdom`
4. **Expected**: Only UK stores should be displayed
5. **Expected**: City dropdown should be enabled with UK cities

#### Test 4.1.3: City Filter Updates URL
1. Continue from Test 4.1.2 (EMEA region and UK country selected)
2. Select "London" from the city dropdown
3. **Expected**: URL should update to `http://localhost:3002/stores?region=EMEA&country=United+Kingdom&city=London`
4. **Expected**: Only London stores should be displayed

### Requirement 4.2: Filters are applied automatically from URL parameters

#### Test 4.2.1: Direct URL Navigation with Single Parameter
1. Navigate directly to `http://localhost:3002/stores?region=AMER`
2. **Expected**: Region dropdown should show "AMER" selected
3. **Expected**: Only AMER stores should be displayed
4. **Expected**: Country dropdown should be enabled with AMER countries
5. **Expected**: City dropdown should be disabled

#### Test 4.2.2: Direct URL Navigation with Multiple Parameters
1. Navigate directly to `http://localhost:3002/stores?region=EMEA&country=United+Kingdom&city=London`
2. **Expected**: Region dropdown should show "EMEA" selected
3. **Expected**: Country dropdown should show "United Kingdom" selected
4. **Expected**: City dropdown should show "London" selected
5. **Expected**: Only London stores should be displayed

#### Test 4.2.3: Invalid URL Parameters
1. Navigate directly to `http://localhost:3002/stores?region=INVALID&country=FAKE`
2. **Expected**: Application should not crash
3. **Expected**: Filters should handle invalid values gracefully
4. **Expected**: No stores should be displayed (or all stores if validation resets filters)

### Requirement 4.3: Page refresh maintains filtered state

#### Test 4.3.1: Refresh with Single Filter
1. Navigate to `http://localhost:3002/stores`
2. Select "APAC" from the region dropdown
3. Refresh the page (F5 or Ctrl+R)
4. **Expected**: Region dropdown should still show "APAC" selected
5. **Expected**: Only APAC stores should still be displayed
6. **Expected**: URL should still be `http://localhost:3002/stores?region=APAC`

#### Test 4.3.2: Refresh with Multiple Filters
1. Navigate to `http://localhost:3002/stores`
2. Select "EMEA" from the region dropdown
3. Select "Germany" from the country dropdown
4. Select "Berlin" from the city dropdown
5. Refresh the page (F5 or Ctrl+R)
6. **Expected**: All three dropdowns should maintain their selections
7. **Expected**: Only Berlin stores should still be displayed
8. **Expected**: URL should still be `http://localhost:3002/stores?region=EMEA&country=Germany&city=Berlin`

### Requirement 4.4: Clearing filters removes parameters from URL

#### Test 4.4.1: Clear Region Filter
1. Navigate to `http://localhost:3002/stores?region=EMEA&country=United+Kingdom&city=London`
2. Select "All Regions" from the region dropdown
3. **Expected**: URL should update to `http://localhost:3002/stores`
4. **Expected**: All stores should be displayed
5. **Expected**: Country and city dropdowns should be disabled and reset to "All"

#### Test 4.4.2: Clear Country Filter
1. Navigate to `http://localhost:3002/stores?region=EMEA&country=United+Kingdom&city=London`
2. Select "All Countries" from the country dropdown
3. **Expected**: URL should update to `http://localhost:3002/stores?region=EMEA`
4. **Expected**: All EMEA stores should be displayed
5. **Expected**: City dropdown should be disabled and reset to "All Cities"

#### Test 4.4.3: Clear City Filter
1. Navigate to `http://localhost:3002/stores?region=EMEA&country=United+Kingdom&city=London`
2. Select "All Cities" from the city dropdown
3. **Expected**: URL should update to `http://localhost:3002/stores?region=EMEA&country=United+Kingdom`
4. **Expected**: All UK stores should be displayed

### Additional Edge Cases

#### Test E1: Browser Back/Forward Navigation
1. Navigate to `http://localhost:3002/stores`
2. Apply filters: EMEA → United Kingdom → London
3. Use browser back button
4. **Expected**: Previous filter state should be restored
5. **Expected**: URL should match the previous state
6. Use browser forward button
7. **Expected**: Forward filter state should be restored

#### Test E2: Bookmark and Share URLs
1. Navigate to `http://localhost:3002/stores`
2. Apply filters: APAC → Japan → Tokyo
3. Copy the URL from the address bar
4. Open a new tab/window and paste the URL
5. **Expected**: The new tab should show the same filtered view
6. **Expected**: All filter dropdowns should show the correct selections

#### Test E3: URL Encoding with Special Characters
1. Test with countries that have special characters or spaces
2. Verify that URLs are properly encoded
3. Verify that encoded URLs work when navigated to directly

## Success Criteria

All tests should pass with the following behaviors:
- ✅ URL parameters update immediately when filters change
- ✅ Direct URL navigation applies filters correctly
- ✅ Page refresh maintains filter state
- ✅ Clearing filters removes URL parameters
- ✅ Browser navigation (back/forward) works correctly
- ✅ URLs can be bookmarked and shared
- ✅ Special characters are properly encoded/decoded

## Troubleshooting

If any tests fail, check:
1. Browser console for JavaScript errors
2. Network tab for failed API requests
3. URL encoding/decoding issues
4. Component state synchronization with URL parameters