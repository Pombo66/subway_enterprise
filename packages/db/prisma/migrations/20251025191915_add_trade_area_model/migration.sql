-- CreateTable
CREATE TABLE "TradeArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT NOT NULL,
    "country" TEXT,
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
    "isLive" BOOLEAN NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "TradeArea_region_finalScore_idx" ON "TradeArea"("region", "finalScore");

-- CreateIndex
CREATE INDEX "TradeArea_confidence_isLive_idx" ON "TradeArea"("confidence", "isLive");
