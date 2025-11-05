# Test Results: Store Upload Flow

## Test Data

**File**: `sample-stores-10.csv`  
**Stores**: 10 Subway locations in London, UK  
**All addresses**: Complete with street, city, postal code, and country

## Test Execution Checklist

### Pre-Test Setup
- [ ] Development server running (`pnpm dev`)
- [ ] Browser console open (F12)
- [ ] Database accessible
- [ ] Test CSV file ready

### Test Steps

#### Step 1: Upload File
- [ ] Navigate to `http://localhost:3002/stores`
- [ ] Click "Upload Store Data"
- [ ] Select `sample-stores-10.csv`
- [ ] File uploads successfully

#### Step 2: Monitor Console Logs

**Expected Logs (in order):**

1. **Upload Phase**
   - [ ] `📊 [ingest-xxx] Retrieved 10 rows from upload cache`
   - [ ] `📊 [ingest-xxx] Column mapping: {...}`

2. **Validation Phase**
   - [ ] `✅ [ingest-xxx] Validation complete: 10 valid, 0 invalid`
   - [ ] `📊 [ingest-xxx] Sample valid store: {...}`

3. **Geocoding Phase**
   - [ ] `🌍 [ingest-xxx] Queuing geocode for "Subway London Bridge": {...}`
   - [ ] (9 more queuing messages)
   - [ ] `🌍 [ingest-xxx] Starting geocoding for 10 addresses`
   - [ ] `🔄 Processing batch 1/1 (10 addresses)`
   - [ ] `🔄 Attempt 1: Trying nominatim for "2 London Bridge Street, London, SE1 9RA, United Kingdom"`
   - [ ] `✅ Nominatim success: (51.xxxx, -0.xxxx) importance=X.X`
   - [ ] `✅ [ingest-xxx] Geocoded "Subway London Bridge" → (51.xxxx, -0.xxxx) via nominatim`
   - [ ] (9 more successful geocodes)
   - [ ] `✅ Batch 1 complete: 10/10 successful`
   - [ ] `🎉 Batch geocoding complete: 10/10 successful, 0 failed`
   - [ ] `📊 Provider usage: {nominatim: 10}`

4. **Database Phase**
   - [ ] `➕ [ingest-xxx] Created store "Subway London Bridge" (ID: xxx)`
   - [ ] `   Coordinates: (51.xxxx, -0.xxxx)`
   - [ ] (9 more store creations)
   - [ ] `📊 [ingest-xxx] Database verification: 10 stores found`
   - [ ] `📊 [ingest-xxx] Stores with coordinates in DB: 10/10`

5. **Completion**
   - [ ] `🎉 [ingest-xxx] Ingest completed in XXXms`
   - [ ] `📊 [ingest-xxx] Final summary: {totalRows: 10, inserted: 10, ...}`
   - [ ] Success toast notification appears

#### Step 3: Verify Database

Run verification script:
```bash
npx ts-node apps/admin/scripts/verify-store-coordinates.ts
```

**Expected Output:**
- [ ] `📊 Total stores in database: 10` (or more if previous data exists)
- [ ] `✅ Stores with valid coordinates: 10` (at least)
- [ ] All 10 test stores listed with coordinates
- [ ] All coordinates in valid ranges (lat: 51.4-51.6, lng: -0.2-0.0 for London)

#### Step 4: Verify Map Display

Navigate to `http://localhost:3002/stores/map`

**Expected Console Logs:**
- [ ] `🗺️ Map page: Setting up stores-imported event listener`
- [ ] `✅ Successfully fetched X stores from BFF` (X >= 10)
- [ ] `📊 Stores with valid coordinates: X/X`
- [ ] `📊 useStores: X/X stores have coordinates`
- [ ] `📍 Valid stores for map: X out of X`
- [ ] `✅ Map data updated with X stores`

**Visual Verification:**
- [ ] Map loads successfully
- [ ] At least 10 pins visible in London area
- [ ] Pins are clustered (may show as 1 cluster if zoomed out)
- [ ] Zoom in to see individual pins
- [ ] All 10 stores visible when zoomed in

#### Step 5: Test Pin Interactions

For each pin:
- [ ] Hover shows tooltip with:
  - Store name (e.g., "Subway London Bridge")
  - City ("London")
  - Country ("United Kingdom")
  - Coordinates (e.g., "51.5045, -0.0865")
  - Status indicator (Active/Inactive)
- [ ] Click opens store drawer with details
- [ ] Pins are at approximately correct locations (verify 2-3 stores)

#### Step 6: Test Map Refresh

1. Keep map page open
2. In another tab, upload another CSV file
3. Return to map tab

**Expected:**
- [ ] `📢 Emitting stores-imported event`
- [ ] `🗺️ Map page: Received stores-imported event`
- [ ] `🔄 Map page: Triggering refetch...`
- [ ] Map updates without page reload
- [ ] New stores appear on map

## Test Results

### Test Run #1

**Date**: _____________  
**Tester**: _____________  
**Environment**: Development

**Results:**
- Upload: ✅ / ❌
- Geocoding: ✅ / ❌ (___/10 successful)
- Database: ✅ / ❌ (___/10 with coordinates)
- Map Display: ✅ / ❌ (___/10 pins visible)
- Tooltips: ✅ / ❌
- Refresh: ✅ / ❌

**Issues Found:**
_____________________________________________
_____________________________________________

**Notes:**
_____________________________________________
_____________________________________________

### Performance Metrics

- File upload time: _______ seconds
- Geocoding time: _______ seconds
- Database save time: _______ seconds
- Total time: _______ seconds
- Map render time: _______ seconds

**Expected Performance:**
- File upload: < 1 second
- Geocoding (10 stores): 10-20 seconds
- Database save: < 1 second
- Total: 15-25 seconds
- Map render: < 2 seconds

## Known Issues

### Issue: Geocoding Rate Limiting

**Symptom**: Some stores fail to geocode with "rate limit" error

**Workaround**: Wait 1 minute and try again

**Status**: Expected behavior with Nominatim free tier

### Issue: Pins Clustering

**Symptom**: Only 1 pin visible when zoomed out

**Explanation**: MapLibre clusters nearby pins for performance

**Solution**: Zoom in to see individual pins

## Acceptance Criteria

All items must be checked for test to pass:

- [ ] All 10 stores uploaded successfully
- [ ] All 10 stores geocoded with valid coordinates
- [ ] All 10 stores saved to database with coordinates
- [ ] All 10 stores returned by API
- [ ] All 10 pins appear on map (when zoomed in)
- [ ] Tooltips show correct information
- [ ] Pins are at approximately correct geographic locations
- [ ] Map refreshes automatically after upload
- [ ] No JavaScript errors in console
- [ ] Performance within expected ranges

## Sign-Off

**Test Passed**: ✅ / ❌  
**Tester Signature**: _____________  
**Date**: _____________

**Notes for Next Test:**
_____________________________________________
_____________________________________________
