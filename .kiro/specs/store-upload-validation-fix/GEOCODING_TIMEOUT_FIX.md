# Geocoding Timeout Fix

## Problem

The import was timing out because:
1. Nominatim (OpenStreetMap) geocoding service was failing with "fetch failed" errors
2. The system was retrying 3 times per address with exponential backoff
3. Processing 10+ addresses was taking longer than the 2-minute timeout
4. Nominatim has strict rate limiting (1 request per second)

## Root Cause

Nominatim rate limiting was being exceeded, causing requests to fail. The retry logic with exponential backoff was making the problem worse by adding more delays.

## Changes Made

### 1. Reduced Retry Attempts
**File**: `apps/admin/lib/services/geocoding.ts`
- Changed `maxRetries` from 3 to 1
- Changed `retryDelayMs` from 1000ms to 500ms
- This reduces the time spent on failed geocoding attempts

### 2. Increased Request Throttling
**File**: `apps/admin/lib/services/geocoding.ts`
- Changed `minInterval` from 250ms to 1500ms (1.5 seconds)
- This respects Nominatim's rate limit of 1 request per second

### 3. Reduced Batch Size
**File**: `apps/admin/lib/services/geocoding.ts`
- Changed `batchSize` from 20 to 3
- Process only 3 addresses in parallel to avoid overwhelming Nominatim

### 4. Increased Batch Delay
**File**: `apps/admin/lib/services/geocoding.ts`
- Changed delay between batches from 1s to 3s
- Gives Nominatim more breathing room between batches

### 5. Increased Client Timeout
**File**: `apps/admin/app/stores/components/UploadStoreData.tsx`
- Changed timeout from 2 minutes (120000ms) to 5 minutes (300000ms)
- Allows more time for geocoding to complete

### 6. Added City/Postcode Parsing
**File**: `apps/admin/lib/services/validation.ts`
- Added support for "City, State ZIP" combined format
- Automatically extracts postcode from combined field
- Example: "Berlin, BLN 10707" → City: "Berlin", Postcode: "10707"

## Expected Behavior

With these changes:
1. ✅ Geocoding respects Nominatim rate limits
2. ✅ Failed geocoding attempts fail faster (1 retry instead of 3)
3. ✅ Import has 5 minutes to complete instead of 2
4. ✅ Stores are saved even if geocoding fails (they just won't have coordinates)
5. ✅ City and postcode are correctly parsed from combined fields

## Timing Estimate

For 10 addresses with the new settings:
- 3 addresses per batch
- 1.5 seconds between requests within a batch
- 3 seconds between batches
- Estimated time: ~30-45 seconds for successful geocoding
- Still well under the 5-minute timeout

## Alternative Solutions

If Nominatim continues to fail:

1. **Add Mapbox Token**: Set `MAPBOX_TOKEN` environment variable
   - Mapbox has higher rate limits and better reliability
   - Free tier: 100,000 requests/month

2. **Add Google Maps API Key**: Set `GOOGLE_MAPS_API_KEY` environment variable
   - Most reliable but costs money after free tier
   - Free tier: $200 credit/month

3. **Skip Geocoding**: Stores can be imported without coordinates
   - They won't appear on the map initially
   - Can be geocoded later or coordinates added manually

## Testing

Try uploading your CSV again. You should see:
- Slower but more reliable geocoding
- Console logs showing throttling delays
- Import completing within 5 minutes
- Stores saved to database even if some geocoding fails
