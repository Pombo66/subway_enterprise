# Testing Guide: Store Upload Geocoding Fix

## Overview

This guide will help you test the store upload functionality and verify that all stores appear on the map with correct coordinates.

## Prerequisites

1. Ensure the development environment is running:
   ```bash
   pnpm dev
   ```

2. Open browser console (F12) to monitor logs

## Test Scenario: Upload 10 Stores

### Step 1: Prepare Test Data

Create a CSV file named `test-stores.csv` with the following content:

```csv
name,address,city,postcode,country
Store 1,123 Main Street,London,SW1A 1AA,United Kingdom
Store 2,456 Oxford Street,London,W1D 1BS,United Kingdom
Store 3,789 Regent Street,London,W1B 5TH,United Kingdom
Store 4,321 Baker Street,London,NW1 6XE,United Kingdom
Store 5,654 Piccadilly,London,W1J 0BH,United Kingdom
Store 6,987 Bond Street,London,W1S 1AY,United Kingdom
Store 7,147 Kensington High Street,London,W8 5SF,United Kingdom
Store 8,258 King's Road,London,SW3 5UL,United Kingdom
Store 9,369 Brompton Road,London,SW3 1HY,United Kingdom
Store 10,741 Fulham Road,London,SW6 5UL,United Kingdom
```

### Step 2: Upload the File

1. Navigate to `http://localhost:3002/stores`
2. Click "Upload Store Data" button
3. Select `test-stores.csv`
4. **Watch the browser console** for log messages

### Step 3: Verify Upload Logs

You should see logs in this sequence:

#### ✅ Expected Success Logs

```
📊 [ingest-xxx] Retrieved 10 rows from upload cache
📊 [ingest-xxx] Column mapping: {...}
✅ [ingest-xxx] Validation complete: 10 valid, 0 invalid
🌍 [ingest-xxx] Queuing geocode for "Store 1": {address: "123 Main Street", city: "London", ...}
... (9 more stores)
🌍 [ingest-xxx] Starting geocoding for 10 addresses
🔄 Processing batch 1/1 (10 addresses)
🔄 Attempt 1: Trying nominatim for "123 Main Street, London, SW1A 1AA, United Kingdom"
✅ Nominatim success: (51.5074, -0.1278) importance=0.8
✅ [ingest-xxx] Geocoded "Store 1" → (51.5074, -0.1278) via nominatim
... (9 more successful geocodes)
✅ Batch 1 complete: 10/10 successful
🎉 Batch geocoding complete: 10/10 successful, 0 failed
📊 Provider usage: {nominatim: 10}
➕ [ingest-xxx] Created store "Store 1" (ID: abc-123)
   Coordinates: (51.5074, -0.1278)
... (9 more stores created)
📊 [ingest-xxx] Database verification: 10 stores found
📊 [ingest-xxx] Stores with coordinates in DB: 10/10
🎉 [ingest-xxx] Ingest completed in XXXms
📊 [ingest-xxx] Final summary: {
  totalRows: 10,
  validRows: 10,
  inserted: 10,
  updated: 0,
  failed: 0,
  pendingGeocode: 0,
  storesWithCoordinates: 10
}
```

### Step 4: Verify Database

Run the verification script:

```bash
npx ts-node apps/admin/scripts/verify-store-coordinates.ts
```

**Expected output:**
```
📊 Total stores in database: 10

✅ Stores with valid coordinates: 10
❌ Stores without coordinates: 0

📍 Stores with coordinates:
  - Store 1 (London, United Kingdom)
    Coordinates: (51.5074, -0.1278)
  ... (9 more)

📊 Summary:
  Total stores: 10
  With coordinates: 10 (100.0%)
  Without coordinates: 0 (0.0%)
  Invalid ranges: 0
```

### Step 5: Verify Map Display

1. Navigate to `http://localhost:3002/stores/map`
2. **Watch the browser console** for map logs

#### ✅ Expected Map Logs

```
🗺️ Map page: Setting up stores-imported event listener
📡 Proxying stores request to BFF: http://localhost:3001/stores
✅ Successfully fetched 10 stores from BFF
📊 Stores with valid coordinates: 10/10
📊 Sample stores: [
  {name: "Store 1", city: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278},
  ...
]
🔄 Filtering stores with filters: {}
📊 useStores: 10/10 stores have coordinates
🗺️ Starting MapLibre initialization...
✅ MapLibre instance created successfully
✅ Map loaded successfully
📍 Creating GeoJSON source for 10 stores
📍 Valid stores for map: 10 out of 10
📍 Sample valid stores: [
  {name: "Store 1", lat: 51.5074, lng: -0.1278},
  ...
]
📍 Generated GeoJSON with 10 features
✅ All map layers added: [...]
🎯 Auto-fitting map to show all stores
✅ Map fitted to bounds
```

3. **Verify visually**: You should see 10 pins on the map in the London area
4. **Hover over pins**: Tooltips should show store name, city, country, and coordinates
5. **Click on pins**: Store drawer should open with details

### Step 6: Test Map Refresh

1. Keep the map page open
2. In another tab, upload another CSV file
3. **Watch the map page console** for refresh logs:

```
📢 Emitting stores-imported event: {hasData: true, summary: {...}}
🗺️ Map page: Received stores-imported event: {...}
🔄 Map page: Triggering refetch...
🔄 Refetching store data
✅ Store data refreshed: 20 stores
📊 useStores: 20/20 stores have coordinates
🔄 Updating map data due to store changes
📊 Total stores received: 20
📊 Valid stores for update: 20/20
✅ Map data updated with 20 stores
```

4. **Verify**: Map should now show 20 pins without page reload

## Troubleshooting

### Problem: Only 1 pin appears instead of 10

**Check 1: Geocoding**
Look for these logs:
```
⚠️ nominatim failed for "Store Name": No results found
❌ All providers failed after 3 attempts
```

**Solution**: Addresses may be invalid. Check CSV file for complete addresses.

**Check 2: Database**
Run verification script and look for:
```
📊 [ingest-xxx] Stores with coordinates in DB: 1/10
```

**Solution**: Check database logs for errors. Coordinates may not be saving.

**Check 3: Duplicate Coordinates**
All stores might have the same coordinates and are clustering into 1 pin.

**Solution**: Zoom in on the pin or check coordinates in database.

### Problem: Geocoding is slow

**Expected**: ~1-2 seconds per store with Nominatim (rate limiting)
**For 10 stores**: ~10-20 seconds total

**If slower**: Check network connection to nominatim.openstreetmap.org

### Problem: Map doesn't refresh after upload

**Check**: Event system logs
```
📢 Emitting stores-imported event
🗺️ Map page: Received stores-imported event
```

**Solution**: If event is emitted but not received, refresh the map page manually.

## Success Criteria

✅ All 10 stores uploaded successfully  
✅ All 10 stores geocoded with coordinates  
✅ All 10 stores saved to database with coordinates  
✅ All 10 stores returned by API  
✅ All 10 pins appear on map  
✅ Tooltips show correct information  
✅ Map refreshes automatically after upload  

## Performance Benchmarks

- **File parsing**: < 1 second
- **Validation**: < 1 second
- **Geocoding (10 stores)**: 10-20 seconds (Nominatim rate limiting)
- **Database save**: < 1 second
- **Map render**: < 2 seconds

**Total time**: ~15-25 seconds for 10 stores

## Additional Tests

### Test with Different Countries

Upload stores from different countries to verify geocoding works globally:

```csv
name,address,city,postcode,country
Paris Store,10 Rue de Rivoli,Paris,75001,France
Berlin Store,Unter den Linden 1,Berlin,10117,Germany
New York Store,350 5th Ave,New York,10118,United States
```

### Test with Missing Postal Codes

Verify geocoding still works without postal codes:

```csv
name,address,city,country
Test Store,Main Street,London,United Kingdom
```

### Test with Existing Coordinates

Upload stores that already have coordinates (should skip geocoding):

```csv
name,address,city,country,latitude,longitude
Coord Store,Test Address,London,United Kingdom,51.5074,-0.1278
```

Expected log:
```
✓ [ingest-xxx] Store "Coord Store" already has coordinates: (51.5074, -0.1278)
```

## Reporting Issues

If tests fail, provide:

1. Full console logs (copy/paste)
2. Output from verification script
3. CSV file used for testing
4. Screenshots of map (if relevant)
5. Browser and version

Include this information when reporting the issue.
