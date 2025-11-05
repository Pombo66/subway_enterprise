# Requirements Document

## Introduction

This spec addresses a critical regression where enabling the Expansion Predictor feature flag causes the stores map to stop rendering. The ExpansionIntegratedMapPage component was implemented as a placeholder without actual map integration, breaking the core store visualization functionality. This fix will properly integrate the expansion mode into the existing working map implementation.

## Glossary

- **ExpansionIntegratedMapPage**: The placeholder component currently used when expansion feature is enabled
- **WorkingMapView**: The existing, functional map component that renders stores correctly
- **EnhancedMapView**: The map component that supports both normal and expansion modes
- **Expansion Mode**: A toggle state that shows expansion controls and suggestions on the map
- **Feature Flag**: Environment variable controlling whether expansion predictor is enabled

## Requirements

### Requirement 1

**User Story:** As a store manager, I want to see the stores map load correctly when the expansion feature is enabled, so that I can view existing store locations.

#### Acceptance Criteria

1. WHEN the expansion feature flag is enabled, THE System SHALL render the actual map with store markers
2. THE System SHALL display all existing stores on the map with correct coordinates
3. THE System SHALL maintain all existing map functionality including clustering, filtering, and store selection
4. THE System SHALL NOT display a placeholder gray box instead of the map

### Requirement 2

**User Story:** As a user, I want to toggle expansion mode on the working map, so that I can switch between viewing stores and exploring expansion opportunities without losing map functionality.

#### Acceptance Criteria

1. WHEN the user clicks the expansion mode toggle, THE System SHALL show expansion controls without reloading the map
2. WHEN expansion mode is disabled, THE System SHALL hide expansion controls while maintaining the map view
3. THE System SHALL preserve the map viewport, zoom level, and selected stores when toggling expansion mode
4. THE System SHALL render both store markers and expansion suggestion markers when expansion mode is active

### Requirement 3

**User Story:** As a developer, I want the ExpansionIntegratedMapPage to use the existing WorkingMapView component, so that we maintain a single source of truth for map rendering logic.

#### Acceptance Criteria

1. THE System SHALL integrate ExpansionIntegratedMapPage with WorkingMapView or EnhancedMapView
2. THE System SHALL reuse existing map state management hooks (useMapState, useStores)
3. THE System SHALL maintain all existing map features including filters, tab navigation, and store drawer
4. THE System SHALL NOT duplicate map rendering logic between components

### Requirement 4

**User Story:** As a user, I want the expansion controls to appear as a sidebar when expansion mode is active, so that I can configure expansion parameters while viewing the map.

#### Acceptance Criteria

1. WHEN expansion mode is active, THE System SHALL display the ExpansionControls component as a sidebar
2. THE System SHALL position the sidebar to not obscure the map view
3. THE System SHALL allow users to adjust expansion parameters and generate suggestions
4. WHEN expansion mode is inactive, THE System SHALL hide the expansion controls sidebar

### Requirement 5

**User Story:** As a user, I want expansion suggestions to render as markers on the actual map, so that I can see their geographic locations relative to existing stores.

#### Acceptance Criteria

1. WHEN suggestions are generated, THE System SHALL render SuggestionMarker components on the map at correct coordinates
2. THE System SHALL color-code suggestion markers based on confidence bands
3. WHEN a user clicks a suggestion marker, THE System SHALL display the SuggestionInfoCard
4. THE System SHALL render the MapLegend when suggestions are visible

### Requirement 6

**User Story:** As a developer, I want the expansion mode toggle to be integrated into the existing map page layout, so that it follows the established design patterns.

#### Acceptance Criteria

1. THE System SHALL position the expansion mode toggle button in the map header or toolbar area
2. THE System SHALL style the toggle button consistently with existing UI components
3. THE System SHALL indicate the current expansion mode state visually
4. THE System SHALL maintain responsive layout when expansion controls are shown
