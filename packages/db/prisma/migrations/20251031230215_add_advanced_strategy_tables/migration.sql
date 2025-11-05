-- CreateTable
CREATE TABLE "DemographicCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coordinateHash" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "population" INTEGER,
    "populationGrowthRate" REAL,
    "medianIncome" REAL,
    "nationalMedianIncome" REAL,
    "incomeIndex" REAL,
    "areaClassification" TEXT,
    "dataSource" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OSMPOICache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coordinateHash" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "radius" INTEGER NOT NULL,
    "poiType" TEXT NOT NULL,
    "features" TEXT NOT NULL,
    "featureCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PerformanceCluster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT NOT NULL,
    "centroidLat" REAL NOT NULL,
    "centroidLng" REAL NOT NULL,
    "radius" REAL NOT NULL,
    "storeIds" TEXT NOT NULL,
    "storeCount" INTEGER NOT NULL,
    "averageTurnover" REAL NOT NULL,
    "strength" REAL NOT NULL,
    "demographics" TEXT NOT NULL,
    "anchorPatterns" TEXT NOT NULL,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StrategyScoringCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coordinateHash" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "whiteSpaceScore" REAL,
    "economicScore" REAL,
    "anchorScore" REAL,
    "clusterScore" REAL,
    "strategyBreakdown" TEXT NOT NULL,
    "dominantStrategy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DemographicCache_coordinateHash_key" ON "DemographicCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "DemographicCache_coordinateHash_idx" ON "DemographicCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "DemographicCache_expiresAt_idx" ON "DemographicCache"("expiresAt");

-- CreateIndex
CREATE INDEX "DemographicCache_areaClassification_idx" ON "DemographicCache"("areaClassification");

-- CreateIndex
CREATE UNIQUE INDEX "OSMPOICache_coordinateHash_key" ON "OSMPOICache"("coordinateHash");

-- CreateIndex
CREATE INDEX "OSMPOICache_coordinateHash_poiType_idx" ON "OSMPOICache"("coordinateHash", "poiType");

-- CreateIndex
CREATE INDEX "OSMPOICache_expiresAt_idx" ON "OSMPOICache"("expiresAt");

-- CreateIndex
CREATE INDEX "OSMPOICache_poiType_idx" ON "OSMPOICache"("poiType");

-- CreateIndex
CREATE INDEX "PerformanceCluster_region_idx" ON "PerformanceCluster"("region");

-- CreateIndex
CREATE INDEX "PerformanceCluster_expiresAt_idx" ON "PerformanceCluster"("expiresAt");

-- CreateIndex
CREATE INDEX "PerformanceCluster_strength_idx" ON "PerformanceCluster"("strength");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyScoringCache_coordinateHash_key" ON "StrategyScoringCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "StrategyScoringCache_coordinateHash_idx" ON "StrategyScoringCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "StrategyScoringCache_expiresAt_idx" ON "StrategyScoringCache"("expiresAt");

-- CreateIndex
CREATE INDEX "StrategyScoringCache_dominantStrategy_idx" ON "StrategyScoringCache"("dominantStrategy");
