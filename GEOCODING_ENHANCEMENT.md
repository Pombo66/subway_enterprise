# Geocoding Enhancement - Accurate Location Coordinates

## Problem
GPT-5 was generating strategic suggestions with excellent rationale but inaccurate coordinates. For example, suggesting "Porschestraße, Wolfsburg" but placing the marker in a rural area 10km away.

## Solution
Separate concerns: Let GPT do strategy, let Mapbox do coordinates.

## Implementation

### 1. Updated Prompt
- GPT now provides `searchQuery` field with exact address
- Enforces specific street names/landmarks (not vague descriptions)
- Examples: "Porschestraße, Wolfsburg" not "city center, Wolfsburg"

### 2. Post-Processing Geocoding
After GPT generates suggestions:
1. Extract `searchQuery` from each suggestion
2. Call Mapbox Geocoding API
3. Replace GPT's coordinates with Mapbox's accurate coordinates
4. Fallback to city center if specific address fails
5. Drop suggestions that can't be geocoded

### 3. Enhanced Validation
- Coordinates must be geocodable (real addresses)
- Re-validate distance from existing stores with accurate coordinates
- Flag geocoded suggestions for transparency

## Benefits

✅ **Accurate Map Pins**: Markers now appear at correct locations
✅ **Strategic Analysis**: GPT still provides excellent market insights
✅ **Quality Filter**: Invalid/vague locations are automatically dropped
✅ **Cost Effective**: Mapbox geocoding is free (100K requests/month)
✅ **No Breaking Changes**: Existing functionality preserved

## Example

**Before:**
```json
{
  "lat": 52.4,
  "lng": 10.5,  // Wrong! Rural area
  "city": "Wolfsburg",
  "rationale": "Porschestraße near Autostadt..."
}
```

**After:**
```json
{
  "lat": 52.4231,
  "lng": 10.7872,  // Correct! Wolfsburg city center
  "city": "Wolfsburg",
  "searchQuery": "Porschestraße, Wolfsburg, Germany",
  "rationale": "Porschestraße near Autostadt...",
  "geocoded": true
}
```

## Cost Analysis

**Per Generation (50 suggestions):**
- GPT-5-mini: ~$0.01
- Mapbox Geocoding: 50 calls = FREE (within free tier)
- **Total: ~$0.01** (no additional cost!)

**Monthly Limits:**
- Mapbox free tier: 100,000 requests/month
- Can generate 2,000 expansion plans/month before hitting limit

## Technical Details

**Geocoding Flow:**
1. Try specific address: "Porschestraße, Wolfsburg, Germany"
2. If fails, fallback to city: "Wolfsburg, Germany"
3. If both fail, drop suggestion

**Validation:**
- Coordinates in valid range (-90 to 90, -180 to 180)
- Within Germany (country filter)
- >500m from existing stores (re-checked with accurate coordinates)

## Files Modified

- `apps/bff/src/services/ai/simple-expansion.service.ts`
  - Updated prompt with location specificity requirements
  - Added `geocodeAddress()` method
  - Modified `parseSuggestions()` to use geocoding
  - Updated interface to include geocoding metadata

## Testing

Generate expansion suggestions and verify:
1. ✅ Markers appear at correct street/landmark locations
2. ✅ Rationale still references specific local features
3. ✅ Vague suggestions are dropped
4. ✅ Distance validation works with accurate coordinates

## Future Enhancements

**Phase 2 (Optional):**
- Cache geocoding results (same address = reuse coordinates)
- Batch geocoding requests for better performance
- Add city boundary validation (within 10km of city center)
- Confidence scoring based on Mapbox match quality

## Rollback Plan

If issues occur, revert to GPT coordinates by:
1. Remove `await` from `parseSuggestions()` call
2. Use `suggestion.lat` and `suggestion.lng` from GPT response
3. Skip geocoding step

No database changes required - this is purely runtime logic.
