-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MenuItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "userId" TEXT,
    "total" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModifierGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MenuItemModifier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuItemId" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MenuItemModifier_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuItemModifier_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TelemetryEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "properties" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Store_country_idx" ON "Store"("country");

-- CreateIndex
CREATE INDEX "Store_region_idx" ON "Store"("region");

-- CreateIndex
CREATE INDEX "MenuItem_storeId_idx" ON "MenuItem"("storeId");

-- CreateIndex
CREATE INDEX "MenuItem_active_idx" ON "MenuItem"("active");

-- CreateIndex
CREATE INDEX "MenuItem_storeId_active_idx" ON "MenuItem"("storeId", "active");

-- CreateIndex
CREATE INDEX "ModifierGroup_active_idx" ON "ModifierGroup"("active");

-- CreateIndex
CREATE INDEX "MenuItemModifier_menuItemId_idx" ON "MenuItemModifier"("menuItemId");

-- CreateIndex
CREATE INDEX "MenuItemModifier_modifierGroupId_idx" ON "MenuItemModifier"("modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemModifier_menuItemId_modifierGroupId_key" ON "MenuItemModifier"("menuItemId", "modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

-- CreateIndex
CREATE INDEX "TelemetryEvent_eventType_idx" ON "TelemetryEvent"("eventType");

-- CreateIndex
CREATE INDEX "TelemetryEvent_timestamp_idx" ON "TelemetryEvent"("timestamp");

-- CreateIndex
CREATE INDEX "TelemetryEvent_userId_idx" ON "TelemetryEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_name_key" ON "Experiment"("name");

-- CreateIndex
CREATE INDEX "Experiment_status_idx" ON "Experiment"("status");

-- CreateIndex
CREATE INDEX "Experiment_startDate_idx" ON "Experiment"("startDate");
