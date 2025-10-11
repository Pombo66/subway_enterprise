# Requirements Document

## Introduction

The Living Map feature enhances the existing Stores section by adding an interactive map view that displays store locations with real-time activity indicators. This feature provides administrators with a visual overview of store operations, clustering capabilities for better navigation, and detailed store information through an integrated drawer interface. The implementation focuses on frontend enhancements with minimal backend risk, leveraging existing APIs and maintaining the current navigation structure.

## Requirements

### Requirement 1

**User Story:** As a store administrator, I want to view all stores on an interactive map, so that I can quickly visualize store distribution and identify geographic patterns.

#### Acceptance Criteria

1. WHEN I navigate to the Stores section THEN I SHALL see a "Map" tab alongside existing tabs
2. WHEN I click the "Map" tab THEN the system SHALL display a full-screen vector map showing all store locations
3. WHEN stores are densely packed at low zoom levels THEN the system SHALL cluster markers to improve readability
4. WHEN I zoom in on clustered areas THEN the system SHALL expand clusters to show individual store markers
5. IF the URL contains `?view=map` on /stores THEN the system SHALL redirect to /stores/map

### Requirement 2

**User Story:** As a store administrator, I want to see visual indicators of recent store activity, so that I can quickly identify which locations have current operational activity.

#### Acceptance Criteria

1. WHEN a store has orders in the last 60 minutes THEN the system SHALL display an animated pulse ring around the store marker
2. WHEN the system cannot fetch recent order data THEN it SHALL fallback to mock activity indicators for approximately 10% of visible stores
3. WHEN NEXT_PUBLIC_DEBUG is enabled THEN the system SHALL use mock activity data with a `__mockActivity=true` flag
4. WHEN the map refreshes THEN the system SHALL re-evaluate activity indicators based on current data

### Requirement 3

**User Story:** As a store administrator, I want to filter stores by franchisee, region, and country, so that I can focus on specific operational areas.

#### Acceptance Criteria

1. WHEN I access the map view THEN the system SHALL provide filter controls for franchisee, region, and country
2. WHEN I change any filter THEN the system SHALL update the map to show only matching stores
3. WHEN I apply filters THEN the system SHALL update the URL to reflect current filter state
4. WHEN I reload the page with filter parameters THEN the system SHALL restore the previous filter state
5. WHEN filters change THEN the system SHALL debounce requests and refetch store data every 15 seconds

### Requirement 4

**User Story:** As a store administrator, I want to view detailed store information and KPIs, so that I can assess individual store performance without leaving the map interface.

#### Acceptance Criteria

1. WHEN I click on a store marker THEN the system SHALL open a side drawer with store details
2. WHEN the drawer opens THEN it SHALL display store name, region, country, and franchisee information
3. WHEN the drawer loads THEN it SHALL show KPIs including orders today, revenue today, and last order timestamp
4. WHEN KPI data is available THEN the system SHALL fetch it via existing /kpis endpoints
5. WHEN I want to see more details THEN the drawer SHALL provide an "Open in Stores → Details" action that navigates to the existing store details page

### Requirement 5

**User Story:** As a system administrator, I want to track user interactions with the map feature, so that I can understand usage patterns and optimize the interface.

#### Acceptance Criteria

1. WHEN a user opens the map view THEN the system SHALL emit a `map_view_opened` telemetry event
2. WHEN a user changes any filter THEN the system SHALL emit a `map_filter_changed` event with changed keys
3. WHEN a user clicks on a store marker THEN the system SHALL emit a `map_store_opened` event with store ID
4. WHEN the map refreshes data THEN the system SHALL emit a `map_refresh_tick` event with visible store count
5. WHEN telemetry events are emitted THEN they SHALL include appropriate timestamps and context data

### Requirement 6

**User Story:** As a developer, I want the map feature to integrate seamlessly with existing design patterns, so that the user experience remains consistent across the application.

#### Acceptance Criteria

1. WHEN the map renders THEN it SHALL use existing design tokens for spacing, cards, shadows, and colors
2. WHEN the map is displayed THEN it SHALL fill the available height while maintaining consistent tab headers
3. WHEN components are styled THEN they SHALL NOT introduce global style changes
4. WHEN the map loads THEN MapLibre CSS SHALL be included only on the map page to avoid global bloat
5. WHEN markers are displayed THEN base colors SHALL match the existing token palette

### Requirement 7

**User Story:** As a developer, I want the implementation to minimize backend risks, so that existing functionality remains stable during deployment.

#### Acceptance Criteria

1. WHEN implementing the feature THEN the system SHALL NOT modify the database schema
2. WHEN adding functionality THEN the system SHALL NOT rename or remove existing API routes
3. WHEN fetching store data THEN the system SHALL use existing GET /stores endpoint
4. IF additional backend selectors are needed THEN they SHALL be internal only and trivial to implement
5. WHEN backend endpoints are unavailable THEN the system SHALL gracefully fallback to mock data

### Requirement 8

**User Story:** As a quality assurance engineer, I want automated tests to verify map functionality, so that regressions can be detected early.

#### Acceptance Criteria

1. WHEN running end-to-end tests THEN the system SHALL verify map loading at /stores/map
2. WHEN testing clustering THEN the system SHALL wait for clusters to render properly
3. WHEN testing filters THEN the system SHALL verify that filter changes reduce marker count appropriately
4. WHEN testing interactions THEN the system SHALL verify that clicking markers opens drawer content
5. WHEN running unit tests THEN the system SHALL verify URL synchronization in useMapState hook