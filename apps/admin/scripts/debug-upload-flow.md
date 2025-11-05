# Store Upload Debugging Guide

This guide helps you diagnose why stores aren't appearing on the map after upload.

## Quick Diagnosis Steps

### Step 1: Upload a Test File

1. Navigate to `/stores` in your browser
2. Click "Upload Store Data"
3. Upload a CSV file with 10 stores
4. **Open browser console (F12)** before uploading

### Step 2: Check Console Logs

Look for these key log messages in order:

#### 📤 Upload Phase
```
📊 [ingest-xxx] Retrieved 10 rows from upload cache
```
✅ **If you see this**: File was parsed successfully  
❌ **If missing**: Check upload API logs

#### 🔍 Validation Phase
```
✅ [ingest-xxx] Validation complete: 10 valid, 0 invalid
```
✅ **If you see this**: All rows passed validation  
❌ **If "0 valid"**: Check validation errors above this line

#### 🌍 Geocoding Phase
```
🌍 [ingest-xxx] Starting geocoding for 10 addresses
🔄 Attempt 1: Trying nominatim for "123 Main St, London..."
✅ Nominatim success: (51.5074, -0.1278)
✅ [ingest-xxx] Geocoded "Store 1" → (51.5074, -0.1278) via nominatim
```
✅ **If you see success for all 10**: Geocoding worked  
❌ **If failures**: See "Geocoding Failures" section below

#### 💾 Database Phase
```
➕ [ingest-xxx] Created store "Store 1" (ID: abc123)
   Coordinates: (51.5074, -0.1278)
📊 [ingest-xxx] Stores with coordinates in DB: 10/10
```
✅ **If "10/10"**: All stores saved with coordinates  
❌ **If less than 10**: See "Database Issues" section below

#### 📡 API Phase
```
✅ Successfully fetched 10 stores from BFF
📊 Stores with valid coordinates: 10/10
```
✅ **If "10/10"**: API returning all stores  
❌ **If less**: See "API Issues" section below

#### 🗺️ Map Phase
```
📊 useStores: 10/10 stores have coordinates
📍 Valid stores for map: 10 out of 10
✅ Map data updated with 10 stores
```
✅ **If "10 out of 10"**: All stores should appear on map  
❌ **If less**: See "Map Filtering Issues" section below

## Common Issues and Solutions

### Issue 1: Geocoding Failures

**Symptoms:**
```
⚠️ nominatim failed for "Store Name": No results found
❌ All providers failed after 3 attempts
```

**Causes:**
- Invalid or incomplete addresses
- Geocoding provider rate limits
- Network issues

**Solutions:**
1. Check if addresses are complete (street, city, country)
2. Verify postal codes are included
3. Check if Nominatim is accessible: https://nominatim.openstreetmap.org/
4. Wait a few minutes and try again (rate limiting)

### Issue 2: Database Not Saving Coordinates

**Symptoms:**
```
📊 [ingest-xxx] Stores with coordinates in DB: 1/10
⚠️ Stores missing coordinates in DB: [Store2, Store3, ...]
```

**Causes:**
- Database transaction rollback
- Coordinate validation failing
- Prisma client issues

**Solutions:**
1. Check for database errors in logs
2. Run verification script: `npx ts-node apps/admin/scripts/verify-store-coordinates.ts`
3. Check if coordinates are within valid ranges (-90 to 90, -180 to 180)

### Issue 3: API Not Returning Stores

**Symptoms:**
```
⚠️ Stores without coordinates: 9
```

**Causes:**
- BFF not returning all stores
- API filtering out stores
- Database query issues

**Solutions:**
1. Check BFF logs
2. Query database directly to verify stores exist
3. Check API route filters

### Issue 4: Map Filtering Out Stores

**Symptoms:**
```
⚠️ Store filtered out from map: {name: "Store 1", lat: null, lng: null}
📍 Valid stores for map: 1 out of 10
```

**Causes:**
- Coordinates are null/undefined
- Coordinates are NaN
- Coordinates out of valid range

**Solutions:**
1. Check why coordinates are null (see Issue 1 or 2)
2. Verify coordinate types in API response
3. Check for data type conversion issues

## Manual Verification

### Check Database Directly

Run the verification script:
```bash
npx ts-node apps/admin/scripts/verify-store-coordinates.ts
```

This will show:
- Total stores in database
- How many have coordinates
- Which stores are missing coordinates
- Recent uploads

### Check API Response

Open browser console and run:
```javascript
fetch('/api/stores')
  .then(r => r.json())
  .then(stores => {
    console.log('Total stores:', stores.length);
    console.log('With coords:', stores.filter(s => s.latitude && s.longitude).length);
    console.log('Sample:', stores.slice(0, 3));
  });
```

### Check Map Data

In browser console while on `/stores/map`:
```javascript
// Check what stores the map received
console.log('Stores in map:', window.__mapStores || 'not available');
```

## Expected Success Pattern

When everything works correctly, you should see:

```
📊 [ingest-xxx] Retrieved 10 rows from upload cache
✅ [ingest-xxx] Validation complete: 10 valid, 0 invalid
🌍 [ingest-xxx] Starting geocoding for 10 addresses
✅ [ingest-xxx] Geocoding summary: 10/10 successful, 0 failed
➕ [ingest-xxx] Created store "Store 1" (ID: xxx)
   Coordinates: (51.5074, -0.1278)
... (9 more stores)
📊 [ingest-xxx] Stores with coordinates in DB: 10/10
📢 Emitting stores-imported event
🗺️ Map page: Received stores-imported event
✅ Successfully fetched 10 stores from BFF
📊 Stores with valid coordinates: 10/10
📊 useStores: 10/10 stores have coordinates
📍 Valid stores for map: 10 out of 10
✅ Map data updated with 10 stores
```

Then you should see 10 pins on the map!

## Still Having Issues?

If you've followed all steps and still only see 1 pin:

1. **Clear browser cache** and reload
2. **Check for JavaScript errors** in console (red messages)
3. **Verify database** has all 10 stores with coordinates
4. **Check map zoom level** - zoom out to see if pins are clustered
5. **Look for duplicate coordinates** - stores at same location cluster into 1 pin

## Getting Help

When reporting issues, include:

1. Full console logs from upload to map display
2. Output from verification script
3. Sample CSV file (first 3 rows)
4. Browser and version
5. Any error messages (red text in console)
