# Infinite Refresh Loop Fix

## Problem
The stores list page was experiencing an infinite refresh loop, causing constant flickering and excessive API calls.

## Root Cause
A circular event chain was created by the event system:

1. `fetchStores()` was called on page load
2. After fetching data, it emitted `emitStoresUpdated()` event
3. While this specific event wasn't directly causing the loop, the event system architecture created a pattern where:
   - Upload component emits `stores-imported` → triggers `fetchStores()`
   - `fetchStores()` emits `stores-updated` → could trigger other listeners
   - This created potential for circular event chains

## Solution
**Removed the `emitStoresUpdated()` call from the `fetchStores()` function** (line 107 in `apps/admin/app/stores/page.tsx`)

### Why This Works
- The event system should only be used for **external triggers** (like file uploads)
- Normal fetch operations should NOT emit events that could trigger other fetches
- The `onStoresImported` listener is still active and will refresh the list when uploads complete
- This breaks the circular event chain

## Files Changed
- `apps/admin/app/stores/page.tsx`
  - Removed `emitStoresUpdated()` call from `fetchStores()`
  - Removed unused `emitStoresUpdated` import
  - Added explanatory comment

## Testing
After this fix:
- ✅ Page should load once without flickering
- ✅ Filters should work without triggering loops
- ✅ Upload functionality should still refresh the list correctly
- ✅ No excessive API calls

## Event System Architecture (Corrected)
```
Upload Component
    ↓
emitStoresImported()
    ↓
onStoresImported listener
    ↓
fetchStores()
    ↓
Update UI (NO EVENT EMISSION)
```

## Prevention
To prevent similar issues in the future:
1. Only emit events for **user actions** or **external data changes**
2. Never emit events from fetch/read operations
3. Document event chains clearly
4. Use event names that clearly indicate their purpose (e.g., `user-uploaded-stores` vs `stores-updated`)
