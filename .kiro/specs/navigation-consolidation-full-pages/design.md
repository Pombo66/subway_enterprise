# Design Document

## Overview

This design consolidates the Subway Enterprise admin dashboard navigation from 10 top-level items to 6 organized sections with nested functionality. The design preserves all existing functionality while creating a cleaner information architecture through nested routes and tabs. The dashboard remains completely unchanged, and all existing design patterns, components, and styling are preserved.

## Architecture

### Current State Analysis

The current implementation has:
- 10 top-level navigation items in the sidebar
- Individual pages for categories, items, pricing, users, and audit
- Existing dashboard with 6 KPI tiles
- Established design patterns using CSS classes and component structure
- Working API endpoints in the BFF layer
- Prisma schema with core models

### Target State

The new architecture will have:
- 6 top-level navigation sections: Dashboard, Menu, Orders, Stores, Analytics, Settings
- Nested routes with tab-based navigation within sections
- Preserved dashboard implementation
- Enhanced pages with full CRUD functionality
- Consistent API patterns and data models

## Components and Interfaces

### Frontend Architecture

#### Navigation Structure

**Sidebar Component Updates**
- Reduce navigation items from 10 to 6
- Maintain existing `sb-link`, `sb-ico`, `sb-txt` CSS classes
- Preserve current icon SVG patterns and styling
- Update href attributes to point to new top-level routes

**New Route Structure**
```
/dashboard (unchanged)
/menu
  ├── /menu/items
  ├── /menu/categories  
  ├── /menu/modifiers
  └── /menu/pricing
/orders
/stores
  └── /stores/[id]
      └── /stores/[id]/pricing
/analytics
/settings
  ├── /settings/users
  ├── /settings/audit
  └── /settings/flags
```

**Redirect Implementation**
- Next.js middleware or next.config.js redirects
- Permanent redirects (301) for SEO and bookmarks
- Mapping: `/categories` → `/menu/categories`, `/items` → `/menu/items`, etc.

#### Page Components

**Tab Navigation Component**
```typescript
interface TabNavigationProps {
  tabs: Array<{
    key: string;
    label: string;
    href: string;
    icon?: ReactNode;
  }>;
  activeTab: string;
}
```

**Menu Section Pages**
- **Items Page**: Table with search, filters, pagination using existing table patterns
- **Categories Page**: CRUD interface with drag-and-drop reordering
- **Modifiers Page**: Hierarchical management of groups and individual modifiers
- **Pricing Page**: Base price editing with override comparison

**Store Section Pages**
- **Store List**: Filterable table using existing patterns
- **Store Details**: Information display with pricing overrides tab
- **Pricing Overrides**: Per-store price management with base price comparison

**Settings Section Pages**
- **Users & Roles**: Basic CRUD interface for user management
- **Audit Log**: Searchable table of system events
- **Feature Flags**: Toggle interface for system flags

#### Shared Components

**Preserve Existing Components**
- `KpiTile` component with current props structure
- `TelemetryErrorBoundary` for error handling
- `ToastProvider` for notifications
- Existing form components and validation patterns

**Design Token Preservation**
- Maintain current CSS class patterns (`s-wrap`, `sb-*`, etc.)
- Preserve existing spacing and typography
- Keep current color scheme and icon sizing
- Maintain responsive behavior patterns

### Backend Architecture

#### API Endpoint Structure

**Menu Endpoints**
```typescript
// Items
GET /menu/items?search=&scope=&page=&limit=
POST /menu/items
PATCH /menu/items/:id
DELETE /menu/items/:id

// Categories  
GET /menu/categories
POST /menu/categories
PATCH /menu/categories/:id
DELETE /menu/categories/:id
PUT /menu/categories/reorder

// Modifiers
GET /menu/modifier-groups
POST /menu/modifier-groups
PATCH /menu/modifier-groups/:id
DELETE /menu/modifier-groups/:id
POST /menu/modifier-groups/:groupId/modifiers
DELETE /menu/modifier-groups/:groupId/modifiers/:modifierId

// Item-Modifier Relationships
GET /menu/items/:id/modifiers
POST /menu/items/:id/modifier-groups
DELETE /menu/items/:id/modifier-groups/:linkId

// Pricing
GET /menu/pricing
PATCH /menu/pricing/:itemId
```

**Store Endpoints**
```typescript
GET /stores?scope=&search=
GET /stores/:id
GET /stores/:id/pricing-overrides
POST /stores/:id/pricing-overrides
DELETE /stores/:id/pricing-overrides/:itemId
```

**Settings Endpoints**
```typescript
GET /settings/users
POST /settings/users
PATCH /settings/users/:id
DELETE /settings/users/:id
GET /settings/audit?search=&entity=&action=
GET /settings/flags
PATCH /settings/flags/:key
```

#### Service Layer Architecture

**Menu Service**
- Item CRUD operations with validation
- Category management with ordering
- Modifier group and modifier management
- Pricing operations with audit trails

**Store Service**
- Store information management
- Pricing override operations
- Base price comparison logic

**Settings Service**
- User management operations
- Audit log retrieval and filtering
- Feature flag management

## Data Models

### Database Schema Extensions

**New Models Required**
```prisma
model Category {
  id          String   @id @default(cuid())
  name        String
  description String?
  sortOrder   Int      @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  items       MenuItemCategory[]
}

model MenuItemCategory {
  id         String   @id @default(cuid())
  menuItemId String
  categoryId String
  menuItem   MenuItem @relation(fields: [menuItemId], references: [id])
  category   Category @relation(fields: [categoryId], references: [id])
  
  @@unique([menuItemId, categoryId])
}

model Modifier {
  id              String        @id @default(cuid())
  modifierGroupId String
  name            String
  priceAdjustment Decimal       @default(0)
  active          Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  modifierGroup   ModifierGroup @relation(fields: [modifierGroupId], references: [id])
}

model PriceOverride {
  id            String    @id @default(cuid())
  storeId       String
  menuItemId    String
  price         Decimal
  effectiveFrom DateTime  @default(now())
  effectiveTo   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  store         Store     @relation(fields: [storeId], references: [id])
  menuItem      MenuItem  @relation(fields: [menuItemId], references: [id])
  
  @@unique([storeId, menuItemId, effectiveFrom])
}

model AuditEntry {
  id        String   @id @default(cuid())
  actor     String
  entity    String
  entityId  String
  action    String
  diff      String?
  timestamp DateTime @default(now())
  
  @@index([entity, entityId])
  @@index([timestamp])
}
```

**Enhanced Existing Models**
- Add `basePrice` field to MenuItem for global pricing
- Add `minSelection`, `maxSelection`, `required` fields to ModifierGroup
- Extend User model with proper role management

### Data Relationships

**Menu Hierarchy**
- Categories contain multiple MenuItems (many-to-many)
- MenuItems can belong to multiple Categories
- ModifierGroups contain multiple Modifiers (one-to-many)
- MenuItems can have multiple ModifierGroups (many-to-many with rules)

**Pricing Structure**
- MenuItems have base prices (global)
- Stores can have PriceOverrides for specific MenuItems
- Override prices take precedence over base prices
- Historical pricing through effectiveFrom/effectiveTo dates

**Audit Trail**
- All write operations generate AuditEntry records
- Telemetry events for user interactions
- Feature flag changes tracked in audit log

## Error Handling

### Frontend Error Handling

**Preserve Existing Patterns**
- Continue using `TelemetryErrorBoundary` for component-level errors
- Maintain current toast notification system for user feedback
- Preserve existing API error handling in `lib/api.ts`

**Enhanced Error States**
- Empty state components for tables with no data
- Loading states for async operations
- Validation error display for forms
- Network error recovery mechanisms

### Backend Error Handling

**Consistent Error Responses**
```typescript
interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
  timestamp: string;
}
```

**Error Categories**
- Validation errors (400) with field-specific messages
- Authorization errors (401/403) with clear messaging
- Not found errors (404) for missing resources
- Server errors (500) with sanitized messages for production

## Testing Strategy

### Frontend Testing

**Component Testing**
- Unit tests for new tab navigation components
- Integration tests for CRUD operations
- Visual regression tests for design consistency
- Accessibility testing for keyboard navigation

**E2E Testing**
- Navigation flow testing (old URLs redirect correctly)
- Complete CRUD workflows for each section
- Cross-browser compatibility testing
- Mobile responsiveness testing

### Backend Testing

**API Testing**
- Unit tests for service layer methods
- Integration tests for database operations
- Contract testing for API endpoints
- Performance testing for data-heavy operations

**Data Testing**
- Migration testing for schema changes
- Seed data validation
- Audit trail verification
- Feature flag behavior testing

### Testing Tools

**Existing Tools**
- Continue using current testing framework setup
- Maintain existing test utilities and helpers
- Preserve current CI/CD pipeline integration

**New Test Requirements**
- Playwright tests for navigation consolidation
- API contract tests for new endpoints
- Database migration tests for schema changes
- Design consistency validation tests

## Implementation Phases

### Phase 1: Navigation Structure
- Update Sidebar component with new navigation items
- Implement redirect configuration
- Create basic page shells for new routes
- Add tab navigation components

### Phase 2: Menu Section Implementation
- Implement Items page with full CRUD functionality
- Create Categories page with drag-and-drop
- Build Modifiers management interface
- Develop Pricing management with override comparison

### Phase 3: Store and Settings Implementation
- Build Store list and details pages
- Implement Pricing Overrides functionality
- Create Settings pages (Users, Audit, Flags)
- Add comprehensive search and filtering

### Phase 4: Backend API Alignment
- Implement new API endpoints
- Add proper validation and error handling
- Integrate audit trail for all operations
- Optimize database queries and indexing

### Phase 5: Testing and Polish
- Comprehensive testing across all new functionality
- Performance optimization
- Accessibility improvements
- Documentation updates

This design maintains the existing visual and functional patterns while providing the requested navigation consolidation and full page implementations. The dashboard remains completely unchanged, and all current design tokens and component patterns are preserved throughout the new implementation.