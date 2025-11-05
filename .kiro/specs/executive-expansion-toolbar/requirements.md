# Requirements Document

## Introduction

This specification defines the requirements for updating the Expansion Controls panel in the Subway Expansion Predictor map view to be more intuitive and executive-friendly. The controls appear as a floating sidebar overlay on the map when expansion mode is enabled. The update focuses on improving the user interface with clearer labels, better visual hierarchy, enhanced tooltips, and executive-friendly terminology while maintaining all existing functionality, hooks, and backend integrations.

## Glossary

- **Expansion Controls Panel**: The floating sidebar component (ExpansionControls) that appears over the map when expansion mode is enabled, allowing users to configure and generate expansion predictions
- **Expansion Intensity**: The aggression parameter that controls how many expansion sites are generated (0-100 scale, mapped to Conservative/Balanced/Aggressive labels)
- **Market Drivers**: The three bias parameters (populationBias, proximityBias, turnoverBias) that influence site scoring with values from 0-1
- **Minimum Spacing**: The minDistanceM parameter that enforces minimum distance between suggested stores (800-3000 meters)
- **NMS**: Non-Maximum Suppression algorithm that enforces minimum spacing between suggestions
- **Confidence Band**: Classification of suggestions as HIGH, MEDIUM, LOW, or INSUFFICIENT_DATA based on scoring
- **Scenario**: A saved configuration of expansion parameters and generated suggestions that can be loaded later

## Requirements

### Requirement 1: Region Selector Enhancement

**User Story:** As an executive user, I want to easily see and select the target region for expansion analysis, so that I can focus on specific geographic markets.

#### Acceptance Criteria

1. WHEN the Expansion Controls Panel renders, THE System SHALL display a dropdown labeled "📍 Region" with the currently selected country
2. THE System SHALL support country selection from the existing list (Germany, Belgium, France, Netherlands)
3. THE System SHALL maintain the existing region filtering logic that passes the selected country to the expansion generation service
4. WHERE auto-detection is available in future, THE System SHALL pre-populate the region selector with the detected country
5. THE System SHALL maintain the existing disabled state when loading is true

### Requirement 2: Expansion Intensity Control

**User Story:** As an executive user, I want to control how aggressive the expansion model should be using clear, business-friendly language, so that I can easily adjust the number of suggestions generated.

#### Acceptance Criteria

1. THE System SHALL replace the "Aggression" label with "🎯 Expansion Intensity"
2. THE System SHALL display the question "How bold should the expansion model be?" above the slider
3. THE System SHALL provide a slider with three labeled positions: "Conservative" (left), "Balanced" (center), and "Aggressive" (right)
4. THE System SHALL maintain the existing 0-100 numeric range for the aggression parameter
5. THE System SHALL pass the aggression value to the expansion generation service without modification

### Requirement 3: Market Drivers Section

**User Story:** As an executive user, I want to understand and adjust the factors that drive expansion recommendations using clear labels and live feedback, so that I can align the model with business priorities.

#### Acceptance Criteria

1. THE System SHALL display a section labeled "🏙️ Market Drivers"
2. THE System SHALL provide three sub-sliders with the following labels and tooltips:
   - "Population Focus" with tooltip "Favour high-footfall and dense population areas." (default 0.5, maps to populationBias)
   - "Proximity Sensitivity" with tooltip "Avoid overlap with existing stores." (default 0.3, maps to proximityBias)
   - "Sales Potential" with tooltip "Prioritise areas near high-performing stores." (default 0.2, maps to turnoverBias)
3. THE System SHALL display the current numeric value beside each sub-slider label
4. THE System SHALL maintain the existing 0-1 range with 0.1 step increments for each bias parameter
5. THE System SHALL pass populationBias, proximityBias, and turnoverBias values to the expansion generation service without modification
6. THE System SHALL maintain the existing disabled state when loading is true
7. WHERE feasible, THE System SHALL display a small ring or pie indicator showing the relative weighting of the three sliders

### Requirement 4: Minimum Spacing Control

**User Story:** As an executive user, I want to control the minimum distance between suggested stores using clear units and rationale, so that I can prevent market cannibalization.

#### Acceptance Criteria

1. THE System SHALL display a section labeled "🚧 Minimum Spacing"
2. THE System SHALL provide a numeric slider labeled "Minimum distance between stores (metres)"
3. THE System SHALL provide a range of 800 to 3000 meters
4. THE System SHALL display a tooltip stating "Prevents store cannibalisation."
5. THE System SHALL display the current numeric value beside the slider
6. THE System SHALL maintain the existing minDistanceM parameter and pass it to the expansion generation service without modification
7. THE System SHALL maintain the existing disabled state when loading is true

### Requirement 5: Action Buttons

**User Story:** As an executive user, I want clearly labeled action buttons that indicate their purpose and priority, so that I can efficiently generate and save expansion scenarios.

#### Acceptance Criteria

1. THE System SHALL display a primary button labeled "Generate Expansion Plan"
2. THE System SHALL display a secondary button labeled "Save Scenario"
3. WHERE the Compare Scenarios feature is implemented, THE System SHALL display a tertiary button labeled "Compare Scenarios"
4. THE System SHALL maintain the existing onClick handlers for generation and scenario saving
5. THE System SHALL disable buttons appropriately when loading or when validation errors exist
6. THE System SHALL maintain the existing save scenario dialog functionality

### Requirement 6: Design System Consistency

**User Story:** As a user of the admin dashboard, I want the updated Expansion Toolbar to match the existing design system, so that the interface feels cohesive and professional.

#### Acceptance Criteria

1. THE System SHALL use typography consistent with the existing admin dashboard design system
2. THE System SHALL use spacing values consistent with the existing admin dashboard design system
3. THE System SHALL use color values consistent with the existing admin dashboard design system
4. THE System SHALL maintain the existing panel styling (background, border, shadow, border-radius)
5. THE System SHALL maintain the existing responsive behavior and scrolling functionality

### Requirement 7: Panel Positioning

**User Story:** As a user, I want the expansion controls to be positioned outside the map area so they don't obscure map content, so that I can see the full map while adjusting parameters.

#### Acceptance Criteria

1. THE System SHALL position the Expansion Controls Panel above the map legend
2. THE System SHALL position the Expansion Controls Panel to the left of the map container
3. THE System SHALL remove the absolute positioning that overlays the panel on top of the map
4. THE System SHALL ensure the panel is visible and accessible when expansion mode is enabled
5. THE System SHALL maintain responsive behavior so the panel adapts to different screen sizes

### Requirement 8: Functional Preservation

**User Story:** As a developer, I want all existing functionality to remain intact after the UI update, so that no regressions are introduced.

#### Acceptance Criteria

1. THE System SHALL maintain all existing state management hooks (useState, useEffect)
2. THE System SHALL maintain all existing validation logic for parameter ranges
3. THE System SHALL maintain all existing error display functionality
4. THE System SHALL maintain all existing loading states and disabled states
5. THE System SHALL maintain all existing prop interfaces (ExpansionParams, ExpansionControlsProps)
6. THE System SHALL call the same expansion generation service with identical parameters
7. THE System SHALL maintain the existing scenario loading functionality
8. THE System SHALL maintain the existing seed-based deterministic generation
