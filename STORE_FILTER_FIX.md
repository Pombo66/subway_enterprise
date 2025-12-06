# Store Filter Fix

## Issue
The filter dropdown on the stores page wasn't closing after applying filters, making it unclear whether filters were actually applied.

## Root Cause
The `CompactFilters` component was updating filters and notifying the parent, but the dropdown remained open, giving no visual feedback that the filter was applied.

## Fix Applied
Added `setShowDropdown(false)` to the `updateFilters` function so the dropdown closes immediately after a filter is applied, providing clear visual feedback.

## Changes Made
- **File**: `apps/admin/app/stores/components/CompactFilters.tsx`
- **Change**: Close dropdown after applying filters
- **Impact**: Better UX - users can see the filter was applied when dropdown closes

## Testing
1. Go to Stores page
2. Click "Filters" button
3. Select any filter (region, country, city, status, or data quality)
4. Dropdown should close automatically
5. Filter count badge should update
6. Store list should update with filtered results

## Status
✅ Fixed - ready to deploy with next update

## Related
- This fix is separate from the AI Intelligence feature (Phase 1)
- Can be deployed together or separately
- No breaking changes
