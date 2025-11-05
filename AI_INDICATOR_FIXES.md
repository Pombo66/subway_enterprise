# AI Indicator Ring Fixes

## Issue
AI-enhanced expansion suggestions were not showing the gold rings/glow effects on the map, even though the data was being generated correctly.

## Root Cause
The AI glow layer was being added AFTER the main suggestion circles, causing it to render on top and potentially be invisible or interfere with the main markers.

## Fixes Applied

### 1. Layer Ordering Fix
**Problem**: Glow layer added after main layer
**Solution**: Reordered layers so glow appears behind main circles

```typescript
// BEFORE (wrong order)
map.addLayer('expansion-suggestions');      // Main circles first
map.addLayer('expansion-suggestions-ai-glow'); // Glow on top

// AFTER (correct order)  
map.addLayer('expansion-suggestions-ai-glow'); // Glow behind
map.addLayer('expansion-suggestions');         // Main circles on top
```

### 2. Enhanced Glow Visibility
**Improvements**:
- Increased glow radius: `16` → `18` pixels
- Increased opacity: `0.2` → `0.3` for better visibility
- Increased blur: `1` → `2` for better glow effect
- Increased main circle opacity: `0.8` → `0.9`

### 3. Added Debug Logging
**Service Level** (`expansion-generation.service.ts`):
```typescript
console.log(`🤖 AI suggestions generated: ${aiSuggestions.length}`);
console.log(`🔍 AI suggestion sample:`, { hasAIAnalysis, aiProcessingRank, ... });
```

**Map Level** (`WorkingMapView.tsx`):
```typescript
console.log(`🗺️ Map: Adding ${suggestions.length} suggestions, ${aiFeatures.length} with AI analysis`);
console.log(`🤖 AI features sample:`, aiFeatures.slice(0, 2));
```

## Expected Behavior After Fix

### Visual Indicators
✅ **Gold Glow Ring**: Visible behind AI-enhanced suggestions  
✅ **Gold Stroke**: Thicker gold border on AI suggestions  
✅ **Larger Size**: AI suggestions slightly larger (12px vs 10px)  
✅ **Purple Color**: All expansion suggestions use purple (`#8b5cf6`)

### Data Flow Verification
1. **Generation**: Top 20% of suggestions get `hasAIAnalysis: true`
2. **Service**: Logs show AI suggestion count and sample data
3. **Map**: Logs show AI features being added to map
4. **Rendering**: Gold glow layer renders behind main circles

## Testing
Run the test script to verify AI indicators:
```bash
node test-ai-indicators.mjs
```

Expected output:
- 20% of suggestions marked as AI-enhanced
- GeoJSON features have `hasAIAnalysis: true`
- MapLibre filter matches AI features correctly

## Browser Console Verification
When generating expansion suggestions, look for:
```
🤖 AI suggestions generated: 10
🗺️ Map: Adding 50 suggestions, 10 with AI analysis
🤖 AI features sample: [{ id: "suggestion-1", hasAIAnalysis: true, ... }]
```

## Files Modified
1. `apps/admin/app/stores/map/components/WorkingMapView.tsx` - Layer ordering and debug logs
2. `apps/admin/lib/services/expansion-generation.service.ts` - Debug logging
3. `test-ai-indicators.mjs` - Test script for verification

The AI indicator rings should now be clearly visible as gold glows behind the purple expansion suggestion markers!