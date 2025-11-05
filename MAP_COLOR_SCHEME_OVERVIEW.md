# Map Color Scheme Overview

## Complete Color Palette Used Across Map Components

### Store Status Colors (Existing Stores)
- **Open Stores**: `#22c55e` / `#10b981` (Green variants)
- **Closed Stores**: `#6b7280` (Gray)
- **Planned Stores**: `#a855f7` (Purple - different shade from expansion)
- **Default/Unknown**: `#3b82f6` (Blue)

### Expansion Suggestion Colors
- **All Expansion Suggestions**: `#8b5cf6` (Purple) - **UPDATED from teal**
- **High Confidence**: `#8b5cf6` (Purple)
- **Medium Confidence**: `#8b5cf6` (Purple)
- **Low Confidence**: `#92400e` (Brown)
- **Insufficient Data**: `#000000` (Black)
- **Default**: `#666666` (Gray)

### Expansion Status Colors
- **Approved Expansions**: `#10b981` (Green - same as open stores)
- **Hold Status**: `#f59e0b` (Orange/Yellow)
- **Default Expansion**: `#8b5cf6` (Purple) - **UPDATED from teal**

### AI Enhancement Indicators
- **AI Analysis Ring**: `#FFD700` (Gold)
- **AI Glow Effect**: `#FFD700` (Gold with opacity)
- **AI Badge**: `#f59e0b` (Orange)
- **Standard Analysis**: `#ffffff` (White stroke)

### Cluster Colors (Store Groupings)
- **Small Clusters**: `#3b82f6` (Blue)
- **Medium Clusters**: `#f59e0b` (Orange)
- **Large Clusters**: `#ef4444` (Red)

### UI Element Colors
- **Tooltips Background**: `#1f2937` (Dark gray)
- **Tooltip Border**: `#374151` (Medium gray)
- **Tooltip Text**: `#ffffff` (White)
- **Tooltip Secondary Text**: `#d1d5db` / `#9ca3af` (Light gray variants)

### Status Indicators
- **Network Warning**: `#f59e0b` (Yellow/Orange)
- **Job Processing**: `#3b82f6` (Blue)
- **Success/Active**: `#22c55e` (Green)
- **Store Count**: `#0070f3` (Blue)

### KPI Card Icons
- **Trending**: `#f97316` (Orange)
- **Revenue**: `#10b981` (Green)
- **Time**: `#3b82f6` (Blue)

## Color Accessibility & Distinction

### High Contrast Pairs
✅ **Green vs Purple**: Excellent distinction between open stores and expansion suggestions
✅ **Gold vs Purple**: Clear AI enhancement indicators
✅ **Orange vs Blue**: Good cluster size differentiation
✅ **Gray vs Colors**: Clear inactive/closed state indication

### Potential Issues Fixed
❌ **Old Teal vs Green**: Too similar - FIXED with purple
✅ **Purple vs Purple**: Different shades for planned stores vs expansions
✅ **Brown for Low Confidence**: Distinct from all other colors

## Files Updated
1. `WorkingMapView.tsx` - Main map markers
2. `WorkingMapView.maplibre-backup.tsx` - Backup file consistency
3. `SuggestionMarker.tsx` - Individual suggestion markers
4. `AIIndicatorLegend.tsx` - Legend visual indicators
5. `MapFilters.tsx` - Filter status indicators

## Color Hex Reference
```css
/* Expansion Suggestions */
--expansion-primary: #8b5cf6;    /* Purple */
--expansion-approved: #10b981;   /* Green */
--expansion-hold: #f59e0b;       /* Orange */

/* Store Status */
--store-open: #22c55e;           /* Green */
--store-closed: #6b7280;         /* Gray */
--store-planned: #a855f7;        /* Purple (darker) */

/* AI Enhancement */
--ai-indicator: #FFD700;         /* Gold */
--ai-badge: #f59e0b;            /* Orange */

/* Clusters */
--cluster-small: #3b82f6;        /* Blue */
--cluster-medium: #f59e0b;       /* Orange */
--cluster-large: #ef4444;        /* Red */
```

The color scheme now provides excellent visual distinction between all map elements while maintaining accessibility and brand consistency.