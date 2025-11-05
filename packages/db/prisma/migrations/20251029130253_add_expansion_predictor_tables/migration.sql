-- AlterTable
ALTER TABLE "Store" ADD COLUMN "annualTurnover" REAL;
ALTER TABLE "Store" ADD COLUMN "cityPopulationBand" TEXT;
ALTER TABLE "Store" ADD COLUMN "openedAt" DATETIME;
ALTER TABLE "Store" ADD COLUMN "ownerName" TEXT;
ALTER TABLE "Store" ADD COLUMN "status" TEXT;

-- CreateTable
CREATE TABLE "ExpansionScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "regionFilter" TEXT NOT NULL,
    "aggressionLevel" INTEGER NOT NULL,
    "populationBias" REAL NOT NULL,
    "proximityBias" REAL NOT NULL,
    "turnoverBias" REAL NOT NULL,
    "minDistanceM" INTEGER NOT NULL,
    "seed" INTEGER NOT NULL,
    "sourceDataVersion" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExpansionSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "rationale" TEXT NOT NULL,
    "rationaleText" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExpansionSuggestion_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ExpansionScenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ExpansionScenario_createdBy_createdAt_idx" ON "ExpansionScenario"("createdBy", "createdAt");

-- CreateIndex
CREATE INDEX "ExpansionScenario_regionFilter_idx" ON "ExpansionScenario"("regionFilter");

-- CreateIndex
CREATE INDEX "ExpansionSuggestion_scenarioId_band_idx" ON "ExpansionSuggestion"("scenarioId", "band");

-- CreateIndex
CREATE INDEX "ExpansionSuggestion_status_idx" ON "ExpansionSuggestion"("status");

-- CreateIndex
CREATE INDEX "ExpansionSuggestion_confidence_idx" ON "ExpansionSuggestion"("confidence");

-- CreateIndex
CREATE INDEX "Store_status_idx" ON "Store"("status");

-- CreateIndex
CREATE INDEX "Store_annualTurnover_idx" ON "Store"("annualTurnover");
