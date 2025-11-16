# SubMind Context System Upgrade

## What Changed

SubMind can now **see real page data** instead of just guessing based on screen names!

## Before vs After

### Before (Hallucinating)
- SubMind only knew the screen name (e.g., "stores_map")
- Generated generic responses based on assumptions
- Example: "The map shows store distribution patterns..." (but didn't know how many stores or where)

### After (Real Data)
- SubMind receives actual page data: store counts, cities, revenue, filters
- Provides specific insights based on what's actually on screen
- Example: "You have 150 stores across 3 countries. Berlin has the highest concentration with 12 stores..."

## How It Works

### 1. Context Manager (`lib/submind-context.ts`)
A singleton that pages can register their data with:

```typescript
subMindContext.setContext({
  screen: 'stores_map',
  data: {
    stores: {
      totalStores: 150,
      countries: [{ country: 'Germany', count: 150 }],
      topCities: [{ city: 'Berlin', count: 12 }, ...],
      revenueStats: { avgMonthlyRevenue: 450000 }
    },
    filters: { region: 'EMEA', country: 'Germany' }
  }
});
```

### 2. Page Registration
Pages register their data when it loads/updates:

```typescript
// In ExpansionIntegratedMapPage.tsx
useEffect(() => {
  const storeData = formatStoreDataForSubMind(stores);
  subMindContext.setContext({
    screen: 'stores_map',
    data: { stores: storeData, ... }
  });
}, [stores, filters]);
```

### 3. SubMind Uses Real Data
The BFF service now includes real data in prompts:

```
Context: Current screen: stores_map | Region: EMEA

**REAL PAGE DATA:**
Stores: 150 stores across 3 countries
Countries: Germany: 150
Top cities: Berlin: 12, Munich: 8, Hamburg: 6
Avg monthly revenue: $450k

User question: Explain what I'm seeing on this map
```

## Visual Indicators

SubMind now shows whether it has real data:

- ✅ **Green indicator**: "Real Page Data Available" - SubMind can see actual metrics
- ⚠️ **Yellow warning**: "Using generic context" - Page hasn't registered data yet

## Currently Supported Pages

### ✅ Stores Map / Expansion Map
- Store counts by country and city
- Revenue statistics
- Active filters
- Expansion suggestions (when in expansion mode)
- Viewport/zoom level

### 🔜 Coming Soon
- Dashboard (KPIs, trends)
- Orders page (order volume, patterns)
- Store details (individual store metrics)
- Analytics (custom reports)

## Adding Context to New Pages

To make a page SubMind-aware:

```typescript
import { subMindContext, formatStoreDataForSubMind } from '@/lib/submind-context';

// In your component
useEffect(() => {
  subMindContext.setContext({
    screen: 'your_screen_name',
    data: {
      // Your page's actual data
      kpis: { revenue: 1000000, orders: 5000 },
      filters: { dateRange: 'last_7_days' }
    },
    scope: {
      region: currentRegion,
      country: currentCountry
    }
  });

  return () => {
    subMindContext.clearContext(); // Clean up on unmount
  };
}, [yourData, filters]);
```

## Benefits

1. **Accurate Insights**: SubMind now provides specific, data-driven responses
2. **Context-Aware**: Knows exactly what filters are applied and what data is visible
3. **Actionable**: Can reference specific stores, cities, and metrics
4. **Transparent**: Users can see when real data is available vs generic responses

## Example Queries That Now Work

**Before**: "Explain this map"
- Response: Generic description of what a store map typically shows

**After**: "Explain this map"
- Response: "You're viewing 150 Subway stores in Germany. Berlin leads with 12 locations, followed by Munich (8) and Hamburg (6). The average monthly revenue is $450k per store. The stores are concentrated in urban centers with good public transport access..."

**Before**: "Where should we expand?"
- Response: Generic expansion advice

**After**: "Where should we expand?"
- Response: "Based on the 25 expansion suggestions currently displayed, the highest confidence opportunities (>75%) are in Tübingen, Wolfsburg, and Lingen. These cities have low competition and strong demographics. The AI model suggests focusing on university towns and commuter hubs..."

## Technical Details

- **No Database Storage**: Context is in-memory only, cleared on page navigation
- **Automatic Cleanup**: Context cleared when components unmount
- **Fallback Behavior**: If no context registered, falls back to pathname-based detection
- **Type-Safe**: Full TypeScript support with proper interfaces
- **Lightweight**: Minimal overhead, only active when SubMind is used

## Next Steps

1. Add context to Dashboard page (KPIs, trends)
2. Add context to Orders page (order analytics)
3. Add context to Store details page (individual store metrics)
4. Consider adding screenshot capability for visual context
5. Add context history/breadcrumbs for multi-page workflows

---

**Result**: SubMind is now a genuinely useful AI assistant that provides real insights based on actual data, not hallucinations! 🎉
