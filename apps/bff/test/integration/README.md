# BFF API Integration Tests

This directory contains comprehensive integration tests for all BFF API endpoints, covering the requirements for task 16.3.

## Test Coverage

### 1. Menu Items API (`menu-items.integration.test.ts`)
- **GET /menu/items** - Retrieval with pagination and filtering
- **POST /menu/items** - Creation with validation and audit trails
- Tests proper request/response validation
- Tests database integration with stores
- Tests audit trail generation for menu item operations
- Tests error handling and data integrity

### 2. Menu Categories API (`menu-categories.integration.test.ts`)
- **GET /menu/categories** - Category listing with item counts
- **GET /menu/categories/:id** - Individual category with items
- **POST /menu/categories** - Category creation
- **PATCH /menu/categories/:id** - Category updates
- **DELETE /menu/categories/:id** - Category deletion with constraints
- **PUT /menu/categories/reorder** - Drag-and-drop reordering
- **POST /menu/categories/:id/items** - Item assignment
- **DELETE /menu/categories/:id/items/:itemId** - Item removal
- Tests many-to-many relationships between categories and items
- Tests validation and error handling

### 3. Menu Modifiers API (`menu-modifiers.integration.test.ts`)
- **GET /menu/modifier-groups** - Modifier group listing
- **GET /menu/items/:id/modifiers** - Item modifier attachments
- **POST /menu/items/:id/modifiers** - Modifier attachment
- **DELETE /menu/items/:id/modifiers/:groupId** - Modifier detachment
- Tests modifier group and individual modifier CRUD operations
- Tests relationship management between items and modifiers
- Tests audit trail for modifier operations

### 4. Menu Pricing API (`menu-pricing.integration.test.ts`)
- **GET /menu/pricing** - Pricing information with overrides
- **PATCH /menu/pricing/:itemId** - Base price updates
- Tests price override comparison logic
- Tests audit trail for pricing changes
- Tests decimal precision handling

### 5. Stores API (`stores.integration.test.ts`)
- **GET /stores** - Store listing with filtering by region/country
- **GET /stores/:id** - Individual store details
- **POST /stores** - Store creation
- **PUT /stores/:id** - Store updates
- **DELETE /stores/:id** - Store deletion
- **GET /stores/:id/pricing-overrides** - Store-specific pricing
- **POST /stores/:id/pricing-overrides** - Price override creation
- **DELETE /stores/:id/pricing-overrides/:itemId** - Override removal
- Tests store-specific pricing functionality
- Tests audit trails for store operations

### 6. Orders API (`orders.integration.test.ts`)
- **GET /orders/recent** - Order listing with comprehensive filtering
- **GET /orders/:id** - Individual order details
- Tests date range filtering (hour, 4hours, today, 7days)
- Tests status filtering and search functionality
- Tests pagination and sorting
- Tests relationships with stores and users
- Tests data integrity and performance

### 7. Analytics API (`analytics.integration.test.ts`)
- **GET /analytics/kpis** - Key performance indicators
- **GET /analytics/time-series** - Time-series data for charts
- **GET /analytics/breakdowns** - Dimensional breakdowns
- Tests metrics calculation (orders, revenue, average order value)
- Tests time-series data generation (hourly, daily, weekly)
- Tests breakdowns by store, region, and category
- Tests data accuracy and consistency between endpoints

### 8. Settings API (`settings.integration.test.ts`)
- **GET /settings/users** - User management
- **POST /settings/users** - User creation
- **PATCH /settings/users/:id** - User updates
- **DELETE /settings/users/:id** - User deletion
- **GET /settings/audit** - Audit log retrieval with filtering
- **GET /settings/flags** - Feature flag management
- **PATCH /settings/flags/:key** - Feature flag updates
- Tests user role validation and constraints
- Tests audit log search and filtering
- Tests feature flag operations with comprehensive logging

### 9. Audit Trail & Telemetry (`audit-telemetry.integration.test.ts`)
- Tests audit entry creation for all CRUD operations
- Tests telemetry event generation
- Tests comprehensive logging for feature flag changes
- Tests audit log retrieval and filtering
- Tests data integrity across concurrent operations
- Tests audit trail performance with large datasets

### 10. Database Models (`database-models.integration.test.ts`)
- Tests all Prisma models and relationships
- Tests data validation and constraints
- Tests foreign key relationships
- Tests unique constraints and indexes
- Tests default values and optional fields
- Tests decimal precision for monetary values
- Tests enum validation for status and role fields
- Tests database performance with indexes

## Test Configuration

### Jest Configuration (`jest.integration.config.js`)
- Configured for Node.js environment
- 30-second timeout for integration tests
- Sequential execution to avoid database conflicts
- Proper setup and teardown for test isolation

### Test Setup (`test/setup.ts`)
- Minimal setup for real database integration
- No mocking to ensure true integration testing

## Key Testing Patterns

### 1. Request/Response Validation
- All tests verify proper API response structure
- Tests validate required fields and data types
- Tests ensure consistent error response formats
- Tests verify proper HTTP status codes

### 2. Database Integration
- Tests verify data persistence and retrieval
- Tests ensure referential integrity
- Tests validate constraints and relationships
- Tests handle concurrent operations

### 3. Audit Trail Testing
- Every write operation generates audit entries
- Tests verify audit entry structure and content
- Tests ensure audit trails don't break main operations
- Tests audit log retrieval and filtering

### 4. Telemetry Event Generation
- Tests verify telemetry events for user actions
- Tests feature flag change logging
- Tests comprehensive metadata capture
- Tests telemetry failure handling

### 5. Error Handling
- Tests validation errors with proper messages
- Tests database constraint violations
- Tests not found scenarios
- Tests malformed request handling
- Tests concurrent operation conflicts

### 6. Data Integrity
- Tests maintain referential integrity
- Tests handle edge cases and boundary conditions
- Tests decimal precision for monetary values
- Tests date/time handling across timezones

## Requirements Coverage

This test suite addresses all requirements from task 16.3:

✅ **Test all new BFF endpoints with proper request/response validation**
- Comprehensive coverage of all menu, store, order, analytics, and settings endpoints
- Validates request schemas and response structures
- Tests error responses and status codes

✅ **Create database integration tests for new models**
- Tests all Prisma models: Category, MenuItemCategory, Modifier, PriceOverride, AuditEntry
- Tests relationships and constraints
- Tests data validation and business rules

✅ **Test audit trail and telemetry event generation**
- Comprehensive audit trail testing for all operations
- Telemetry event validation
- Feature flag change logging
- Audit log retrieval and filtering

✅ **Requirements 10.2, 10.3, 10.4, 10.5 coverage**
- 10.2: API consistency and proper typing
- 10.3: Telemetry and audit event generation
- 10.4: Database migrations and model validation
- 10.5: Data integrity across operations

## Running the Tests

```bash
# Run all integration tests
pnpm -C apps/bff test:integration

# Run specific test file
pnpm -C apps/bff test:integration --testNamePattern="Menu Items"

# Run with verbose output
pnpm -C apps/bff test:integration --verbose
```

## Test Data Management

- Each test file manages its own test data
- Proper cleanup in `afterAll` hooks
- Isolated test environments to prevent conflicts
- Realistic test data that mirrors production scenarios

## Performance Considerations

- Tests are designed to run efficiently
- Database queries are optimized
- Concurrent operation testing
- Large dataset handling validation
- Memory usage monitoring

This comprehensive test suite ensures the reliability, performance, and correctness of all BFF API endpoints and their integration with the database layer.