# Requirements Document

## Introduction

This document specifies the requirements for simplifying the competitor intelligence feature. The goal is to replace the existing always-on competitor discovery system (Mapbox Tilequery, database storage, auto-loading) with a simple on-demand competitor overlay that fetches data from Google Places API only when explicitly requested by the user for a specific location.

Additionally, this refactoring will clarify the separation between the Stores map view (simple store visualization) and the Intelligence Map (full intelligence features including expansion and competitor analysis).

## Glossary

- **Competitor_Overlay**: A temporary Mapbox layer that displays competitor locations around a selected point
- **Intelligence_Map**: The `/intelligence-map` page that provides full AI-powered analysis features
- **Stores_Map**: The `/stores/map` page that provides basic store visualization without intelligence features
- **Google_Places_Service**: Backend service that queries Google Places API for competitor locations
- **Competitor_Panel**: UI component in the side panel that controls competitor overlay visibility
- **Radius_Ring**: A visual circle on the map showing the 5km analysis boundary
- **Brand_Set**: The fixed list of competitor brands to search for (McDonald's, Burger King, KFC, Domino's, Starbucks)

## Requirements

### Requirement 1: On-Demand Competitor Fetching

**User Story:** As a franchise analyst, I want to fetch competitor locations only when I explicitly request them for a specific location, so that I can analyze competitive density without unnecessary API calls or data storage.

#### Acceptance Criteria

1. WHEN a user clicks "Show competitors (5km)" in the detail panel, THE Google_Places_Service SHALL query Google Places API for each brand in the Brand_Set within a 5km radius of the selected location
2. WHEN the Google Places API returns results, THE System SHALL deduplicate results across brand queries using location proximity (within 50m tolerance)
3. THE Google_Places_Service SHALL enforce a maximum of 50 results per brand and 250 total results per request
4. WHEN a Google Places API call fails, THE System SHALL retry with exponential backoff up to 3 times before returning an error
5. THE System SHALL NOT persist competitor data to the database beyond an in-memory cache with 30-minute TTL
6. THE System SHALL return only brand name, latitude, longitude, and distance in meters for each competitor

### Requirement 2: Competitor Overlay Rendering

**User Story:** As a franchise analyst, I want to see competitor locations displayed as temporary markers on the map around my selected location, so that I can visually assess competitive density.

#### Acceptance Criteria

1. WHEN competitor data is received, THE Competitor_Overlay SHALL render brand-specific icons on the Mapbox map using a temporary source named "competitor-overlay"
2. THE Competitor_Overlay SHALL display a faint 5km radius ring around the selected location to show the analysis boundary
3. WHEN the user closes the detail panel, THE System SHALL remove the Competitor_Overlay and Radius_Ring from the map
4. WHEN the user selects a different store or expansion suggestion, THE System SHALL remove the existing Competitor_Overlay before fetching new data
5. WHEN the user clicks "Hide competitors", THE System SHALL remove the Competitor_Overlay and Radius_Ring from the map
6. THE Competitor_Overlay icons SHALL NOT conflict visually with existing store markers, expansion markers, or AI rings

### Requirement 3: UI Integration

**User Story:** As a franchise analyst, I want clear controls in the detail panel to show and hide competitor analysis, so that I can easily toggle the competitive view.

#### Acceptance Criteria

1. WHEN a store or expansion suggestion is selected, THE Competitor_Panel SHALL display a "Show competitors (5km)" button
2. WHEN competitor loading is in progress, THE Competitor_Panel SHALL display a loading indicator
3. WHEN competitors are displayed, THE Competitor_Panel SHALL show a summary with total count and count per brand with nearest distance
4. WHEN competitors are displayed, THE button SHALL toggle to "Hide competitors"
5. IF the Google Places API call fails, THEN THE Competitor_Panel SHALL display a user-friendly error message
6. THE Competitor_Panel SHALL be available in the Intelligence_Map detail panel only, not in the basic Stores_Map

### Requirement 4: Backend API Endpoint

**User Story:** As a frontend developer, I want a clean API endpoint to fetch nearby competitors, so that I can integrate competitor analysis into the UI.

#### Acceptance Criteria

1. THE System SHALL expose a POST endpoint at `/api/competitors/nearby` that accepts latitude, longitude, radiusKm, and optional brands array
2. WHEN brands array is not provided, THE System SHALL default to the fixed Brand_Set (McDonald's, Burger King, KFC, Domino's, Starbucks)
3. THE endpoint SHALL return a response containing center coordinates, radius, brands searched, results array, and summary statistics
4. THE endpoint SHALL include byBrand summary with count and nearest distance for each brand
5. THE endpoint SHALL enforce rate limiting of 10 requests per minute per session
6. THE endpoint SHALL timeout individual Google Places API calls after 10 seconds

### Requirement 5: Legacy System Removal

**User Story:** As a system maintainer, I want the old competitor discovery system safely removed, so that the codebase is simplified and no unused code remains.

#### Acceptance Criteria

1. THE System SHALL disable or remove the Mapbox Tilequery competitor discovery code
2. THE System SHALL disable or remove the automatic competitor loading on viewport change
3. THE System SHALL disable or remove the competitor refresh job functionality
4. IF any old endpoint is still referenced, THEN THE System SHALL return a deprecation response with status 410 Gone
5. THE System SHALL NOT require MAPBOX_ACCESS_TOKEN for competitor functionality after migration
6. THE System SHALL add GOOGLE_PLACES_API_KEY to required environment variables
7. WHEN removing legacy code, THE System SHALL preserve expansion generation, AI summaries, and store rendering functionality

### Requirement 6: Map View Separation

**User Story:** As a user, I want the Stores map to show only stores without intelligence features, so that I have a simple view for basic store management.

#### Acceptance Criteria

1. THE Stores_Map at `/stores/map` SHALL display only store markers without competitor overlay capability
2. THE Stores_Map SHALL NOT include expansion suggestion controls or AI analysis features
3. THE Intelligence_Map at `/intelligence-map` SHALL include all intelligence features: expansion suggestions, competitor overlay, and AI analysis
4. WHEN navigating between Stores_Map and Intelligence_Map, THE System SHALL maintain consistent store marker rendering
5. THE Intelligence_Map SHALL be the only location where the "Show competitors (5km)" button appears

### Requirement 7: Caching Strategy

**User Story:** As a system operator, I want competitor results cached briefly to reduce API costs during demo sessions, so that repeated requests for the same location don't incur additional charges.

#### Acceptance Criteria

1. THE System SHALL cache competitor results in memory keyed by (lat, lng, radius, brandSet) with 30-minute TTL
2. WHEN a cached result exists for the same parameters, THE System SHALL return the cached result without calling Google Places API
3. THE cache SHALL automatically expire entries after 30 minutes
4. THE cache SHALL have a maximum size of 100 entries to prevent memory issues
5. THE System SHALL NOT persist cache to database or disk
