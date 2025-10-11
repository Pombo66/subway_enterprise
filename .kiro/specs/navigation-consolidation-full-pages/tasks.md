 # Implementation Plan

- [x] 1. Update navigation structure and implement redirects
  - Update Sidebar component to show only 6 top-level navigation items (Dashboard, Menu, Orders, Stores, Analytics, Settings)
  - Implement Next.js redirects for legacy URLs (/categories → /menu/categories, /items → /menu/items, /pricing → /menu/pricing, /users → /settings/users, /audit → /settings/audit)
  - Create basic page shells for new nested routes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2. Implement shared tab navigation component
  - Create reusable TabNavigation component for section-level navigation
  - Implement consistent styling that matches existing design patterns
  - Add keyboard navigation support for accessibility
  - _Requirements: 1.2, 1.3, 1.4, 9.1, 9.4, 9.5_

- [x] 3. Implement Menu section with full CRUD functionality
- [x] 3.1 Create Menu Items page with comprehensive management
  - Build items table with search, scope filters (global/region/country/store), and pagination
  - Implement create/edit item drawer with validation, base price setting, and category selection
  - Add modifier group attachment/detachment functionality
  - _Requirements: 4.1, 4.6, 9.2, 9.3, 10.1, 10.3_

- [x] 3.2 Create Menu Categories page with drag-and-drop ordering
  - Implement CRUD operations for categories
  - Add drag-to-reorder functionality for category management
  - Create item assignment interface for categories
  - _Requirements: 4.3, 4.6, 9.2, 9.3, 10.1, 10.3_

- [x] 3.3 Create Menu Modifiers management interface
  - Build modifier groups CRUD with min/max/required settings
  - Implement individual modifier management within groups
  - Create interface for attaching modifier groups to menu items
  - _Requirements: 4.4, 4.6, 9.2, 9.3, 10.1, 10.3_

- [x] 3.4 Create Menu Pricing management with override comparison
  - Build base pricing editing interface
  - Implement price override comparison display
  - Add audit trail integration for pricing changes
  - _Requirements: 4.5, 4.6, 9.2, 9.3, 10.1, 10.3_

- [x] 4. Implement Store management system
- [x] 4.1 Create Store list page with filtering
  - Build store list table with scope filters
  - Implement search functionality for store management
  - Add navigation to individual store details
  - _Requirements: 5.1, 5.6, 9.2, 9.3, 10.1_

- [x] 4.2 Create Store details page with pricing overrides
  - Build store information display
  - Implement Pricing Overrides tab functionality
  - Add price override editing with base price comparison
  - Create clear/restore to base pricing functionality
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 9.2, 9.3, 10.1, 10.3_

- [x] 5. Implement Orders management interface
  - Create orders list with status and total display
  - Add quick filters for order status and date ranges
  - Implement basic order details view
  - Add real-time filtering functionality
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.2, 9.3, 10.1_

- [x] 6. Implement Analytics and reporting interface
  - Create time-series charts for orders and revenue using existing chart patterns
  - Build dimension breakdowns by store, region, and category
  - Implement date range comparison functionality
  - Add responsive chart controls and interactions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.2, 9.3, 10.1_

- [x] 7. Implement Settings section with administration features
- [x] 7.1 Create Users & Roles management interface
  - Build basic CRUD operations for user management
  - Implement role assignment functionality
  - Add user search and filtering capabilities
  - _Requirements: 8.1, 8.4, 9.2, 9.3, 10.1, 10.3_

- [x] 7.2 Create Audit Log interface
  - Build audit log display with actor, entity, and diff information
  - Implement search and filtering for audit entries
  - Add comprehensive log viewing capabilities
  - _Requirements: 8.2, 8.4, 8.5, 9.2, 9.3, 10.1_

- [x] 7.3 Create Feature Flags management interface
  - Build feature flag toggle interface
  - Implement recent events display
  - Add flag description and metadata management
  - _Requirements: 8.3, 8.4, 9.2, 9.3, 10.1, 10.3_

- [x] 8. Extend database schema and implement migrations
  - Create Category, MenuItemCategory, Modifier, PriceOverride, and AuditEntry models
  - Add basePrice field to MenuItem and role management fields to User
  - Add minSelection, maxSelection, required fields to ModifierGroup
  - Generate and test database migrations
  - _Requirements: 10.2, 10.4, 10.5_

- [x] 9. Implement BFF API endpoints for Menu management
- [x] 9.1 Create Menu Items API endpoints
  - Implement GET /menu/items with filtering, sorting, and pagination
  - Add POST /menu/items and PATCH /menu/items/:id for CRUD operations
  - Create modifier group attachment/detachment endpoints
  - _Requirements: 4.1, 4.2, 4.6, 10.2, 10.3_

- [x] 9.2 Create Menu Categories API endpoints
  - Implement GET /menu/categories and CRUD operations
  - Add PUT /menu/categories/reorder for drag-and-drop functionality
  - Create category-item relationship management endpoints
  - _Requirements: 4.3, 4.6, 10.2, 10.3_

- [x] 9.3 Create Menu Modifiers API endpoints
  - Implement modifier groups and modifiers CRUD operations
  - Add item-modifier group relationship management
  - Create endpoints for modifier rules (min/max/required)
  - _Requirements: 4.4, 4.6, 10.2, 10.3_

- [x] 9.4 Create Menu Pricing API endpoints
  - Implement GET /menu/pricing and PATCH /menu/pricing/:itemId
  - Add price override comparison logic
  - Integrate audit trail for pricing changes
  - _Requirements: 4.5, 4.6, 10.2, 10.3_

- [x] 10. Implement BFF API endpoints for Stores management
  - Create GET /stores with scope filtering and search
  - Implement GET /stores/:id for store details
  - Add pricing overrides endpoints (GET, POST, DELETE)
  - Integrate audit trail for store modifications
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 10.2, 10.3_

- [x] 11. Implement BFF API endpoints for Orders and Analytics
  - Create GET /orders/recent with filtering capabilities
  - Implement analytics endpoints for KPIs and time-series data
  - Add dimension breakdown endpoints for reporting
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 10.2_

- [x] 12. Implement BFF API endpoints for Settings
  - Create Users & Roles CRUD endpoints
  - Implement Audit Log retrieval with search and filtering
  - Add Feature Flags management endpoints
  - Integrate comprehensive audit trail for all settings operations
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 10.2, 10.3_

- [x] 13. Add comprehensive input validation and error handling
  - Implement Zod schemas for all API request validation
  - Add consistent error response formatting
  - Integrate existing TelemetryErrorBoundary and toast system
  - Create user-friendly error states and recovery options
  - _Requirements: 9.2, 9.3, 10.1, 10.2_

- [x] 14. Implement audit trail and telemetry integration
  - Add telemetry event emission for all write operations
  - Create audit entry generation for data modifications
  - Implement comprehensive logging for user actions
  - Add telemetry integration for feature flag changes
  - _Requirements: 4.6, 5.6, 8.4, 10.3, 10.5_

- [x] 15. Create database seed data for testing and development
  - Generate realistic seed data for items, categories, modifiers, and stores
  - Create price overrides and audit entries for testing
  - Add sample users, feature flags, and orders
  - Ensure seed data supports all new functionality testing
  - _Requirements: 10.4, 10.5_

- [x] 16. Implement comprehensive testing suite
- [x] 16.1 Create Playwright E2E tests for navigation and CRUD workflows
  - Test navigation consolidation and redirect functionality
  - Create end-to-end tests for Items, Categories, and Modifiers CRUD
  - Test store pricing override workflows
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 16.2 Create unit tests for components and services
  - Test shared TabNavigation component functionality
  - Create unit tests for API service methods and selectors
  - Test form validation and error handling
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1_

- [x] 16.3 Create API integration tests
  - Test all new BFF endpoints with proper request/response validation
  - Create database integration tests for new models
  - Test audit trail and telemetry event generation
  - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [x] 17. Final integration and polish
  - Verify all redirects work correctly and maintain functionality
  - Ensure design consistency across all new pages
  - Test responsive behavior and accessibility compliance
  - Validate that dashboard remains completely unchanged
  - Run comprehensive testing suite and fix any issues
  - _Requirements: 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 9.1, 9.4, 9.5, 9.6, 9.7_