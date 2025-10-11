# Design Document

## Overview

The stores filter functionality needs to be fixed by addressing the data mismatch between filter values and store data. The current implementation uses country codes in the filter component while the store data contains full country names. This design outlines the solution to make the cascading filters work correctly without requiring any design changes to the UI.

## Architecture

The fix involves updating the data mapping and filtering logic in two main components:

1. **CascadingFilters Component**: Update the data structure to use full country names instead of country codes
2. **StoresPage Component**: Ensure the filtering logic correctly matches the updated filter values with store data

## Components and Interfaces

### CascadingFilters Component Updates

**Current Issue**: The component uses country codes ('GB', 'US') but store data has full names ('United Kingdom', 'United States').

**Solution**: Update the data structures to use full country names that match the store data.

```typescript
interface FilterState {
  region?: string;
  country?: string;
  city?: string;
}

// Updated data structure
const COUNTRIES_BY_REGION: Record<string, Array<{ value: string; label: string }>> = {
  EMEA: [
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'Germany', label: 'Germany' },
    { value: 'France', label: 'France' },
    { value: 'Spain', label: 'Spain' },
  ],
  AMER: [
    { value: 'United States', label: 'United States' },
    { value: 'Canada', label: 'Canada' },
  ],
  APAC: [
    { value: 'Japan', label: 'Japan' },
    { value: 'Australia', label: 'Australia' },
    { value: 'Singapore', label: 'Singapore' },
  ],
};

const CITIES_BY_COUNTRY: Record<string, Array<{ value: string; label: string }>> = {
  'United Kingdom': [
    { value: 'London', label: 'London' },
    { value: 'Manchester', label: 'Manchester' },
    { value: 'Birmingham', label: 'Birmingham' },
  ],
  'United States': [
    { value: 'New York', label: 'New York' },
    { value: 'Los Angeles', label: 'Los Angeles' },
    { value: 'Chicago', label: 'Chicago' },
  ],
  // ... other countries
};
```

### StoresPage Component Updates

**Current Issue**: The filtering logic needs to handle exact matches for the updated filter values.

**Solution**: Update the `fetchStores` function to use exact string matching for country names and case-insensitive matching for cities.

```typescript
const fetchStores = async (currentFilters: FilterState = {}) => {
  let filteredStores = [...mockStores];
  
  // Apply region filter (exact match)
  if (currentFilters.region) {
    filteredStores = filteredStores.filter(store => 
      store.region === currentFilters.region
    );
  }
  
  // Apply country filter (exact match)
  if (currentFilters.country) {
    filteredStores = filteredStores.filter(store => 
      store.country === currentFilters.country
    );
  }
  
  // Apply city filter (exact match, case-insensitive)
  if (currentFilters.city) {
    filteredStores = filteredStores.filter(store => 
      store.city?.toLowerCase() === currentFilters.city?.toLowerCase()
    );
  }
  
  setStores(filteredStores);
};
```

## Data Models

### Store Interface
The existing Store interface remains unchanged:

```typescript
interface Store {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  city?: string | null;
  createdAt: string;
  updatedAt?: string;
}
```

### FilterState Interface
The existing FilterState interface remains unchanged:

```typescript
interface FilterState {
  region?: string;
  country?: string;
  city?: string;
}
```

## Error Handling

### Filter Mismatch Prevention
- Ensure all country names in the filter data exactly match the country names in the store data
- Add validation to prevent mismatched filter values
- Handle cases where store data might have null values for country, region, or city

### Graceful Degradation
- If a filter value doesn't match any stores, display "No stores found matching your criteria"
- Maintain filter state even when no results are found
- Allow users to clear filters to return to the full list

## Testing Strategy

### Unit Testing Focus Areas
1. **Filter Data Consistency**: Verify that all country names in COUNTRIES_BY_REGION match actual store data
2. **Filtering Logic**: Test that each filter type (region, country, city) correctly filters the store list
3. **Cascading Behavior**: Ensure that changing a parent filter (region) correctly resets child filters (country, city)
4. **URL Parameter Handling**: Verify that filter state is correctly synchronized with URL parameters

### Integration Testing
1. **Filter Combinations**: Test various combinations of region, country, and city filters
2. **URL State Management**: Test that bookmarking and sharing filtered URLs works correctly
3. **Search Integration**: Ensure that text search works correctly with applied filters

### Manual Testing Scenarios
1. Select each region and verify that only stores from that region are displayed
2. Select different countries within a region and verify correct filtering
3. Select different cities within a country and verify correct filtering
4. Test the "All" options to ensure they clear the respective filters
5. Verify that the store count updates correctly as filters are applied
6. Test URL parameter persistence by refreshing the page with filters applied

## Implementation Notes

### No Design Changes Required
- The existing UI components and styling remain unchanged
- Only the data structures and filtering logic need updates
- The visual appearance and user interaction patterns stay the same

### Data Alignment Strategy
- Update the mock data structure in CascadingFilters to match the actual store data format
- Ensure consistent naming conventions between filter options and store properties
- Use exact string matching for region and country, case-insensitive matching for city

### Performance Considerations
- The filtering is performed on the client-side with mock data, so performance impact is minimal
- In a real implementation with API calls, consider debouncing filter changes to reduce API requests
- The current pagination system will work correctly with filtered results