-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MenuItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MenuItem" ("active", "id", "name", "price", "storeId") SELECT "active", "id", "name", "price", "storeId" FROM "MenuItem";
DROP TABLE "MenuItem";
ALTER TABLE "new_MenuItem" RENAME TO "MenuItem";
CREATE INDEX "MenuItem_storeId_idx" ON "MenuItem"("storeId");
CREATE INDEX "MenuItem_active_idx" ON "MenuItem"("active");
CREATE INDEX "MenuItem_storeId_active_idx" ON "MenuItem"("storeId", "active");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
