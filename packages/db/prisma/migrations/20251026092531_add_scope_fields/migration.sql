-- CreateTable
CREATE TABLE "ExpansionCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "intensity" INTEGER NOT NULL,
    "dataMode" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "suggestions" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TradeArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT NOT NULL,
    "country" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'legacy',
    "scopeType" TEXT NOT NULL DEFAULT 'region',
    "customAreaPolygon" TEXT,
    "centroidLat" REAL NOT NULL,
    "centroidLng" REAL NOT NULL,
    "population" INTEGER NOT NULL,
    "footfallIndex" REAL NOT NULL,
    "incomeIndex" REAL NOT NULL,
    "competitorIdx" REAL NOT NULL,
    "existingStoreDist" REAL NOT NULL,
    "demandScore" REAL NOT NULL,
    "supplyPenalty" REAL NOT NULL,
    "competitionPenalty" REAL NOT NULL,
    "finalScore" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "dataMode" TEXT NOT NULL DEFAULT 'live',
    "modelVersion" TEXT NOT NULL DEFAULT 'v0.1',
    "dataSnapshotDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cacheKey" TEXT NOT NULL DEFAULT '',
    "isLive" BOOLEAN NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TradeArea" ("centroidLat", "centroidLng", "competitionPenalty", "competitorIdx", "confidence", "country", "demandScore", "existingStoreDist", "finalScore", "footfallIndex", "id", "incomeIndex", "isLive", "population", "region", "supplyPenalty", "updatedAt") SELECT "centroidLat", "centroidLng", "competitionPenalty", "competitorIdx", "confidence", "country", "demandScore", "existingStoreDist", "finalScore", "footfallIndex", "id", "incomeIndex", "isLive", "population", "region", "supplyPenalty", "updatedAt" FROM "TradeArea";
DROP TABLE "TradeArea";
ALTER TABLE "new_TradeArea" RENAME TO "TradeArea";
CREATE INDEX "TradeArea_scope_scopeType_finalScore_idx" ON "TradeArea"("scope", "scopeType", "finalScore");
CREATE INDEX "TradeArea_cacheKey_idx" ON "TradeArea"("cacheKey");
CREATE INDEX "TradeArea_dataMode_modelVersion_idx" ON "TradeArea"("dataMode", "modelVersion");
CREATE INDEX "TradeArea_region_finalScore_idx" ON "TradeArea"("region", "finalScore");
CREATE INDEX "TradeArea_confidence_isLive_idx" ON "TradeArea"("confidence", "isLive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ExpansionCache_cacheKey_key" ON "ExpansionCache"("cacheKey");

-- CreateIndex
CREATE INDEX "ExpansionCache_cacheKey_expiresAt_idx" ON "ExpansionCache"("cacheKey", "expiresAt");
