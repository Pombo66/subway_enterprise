# Design Document

## Overview

This design addresses the regressions in the Menu Management and Store Management pages that occurred after running a Code Quality Analyzer. The primary issues are:

1. **CSS Compression**: The globals.css file was minified, making it unreadable and hard to maintain
2. **Mixed Styling Approaches**: Components are inconsistently using Tailwind classes vs custom CSS
3. **Table Layout Issues**: The MenuTable component uses HTML table structure but CSS expects grid layout
4. **Broken Visual Consistency**: Styling inconsistencies between pages that were previously cohesive

## Architecture

### Styling Strategy

**Approach**: Maintain the existing custom CSS design system while ensuring consistency and readability.

**Rationale**: The current custom CSS provides a cohesive dark theme design that works well. Rather than converting everything to Tailwind (which would be a major refactor), we'll:
- Restore readable CSS formatting
- Fix component-CSS mismatches
- Ensure consistent application of the design system

### Component Structure

```
Menu/Store Pages
├── Header Section (consistent across pages)
├── Controls Section (filters, search, actions)
├── Data Display Section (table/grid)
└── Drawer Components (add/edit forms)
```

## Components and Interfaces

### 1. CSS Organization

**Structure**:
```css
/* Base Styles */
/* Layout Components */
/* Form Elements */
/* Table/Grid Components */
/* Drawer/Modal Components */
/* Page-Specific Styles */
```

**Key Classes**:
- `.s-*` - System-wide components (buttons, inputs, panels)
- `.menu-*` - Menu page specific styles
- `.stores-*` - Store page specific styles
- `.drawer-*` - Modal/drawer components

### 2. MenuTable Component

**Current Issue**: Component uses HTML `<table>` structure but CSS expects grid layout.

**Solution**: Update MenuTable to use the grid-based approach that matches the CSS:

```tsx
// Instead of <table><thead><tbody>
<div className="menu-table">
  <div className="menu-header">
    <div className="menu-cell menu-cell-left">Name</div>
    <div className="menu-cell menu-cell-center">Price</div>
    // ...
  </div>
  <div className="menu-body">
    {items.map(item => (
      <div className="menu-row">
        <div className="menu-cell menu-cell-left">{item.name}</div>
        // ...
      </div>
    ))}
  </div>
</div>
```

### 3. Store Page Consistency

**Current State**: Store page uses correct grid structure but needs alignment with menu page patterns.

**Improvements**:
- Ensure header section matches menu page layout
- Standardize control section spacing and alignment
- Verify drawer components use consistent styling

## Data Models

No data model changes required. The existing interfaces for `MenuItem` and `Store` are sufficient.

## Error Handling

### CSS Loading Issues
- Ensure proper CSS formatting doesn't break existing styles
- Maintain backward compatibility with existing class names
- Test all interactive states (hover, focus, active)

### Component Rendering
- Verify table/grid layouts render correctly across different screen sizes
- Ensure drawer animations and overlays work properly
- Test search and filter functionality

## Testing Strategy

### Visual Regression Testing
1. **Before/After Comparison**: Document current broken state and verify fixes
2. **Cross-Page Consistency**: Ensure both pages look and behave similarly
3. **Interactive Elements**: Test all buttons, forms, and navigation

### Functional Testing
1. **Menu Management**: Create, edit, delete menu items
2. **Store Management**: Create, edit, delete stores
3. **Search/Filter**: Verify filtering works on both pages
4. **Responsive Design**: Test on different screen sizes

### CSS Validation
1. **Formatting**: Ensure CSS is readable and properly organized
2. **Consistency**: Verify consistent use of design tokens and patterns
3. **Performance**: Ensure no duplicate or conflicting styles

## Implementation Approach

### Phase 1: CSS Restoration
- Reformat globals.css for readability
- Organize styles into logical sections
- Add comments for maintainability

### Phase 2: Component Alignment
- Fix MenuTable to use grid layout matching CSS
- Ensure consistent header sections across pages
- Standardize control sections

### Phase 3: Visual Polish
- Verify all interactive states work correctly
- Ensure consistent spacing and typography
- Test drawer/modal functionality

### Phase 4: Validation
- Cross-browser testing
- Responsive design verification
- Performance check