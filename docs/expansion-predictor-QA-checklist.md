# Expansion Predictor - Manual QA Checklist

## Pre-Testing Setup

- [ ] Environment variables configured (.env.local)
  - [ ] NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR=true
  - [ ] NEXT_PUBLIC_MAPBOX_TOKEN set
  - [ ] MAPBOX_SECRET_TOKEN set
  - [ ] OPENAI_API_KEY set
- [ ] Database migration applied
- [ ] Application running (pnpm dev)
- [ ] Test data: At least 50 stores in Germany with coordinates

## Test 1: Expansion Mode Toggle

### Test Steps
1. Navigate to `/stores/map`
2. Verify map loads with existing stores
3. Click "Enable Expansion Mode" button
4. Verify button changes to "✓ Expansion Mode Active"
5. Verify expansion controls sidebar appears
6. Verify map does NOT reload (check network tab)
7. Click button again to disable
8. Verify controls disappear
9. Verify map does NOT reload

### Expected Results
- [ ] Toggle works without page refresh
- [ ] No additional Mapbox tile loads in network tab
- [ ] Viewport and zoom level preserved
- [ ] Controls appear/disappear smoothly

## Test 2: Suggestion Generation

### Test Steps
1. Enable expansion mode
2. Select "Germany" from region dropdown
3. Set aggression to 60
4. Keep default bias values (0.5, 0.3, 0.2)
5. Keep minimum distance at 800m
6. Click "Generate Suggestions"
7. Wait for generation to complete
8. Verify suggestions appear on map

### Expected Results
- [ ] Generation completes in <10 seconds
- [ ] Suggestions displayed as colored markers
- [ ] Colors match confidence bands:
  - [ ] Teal for HIGH confidence
  - [ ] Purple for MEDIUM confidence
  - [ ] Brown for LOW confidence
  - [ ] Black for INSUFFICIENT_DATA
- [ ] Legend appears in bottom-left
- [ ] No console errors

## Test 3: Suggestion Details

### Test Steps
1. Click on a HIGH confidence (teal) marker
2. Verify "Why here?" card appears
3. Review displayed information
4. Click close button (×)
5. Click on a different marker
6. Verify card updates with new data

### Expected Results
- [ ] Info card displays:
  - [ ] Confidence score as percentage
  - [ ] Location coordinates
  - [ ] Distance to nearest store
  - [ ] Factor breakdown with progress bars
  - [ ] Rationale text
  - [ ] Action buttons (Approve/Review/Reject)
- [ ] Card closes when × clicked
- [ ] Card updates when different marker clicked

## Test 4: Minimum Distance Enforcement

### Test Steps
1. Generate suggestions with minDistance=800m
2. Measure distance between adjacent markers
3. Verify no two markers are closer than 800m
4. Change minDistance to 1500m
5. Regenerate
6. Verify increased spacing

### Expected Results
- [ ] Minimum distance respected
- [ ] Fewer suggestions with higher minDistance
- [ ] No overlapping markers

## Test 5: Determinism Test

### Test Steps
1. Note current parameters (region, aggression, seed)
2. Generate suggestions
3. Note first 3 suggestion coordinates
4. Refresh page
5. Enter EXACT same parameters
6. Generate again
7. Compare first 3 coordinates

### Expected Results
- [ ] Identical coordinates for same parameters
- [ ] Same number of suggestions
- [ ] Same confidence scores

## Test 6: Scenario Management

### Test Steps - Save
1. Generate suggestions
2. Click "Save Scenario"
3. Enter label: "Germany_Test_Agg60"
4. Click Save
5. Verify success message

### Test Steps - Load
1. Select "Germany_Test_Agg60" from dropdown
2. Verify suggestions reload
3. Verify parameters restored
4. Verify map shows saved suggestions

### Expected Results
- [ ] Scenario saves successfully
- [ ] Scenario appears in dropdown
- [ ] Loading restores exact state
- [ ] Parameters match saved values

## Test 7: Status Updates

### Test Steps
1. Click on a suggestion marker
2. Click "Approve" button
3. Verify status updates to APPROVED
4. Close and reopen same marker
5. Verify status persisted
6. Try "Reject" on another suggestion
7. Try "Review" on another suggestion

### Expected Results
- [ ] Status updates immediately
- [ ] Status persists after close/reopen
- [ ] All three status buttons work
- [ ] Visual feedback on status change

## Test 8: Parameter Validation

### Test Steps
1. Set aggression to 150 (invalid)
2. Verify error message appears
3. Verify Generate button disabled
4. Set aggression back to 60
5. Set population bias to 1.5 (invalid)
6. Verify error message
7. Set minimum distance to 50 (invalid)
8. Verify error message

### Expected Results
- [ ] Validation errors display inline
- [ ] Generate button disabled when invalid
- [ ] Error messages clear and helpful
- [ ] Button re-enables when valid

## Test 9: Rationale Quality

### Test Steps
1. Generate suggestions
2. Click on 5 different HIGH confidence markers
3. Read rationale text for each
4. Verify rationales are:
   - Coherent and grammatically correct
   - Specific to location
   - Reference actual factors
   - 2-3 sentences long

### Expected Results
- [ ] Rationales are coherent
- [ ] Rationales reference specific factors
- [ ] Rationales vary by location
- [ ] No generic/template text (if OpenAI working)

## Test 10: Performance with Large Datasets

### Test Steps
1. Ensure database has 1000+ stores
2. Navigate to map
3. Enable expansion mode
4. Generate suggestions for large region
5. Monitor performance

### Expected Results
- [ ] Map remains responsive
- [ ] Generation completes in <10s
- [ ] No browser freezing
- [ ] Smooth marker rendering
- [ ] Memory usage stable

## Test 11: Network Efficiency

### Test Steps
1. Open browser DevTools Network tab
2. Navigate to `/stores/map`
3. Note initial Mapbox tile loads
4. Enable expansion mode
5. Check for additional tile loads
6. Generate suggestions
7. Check for additional tile loads

### Expected Results
- [ ] Initial map load: Mapbox tiles loaded
- [ ] Toggle expansion: NO additional tile loads
- [ ] Generate: NO additional tile loads
- [ ] Only API calls to /api/expansion/*

## Test 12: Error Handling

### Test Steps - No Stores
1. Select region with no stores (e.g., "Antarctica")
2. Generate
3. Verify error message

### Test Steps - Network Error
1. Disconnect network
2. Try to generate
3. Verify error handling

### Test Steps - Invalid Scenario
1. Try to load non-existent scenario ID
2. Verify error handling

### Expected Results
- [ ] Clear error messages
- [ ] No crashes or blank screens
- [ ] User can recover from errors
- [ ] Errors logged to console

## Test 13: Legend and UI Elements

### Test Steps
1. Enable expansion mode
2. Generate suggestions
3. Verify legend appears
4. Hover over "?" icon
5. Read tooltip
6. Verify all colors match markers

### Expected Results
- [ ] Legend displays in bottom-left
- [ ] All 4 confidence bands shown
- [ ] Colors match marker colors
- [ ] Tooltip explains AI generation
- [ ] Legend is readable and clear

## Test 14: Scenario Refresh

### Test Steps
1. Load a saved scenario
2. Note suggestion count
3. Click "Refresh Scenario" (if implemented)
4. Verify suggestions regenerate
5. Verify count may differ (if data changed)

### Expected Results
- [ ] Refresh uses current store data
- [ ] Parameters remain same
- [ ] New suggestions generated
- [ ] Source data version updated

## Test 15: Cross-Browser Testing

### Test in Each Browser
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Verify
- [ ] Map renders correctly
- [ ] Controls work
- [ ] Markers display
- [ ] No console errors
- [ ] Performance acceptable

## Test 16: Mobile Responsiveness

### Test Steps
1. Open on mobile device or use DevTools mobile view
2. Navigate to map
3. Enable expansion mode
4. Verify controls are usable
5. Verify markers are tappable

### Expected Results
- [ ] Controls fit on screen
- [ ] Text is readable
- [ ] Buttons are tappable
- [ ] Map is usable
- [ ] No horizontal scroll

## Regression Tests

### After Any Code Changes
- [ ] Re-run Tests 1-5 (core functionality)
- [ ] Verify no new console errors
- [ ] Check network tab for extra requests
- [ ] Verify determinism still works

## Sign-Off

**Tester Name**: _______________
**Date**: _______________
**Build Version**: _______________

**Overall Status**: 
- [ ] PASS - All tests passed
- [ ] PASS WITH ISSUES - Minor issues noted below
- [ ] FAIL - Critical issues found

**Issues Found**:
1. 
2. 
3. 

**Notes**:
