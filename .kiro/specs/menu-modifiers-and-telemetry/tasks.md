# Implementation Plan

- [x] 1. Create modifier system database schema
  - Add ModifierGroup and MenuItemModifier models to Prisma schema
  - Extend existing MenuItem model with modifiers relation
  - Generate and run Prisma migration for new modifier tables
  - _Requirements: 1.1, 1.2_

- [x] 2. Implement MenuController with modifier endpoints
  - Create MenuController in BFF with modifier group endpoints (GET /menu/modifier-groups, GET /menu/items/:id/modifiers, POST /menu/items/:id/modifiers, DELETE /menu/items/:id/modifiers/:groupId)
  - Add MenuController to AppModule providers
  - Implement proper error handling and response formatting
  - _Requirements: 1.3, 1.4, 5.2_

- [x] 3. Build ItemModifiersDrawer component
  - Create ItemModifiersDrawer component with available and attached modifier groups display
  - Implement attach/detach functionality with optimistic UI updates
  - Add error handling with fallback refresh and user feedback
  - Add loading states and proper accessibility
  - _Requirements: 1.3, 1.4, 1.5, 5.3_

- [x] 4. Integrate modifier management with existing menu table
  - Add "Modifiers" button to MenuTable component actions column
  - Connect modifier drawer to existing menu item table
  - Ensure consistent styling with existing design system
  - _Requirements: 1.2, 5.1, 5.3_

- [x] 5. Enhance ItemDrawer with improved validation and UX
  - Add auto-focus on name field when form opens
  - Implement decimal validation for price input field with inline error display
  - Create "Create & add another" workflow to keep drawer open with form reset
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 6. Create toast notification system
  - Build Toast component with success/error/info variants
  - Implement toast provider and context for global toast management
  - Add success toast notification for item creation
  - Integrate toast system with error handling across components
  - _Requirements: 2.3, 2.5_

- [x] 7. Create telemetry database schema and API
  - Add FeatureFlag, TelemetryEvent, and Experiment models to Prisma schema
  - Generate and run migration for telemetry tables
  - Create TelemetryController with POST /telemetry endpoint for event validation and storage
  - Add TelemetryController to AppModule providers
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. Implement telemetry development tools
  - Add hidden debug toggle in admin interface for development mode
  - Implement test event emission functionality for telemetry validation
  - Create graceful error handling for telemetry submission failures
  - _Requirements: 3.4, 3.5_

- [x] 9. Create comprehensive seed data for modifier system
  - Update seed.mjs to create 2 modifier groups (Bread, Extras) with descriptions
  - Add sample menu items with attached modifier group relationships
  - Ensure BFF routes return expected data shapes for modifier operations
  - Test seed data creation and verify database relationships
  - _Requirements: 4.1, 4.2_

- [x] 10. Implement testing infrastructure for new features
  - Create e2e test for menu modifier attach/detach flow from UI to database
  - Write integration tests for BFF modifier and telemetry endpoints
  - Add unit tests for modifier-related UI components
  - _Requirements: 4.3_

- [x] 11. Ensure system integration and quality standards
  - Run typecheck, lint, and build processes for all modified code
  - Verify no console errors appear in admin interface
  - Ensure all new API endpoints follow existing error handling patterns
  - Validate that new UI components match existing design system
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_