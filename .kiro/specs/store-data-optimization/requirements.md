# Requirements Document

## Introduction

This spec addresses the need to efficiently handle large store datasets (1,400+ stores currently, scaling to 30k+ globally) while minimizing Mapbox API usage and maintaining smooth performance in both list and map views. The system will implement intelligent caching, viewport-based loading, and efficient pagination to ensure scalability without disrupting existing functionality.

## Glossary

- **Store Dataset**: The complete collection of store records in the database
- **Viewport Loading**: Loading only stores visible in the current map viewport
- **Local Cache**: Browser-based storage (IndexedDB) for store data
- **Cache Invalidation**: Process of refreshing cached data when stores are imported or updated
- **Clustering**: Grouping nearby markers on the map for performance
- **Mapbox Hit**: A single API request to Mapbox services (map style load, geocoding, etc.)
- **Pagination**: Breaking large datasets into smaller pages for efficient loading
- **Infinite Scroll**: Progressively loading more data as the user scrolls

## Requirements

### Requirement 1

**User Story:** As a user, I want to browse all 1,400+ stores in the list view without lag, so that I can quickly find and manage any store.

#### Acceptance Criteria

1. WHEN the user navigates to the stores list, THE System SHALL load the first page of stores within 500ms
2. THE System SHALL implement pagination or infinite scroll to handle 1,400+ stores efficiently
3. WHEN the user scrolls or navigates pages, THE System SHALL load additional stores without blocking the UI
4. THE System SHALL display a loading indicator while fetching additional pages
5. THE System SHALL maintain smooth scrolling performance with no visible lag

### Requirement 2

**User Story:** As a user, I want the map to load only stores in my current viewport, so that the map remains responsive even with thousands of stores.

#### Acceptance Criteria

1. WHEN the map loads, THE System SHALL fetch only stores within the current viewport bounds
2. WHEN the user pans or zooms the map, THE System SHALL load additional stores for the new viewport
3. THE System SHALL use clustering to group nearby markers for performance
4. THE System SHALL maintain smooth pan and zoom interactions with no lag
5. THE System SHALL limit the maximum number of visible markers to prevent performance degradation

### Requirement 3

**User Story:** As a developer, I want store data cached locally, so that subsequent visits don't require re-fetching all data from the server.

#### Acceptance Criteria

1. WHEN stores are fetched from the API, THE System SHALL cache them in IndexedDB
2. WHEN the user returns to the stores page, THE System SHALL load data from cache first
3. THE System SHALL display cached data immediately while checking for updates in the background
4. THE System SHALL store cache metadata including timestamp and version
5. THE System SHALL implement a maximum cache age (e.g., 24 hours) before forcing refresh

### Requirement 4

**User Story:** As a developer, I want to minimize Mapbox API usage, so that we reduce costs and stay within rate limits.

#### Acceptance Criteria

1. THE System SHALL load the Mapbox map style only once per session
2. THE System SHALL NOT trigger additional Mapbox hits for cached marker rendering
3. THE System SHALL reuse the same map instance across component re-renders
4. THE System SHALL batch geocoding requests when processing multiple stores
5. THE System SHALL track and log Mapbox API usage for monitoring

### Requirement 5

**User Story:** As a user, I want the cache to automatically refresh when new stores are imported, so that I always see the latest data.

#### Acceptance Criteria

1. WHEN stores are imported via the upload feature, THE System SHALL invalidate the store cache
2. WHEN a store is created, updated, or deleted, THE System SHALL update the cache accordingly
3. THE System SHALL broadcast cache invalidation events to all open tabs/windows
4. THE System SHALL provide a manual "Refresh" button to force cache reload
5. THE System SHALL display a timestamp showing when data was last updated

### Requirement 6

**User Story:** As a developer, I want the implementation to be lightweight and backward compatible, so that existing features continue to work without disruption.

#### Acceptance Criteria

1. THE System SHALL reuse existing hooks (useStores, useMapState) with minimal changes
2. THE System SHALL maintain compatibility with existing filter and search functionality
3. THE System SHALL NOT break existing store drawer, table, or map interactions
4. THE System SHALL implement caching as an optional enhancement that can be disabled
5. THE System SHALL provide fallback behavior if IndexedDB is unavailable

### Requirement 7

**User Story:** As a user, I want smooth clustering and map performance, so that I can explore thousands of stores without lag.

#### Acceptance Criteria

1. THE System SHALL use Mapbox's built-in clustering for marker grouping
2. WHEN clusters are clicked, THE System SHALL zoom to show individual markers
3. THE System SHALL adjust cluster radius based on zoom level
4. THE System SHALL limit visible markers to 1,000 at any zoom level
5. THE System SHALL maintain 60fps performance during pan and zoom operations

### Requirement 8

**User Story:** As a developer, I want efficient API endpoints for viewport-based queries, so that we only fetch necessary data.

#### Acceptance Criteria

1. THE System SHALL provide a GET /api/stores/viewport endpoint accepting bounds parameters
2. THE System SHALL support filtering by north, south, east, west coordinates
3. THE System SHALL return only essential store fields for map markers (id, lat, lng, name)
4. THE System SHALL support optional full data fetch for selected stores
5. THE System SHALL implement database indexing on latitude and longitude columns

### Requirement 9

**User Story:** As a user, I want to see a loading state that indicates data is being fetched, so that I understand the system is working.

#### Acceptance Criteria

1. WHEN data is loading from cache, THE System SHALL show a "Loading from cache..." indicator
2. WHEN data is loading from API, THE System SHALL show a "Fetching stores..." indicator
3. WHEN data is being refreshed in background, THE System SHALL show a subtle refresh indicator
4. THE System SHALL display the number of stores loaded (e.g., "Loaded 1,234 stores")
5. THE System SHALL show error messages if loading fails with retry option

### Requirement 10

**User Story:** As a developer, I want cache statistics and monitoring, so that I can verify the system is working efficiently.

#### Acceptance Criteria

1. THE System SHALL track cache hit rate (cache hits / total requests)
2. THE System SHALL track cache size and number of cached stores
3. THE System SHALL log cache operations (read, write, invalidate) in development mode
4. THE System SHALL provide a cache stats API endpoint for monitoring
5. THE System SHALL include cache metrics in the health check endpoint
