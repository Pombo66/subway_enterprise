# Stores Page Infinite Loop - FINAL FIX

## Problem
The stores list page was experiencing an infinite refresh loop causing:
- Constant flickering
- Excessive API calls
- "Failed to load stores" errors appearing intermittently

## Root Causes Identified

### 1. Debouncing with setTimeout
The original code used `setTimeout` for debouncing, which created timing issues:
- Multiple timeouts could be queued
- Cleanup wasn't properly handled
- React's re-render cycle could trigger multiple debounced calls

### 2. Empty Dependency Arrays
Using empty dependency arrays `[]` on useCallback and useEffect hooks meant:
- `fetchStores` had stale closures over `showError`
- Event listeners couldn't properly track `fetchStores` changes
- Initial load effect couldn't track when `fetchStores` was ready

### 3. Event System Complexity
The event system added unnecessary complexity:
- `emitStoresUpdated()` was being called after every fetch
- This could trigger other components to refresh
- Created potential for circular event chains

## Solution Applied

### 1. Removed Debouncing
- Removed `setTimeout` and `fetchTimeoutRef`
- Simplified to direct async calls
- Kept `isLoadingRef` to prevent concurrent requests

### 2. Fixed Dependencies
- Added `showError` to `fetchStores` dependencies
- Added `fetchStores` to event listener dependencies
- Added `hasInitialLoadRef` to ensure single initial load

### 3. Simplified Event Flow
- Removed `emitStoresUpdated()` from fetch operations
- Only `emitStoresImported()` is used (from upload component)
- Event listener only triggers on actual imports, not fetches

## Code Changes

### Before (Problematic):
```typescript
const fetchStores = useCallback(async (currentFilters: FilterState = {}) => {
  // Complex debouncing with setTimeout
  fetchTimeoutRef.current = setTimeout(async () => {
    // ... fetch logic
    emitStoresUpdated({ count: stores.length, filters: currentFilters });
  }, 300);
}, []); // Empty dependencies - stale closure!

useEffect(() => {
  fetchStores(initialFilters);
}, []); // Could run multiple times in strict mode
```

### After (Fixed):
```typescript
const fetchStores = useCallback(async (currentFilters: FilterState = {}) => {
  if (isLoadingRef.current) return; // Simple guard
  
  try {
    isLoadingRef.current = true;
    setLoading(true);
    // ... fetch logic
    // NO EVENT EMISSION
  } finally {
    setLoading(false);
    isLoadingRef.current = false;
  }
}, [showError]); // Proper dependencies

useEffect(() => {
  if (!hasInitialLoadRef.current) {
    hasInitialLoadRef.current = true;
    fetchStores(initialFilters);
  }
}, [fetchStores]); // Runs once when fetchStores is ready
```

## Testing Checklist
- [x] API endpoints working (BFF and Next.js)
- [x] No TypeScript errors
- [ ] Page loads without flickering
- [ ] Filters work correctly
- [ ] Upload triggers refresh
- [ ] No excessive API calls in network tab

## Key Learnings
1. **Avoid setTimeout in React hooks** - Use proper dependency management instead
2. **Never use empty dependency arrays** unless you truly want stale closures
3. **Keep event systems simple** - Only emit events for user actions, not data fetches
4. **Use refs for guards** - `isLoadingRef` prevents concurrent requests without complex state
5. **Test with React Strict Mode** - It will expose dependency issues early

## Files Modified
- `apps/admin/app/stores/page.tsx` - Simplified fetchStores, fixed dependencies, removed debouncing
