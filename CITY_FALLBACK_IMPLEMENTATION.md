# City Fallback Implementation

## Problem Solved

When GPT suggests a location with a specific address that doesn't exist or geocodes to the wrong city, we now intelligently fall back to the city center while preserving GPT's strategic rationale.

## Implementation: Option C + Flag

### The Flow

```
1. GPT suggests: "Hauptbahnhof, Guben, Germany"
   ↓
2. Geocode specific address
   ↓
3. Result: Hoyerswerda (MISMATCH!)
   ↓
4. Fallback: Geocode "Guben, Germany"
   ↓
5. Result: Guben city center ✅
   ↓
6. Flag: usedCityFallback = true
```

### Key Features

✅ **Preserves Strategic Intent**: Uses GPT's chosen city (Guben)
✅ **Accurate Coordinates**: From Mapbox, not GPT guessing
✅ **Intelligent Fallback**: City center when specific address fails
✅ **Transparent Flagging**: `usedCityFallback` indicates fallback was used
✅ **Rationale Alignment**: Rationale matches the actual location

## Code Changes

### 1. Updated Return Type

```typescript
private async geocodeAddress(
  searchQuery: string, 
  expectedCity: string
): Promise<{ 
  lat: number; 
  lng: number; 
  actualCity: string; 
  geocoded: boolean;
  cityMatch: boolean  // NEW: Indicates if city matched
} | null>
```

### 2. Added Fallback Logic

```typescript
// If geocoding failed or city mismatch, try fallback
if (!geocoded || !geocoded.cityMatch) {
  // Try geocoding just the city name
  const cityFallback = await this.geocodeAddress(
    `${claimedCity}, Germany`, 
    claimedCity
  );
  
  if (cityFallback && cityFallback.cityMatch) {
    geocoded = cityFallback;
    usedCityFallback = true;
    this.logger.log(`✅ Using city center fallback for ${claimedCity}`);
  }
}
```

### 3. Added Flag to Response

```typescript
export interface ExpansionSuggestion {
  // ... existing fields
  usedCityFallback?: boolean; // NEW: Indicates city center fallback
}
```

## Usage Examples

### Example 1: Perfect Match (No Fallback)

**Input:**
- GPT: "Marienplatz, Munich, Germany"
- Mapbox: Munich (48.1374, 11.5755)

**Output:**
```json
{
  "city": "Munich",
  "lat": 48.1374,
  "lng": 11.5755,
  "usedCityFallback": false
}
```

### Example 2: Address Mismatch (Fallback Used)

**Input:**
- GPT: "Hauptbahnhof, Guben, Germany"
- Mapbox (specific): Hoyerswerda (mismatch!)
- Mapbox (fallback): Guben city center

**Output:**
```json
{
  "city": "Guben",
  "lat": 51.9500,
  "lng": 14.7167,
  "usedCityFallback": true
}
```

**Logs:**
```
⚠️ CITY MISMATCH: GPT claimed "Guben" but geocoded to "Hoyerswerda"
   Query: "Hauptbahnhof, Guben, Germany"
   Coordinates: 51.4381, 14.2394
⚠️ City mismatch detected for "Hauptbahnhof, Guben, Germany"
   GPT claimed: "Guben", Mapbox found: "Hoyerswerda"
   Falling back to city center: "Guben, Germany"
✅ Using city center fallback for Guben
```

## UI Integration

Use the `usedCityFallback` flag to:

### 1. Visual Indicators
```typescript
const markerColor = suggestion.usedCityFallback 
  ? 'orange'  // Fallback used (less precise)
  : 'green';  // Exact address (more precise)
```

### 2. Confidence Adjustment
```typescript
const adjustedConfidence = suggestion.usedCityFallback
  ? suggestion.confidence * 0.9  // Reduce by 10%
  : suggestion.confidence;
```

### 3. Tooltip Information
```typescript
const tooltip = suggestion.usedCityFallback
  ? `${suggestion.city} (city center - specific address not found)`
  : `${suggestion.specificLocation}, ${suggestion.city}`;
```

### 4. Sorting Priority
```typescript
// Prioritize exact matches over fallbacks
suggestions.sort((a, b) => {
  if (a.usedCityFallback && !b.usedCityFallback) return 1;
  if (!a.usedCityFallback && b.usedCityFallback) return -1;
  return b.confidence - a.confidence;
});
```

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Wrong Address** | Marker in wrong city | Marker in correct city center |
| **Rationale** | Doesn't match location | Matches location |
| **Transparency** | No indication of issue | Flagged with `usedCityFallback` |
| **User Trust** | Confusing mismatches | Clear and accurate |
| **Strategic Value** | Lost (wrong city) | Preserved (right city) |

## Testing

Run the test script:
```bash
./scripts/test-city-fallback.sh
```

Or test with real API:
```bash
# Start BFF
pnpm -C apps/bff dev

# Generate expansion
curl -X POST http://localhost:3001/api/expansion/generate \
  -H 'Content-Type: application/json' \
  -d '{"region":"Germany","aggression":"moderate"}'

# Check response for usedCityFallback flags
# Check logs for fallback messages
```

## Decision Rationale

**Why Option C (Fallback) + Flag?**

1. **Trust GPT's Strategy**: GPT is good at identifying which cities need stores
2. **Trust Mapbox's Geography**: Mapbox is accurate for coordinates
3. **Handle GPT's Address Errors**: GPT sometimes invents addresses that don't exist
4. **Preserve Value**: Don't throw away good strategic suggestions due to bad addresses
5. **Maintain Transparency**: Flag fallbacks so users know precision level

This approach gives us the best of both worlds: GPT's strategic thinking with Mapbox's geographic accuracy.
