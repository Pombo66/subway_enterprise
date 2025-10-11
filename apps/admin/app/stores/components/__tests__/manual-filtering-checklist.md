# Manual Filtering Validation Checklist

This checklist provides a lightweight way to validate the complete filtering functionality without running heavy automated tests that can cause system overheating.

## Prerequisites
- Start the admin app: `pnpm -C apps/admin dev`
- Navigate to `/stores` page
- Ensure you can see "Store Locations (10)" initially

## Individual Filter Types

### ✅ Region Filter
1. **Test EMEA Region:**
   - Select "EMEA" from region dropdown
   - Expected: Shows 4 stores (Riverside Mall, Paris Nord, Berlin Hauptbahnhof, Madrid Centro)
   - Verify count shows "Store Locations (4)"

2. **Test AMER Region:**
   - Select "AMER" from region dropdown
   - Expected: Shows 3 stores (Central Station, Downtown Plaza, Los Angeles Downtown)
   - Verify count shows "Store Locations (3)"

3. **Test APAC Region:**
   - Select "APAC" from region dropdown
   - Expected: Shows 3 stores (Tokyo Central, Sydney Harbour, Singapore Marina)
   - Verify count shows "Store Locations (3)"

### ✅ Country Filter
1. **Test United States (within AMER):**
   - Select "AMER" region first
   - Select "United States" from country dropdown
   - Expected: Shows 2 stores (Central Station, Los Angeles Downtown)
   - Verify count shows "Store Locations (2)"

2. **Test United Kingdom (within EMEA):**
   - Select "EMEA" region first
   - Select "United Kingdom" from country dropdown
   - Expected: Shows 1 store (Riverside Mall)
   - Verify count shows "Store Locations (1)"

### ✅ City Filter
1. **Test New York (within US/AMER):**
   - Select "AMER" → "United States" → "New York"
   - Expected: Shows 1 store (Central Station)
   - Verify count shows "Store Locations (1)"

2. **Test London (within UK/EMEA):**
   - Select "EMEA" → "United Kingdom" → "London"
   - Expected: Shows 1 store (Riverside Mall)
   - Verify count shows "Store Locations (1)"

## Filter Combinations

### ✅ Multiple Filters Working Together
1. **Test EMEA + United Kingdom + London:**
   - Apply all three filters in sequence
   - Expected: Shows 1 store (Riverside Mall)
   - Verify each step reduces the count correctly

2. **Test AMER + United States + Los Angeles:**
   - Apply all three filters in sequence
   - Expected: Shows 1 store (Los Angeles Downtown)

### ✅ Cascading Filter Reset
1. **Test Region Change Resets Lower Filters:**
   - Set up: EMEA → United Kingdom → London
   - Change region to "AMER"
   - Expected: Country and City dropdowns reset to "All Countries" and "All Cities"
   - Expected: Shows 3 AMER stores

2. **Test Country Change Resets City:**
   - Set up: AMER → United States → New York
   - Change country to "Canada"
   - Expected: City dropdown resets to "All Cities"
   - Expected: Shows Canadian stores only

## "All" Options Clear Filters

### ✅ Clear Region Filter
1. **Test "All Regions":**
   - Apply any region filter
   - Select "All Regions"
   - Expected: Shows all 10 stores
   - Expected: Country and City dropdowns reset

### ✅ Clear Country Filter
1. **Test "All Countries":**
   - Apply region + country filters
   - Select "All Countries"
   - Expected: Shows all stores in the selected region
   - Expected: City dropdown resets

### ✅ Clear City Filter
1. **Test "All Cities":**
   - Apply region + country + city filters
   - Select "All Cities"
   - Expected: Shows all stores in the selected country

## Store Count Updates

### ✅ Count Accuracy
1. **Verify counts at each filter level:**
   - No filters: 10 stores
   - EMEA: 4 stores
   - EMEA + UK: 1 store
   - EMEA + UK + London: 1 store

2. **Test "No stores found" scenario:**
   - Try to create a filter combination that has no matches
   - Expected: Shows "No stores found matching your criteria"

## URL Parameter Handling

### ✅ URL Updates
1. **Test URL synchronization:**
   - Apply filters and check URL updates with query parameters
   - Refresh page and verify filters are maintained
   - Clear filters and verify URL parameters are removed

### ✅ Direct URL Access
1. **Test direct URL with parameters:**
   - Navigate to `/stores?region=EMEA&country=United%20Kingdom`
   - Expected: Filters are pre-selected and stores are filtered accordingly

## Disabled States

### ✅ Cascading Enablement
1. **Test initial state:**
   - Country dropdown should be disabled when no region selected
   - City dropdown should be disabled when no country selected

2. **Test progressive enablement:**
   - Select region → Country dropdown becomes enabled
   - Select country → City dropdown becomes enabled

## Performance Check

### ✅ No System Overheating
- Filters should respond quickly (< 1 second)
- No excessive CPU usage during filter operations
- No memory leaks during repeated filter changes

## Results Summary

**Date:** ___________  
**Tester:** ___________

- [ ] All individual filter types work correctly
- [ ] Filter combinations work as expected
- [ ] Cascading resets function properly
- [ ] "All" options clear filters correctly
- [ ] Store counts update accurately
- [ ] URL parameters sync properly
- [ ] Disabled states work correctly
- [ ] No performance issues observed

**Issues Found:**
_List any issues discovered during testing_

**Overall Status:** ✅ PASS / ❌ FAIL

---

*This manual checklist replaces the automated test to prevent system overheating while ensuring comprehensive validation of the filtering functionality.*