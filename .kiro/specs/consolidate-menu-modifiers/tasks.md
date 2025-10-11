# Implementation Plan

- [x] 1. Remove modifiers drawer functionality from MenuPage component
  - Remove ItemModifiersDrawer import statement
  - Remove modifiersDrawer state management (isOpen, itemId, itemName)
  - Remove handleEditModifiers function
  - Remove ItemModifiersDrawer component from JSX
  - Remove modifiers drawer from ESC key handler
  - _Requirements: 1.1, 2.2_

- [x] 2. Update MenuTable component to remove modifiers button
  - Remove onEditModifiers prop from MenuTableProps interface
  - Remove onEditModifiers parameter from component function
  - Remove Modifiers button from Actions column JSX
  - Keep modifiers column displaying count information unchanged
  - _Requirements: 1.1, 3.1, 3.2, 3.3_

- [x] 3. Delete ItemModifiersDrawer component file
  - Delete apps/admin/app/menu/components/ItemModifiersDrawer.tsx file completely
  - _Requirements: 2.1_

- [x] 4. Remove ItemModifiersDrawer CSS styles from globals.css
  - Remove .modifier-toggle-btn and related styles
  - Remove .modifier-group-item and related styles  
  - Remove .modifier-status and related styles
  - Remove all ItemModifiersDrawer specific CSS classes
  - _Requirements: 2.3_

- [x] 5. Verify Edit drawer modifiers functionality remains unchanged
  - Test that modifiers checkboxes work identically in Edit drawer
  - Verify form submission includes modifier data correctly
  - Confirm no visual or functional changes to Edit drawer
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Write integration tests for consolidated modifier workflow
  - Test creating items with modifiers via Edit drawer
  - Test editing existing item modifiers via Edit drawer
  - Verify modifier counts display correctly in table
  - Test that no modifiers drawer functionality remains
  - _Requirements: 1.1, 1.2, 1.3, 1.4_