# Implementation Plan

- [x] 1. Setup CI/CD infrastructure and automation
  - Create GitHub Actions workflow file with typecheck, lint, and build steps
  - Add status badge to README.md with link to workflow results
  - Test CI pipeline with a sample commit to ensure all checks pass
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Implement menu table UX polish
  - Update menu table component to center-align all columns except first (left-aligned)
  - Refactor header controls layout to inline category select, search input, and "Create Item" button with 12-16px spacing
  - Modify Create Item drawer to slide from right without pushing content down
  - Add ESC key handler to close any open drawer
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 3. Create modifier group database schema and API
  - Add ModifierGroup and MenuItemModifier models to Prisma schema
  - Generate and run Prisma migration for new modifier tables
  - Create MenuController in BFF with modifier group endpoints (GET /menu/modifier-groups, GET /menu/items/:id/modifiers, POST /menu/items/:id/modifiers, DELETE /menu/items/:id/modifiers/:groupId)
  - Add MenuController to AppModule providers
  - _Requirements: 2.5, 2.6_

- [ ] 4. Build item modifiers management UI
  - Create ItemModifiersDrawer component with available and attached modifier groups display
  - Implement attach/detach functionality with optimistic UI updates
  - Add error handling with fallback refresh and user feedback
  - Integrate modifier drawer with existing menu item table
  - _Requirements: 2.5, 2.6_

- [ ] 5. Implement cascading store filters with query string state
  - Create CascadingFilters component for region/country/city selection
  - Implement filter state synchronization with URL query parameters
  - Add state persistence logic to retain selections on page refresh
  - Connect filters to existing BFF stores endpoint with proper scoping
  - _Requirements: 3.1, 3.2_

- [ ] 6. Create unified analytics filter styling and live updates
  - Define .s-input, .s-select, and .s-btn CSS classes in theme.css
  - Update analytics filter controls to use unified styling classes
  - Implement live-updating KPI cards without Apply button requirement
  - Connect analytics filters to /kpis and /kpis/daily endpoints with scope parameters
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 7. Enhance menu item creation form with smart defaults and validation
  - Add auto-population of category field from currently selected filter
  - Implement auto-focus on name field when form opens
  - Create decimal validation for price input field
  - Add success toast notification system for item creation
  - Implement "Create & add another" workflow to keep drawer open with form reset
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 8. Create comprehensive seed data for modifier system
  - Update seed.mjs to create 2 modifier groups (Bread, Extras)
  - Add sample menu item with attached modifier group relationship
  - Ensure BFF routes return expected data shapes for modifier operations
  - Test seed data creation and verify database relationships
  - _Requirements: 5.1, 5.2_

- [ ] 9. Implement end-to-end testing for modifier functionality
  - Create e2e test for menu modifier attach/detach flow from UI to database
  - Write integration tests for BFF modifier endpoints
  - Add unit tests for modifier-related UI components
  - Ensure test coverage meets minimum requirements for critical user journeys
  - _Requirements: 5.3, 5.4_

- [ ] 10. Build telemetry and feature flag infrastructure
  - Add FeatureFlag, TelemetryEvent, and Experiment models to Prisma schema
  - Generate and run migration for telemetry tables
  - Create TelemetryController with POST /telemetry endpoint for event validation and storage
  - Add TelemetryController to AppModule providers
  - _Requirements: 6.1, 6.2, 6.4_

- [ ] 11. Create development debug tooling for telemetry
  - Add hidden debug toggle in admin interface for development mode
  - Implement test event emission functionality for telemetry validation
  - Create graceful error handling for telemetry submission failures
  - Ensure telemetry system doesn't affect user experience when errors occur
  - _Requirements: 6.3, 6.5_

- [ ] 12. Ensure system integrity and quality standards across all changes
  - Run typecheck, lint, and build processes for all modified code
  - Verify no console errors appear in admin interface
  - Create comprehensive PR documentation with summaries, screenshots, and test notes
  - Split any large changes into multiple PRs with ≤150 LOC diffs where possible
  - Document any new environment variables and migration requirements
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_