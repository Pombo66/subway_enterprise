# Quadrant View Feature

## Overview
Added regional quadrant view system to focus on specific geographic areas of a country (Northwest, Northeast, Southwest, Southeast).

## What It Does

Allows users to:
- View stores in specific quadrants of a country
- See store counts per quadrant
- Focus analysis on one region at a time
- Toggle back to full country view anytime

## Visual Layout

```
┌─────────────┬─────────────┐
│             │             │
│   NORTH     │   NORTH     │
│   WEST      │   EAST      │
│             │             │
├─────────────┼─────────────┤
│             │             │
│   SOUTH     │   SOUTH     │
│   WEST      │   EAST      │
│             │             │
└─────────────┴─────────────┘
```

## Components Added

### 1. QuadrantSelector Component
**Location**: `apps/admin/app/stores/map/components/QuadrantSelector.tsx`

- Displays in top-left corner of map
- Shows "All Regions" button + 2x2 grid of quadrants
- Displays store count for each quadrant
- Clean, modern UI matching app design

### 2. Quadrant Utilities
**Location**: `apps/admin/app/stores/map/utils/quadrant-utils.ts`

Functions:
- `getCountryCenter()` - Get center coordinates for a country
- `isInQuadrant()` - Check if a point is in a specific quadrant
- `filterStoresByQuadrant()` - Filter stores by quadrant
- `countStoresByQuadrant()` - Count stores in each quadrant
- `getQuadrantBounds()` - Get geographic bounds for a quadrant

Country Centers:
- Germany: 51.1657°N, 10.4515°E
- Belgium: 50.5039°N, 4.4699°E
- France: 46.2276°N, 2.2137°E
- Netherlands: 52.1326°N, 5.2913°E

## How It Works

### 1. Quadrant Calculation
- Uses country center as dividing point
- North/South: latitude >= center.lat
- East/West: longitude >= center.lng

### 2. Filtering Logic
```typescript
// Default: Show all stores
const filteredStores = selectedQuadrant === 'ALL' 
  ? stores 
  : stores.filter(/* quadrant logic */);
```

### 3. State Management
- New state: `selectedQuadrant` (defaults to 'ALL')
- Computed: `filteredStores` (memoized for performance)
- Computed: `quadrantCounts` (memoized for performance)

## Integration Points

### ExpansionIntegratedMapPage
- Added quadrant state
- Added filtering logic
- Passes filtered stores to map
- Renders QuadrantSelector component

### WorkingMapView
- Receives filtered stores (no changes needed)
- Renders only stores in selected quadrant

## Safety Features

✅ **Non-Breaking**: Default behavior unchanged (shows all stores)
✅ **Opt-In**: User must click quadrant to activate filtering
✅ **Reversible**: Click "All Regions" to restore full view
✅ **Performance**: Uses memoization to avoid unnecessary recalculations
✅ **Compatible**: Works with existing filters (country, region, status)

## Usage

1. **View All Stores** (Default)
   - Map shows all stores in selected country
   - QuadrantSelector shows "All Regions" selected

2. **Focus on Quadrant**
   - Click NW, NE, SW, or SE button
   - Map filters to show only stores in that quadrant
   - Store count updates to show filtered count

3. **Return to Full View**
   - Click "All Regions" button
   - Map shows all stores again

## Benefits

✅ **Focus**: Easier to analyze specific regions
✅ **Clarity**: Less visual clutter when zoomed in
✅ **Analysis**: Compare quadrants side-by-side
✅ **Performance**: Fewer markers to render
✅ **Expansion**: Can generate suggestions per quadrant

## Future Enhancements

Potential additions:
- Auto-zoom to quadrant bounds when selected
- Overlay showing quadrant boundaries on map
- Quadrant-specific expansion generation
- Save quadrant preference per user
- Custom quadrant definitions (not just N/S/E/W)

## Testing

Test scenarios:
1. ✅ Default shows all stores
2. ✅ Each quadrant shows correct stores
3. ✅ Store counts are accurate
4. ✅ Works with country filter
5. ✅ Works with expansion mode
6. ✅ Toggle back to "All" works
7. ✅ Fullscreen mode hides selector

## Rollback

If needed, remove:
1. `QuadrantSelector.tsx` component
2. `quadrant-utils.ts` utilities
3. Quadrant state and logic from `ExpansionIntegratedMapPage.tsx`
4. Change `filteredStores` back to `stores` in WorkingMapView

Total rollback time: ~2 minutes
