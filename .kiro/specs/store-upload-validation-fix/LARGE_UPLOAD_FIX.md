# Large Upload Fix (1,313 Stores)

## Problem Identified

The upload is timing out because you're uploading **1,313 stores**, not 10. With Nominatim's rate limiting:
- 1.5 seconds between requests
- 3 second delays between batches
- Processing 3 at a time
- **Total time: ~30+ minutes** for 1,313 addresses

The 5-minute timeout was killing the process.

## Solutions Implemented

### 1. Optimized Geocoding Performance

**Batch Processing:**
- Increased batch size from 3 to 5 for Nominatim (10 for commercial providers)
- Reduced batch delay from 3s to 1s for Nominatim (100ms for commercial)
- Reduced throttle interval from 1.5s to 1.2s for Nominatim

**Expected Performance:**
- **With Nominatim only**: ~15-20 minutes for 1,313 addresses (down from 30+)
- **With Mapbox/Google**: ~3-5 minutes for 1,313 addresses

### 2. Increased Timeout

Changed frontend timeout from 5 minutes to **30 minutes** to accommodate large uploads.

### 3. Smart Provider Detection

The system now automatically adjusts batch sizes and delays based on available providers:
- **Commercial providers (Mapbox/Google)**: Larger batches, shorter delays
- **Nominatim only**: Smaller batches, longer delays (respects rate limits)

## Recommended Solution: Get API Keys

For production use with large datasets, you should set up proper geocoding API keys:

### Option A: Mapbox (Recommended)
1. Sign up at https://www.mapbox.com/
2. Get your access token
3. Add to `.env.local`:
   ```
   MAPBOX_TOKEN=pk.your_token_here
   ```
4. Restart dev server

**Benefits:**
- 100,000 free requests/month
- Fast and reliable
- No rate limiting issues
- ~3-5 minutes for 1,313 addresses

### Option B: Google Maps
1. Enable Geocoding API in Google Cloud Console
2. Get your API key
3. Add to `.env.local`:
   ```
   GOOGLE_MAPS_API_KEY=your_key_here
   ```
4. Restart dev server

**Benefits:**
- $200 free credit/month
- Very accurate
- Fast processing
- ~3-5 minutes for 1,313 addresses

## Current Status

With the optimizations:
- ✅ Validation bug fixed (data structure conversion)
- ✅ Geocoding optimized for large uploads
- ✅ Timeout increased to 30 minutes
- ✅ Smart batch sizing based on providers
- ⚠️ Still slow with Nominatim only (~15-20 min for 1,313 stores)

## Testing

Try uploading your 1,313-store CSV again:
1. The validation should pass (all rows converted to objects correctly)
2. Geocoding will start (watch console logs)
3. With Nominatim: Expect 15-20 minutes
4. With Mapbox/Google: Expect 3-5 minutes

## Performance Comparison

| Provider | Batch Size | Delay | Time for 1,313 stores |
|----------|-----------|-------|----------------------|
| Nominatim (before) | 3 | 3s | ~30+ minutes |
| Nominatim (after) | 5 | 1s | ~15-20 minutes |
| Mapbox | 10 | 100ms | ~3-5 minutes |
| Google Maps | 10 | 100ms | ~3-5 minutes |

## Next Steps

1. **Short term**: Try the upload with optimized Nominatim (should work but slow)
2. **Long term**: Set up Mapbox or Google Maps API key for production use
3. **Alternative**: Split your 1,313 stores into smaller batches (e.g., 200 at a time)
