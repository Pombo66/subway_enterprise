# Requirements Document

## Introduction

This feature consolidates the duplicate modifiers functionality in the menu management system by removing the redundant ItemModifiersDrawer and keeping only the existing modifiers section in the Edit Item drawer. This eliminates user confusion, reduces code duplication, and maintains design consistency without making any visual changes to the existing menu or edit drawer interfaces.

## Requirements

### Requirement 1

**User Story:** As a Subway HQ administrator, I want a single, consistent way to manage menu item modifiers across all stores, so that I don't get confused by duplicate functionality.

#### Acceptance Criteria

1. WHEN I view the menu table THEN I SHALL NOT see a "Modifiers" button in the Actions column
2. WHEN I click "Edit" on a menu item THEN I SHALL see the existing modifiers section in the edit drawer
3. WHEN I manage modifiers in the edit drawer THEN the functionality SHALL work exactly as it currently does
4. WHEN I save changes in the edit drawer THEN modifier associations SHALL be properly updated

### Requirement 2

**User Story:** As a developer, I want to remove duplicate code and inconsistent styling, so that the codebase is cleaner and more maintainable.

#### Acceptance Criteria

1. WHEN the consolidation is complete THEN the ItemModifiersDrawer component SHALL be removed
2. WHEN the consolidation is complete THEN all references to the modifiers drawer SHALL be removed
3. WHEN the consolidation is complete THEN the custom modifier-toggle-btn styles SHALL be removed from CSS
4. WHEN the consolidation is complete THEN no design changes SHALL be made to the menu table or edit drawer

### Requirement 3

**User Story:** As a Subway HQ administrator, I want the modifiers column in the menu table to remain informational, so that I can see modifier counts at a glance.

#### Acceptance Criteria

1. WHEN I view the menu table THEN I SHALL still see the "Modifiers" column showing modifier counts
2. WHEN I view the menu table THEN the modifiers column SHALL display "{count} groups" format
3. WHEN I view the menu table THEN the modifiers column SHALL be read-only information only
4. WHEN I want to edit modifiers THEN I SHALL use the Edit button to open the edit drawer

### Requirement 4

**User Story:** As a Subway HQ administrator, I want the existing edit drawer modifiers functionality to remain unchanged, so that my workflow is not disrupted.

#### Acceptance Criteria

1. WHEN I open the edit drawer THEN the modifiers section SHALL appear exactly as it currently does
2. WHEN I select/deselect modifier checkboxes THEN the behavior SHALL remain identical
3. WHEN I save the item THEN modifier associations SHALL be updated as they currently are
4. WHEN I cancel editing THEN no changes SHALL be applied as currently implemented