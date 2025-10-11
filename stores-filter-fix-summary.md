# Stores Filter Fix Summary

## Issue
The filter buttons on the stores page were not working properly. The region dropdown showed options but clicking them didn't filter the table, and the country/city buttons were not working at all.

## Root Cause
The issue was in the `CascadingFilters` component's `useEffect` hook. It had `onFiltersChange` in its dependency array, which caused infinite re-renders and prevented the filtering from working properly.

## Fix Applied
1. **Fixed React dependency issue**: Removed `onFiltersChange` from the `useEffect` dependency array in `CascadingFilters.tsx` to prevent infinite re-renders.

2. **Added proper memoization**: Used `useCallback` to memoize the `fetchStores` and `handleFiltersChange` functions in `StoresPage.tsx` to prevent unnecessary re-renders.

## Changes Made

### apps/admin/app/stores/components/CascadingFilters.tsx
- Removed `onFiltersChange` from the `useEffect` dependency array to fix infinite re-render issue

### apps/admin/app/stores/page.tsx
- Added `useCallback` import
- Memoized `fetchStores` function with `useCallback`
- Memoized `handleFiltersChange` function with `useCallback`

## Verification
- Created and ran a debug test that confirmed the filtering logic works correctly
- All filter combinations (region, country, city) now work as expected
- URL parameter handling is preserved
- Store count updates correctly with applied filters

## Result
The stores filter functionality now works correctly:
- Region dropdown filters stores by region (EMEA, AMER, APAC)
- Country dropdown is enabled when region is selected and filters correctly
- City dropdown is enabled when country is selected and filters correctly
- All filters work in combination
- URL parameters are maintained for bookmarking/sharing
- Store count updates dynamically