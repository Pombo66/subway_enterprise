# Testing Guide

## Quick Test

To verify the fix works:

1. **Start the development server:**
   ```bash
   pnpm -C apps/admin dev
   ```

2. **Navigate to the stores page** (should have the upload button)

3. **Upload the test file:**
   - Use `apps/admin/test-data/sample-stores-10.csv`
   - This file contains 10 valid store records with name, address, city, postcode, and country

4. **Expected behavior:**
   - ✅ File uploads successfully
   - ✅ Preview modal shows all 10 rows
   - ✅ Column mapping is auto-detected correctly
   - ✅ Country is inferred as "United Kingdom" from data
   - ✅ All rows show as "Valid" in validation summary
   - ✅ Import succeeds without errors
   - ✅ Stores are geocoded and saved to database
   - ✅ Stores appear on the map

## Console Logs to Check

When you upload the file, you should see logs like:

```
🔍 Validating store data: { originalData: {...}, mappedData: {...}, mapping: {...} }
✅ Validation successful
🌍 Country inference active: United Kingdom
🌍 Row 1: Using inferred country "United Kingdom" (no country in data)
✅ [ingest-xxx] Validation complete: 10 valid, 0 invalid
🌍 [ingest-xxx] Starting geocoding for 10 addresses
✅ [ingest-xxx] Geocoded "Subway London Bridge" → (51.5074, -0.0877) via mapbox
...
🎉 [ingest-xxx] Ingest completed in XXXms
```

## Test Cases

### Test Case 1: Valid CSV with All Fields
**File:** `sample-stores-10.csv`  
**Expected:** All rows validate and import successfully

### Test Case 2: CSV with Missing Optional Fields
Create a CSV with only required fields:
```csv
name
Subway Test Store
```
**Expected:** Validates successfully, geocoding may fail but store is saved

### Test Case 3: CSV with Empty Name
Create a CSV with empty name:
```csv
name,address,city
,123 Main St,London
```
**Expected:** Validation fails with "Store name is required"

### Test Case 4: CSV with Country Column
Create a CSV with explicit country:
```csv
name,address,city,country
Subway Test,123 Main St,London,United Kingdom
```
**Expected:** Uses mapped country, not inferred country

### Test Case 5: CSV with Coordinates
Create a CSV with coordinates:
```csv
name,address,city,latitude,longitude
Subway Test,123 Main St,London,51.5074,-0.1278
```
**Expected:** Skips geocoding, uses provided coordinates

## Debugging

If validation still fails:

1. **Check browser console** for detailed validation logs
2. **Check server console** for backend validation logs
3. **Look for these log patterns:**
   - `🔍 Validating store data:` - Shows what's being validated
   - `❌ Validation failed:` - Shows why validation failed
   - `🌍 Country inference active:` - Shows if country inference is working

4. **Common issues:**
   - Column mapping not detected correctly → Check CSV headers match expected names
   - Country inference not working → Check filename or data patterns
   - Geocoding failing → Check geocoding service configuration

## Verification Checklist

After uploading `sample-stores-10.csv`:

- [ ] Upload completes without errors
- [ ] Preview modal shows 10 rows
- [ ] All rows marked as "Valid"
- [ ] Country inferred as "United Kingdom"
- [ ] Import succeeds
- [ ] Console shows "✅ Validation successful" for all rows
- [ ] Console shows geocoding results
- [ ] Database contains 10 new stores
- [ ] Stores appear on map with correct coordinates
- [ ] No error messages in browser or server console

## Expected Console Output

```
🔄 Starting ingest process [ingest-xxx]
📊 [ingest-xxx] Retrieved 10 rows from upload cache
📊 [ingest-xxx] Column mapping: {"name":"name","address":"address","city":"city","postcode":"postcode","country":"country"}
📊 [ingest-xxx] Inferred country: United Kingdom
🔍 Starting validation with inferred country: United Kingdom
🌍 Country inference active: United Kingdom
🔍 Validating store data: {...}
✅ Validation successful
🔍 Validating store data: {...}
✅ Validation successful
... (repeated for all 10 rows)
✅ [ingest-xxx] Validation complete: 10 valid, 0 invalid
📊 [ingest-xxx] Sample valid store: {name: "Subway London Bridge", address: "2 London Bridge Street", ...}
🌍 [ingest-xxx] Starting geocoding for 10 addresses
📊 [ingest-xxx] Geocoding results received: 10 results
✅ [ingest-xxx] Geocoded "Subway London Bridge" → (51.5074, -0.0877) via mapbox
... (repeated for all 10 stores)
✅ [ingest-xxx] Geocoding summary: 10/10 successful, 0 failed
📝 [ingest-xxx] Updated store "Subway London Bridge" (ID: xxx)
... (repeated for all 10 stores)
📊 [ingest-xxx] Database verification: 10 stores found
📊 [ingest-xxx] Stores with coordinates in DB: 10/10
🎉 [ingest-xxx] Ingest completed in XXXms
📢 [ingest-xxx] Emitting stores-imported event to trigger map refresh
```

## Success Indicators

✅ No "Invalid input" errors  
✅ No "name: Store name is required" errors for valid data  
✅ Country inference logs appear  
✅ All validation logs show success  
✅ Geocoding completes successfully  
✅ Stores saved to database  
✅ Map refreshes with new stores
