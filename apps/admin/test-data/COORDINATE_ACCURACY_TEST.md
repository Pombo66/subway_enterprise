# Coordinate Accuracy Test

## Purpose

Verify that geocoded coordinates are accurate and match expected locations for well-known landmarks.

## Test Data

File: `coordinate-accuracy-test.csv`

Contains 5 famous landmarks with known coordinates:

| Location | Expected Coordinates | Tolerance |
|----------|---------------------|-----------|
| Big Ben, London | 51.5007, -0.1246 | ±0.001° (~110m) |
| Eiffel Tower, Paris | 48.8584, 2.2945 | ±0.001° (~110m) |
| Statue of Liberty, NYC | 40.6892, -74.0445 | ±0.001° (~110m) |
| Sydney Opera House | -33.8568, 151.2153 | ±0.001° (~110m) |
| Tokyo Tower | 35.6586, 139.7454 | ±0.001° (~110m) |

## Test Procedure

### Step 1: Upload Test File

1. Navigate to `/stores`
2. Upload `coordinate-accuracy-test.csv`
3. Monitor console for geocoding results

### Step 2: Check Geocoded Coordinates

Look for logs like:
```
✅ [ingest-xxx] Geocoded "Big Ben" → (51.5007, -0.1246) via nominatim
```

### Step 3: Verify Accuracy

For each location, check if geocoded coordinates are within tolerance:

**Big Ben:**
- Expected: (51.5007, -0.1246)
- Geocoded: (______, ______)
- Difference: ______ degrees
- Within tolerance: ✅ / ❌

**Eiffel Tower:**
- Expected: (48.8584, 2.2945)
- Geocoded: (______, ______)
- Difference: ______ degrees
- Within tolerance: ✅ / ❌

**Statue of Liberty:**
- Expected: (40.6892, -74.0445)
- Geocoded: (______, ______)
- Difference: ______ degrees
- Within tolerance: ✅ / ❌

**Sydney Opera House:**
- Expected: (-33.8568, 151.2153)
- Geocoded: (______, ______)
- Difference: ______ degrees
- Within tolerance: ✅ / ❌

**Tokyo Tower:**
- Expected: (35.6586, 139.7454)
- Geocoded: (______, ______)
- Difference: ______ degrees
- Within tolerance: ✅ / ❌

### Step 4: Visual Verification on Map

1. Navigate to `/stores/map`
2. Zoom to each location
3. Verify pin is at correct landmark

**Visual Check:**
- [ ] Big Ben pin is at Westminster, London
- [ ] Eiffel Tower pin is in Paris
- [ ] Statue of Liberty pin is in New York Harbor
- [ ] Sydney Opera House pin is in Sydney Harbor
- [ ] Tokyo Tower pin is in Tokyo

### Step 5: Test Different Countries

Verify geocoding works across different countries:

- [ ] United Kingdom (Big Ben) - ✅ / ❌
- [ ] France (Eiffel Tower) - ✅ / ❌
- [ ] United States (Statue of Liberty) - ✅ / ❌
- [ ] Australia (Sydney Opera House) - ✅ / ❌
- [ ] Japan (Tokyo Tower) - ✅ / ❌

### Step 6: Test Postal Code Inclusion

Verify postal codes are included in geocoding requests:

Check console logs for:
```
🌍 Geocoding request: {
  address: "Westminster, London, SW1A 0AA, United Kingdom",
  components: {address: "Westminster", city: "London", postcode: "SW1A 0AA", country: "United Kingdom"}
}
```

- [ ] Postal codes are included in geocoding requests
- [ ] Postal codes improve accuracy (compare with/without)

## Expected Results

### Accuracy Expectations

**Nominatim (OpenStreetMap):**
- Typical accuracy: ±10-100 meters for well-known locations
- May be less accurate for residential addresses
- Postal codes improve accuracy significantly

**Google Maps / Mapbox:**
- Typical accuracy: ±1-10 meters
- Generally more accurate than Nominatim
- Better for residential addresses

### Tolerance Levels

- **High accuracy**: < 0.0001° (~11m)
- **Good accuracy**: < 0.001° (~110m)
- **Acceptable accuracy**: < 0.01° (~1.1km)
- **Poor accuracy**: > 0.01° (>1.1km)

## Common Issues

### Issue: Coordinates Off by Several Kilometers

**Cause**: Geocoding service returned city center instead of specific address

**Solution**: 
- Ensure postal code is included
- Try more specific address
- Use different geocoding provider

### Issue: Coordinates in Wrong Country

**Cause**: Address ambiguity (e.g., "Paris, Texas" vs "Paris, France")

**Solution**:
- Always include country in address
- Include postal code for disambiguation

### Issue: No Results Found

**Cause**: Address format not recognized by geocoding service

**Solution**:
- Try different address format
- Use local language for address
- Include more context (landmarks, cross streets)

## Acceptance Criteria

- [ ] All 5 landmarks geocoded successfully
- [ ] All coordinates within ±0.001° tolerance (±110m)
- [ ] Pins appear at correct locations on map
- [ ] Geocoding works for all 5 different countries
- [ ] Postal codes are included in geocoding requests
- [ ] No geocoding errors in console

## Notes

**Geocoding Provider Used**: _______________

**Average Accuracy**: _______________

**Issues Encountered**: 
_____________________________________________
_____________________________________________

**Recommendations**:
_____________________________________________
_____________________________________________
