# Implementation Plan

- [x] 1. Update ExpansionControls component labels and structure
  - Update the component to use executive-friendly labels with emojis
  - Add subtitle text for key sections
  - Maintain all existing state management and validation logic
  - _Requirements: 1.1, 2.1, 2.2, 3.1, 4.1_

- [x] 1.1 Update region selector label
  - Change label from "Region" to "📍 Region"
  - Maintain existing dropdown functionality and country options
  - _Requirements: 1.1, 1.2_

- [x] 1.2 Update expansion intensity section
  - Change label from "Aggression" to "🎯 Expansion Intensity"
  - Add subtitle text: "How bold should the expansion model be?"
  - Update slider labels to show "Conservative" (left), "Balanced" (center), "Aggressive" (right)
  - Maintain existing 0-100 range and state management
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 1.3 Update market drivers section
  - Add section label "🏙️ Market Drivers"
  - Rename "Population Bias" to "Population Focus"
  - Rename "Proximity Bias" to "Proximity Sensitivity"
  - Rename "Turnover Bias" to "Sales Potential"
  - Display numeric values beside each slider label (e.g., "Population Focus: 0.5")
  - Maintain existing 0-1 range with 0.1 step for all sliders
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 1.4 Update minimum spacing section
  - Change label to "🚧 Minimum Spacing"
  - Add subtitle: "Minimum distance between stores (metres)"
  - Display current value beside the slider
  - Maintain existing 800-3000 range (update from current 100+ minimum)
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 1.5 Update action button labels
  - Change "Generate Suggestions" to "Generate Expansion Plan"
  - Maintain "Save Scenario" label
  - Maintain all existing button functionality and states
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 2. Add tooltips to controls
  - Implement tooltips for Market Drivers sliders and Minimum Spacing
  - Ensure tooltips are accessible via keyboard
  - Use native title attributes or implement custom tooltip component
  - _Requirements: 3.2, 4.4_

- [x] 2.1 Add tooltip to Population Focus slider
  - Add tooltip text: "Favour high-footfall and dense population areas."
  - _Requirements: 3.2_

- [x] 2.2 Add tooltip to Proximity Sensitivity slider
  - Add tooltip text: "Avoid overlap with existing stores."
  - _Requirements: 3.2_

- [x] 2.3 Add tooltip to Sales Potential slider
  - Add tooltip text: "Prioritise areas near high-performing stores."
  - _Requirements: 3.2_

- [x] 2.4 Add tooltip to Minimum Spacing control
  - Add tooltip text: "Prevents store cannibalisation."
  - _Requirements: 4.4_

- [x] 3. Reposition ExpansionControls panel outside map area
  - Update ExpansionIntegratedMapPage layout to position controls outside map
  - Remove absolute positioning from ExpansionControls component
  - Position panel to the left of or above the map container
  - Ensure panel is above MapLegend component
  - Test responsive behavior at different screen sizes
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3.1 Update ExpansionControls component styling
  - Remove absolute positioning styles (position, top, right, z-index)
  - Update panel to work in normal document flow
  - Maintain existing panel styling (background, border, shadow, border-radius)
  - _Requirements: 6.4, 7.3_

- [x] 3.2 Update ExpansionIntegratedMapPage layout
  - Modify layout to position ExpansionControls outside the map container
  - Implement side-by-side layout for desktop or stacked layout for all sizes
  - Ensure controls appear above MapLegend
  - Test that map doesn't have controls overlaying it
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 3.3 Implement responsive behavior
  - Ensure panel adapts to different screen sizes
  - Consider collapsible panel for mobile devices
  - Test on desktop (>1200px), tablet (768-1200px), and mobile (<768px)
  - _Requirements: 7.5_

- [x] 4. Add Market Drivers visual indicator
  - Implement small pie or ring chart showing relative weighting of three bias sliders
  - Update live as sliders change
  - Position below sliders or in section header
  - Use memoization for performance
  - _Requirements: 3.7_

- [x] 4.1 Create visual indicator component
  - Implement SVG-based pie or ring chart
  - Calculate percentages from populationBias, proximityBias, turnoverBias
  - Use distinct colors for each segment
  - _Requirements: 3.7_

- [x] 4.2 Integrate visual indicator into Market Drivers section
  - Position indicator appropriately in the UI
  - Ensure it updates when any bias slider changes
  - Test visual appearance and performance
  - _Requirements: 3.7_

- [x] 5. Verify design system consistency
  - Audit all typography, spacing, and colors against design system
  - Ensure consistency with existing admin dashboard components
  - Test visual appearance across browsers
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 6. Accessibility testing
  - Test keyboard navigation through all controls
  - Verify screen reader compatibility
  - Ensure focus indicators are visible
  - Test tooltip accessibility
  - Verify color contrast meets WCAG AA standards
  - _Requirements: 3.2, 4.4_

- [x] 7. Integration testing
  - Verify onGenerate is called with correct parameters
  - Verify onSaveScenario is called with correct parameters
  - Verify onLoadScenario is called with correct scenario ID
  - Test that all existing functionality works after changes
  - Test error handling and validation
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_
