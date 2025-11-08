# City Verification Enhancement

## Problem Identified

GPT was generating rationales based on claimed city names that didn't match the actual geocoded locations:

**Example:**
- GPT claimed: "Guben is a border town with cross-border shoppers..."
- Actual location: Hoyerswerda (40km from border, not a border town)
- Issue: Rationale was factually incorrect for the actual location

## Solution Implemented

Enhanced geocoding with city verification and intelligent fallback to catch mismatches between GPT's claimed city and the actual geocoded location.

### How It Works

1. **GPT provides location details**
   - City name: "Guben"
   - Search query: "Hauptbahnhof, Guben, Germany"
   - Rationale: "Border town with cross-border traffic..."

2. **We geocode using Mapbox**
   - Get accurate lat/lng coordinates
   - Extract actual city name from Mapbox response

3. **We verify city match**
   - Compare GPT's claimed city vs actual geocoded city
   - If mismatch detected → Try fallback

4. **Fallback Strategy (Option C)**
   - If specific address geocodes to wrong city
   - Try geocoding just the city name: "Guben, Germany"
   - Use city center coordinates if that matches
   - Flag the suggestion as `usedCityFallback: true`

5. **Result**
   - ✅ Coordinates are accurate (from Mapbox)
   - ✅ City name reflects GPT's strategic choice
   - ✅ Falls back to city center if specific address is wrong
   - 🚩 Flagged when fallback was used

## Implementation Details

### Enhanced `geocodeAddress()` Method

```typescript
private async geocodeAddress(
  searchQuery: string, 
  expectedCity: string
): Promise<{ 
  lat: number; 
  lng: number; 
  actualCity: string; 
  geocoded: boolean 
} | null>
```

**Returns:**
- `lat`, `lng`: Accurate coordinates from Mapbox
- `actualCity`: City name extracted from Mapbox response
- `geocoded`: Flag indicating successful geocoding

### City Extraction

```typescript
private extractCityFromMapboxFeature(feature: any): string
```

Extracts city name from Mapbox's context hierarchy:
1. Looks for `place` type in context array (most reliable)
2. Falls back to `place_type` check
3. Last resort: extracts from `place_name`

### City Matching

```typescript
private verifyCityMatch(expected: string, actual: string): boolean
```

Normalizes and compares city names:
- Converts to lowercase
- Removes special characters
- Handles partial matches (e.g., "Frankfurt" matches "Frankfurt am Main")

## Logging

### Success Case (Exact Match)
```
✅ Geocoded: "Hauptbahnhof, Munich, Germany" → Munich (48.1351, 11.5820)
```

### Mismatch Case with Fallback
```
⚠️ CITY MISMATCH: GPT claimed "Guben" but geocoded to "Hoyerswerda"
   Query: "Hauptbahnhof, Guben, Germany"
   Coordinates: 51.4381, 14.2394
⚠️ City mismatch detected for "Hauptbahnhof, Guben, Germany"
   GPT claimed: "Guben", Mapbox found: "Hoyerswerda"
   Falling back to city center: "Guben, Germany"
✅ Using city center fallback for Guben
```

### Result
- Marker placed at Guben city center (not Hoyerswerda)
- Suggestion flagged with `usedCityFallback: true`
- Rationale about Guben is now accurate for the location

## Testing

Run the test script:
```bash
./scripts/test-city-verification.sh
```

Or test with actual API call:
```bash
curl -X POST http://localhost:3001/api/expansion/generate \
  -H 'Content-Type: application/json' \
  -d '{"region":"Germany","aggression":"moderate"}'
```

Then check BFF logs for city mismatch warnings.

## Benefits

✅ **Accuracy**: Coordinates come from Mapbox, not GPT guessing
✅ **Verification**: Catches hallucinations where GPT invents addresses
✅ **Intelligent Fallback**: Uses city center when specific address is wrong
✅ **Strategic Preservation**: Keeps GPT's city choice and rationale
✅ **Transparency**: Flags suggestions that used fallback
✅ **Best of Both**: GPT's strategic thinking + Mapbox's accurate coordinates

## Flag Usage

The `usedCityFallback` flag indicates:
- `false` or `undefined`: Specific address geocoded correctly
- `true`: Specific address failed, used city center instead

Use this flag to:
- Show visual indicator on map (e.g., different marker color)
- Lower confidence score for fallback suggestions
- Prioritize non-fallback suggestions in UI
- Track accuracy of GPT's address generation

## Example Flow

**Scenario: GPT suggests wrong address for right city**

1. GPT: "Hauptbahnhof, Guben" (doesn't exist or wrong location)
2. Mapbox: Geocodes to Hoyerswerda (wrong city)
3. System: Detects mismatch, tries "Guben, Germany"
4. Mapbox: Returns Guben city center (51.9500, 14.7167)
5. Result: Marker at Guben center, `usedCityFallback: true`

**Outcome:**
- ✅ Rationale about Guben is accurate
- ✅ Marker is in Guben (not Hoyerswerda)
- 🚩 Flagged as using fallback (less precise location)
