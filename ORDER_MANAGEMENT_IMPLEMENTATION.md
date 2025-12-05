# Order Management System - Implementation Plan

**Date:** December 5, 2024  
**Status:** 🚧 In Progress

## Current State Assessment

### What Exists ✅
- **Database Schema:** Order table with relationships to Store and User
- **Backend API:** Basic GET endpoints for orders (`/orders/recent`, `/orders/:id`)
- **Frontend Page:** Orders list view with filtering, search, and pagination
- **UI Components:** Order details modal, status badges, filters

### What's Missing ❌
- Order creation workflow
- Order status management (update status)
- Order items/line items (currently just total)
- Payment tracking
- Order analytics
- Bulk operations
- Export functionality

## Implementation Phases

### Phase 1: Core Order Management (Priority: HIGH) 🔴

#### 1.1 Order Creation API
**File:** `apps/bff/src/routes/orders.ts`

**New Endpoints:**
```typescript
POST /orders/create
- Create new order with items
- Validate store exists
- Calculate total
- Set initial status

PATCH /orders/:id/status
- Update order status
- Validate status transitions
- Track status history
```

#### 1.2 Order Items Schema Enhancement
**File:** `packages/db/prisma/schema.prisma`

**Add OrderItem model:**
```prisma
model OrderItem {
  id          String   @id @default(cuid())
  orderId     String
  menuItemId  String
  quantity    Int
  price       Decimal
  subtotal    Decimal
  createdAt   DateTime @default(now())
  
  Order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  MenuItem    MenuItem @relation(fields: [menuItemId], references: [id])
  
  @@index([orderId])
  @@index([menuItemId])
}

// Update Order model to include items
model Order {
  // ... existing fields
  items       OrderItem[]
}
```

#### 1.3 Order Creation UI
**File:** `apps/admin/app/orders/new/page.tsx`

**Features:**
- Store selection
- Menu item selection
- Quantity input
- Real-time total calculation
- Customer selection/input
- Submit order

### Phase 2: Order Status Management (Priority: HIGH) 🔴

#### 2.1 Status Update API
**Implementation:**
- Validate status transitions (PENDING → PREPARING → READY → COMPLETED)
- Prevent invalid transitions
- Track status change history
- Emit telemetry events

#### 2.2 Status Update UI
**Features:**
- Quick status change buttons in order list
- Status change in order details
- Status history timeline
- Confirmation for critical changes (CANCELLED)

### Phase 3: Order Analytics (Priority: MEDIUM) 🟡

#### 3.1 Analytics API
**New Endpoints:**
```typescript
GET /orders/analytics/summary
- Total orders
- Total revenue
- Average order value
- Orders by status

GET /orders/analytics/trends
- Orders over time
- Revenue trends
- Peak hours
- Top stores
```

#### 3.2 Analytics Dashboard
**File:** `apps/admin/app/orders/analytics/page.tsx`

**Features:**
- Revenue charts
- Order volume trends
- Status distribution
- Store performance
- Time-based analysis

### Phase 4: Enhanced Features (Priority: LOW) 🟢

#### 4.1 Bulk Operations
- Bulk status updates
- Bulk export
- Bulk delete (with confirmation)

#### 4.2 Export Functionality
- CSV export
- PDF receipts
- Date range export
- Filtered export

#### 4.3 Order Notes
- Add notes to orders
- Internal comments
- Customer instructions

## Database Migration Required

### Migration: Add OrderItem table

```prisma
// Run this migration
pnpm -C packages/db prisma migrate dev --name add_order_items
```

**Changes:**
1. Create OrderItem table
2. Add relationship to Order
3. Add relationship to MenuItem
4. Add indexes for performance

## API Endpoints Summary

### Existing ✅
- `GET /orders/recent` - List orders with filters
- `GET /orders/:id` - Get single order

### New (Phase 1) 🔴
- `POST /orders/create` - Create new order
- `PATCH /orders/:id/status` - Update order status
- `GET /orders/:id/items` - Get order items

### New (Phase 2) 🟡
- `GET /orders/analytics/summary` - Order analytics
- `GET /orders/analytics/trends` - Trend data
- `POST /orders/export` - Export orders

## UI Pages Summary

### Existing ✅
- `/orders` - Order list with filters

### New (Phase 1) 🔴
- `/orders/new` - Create new order
- `/orders/[id]` - Order details page (full page, not modal)

### New (Phase 2) 🟡
- `/orders/analytics` - Analytics dashboard

## Testing Checklist

### Manual Testing
- [ ] Create order with single item
- [ ] Create order with multiple items
- [ ] Update order status (all transitions)
- [ ] Cancel order
- [ ] View order details
- [ ] Filter orders by status
- [ ] Filter orders by date range
- [ ] Search orders
- [ ] Pagination works correctly
- [ ] Export orders to CSV

### Edge Cases
- [ ] Create order with invalid store
- [ ] Create order with invalid menu item
- [ ] Update status with invalid transition
- [ ] Handle concurrent status updates
- [ ] Handle deleted menu items
- [ ] Handle deleted stores

## Implementation Order

1. **Database Migration** (30 min)
   - Add OrderItem model
   - Run migration
   - Test schema

2. **Order Creation API** (2 hours)
   - POST /orders/create endpoint
   - Validation logic
   - Total calculation
   - Error handling

3. **Order Creation UI** (3 hours)
   - New order page
   - Store selection
   - Menu item selection
   - Form validation
   - Submit logic

4. **Status Management API** (1 hour)
   - PATCH /orders/:id/status endpoint
   - Status transition validation
   - Telemetry

5. **Status Management UI** (2 hours)
   - Status update buttons
   - Confirmation dialogs
   - Optimistic updates
   - Error handling

6. **Order Details Page** (2 hours)
   - Full page view
   - Order items list
   - Status history
   - Actions

7. **Analytics** (4 hours)
   - Analytics API endpoints
   - Dashboard page
   - Charts and visualizations
   - Export functionality

**Total Estimated Time:** 14-16 hours (2 days)

## Success Criteria

✅ Users can create new orders  
✅ Users can update order status  
✅ Users can view order details with items  
✅ Users can filter and search orders  
✅ Users can view order analytics  
✅ System validates all operations  
✅ All changes are tracked in telemetry  
✅ UI is responsive and intuitive  

## Production Deployment Notes

- **Database Migration:** Required before deploying code changes
- **Backward Compatibility:** Existing orders will work (no items initially)
- **Rollback Plan:** Can revert code, but migration rollback is complex
- **Testing:** Test thoroughly in development before production

## Next Steps

1. Start with database migration
2. Implement order creation API
3. Build order creation UI
4. Add status management
5. Enhance with analytics
6. Polish and test

---

**Priority:** HIGH - Core business functionality  
**Risk Level:** Medium (requires database migration)  
**Dependencies:** None (can start immediately)
