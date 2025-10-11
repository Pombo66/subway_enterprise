-- DropIndex
DROP INDEX "MenuItem_storeId_active_idx";

-- DropIndex
DROP INDEX "MenuItem_active_idx";

-- DropIndex
DROP INDEX "MenuItem_storeId_idx";

-- CreateIndex
CREATE INDEX "MenuItem_storeId_active_createdAt_idx" ON "MenuItem"("storeId", "active", "createdAt");

-- CreateIndex
CREATE INDEX "MenuItem_active_updatedAt_idx" ON "MenuItem"("active", "updatedAt");

-- CreateIndex
CREATE INDEX "MenuItem_name_idx" ON "MenuItem"("name");

-- CreateIndex
CREATE INDEX "MenuItem_storeId_price_idx" ON "MenuItem"("storeId", "price");

-- CreateIndex
CREATE INDEX "Order_storeId_createdAt_idx" ON "Order"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
