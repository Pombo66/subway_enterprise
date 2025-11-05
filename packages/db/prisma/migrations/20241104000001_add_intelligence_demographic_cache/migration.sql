-- CreateTable
CREATE TABLE "IntelligenceDemographicCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "radius" INTEGER NOT NULL,
    "demographicData" TEXT NOT NULL,
    "dataSource" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "IntelligenceDemographicCache_lat_lng_radius_idx" ON "IntelligenceDemographicCache"("lat", "lng", "radius");

-- CreateIndex
CREATE INDEX "IntelligenceDemographicCache_expiresAt_idx" ON "IntelligenceDemographicCache"("expiresAt");

-- CreateIndex
CREATE INDEX "IntelligenceDemographicCache_dataSource_idx" ON "IntelligenceDemographicCache"("dataSource");