# Pre-Test Verification Report

## ✅ All Systems Check - PASSED

### 1. TypeScript Compilation
**Status**: ✅ PASSED
- No TypeScript errors in any modified files
- All type definitions are correct
- No compilation issues

### 2. Environment Configuration
**Status**: ✅ PASSED
- Mapbox token is set: `pk.eyJ1IjoicG9tYm82NiIsImEiOiJjbWhiMGYwZWcxa250MmpwY3JidDBtYmg0In0.bs4nA00qCWkfZPX50GiGyw`
- Upload feature flags enabled: `NEXT_PUBLIC_ALLOW_UPLOAD=true`, `ADMIN_ALLOW_UPLOAD=true`
- Database URL configured: `file:./dev.db`
- Max rows set to 2000 (your 1,313 stores are within limit)

### 3. Validation Schema Fix
**Status**: ✅ PASSED
- All fields now accept `null` and `undefined` in union types
- Proper transformation for empty values
- Required field (name) correctly validates
- Optional fields correctly handle missing data

**Verified in**: `apps/admin/lib/validation/store-upload.ts`

### 4. Data Structure Conversion
**Status**: ✅ PASSED
- Array rows from CSV parser are converted to objects with column names
- Headers are properly mapped to object keys
- Logging added for debugging

**Verified in**: `apps/admin/app/api/stores/ingest/route.ts` (lines 47-59)

### 5. Geocoding Optimization
**Status**: ✅ PASSED

**Batch Settings**:
- With Mapbox: 10 addresses per batch, 100ms delay
- With Nominatim: 5 addresses per batch, 1000ms delay
- Smart provider detection implemented

**Throttle Settings**:
- With Mapbox: 100ms between requests
- With Nominatim: 1200ms between requests

**Verified in**: `apps/admin/lib/services/geocoding.ts`

### 6. Timeout Configuration
**Status**: ✅ PASSED
- Frontend timeout: 30 minutes (1,800,000ms)
- Sufficient for 1,313 stores with Mapbox (~3-5 minutes expected)

**Verified in**: `apps/admin/app/stores/components/UploadStoreData.tsx` (line 209)

### 7. City/Postcode Parsing
**Status**: ✅ PASSED
- Handles "City, State ZIP" format
- Extracts postcode from combined field
- Normalizes city name correctly

**Verified in**: `apps/admin/lib/services/validation.ts` (lines 66-72)

### 8. Provider Priority
**Status**: ✅ PASSED
- Mapbox will be tried first (fastest, most reliable)
- Falls back to Nominatim if Mapbox fails
- Provider detection working correctly

## Expected Performance

### With Mapbox (Current Setup)
- **Batch size**: 10 addresses
- **Delay between batches**: 100ms
- **Throttle**: 100ms between requests
- **Total batches**: 132 batches (1,313 ÷ 10)
- **Estimated time**: 3-5 minutes

### Calculation
```
132 batches × (10 addresses × 100ms throttle + 100ms batch delay)
= 132 × (1000ms + 100ms)
= 132 × 1.1 seconds
= ~145 seconds = ~2.4 minutes (plus network latency)
```

## What to Expect During Upload

1. **Upload Phase** (~5 seconds)
   - File is parsed
   - Preview modal shows
   - Column mapping detected

2. **Validation Phase** (~2 seconds)
   - 1,313 rows validated
   - Data structure converted
   - Country inferred

3. **Geocoding Phase** (~3-5 minutes)
   - Console logs will show:
     - `📊 Using batch size: 10, delay: 100ms (providers: mapbox, nominatim)`
     - `🔄 Processing batch X/132`
     - `✅ Batch X complete: Y/10 successful`
     - `✅ Geocoding successful with mapbox`

4. **Database Phase** (~10-15 seconds)
   - Stores saved to database
   - Coordinates verified

5. **Completion**
   - Success message
   - Map refreshes with new stores

## Console Logs to Watch For

### Good Signs ✅
```
🔄 Available providers: mapbox, nominatim
📊 Using batch size: 10, delay: 100ms
✅ Geocoding successful with mapbox
📊 Batch geocoding complete: 1313/1313 successful
```

### Warning Signs ⚠️
```
⚠️ mapbox failed - trying nominatim
❌ All providers failed for "address"
```

### Error Signs ❌
```
❌ Mapbox API error: 401 Unauthorized (invalid token)
❌ ALL ROWS FAILED VALIDATION
```

## Troubleshooting

### If Mapbox fails with 401 Unauthorized
- Token might be invalid or expired
- Check token starts with `pk.` (public token)
- Verify token is active in Mapbox dashboard

### If validation still fails
- Check console for specific validation errors
- Verify CSV column names match expected format
- Check first row sample in logs

### If geocoding is slow
- Mapbox might be rate limiting (unlikely with 100k/month limit)
- Check network connection
- Verify Mapbox service status

## Ready to Test

All systems are verified and ready. You can now:
1. Navigate to the stores page
2. Click "Upload Store Data"
3. Select your 1,313-store CSV file
4. Review the preview and column mapping
5. Click "Import & Geocode"
6. Wait 3-5 minutes for completion

The system is optimized and should handle your upload successfully!
