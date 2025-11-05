# Design Document

## Overview

This design document outlines the approach for updating the Expansion Controls panel in the Subway Expansion Predictor to be more executive-friendly and intuitive. The redesign focuses on improving labels, adding helpful tooltips, enhancing visual hierarchy, and repositioning the panel outside the map area while preserving all existing functionality and backend integrations.

## Architecture

### Component Structure

The solution maintains the existing component architecture:

```
ExpansionIntegratedMapPage (Parent)
├── ExpansionControls (Updated Component)
│   ├── Region Selector
│   ├── Expansion Intensity Slider
│   ├── Market Drivers Section
│   │   ├── Population Focus Slider
│   │   ├── Proximity Sensitivity Slider
│   │   └── Sales Potential Slider
│   ├── Minimum Spacing Slider
│   ├── Action Buttons
│   │   ├── Generate Expansion Plan
│   │   ├── Save Scenario
│   │   └── Load Scenario Dropdown
│   └── Save Scenario Dialog (Modal)
└── MapLegend (Sibling Component)
```

### State Management

No changes to state management. The component continues to use:
- Local state via `useState` for all form inputs
- `useEffect` for validation
- Props for callbacks (`onGenerate`, `onSaveScenario`, `onLoadScenario`)
- Existing `ExpansionParams` interface for parameter passing

### Layout Changes

**Current Layout:**
- Panel positioned absolutely over the map (`position: absolute; top: 16px; right: 16px; z-index: 1000`)
- Width: 320px
- Overlays map content

**New Layout:**
- Panel positioned outside map container, to the left
- Positioned above the MapLegend component
- Uses flexbox or grid layout in parent component
- No z-index stacking over map
- Responsive width (320px default, adjusts for smaller screens)

## Components and Interfaces

### ExpansionControls Component

**Props Interface (Unchanged):**
```typescript
export interface ExpansionControlsProps {
  onGenerate: (params: ExpansionParams) => Promise<void>;
  onSaveScenario: (label: string, params: ExpansionParams) => Promise<void>;
  onLoadScenario: (scenarioId: string) => Promise<void>;
  loading: boolean;
  scenarios: Array<{
    id: string;
    label: string;
    createdAt: Date;
  }>;
}
```

**Parameters Interface (Unchanged):**
```typescript
export interface ExpansionParams {
  region: {
    country?: string;
    state?: string;
  };
  aggression: number;
  populationBias: number;
  proximityBias: number;
  turnoverBias: number;
  minDistanceM: number;
  seed: number;
}
```

### UI Component Breakdown

#### 1. Region Selector
- **Label:** "📍 Region"
- **Control:** Dropdown select
- **Options:** Germany, Belgium, France, Netherlands
- **State:** `country` (string)
- **Styling:** Full width, 8px padding, rounded corners

#### 2. Expansion Intensity
- **Label:** "🎯 Expansion Intensity"
- **Subtitle:** "How bold should the expansion model be?"
- **Control:** Range slider (0-100)
- **Visual Labels:** "Conservative" (left) ← "Balanced" (center) → "Aggressive" (right)
- **State:** `aggression` (number)
- **Display:** Show numeric value or position indicator

#### 3. Market Drivers Section
- **Section Label:** "🏙️ Market Drivers"
- **Sub-sliders:**
  1. **Population Focus**
     - Tooltip: "Favour high-footfall and dense population areas."
     - Range: 0-1, step 0.1
     - Default: 0.5
     - State: `populationBias`
     - Display: Show value (e.g., "0.5") beside label
  
  2. **Proximity Sensitivity**
     - Tooltip: "Avoid overlap with existing stores."
     - Range: 0-1, step 0.1
     - Default: 0.3
     - State: `proximityBias`
     - Display: Show value beside label
  
  3. **Sales Potential**
     - Tooltip: "Prioritise areas near high-performing stores."
     - Range: 0-1, step 0.1
     - Default: 0.2
     - State: `turnoverBias`
     - Display: Show value beside label

- **Optional Visual Indicator:**
  - Small pie/ring chart showing relative weights
  - Updates live as sliders change
  - Positioned below sliders or in section header

#### 4. Minimum Spacing
- **Label:** "🚧 Minimum Spacing"
- **Subtitle:** "Minimum distance between stores (metres)"
- **Tooltip:** "Prevents store cannibalisation."
- **Control:** Range slider (800-3000)
- **State:** `minDistance` (number)
- **Display:** Show current value (e.g., "1200m")

#### 5. Action Buttons
- **Primary Button:** "Generate Expansion Plan"
  - Full width
  - Primary color (blue)
  - Disabled when loading or validation errors exist
  - Shows "Generating..." when loading
  
- **Secondary Button:** "Save Scenario"
  - Full width
  - Secondary style (outlined)
  - Opens save dialog modal
  
- **Tertiary Control:** "Load Scenario" dropdown
  - Full width
  - Shows list of saved scenarios
  - Placeholder: "Select a scenario..."
  - Only visible when scenarios exist

#### 6. Save Scenario Dialog
- **Modal overlay** (unchanged)
- **Input:** Text field for scenario label
- **Buttons:** Cancel (secondary), Save (primary)

## Data Models

### Validation Rules (Unchanged)

```typescript
// Population bias: 0-1
if (populationBias < 0 || populationBias > 1) {
  errors.push('Population bias must be between 0 and 1');
}

// Proximity bias: 0-1
if (proximityBias < 0 || proximityBias > 1) {
  errors.push('Proximity bias must be between 0 and 1');
}

// Turnover bias: 0-1
if (turnoverBias < 0 || turnoverBias > 1) {
  errors.push('Turnover bias must be between 0 and 1');
}

// Minimum distance: >= 100m
if (minDistance < 100) {
  errors.push('Minimum distance must be at least 100 meters');
}
```

### Parameter Mapping

| UI Label | State Variable | API Parameter | Range | Default |
|----------|---------------|---------------|-------|---------|
| Region | `country` | `region.country` | String | "Germany" |
| Expansion Intensity | `aggression` | `aggression` | 0-100 | 60 |
| Population Focus | `populationBias` | `populationBias` | 0-1 | 0.5 |
| Proximity Sensitivity | `proximityBias` | `proximityBias` | 0-1 | 0.3 |
| Sales Potential | `turnoverBias` | `turnoverBias` | 0-1 | 0.2 |
| Minimum Spacing | `minDistance` | `minDistanceM` | 800-3000 | 800 |

## Error Handling

### Validation Errors
- Display validation errors in a red-bordered box above action buttons
- Disable "Generate Expansion Plan" button when errors exist
- Errors clear automatically when values are corrected

### API Errors
- Generation errors: Show alert with error message
- Save errors: Show alert with error message
- Load errors: Show alert with error message
- All errors logged to console

### Loading States
- All inputs disabled when `loading` prop is true
- Primary button shows "Generating..." text
- Buttons show disabled cursor

## Testing Strategy

### Unit Tests
- Test that all labels render correctly with emojis
- Test that tooltips appear on hover/focus
- Test that sliders update state correctly
- Test that validation logic works for all parameters
- Test that parameter mapping to ExpansionParams is correct
- Test that buttons are disabled appropriately

### Integration Tests
- Test that onGenerate is called with correct parameters
- Test that onSaveScenario is called with correct parameters
- Test that onLoadScenario is called with correct scenario ID
- Test that save dialog opens and closes correctly
- Test that scenario dropdown populates correctly

### Visual Regression Tests
- Test panel positioning outside map area
- Test responsive behavior at different screen sizes
- Test that design system styles are applied consistently
- Test tooltip positioning and visibility

### Accessibility Tests
- Test keyboard navigation through all controls
- Test screen reader labels for all inputs
- Test focus indicators on all interactive elements
- Test that tooltips are accessible via keyboard

## Design System Integration

### Typography
- **Section Headers:** 18px, font-weight 600
- **Labels:** 14px, font-weight 500
- **Subtitles:** 14px, font-weight 400, color: muted
- **Values:** 14px, font-weight 500
- **Tooltips:** 12px, font-weight 400

### Spacing
- **Panel padding:** 20px
- **Section margin-bottom:** 16px
- **Label margin-bottom:** 4px
- **Button gap:** 8px

### Colors
- **Panel background:** `var(--s-panel, white)`
- **Border:** `var(--s-border, #e5e7eb)`
- **Primary button:** `#0070f3`
- **Secondary button:** `white` with `#0070f3` border
- **Muted text:** `var(--s-muted, #666)`
- **Error background:** `#fee`
- **Error border:** `#fcc`
- **Error text:** `#c00`

### Borders & Shadows
- **Border radius:** 8px (panel), 4px (inputs/buttons)
- **Box shadow:** `0 4px 12px rgba(0,0,0,0.15)`
- **Border width:** 1px

### Interactive States
- **Hover:** Cursor pointer on buttons
- **Disabled:** Cursor not-allowed, reduced opacity
- **Focus:** Browser default focus ring (accessible)

## Implementation Approach

### Phase 1: Update Labels and Structure
1. Update section labels with emojis
2. Add subtitle text for Expansion Intensity and Minimum Spacing
3. Rename bias sliders to executive-friendly names
4. Add value displays beside slider labels

### Phase 2: Add Tooltips
1. Implement tooltip component or use native title attributes
2. Add tooltips to all Market Drivers sliders
3. Add tooltip to Minimum Spacing
4. Test tooltip accessibility

### Phase 3: Update Button Labels
1. Rename "Generate Suggestions" to "Generate Expansion Plan"
2. Ensure button styling matches design system
3. Test button states (loading, disabled, enabled)

### Phase 4: Reposition Panel
1. Update ExpansionIntegratedMapPage layout
2. Remove absolute positioning from ExpansionControls
3. Position panel to left of map, above legend
4. Test responsive behavior
5. Ensure panel doesn't overlap map content

### Phase 5: Optional Enhancements
1. Add pie/ring chart for Market Drivers weighting
2. Add visual indicators for slider positions
3. Add "Compare Scenarios" button (if feature exists)

### Phase 6: Testing and Refinement
1. Run unit tests
2. Run integration tests
3. Test accessibility
4. Visual QA across browsers
5. Test responsive behavior

## Positioning Implementation Details

### Current Structure (ExpansionIntegratedMapPage)
```tsx
<div className="s-panel">
  <div className="s-panelCard">
    <div className="s-panelHeader">...</div>
    <div style={{ height: '600px', position: 'relative' }}>
      <WorkingMapView ... />
      {expansionMode && (
        <ExpansionControls ... /> // Currently positioned absolutely over map
      )}
    </div>
  </div>
</div>
```

### New Structure (Proposed)
```tsx
<div className="s-panel">
  <div className="s-panelCard">
    <div className="s-panelHeader">...</div>
    
    {/* Expansion controls outside map */}
    {expansionMode && (
      <div style={{ marginBottom: '16px' }}>
        <ExpansionControls ... />
      </div>
    )}
    
    <div style={{ height: '600px', position: 'relative' }}>
      <WorkingMapView ... />
    </div>
  </div>
</div>

{/* Legend positioned below map */}
{expansionMode && suggestions.length > 0 && <MapLegend />}
```

### Alternative: Side-by-Side Layout
```tsx
<div className="s-panel">
  <div className="s-panelCard">
    <div className="s-panelHeader">...</div>
    
    <div style={{ display: 'flex', gap: '16px' }}>
      {/* Controls on left */}
      {expansionMode && (
        <div style={{ width: '320px', flexShrink: 0 }}>
          <ExpansionControls ... />
        </div>
      )}
      
      {/* Map on right */}
      <div style={{ flex: 1, height: '600px', position: 'relative' }}>
        <WorkingMapView ... />
      </div>
    </div>
  </div>
</div>
```

### Responsive Considerations
- **Desktop (>1200px):** Side-by-side layout with 320px controls
- **Tablet (768-1200px):** Controls above map, full width
- **Mobile (<768px):** Controls above map, full width, collapsible

## Tooltip Implementation

### Option 1: Native Title Attribute
```tsx
<label title="Favour high-footfall and dense population areas.">
  Population Focus: {populationBias.toFixed(2)}
</label>
```
**Pros:** Simple, no dependencies, accessible
**Cons:** Limited styling, browser-dependent appearance

### Option 2: Custom Tooltip Component
```tsx
<Tooltip content="Favour high-footfall and dense population areas.">
  <label>Population Focus: {populationBias.toFixed(2)}</label>
</Tooltip>
```
**Pros:** Consistent styling, better UX
**Cons:** Requires implementation or library

### Recommendation
Start with native title attributes for speed, upgrade to custom component if needed for consistency.

## Market Drivers Visual Indicator (Optional)

### Pie Chart Implementation
```tsx
const total = populationBias + proximityBias + turnoverBias;
const popPercent = (populationBias / total) * 100;
const proxPercent = (proximityBias / total) * 100;
const turnPercent = (turnoverBias / total) * 100;

// Use SVG or canvas to render small pie chart
<svg width="60" height="60" viewBox="0 0 60 60">
  {/* Render three segments based on percentages */}
</svg>
```

### Ring Chart Alternative
- Simpler to implement with CSS
- Shows relative weights as colored segments
- More compact than pie chart

### Recommendation
Implement as optional enhancement after core functionality is complete.

## Migration Path

1. **No Breaking Changes:** All existing props and interfaces remain unchanged
2. **Backward Compatible:** Component can be used in existing parent without modifications
3. **Incremental Rollout:** Changes can be deployed incrementally (labels first, then positioning)
4. **Feature Flag:** Consider adding feature flag for new UI if gradual rollout is desired

## Performance Considerations

- No performance impact expected
- Tooltip rendering is lightweight
- Optional pie chart should use memoization if implemented
- No additional API calls or data fetching

## Accessibility Considerations

- All form inputs have associated labels
- Tooltips accessible via keyboard (title attribute or aria-describedby)
- Focus indicators visible on all interactive elements
- Color contrast meets WCAG AA standards
- Screen reader announces slider values
- Error messages associated with form via aria-live or role="alert"

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS features: flexbox, grid (widely supported)
- No IE11 support required (Next.js 14 default)
- Emoji support in all modern browsers

## Open Questions

1. **Pie Chart Priority:** Should the Market Drivers visual indicator be included in MVP or deferred?
   - **Recommendation:** Defer to Phase 5 (optional enhancement)

2. **Tooltip Library:** Should we use a tooltip library or native title attributes?
   - **Recommendation:** Start with native, upgrade if needed

3. **Responsive Breakpoints:** What are the exact breakpoints for responsive behavior?
   - **Recommendation:** Follow existing admin dashboard breakpoints

4. **Compare Scenarios:** Does this feature exist in the backend?
   - **Recommendation:** Add button UI only if backend support exists

5. **Panel Collapse:** Should the panel be collapsible on mobile?
   - **Recommendation:** Yes, add collapse/expand toggle for mobile
