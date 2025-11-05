# Design Document

## Overview

This design addresses the infinite loading loop in the Store list view by fixing React hook dependencies and ensuring all interactive elements use proper Subway UI classes. The solution focuses on stabilizing the `fetchStores` callback, preventing duplicate filter initialization, and eliminating Design Guard warnings.

## Root Cause Analysis

### Infinite Loop Mechanism

1. **CascadingFilters initialization**: On mount, calls `onFiltersChange` which triggers `fetchStores`
2. **Unstable callback**: `fetchStores` is recreated on every render due to `showError` dependency
3. **useEffect re-trigger**: The store import listener has `fetchStores` in its dependency array, causing it to re-run when `fetchStores` changes
4. **Design Guard mutations**: DOM scanning by Design Guard can trigger React re-renders
5. **Loop continuation**: Re-renders recreate `fetchStores`, triggering the cycle again

### Design Guard Impact

The Design Guard's MutationObserver detects DOM changes and validates elements. When it finds elements without proper Subway UI classes, it logs warnings. The continuous DOM scanning combined with React re-renders exacerbates the infinite loop issue.

## Architecture

### Component Structure

```
StoresPage (Suspense wrapper)
└── StoresPageContent (main component)
    ├── CascadingFilters (filter controls)
    ├── TabNavigation (view switcher)
    ├── UploadStoreData (import functionality)
    ├── Store Table (data display)
    ├── Pagination Controls
    ├── AddStoreDrawer (modal)
    └── EditStoreDrawer (modal)
```

### State Management

**Current Issues:**
- `fetchStores` callback recreated on every render
- Filter state in both state and ref (inconsistent)
- Multiple useEffects with overlapping concerns

**Improved Design:**
- Stable `fetchStores` callback using `useCallback` with minimal dependencies
- Single source of truth for filters using refs
- Consolidated initialization logic
- Loading guards to prevent concurrent requests

## Components and Interfaces

### 1. StoresPageContent Component

**Responsibilities:**
- Manage store data fetching and state
- Handle filter changes
- Coordinate pagination
- Manage drawer visibility

**Key Changes:**
- Remove `showError` from `fetchStores` dependencies
- Use inline error handling instead of toast dependency
- Simplify initial load logic
- Add proper loading guards

### 2. CascadingFilters Component

**Responsibilities:**
- Provide region/country/city filter controls
- Manage cascading filter dependencies
- Sync filters with URL parameters

**Key Changes:**
- Remove `onFiltersChange` from useEffect dependencies
- Call `onFiltersChange` only on user interaction, not on mount
- Let parent component handle initial data load

### 3. Button Elements

**Current Non-Compliant Elements:**
- `.store-name-link` (should be `.s-btn .s-btn--ghost`)
- `.stores-action-btn` (should be `.s-btn .s-btn--sm`)
- `.pagination-btn` (should be `.s-btn .s-btn--ghost`)
- `.pagination-number` (should be `.s-btn .s-btn--ghost .s-btn--sm`)
- `.menu-add-button-custom` (should use `.s-btn .s-btn--primary`)

**Design Pattern:**
```tsx
// Primary action button
<button className="s-btn s-btn--primary">Add New Store</button>

// Ghost button (subtle)
<button className="s-btn s-btn--ghost">View</button>

// Small button
<button className="s-btn s-btn--sm">Edit</button>

// Icon button
<button className="s-btn s-btn--ghost s-btn--sm" title="Delete">
  <svg>...</svg>
</button>
```

## Data Flow

### Initial Page Load

```
1. StoresPageContent mounts
2. hasInitialLoadRef prevents duplicate loads
3. fetchStores called with empty filters
4. CascadingFilters mounts
5. CascadingFilters reads URL params (no API call)
6. User sees data
```

### Filter Change Flow

```
1. User selects region in CascadingFilters
2. handleRegionChange updates local state
3. onFiltersChange callback invoked
4. Parent's handleFiltersChange receives new filters
5. filtersRef updated
6. fetchStores called with new filters
7. Store list updates
```

### Store Import Flow

```
1. User uploads CSV via UploadStoreData
2. Import completes successfully
3. onStoresImported event fired
4. Event listener in StoresPageContent triggered
5. fetchStores called with filtersRef.current
6. Store list refreshes with new data
```

## Error Handling

### API Errors

**Current:** Uses toast dependency in `fetchStores`
**Improved:** Inline error handling without toast dependency

```tsx
const fetchStores = useCallback(async (currentFilters: FilterState = {}) => {
  try {
    // ... fetch logic
  } catch (error) {
    console.error('Failed to fetch stores:', error);
    // Show error without dependency
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Failed to load stores' }
      });
      window.dispatchEvent(event);
    }
    setStores([]);
  }
}, []); // No dependencies!
```

### Concurrent Request Prevention

```tsx
const isLoadingRef = useRef(false);

const fetchStores = useCallback(async (currentFilters: FilterState = {}) => {
  if (isLoadingRef.current) return; // Guard
  
  try {
    isLoadingRef.current = true;
    // ... fetch logic
  } finally {
    isLoadingRef.current = false;
  }
}, []);
```

## Testing Strategy

### Manual Testing

1. **Initial Load Test**
   - Navigate to `/stores`
   - Verify data loads exactly once
   - Check console for duplicate API calls
   - Verify no Design Guard warnings

2. **Filter Test**
   - Select region filter
   - Verify single API call
   - Select country filter
   - Verify single API call
   - Check console for loop indicators

3. **Import Test**
   - Upload store CSV
   - Verify list refreshes once
   - Check console for duplicate calls

4. **Design Guard Test**
   - Open browser console
   - Navigate to `/stores`
   - Verify no warnings about missing Subway UI classes
   - Inspect button elements for proper classes

### Console Monitoring

Watch for these indicators of the infinite loop:
- Multiple "Loading stores..." logs in rapid succession
- Multiple identical API requests to `/api/stores`
- Design Guard warnings about missing classes
- React warning about maximum update depth

### Success Criteria

- Store list loads exactly once on initial page load
- Each filter change triggers exactly one API call
- No Design Guard warnings in console
- All buttons use proper Subway UI classes
- Visual appearance remains consistent
- No performance degradation

## Implementation Notes

### Dependency Management

**Critical:** The `fetchStores` callback must have zero dependencies or only stable dependencies. This is the key to preventing the infinite loop.

**Avoid:**
- Adding `showError` or `showSuccess` to dependencies
- Adding `filters` state to dependencies
- Adding any function from context to dependencies

**Use Instead:**
- Refs for accessing current values
- Inline error handling
- Custom events for toasts

### CSS Class Migration

When updating button classes, maintain the same visual appearance:

```css
/* Old custom classes can be removed */
.store-name-link { /* delete */ }
.stores-action-btn { /* delete */ }
.pagination-btn { /* delete */ }

/* Rely on Subway UI classes */
.s-btn { /* already defined */ }
.s-btn--ghost { /* already defined */ }
.s-btn--sm { /* already defined */ }
```

### Performance Considerations

- The loading guard (`isLoadingRef`) prevents race conditions
- The initial load guard (`hasInitialLoadRef`) prevents duplicate initial fetches
- Using refs instead of state for filters reduces unnecessary re-renders
- Stable callbacks prevent useEffect re-execution

## Rollback Plan

If issues arise:

1. **Immediate:** Add `data-design-guard="off"` to problematic elements
2. **Short-term:** Disable Design Guard globally using `markDesignGuardSilenced()`
3. **Revert:** Git revert to previous working state
4. **Debug:** Add extensive console logging to track render cycles

## Future Improvements

1. **React Query**: Consider migrating to React Query for better data fetching management
2. **Zustand/Redux**: Centralized state management could simplify filter coordination
3. **Design Guard**: Add opt-in mode instead of opt-out for better control
4. **API Optimization**: Implement debouncing for rapid filter changes
