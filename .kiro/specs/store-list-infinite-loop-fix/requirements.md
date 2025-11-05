# Requirements Document

## Introduction

The Store list view in the admin dashboard is experiencing an infinite loading loop that prevents users from viewing store data. This issue is linked to Design Guard warnings about clickable elements not using standard Subway UI button classes. The infinite loop is caused by a combination of React dependency issues and DOM mutations triggered by the Design Guard monitoring system.

## Glossary

- **Store List View**: The main page displaying all stores in a table format at `/stores`
- **Design Guard**: A development tool that monitors the DOM and validates that interactive elements use proper Subway UI classes
- **CascadingFilters**: A component that provides region/country/city filtering for the store list
- **fetchStores**: The async function that retrieves store data from the API
- **Subway UI Classes**: Standard CSS classes for UI components (e.g., `.s-btn`, `.s-input`, `.s-select`)

## Requirements

### Requirement 1

**User Story:** As a store manager, I want to view the store list without infinite loading loops, so that I can access and manage store data efficiently.

#### Acceptance Criteria

1. WHEN the Store list page loads, THE Store List View SHALL fetch store data exactly once during initial mount
2. WHEN filters are applied, THE Store List View SHALL fetch store data exactly once per filter change
3. WHEN the Design Guard scans the DOM, THE Store List View SHALL NOT trigger additional data fetches
4. THE Store List View SHALL display loading state only during active data fetching operations
5. WHEN store data is successfully fetched, THE Store List View SHALL render the store table without re-triggering data fetches

### Requirement 2

**User Story:** As a developer, I want all clickable elements to use standard Subway UI button classes, so that the Design Guard does not generate warnings and the UI remains consistent.

#### Acceptance Criteria

1. THE Store List View SHALL use `.s-btn` class for all button elements
2. THE Store List View SHALL use appropriate `.s-btn` variants (`.s-btn--primary`, `.s-btn--ghost`, `.s-btn--sm`) for different button types
3. WHEN the Design Guard scans the Store list page, THE Store List View SHALL NOT generate warnings for missing Subway UI classes
4. THE Store List View SHALL maintain visual consistency with existing Subway UI design patterns
5. THE Store List View SHALL use `.s-select` class for all select elements

### Requirement 3

**User Story:** As a developer, I want the CascadingFilters component to initialize without triggering duplicate API calls, so that the application performs efficiently.

#### Acceptance Criteria

1. WHEN the CascadingFilters component mounts, THE CascadingFilters Component SHALL call `onFiltersChange` exactly once
2. THE CascadingFilters Component SHALL NOT trigger `onFiltersChange` when URL search parameters change externally
3. WHEN a user changes a filter value, THE CascadingFilters Component SHALL call `onFiltersChange` exactly once per change
4. THE CascadingFilters Component SHALL reset dependent filters (country resets when region changes, city resets when country changes)

### Requirement 4

**User Story:** As a developer, I want React hooks to have stable dependencies, so that useEffect callbacks do not trigger unnecessarily.

#### Acceptance Criteria

1. THE Store List View SHALL use `useCallback` with stable dependencies for the `fetchStores` function
2. THE Store List View SHALL use refs to access current filter state without adding filters to dependency arrays
3. WHEN the component re-renders, THE Store List View SHALL NOT recreate callback functions unless their actual dependencies change
4. THE Store List View SHALL use `useRef` to track loading state and prevent concurrent API requests
5. THE Store List View SHALL use `useRef` to ensure initial data load happens exactly once
