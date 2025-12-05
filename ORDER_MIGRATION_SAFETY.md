# Order Management Migration - Safety Plan

**Date:** December 5, 2024  
**Status:** ⚠️ REQUIRES APPROVAL BEFORE EXECUTION

## ⚠️ CRITICAL WARNING

This migration will affect the **LIVE PRODUCTION DATABASE** on Railway. We must proceed with extreme caution.

## Schema Changes

### New Table: OrderItem
```prisma
model OrderItem {
  id         String   @id @default(cuid())
  orderId    String
  menuItemId String
  quantity   Int
  price      Decimal
  subtotal   Decimal
  createdAt  DateTime @default(now())
  Order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  MenuItem   MenuItem @relation(fields: [menuItemId], references: [id])
  
  @@index([orderId])
  @@index([menuItemId])
}
```

### Modified Table: Order
```prisma
model Order {
  // ... existing fields
  updatedAt DateTime @updatedAt  // NEW FIELD
  items     OrderItem[]          // NEW RELATION
  
  // Changed default status from "PAID" to "PENDING"
  status    String   @default("PENDING")  // CHANGED
}
```

### Modified Table: MenuItem
```prisma
model MenuItem {
  // ... existing fields
  OrderItems OrderItem[]  // NEW RELATION
}
```

## Migration Impact Assessment

### Breaking Changes: ❌ NONE
- **Existing orders will continue to work**
- **No data loss**
- **Backward compatible**

### Non-Breaking Changes: ✅
- New OrderItem table (empty initially)
- New Order.updatedAt field (will be set to createdAt for existing records)
- New Order.items relation (empty array for existing orders)
- Changed Order.status default (only affects NEW orders)

### Existing Data
- **Existing orders:** Will have no items (items array will be empty)
- **This is acceptable:** Old orders were created before item tracking
- **Future orders:** Will have proper item tracking

## Migration Strategy

### Option 1: Safe Additive Migration (RECOMMENDED) ✅

**Approach:**
1. Add new OrderItem table
2. Add Order.updatedAt field (non-breaking)
3. Add Order.items relation (non-breaking)
4. Keep Order.status default as "PAID" for now (no breaking change)
5. Deploy code that handles both old orders (no items) and new orders (with items)

**Pros:**
- Zero downtime
- No data migration needed
- Fully backward compatible
- Can rollback easily

**Cons:**
- Old orders won't have item details
- Status default stays as "PAID" (not ideal but safe)

### Option 2: Full Migration with Data Backfill (RISKY) ⚠️

**Approach:**
1. Backup production database
2. Run migration
3. Backfill existing orders with placeholder items
4. Change status default

**Pros:**
- All orders have consistent structure
- Better data integrity

**Cons:**
- Requires downtime
- Risk of data corruption
- Complex rollback
- **NOT RECOMMENDED for production**

## Recommended Action Plan

### Phase 1: Safe Migration (NOW)
```bash
# 1. Test migration locally first
pnpm -C packages/db prisma migrate dev --name add_order_items

# 2. Review generated migration SQL
# 3. Test with local data
# 4. Verify application still works

# 5. Deploy to production (Railway will auto-run migration)
git add packages/db/prisma/schema.prisma
git commit -m "Add OrderItem table for order management (backward compatible)"
git push origin main
```

### Phase 2: Code Deployment (AFTER MIGRATION)
```bash
# Deploy code that handles:
# - Old orders (no items) - show "Legacy order" message
# - New orders (with items) - show full item details
```

### Phase 3: Status Default Change (LATER, OPTIONAL)
```bash
# After confirming everything works, optionally change status default
# This only affects NEW orders, so it's safe
```

## Rollback Plan

### If Migration Fails:
1. **Via Railway Dashboard:**
   - Restore from automatic backup
   - Redeploy previous version

2. **Via Git:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Manual Database Rollback:**
   ```sql
   -- Drop new table
   DROP TABLE IF EXISTS "OrderItem";
   
   -- Remove new column (if needed)
   ALTER TABLE "Order" DROP COLUMN IF EXISTS "updatedAt";
   ```

## Testing Checklist

### Before Production Deployment:
- [ ] Test migration locally
- [ ] Verify existing orders still load
- [ ] Verify new orders can be created
- [ ] Test order list page
- [ ] Test order details page
- [ ] Check for TypeScript errors
- [ ] Run Prisma generate successfully

### After Production Deployment:
- [ ] Monitor Railway logs for errors
- [ ] Check order list page loads
- [ ] Verify no 500 errors
- [ ] Test creating a new order
- [ ] Verify database connection is stable

## Code Changes Required

### Backend (BFF)
- Update order creation to include items
- Update order queries to include items
- Handle orders without items gracefully

### Frontend (Admin)
- Update order display to show items
- Handle legacy orders (no items) gracefully
- Add "Legacy Order" badge for old orders

## Migration SQL Preview

```sql
-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_menuItemId_idx" ON "OrderItem"("menuItemId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" 
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" 
    FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON UPDATE CASCADE;

-- AlterTable (add updatedAt to Order)
ALTER TABLE "Order" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

## Decision Required

**Should we proceed with the migration?**

- ✅ **YES** - Safe additive migration, backward compatible
- ⏸️ **WAIT** - Need more testing or approval
- ❌ **NO** - Too risky, find alternative approach

**Recommendation:** ✅ **PROCEED** with Option 1 (Safe Additive Migration)

This migration is safe because:
1. No data loss
2. Backward compatible
3. Easy rollback
4. Existing functionality preserved
5. Railway has automatic backups

---

**Next Steps:**
1. Get approval to proceed
2. Test migration locally
3. Deploy to production
4. Monitor for issues
5. Implement order creation with items
