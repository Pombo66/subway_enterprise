-- CreateTable
CREATE TABLE "MapboxTilequeryCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coordinateHash" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "landuseType" TEXT,
    "roadDistanceM" INTEGER,
    "buildingDistanceM" INTEGER,
    "urbanDensityIndex" REAL,
    "isSuitable" BOOLEAN NOT NULL,
    "rawResponse" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OpenAIRationaleCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contextHash" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "rationaleText" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExpansionSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "rationale" TEXT NOT NULL,
    "rationaleText" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "urbanDensityIndex" REAL,
    "roadDistanceM" INTEGER,
    "buildingDistanceM" INTEGER,
    "landuseType" TEXT,
    "mapboxValidated" BOOLEAN NOT NULL DEFAULT false,
    "aiRationaleCached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExpansionSuggestion_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ExpansionScenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ExpansionSuggestion" ("band", "confidence", "createdAt", "id", "lat", "lng", "rationale", "rationaleText", "scenarioId", "status", "updatedAt") SELECT "band", "confidence", "createdAt", "id", "lat", "lng", "rationale", "rationaleText", "scenarioId", "status", "updatedAt" FROM "ExpansionSuggestion";
DROP TABLE "ExpansionSuggestion";
ALTER TABLE "new_ExpansionSuggestion" RENAME TO "ExpansionSuggestion";
CREATE INDEX "ExpansionSuggestion_scenarioId_band_idx" ON "ExpansionSuggestion"("scenarioId", "band");
CREATE INDEX "ExpansionSuggestion_status_idx" ON "ExpansionSuggestion"("status");
CREATE INDEX "ExpansionSuggestion_confidence_idx" ON "ExpansionSuggestion"("confidence");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MapboxTilequeryCache_coordinateHash_key" ON "MapboxTilequeryCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "MapboxTilequeryCache_coordinateHash_idx" ON "MapboxTilequeryCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "MapboxTilequeryCache_expiresAt_idx" ON "MapboxTilequeryCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OpenAIRationaleCache_contextHash_key" ON "OpenAIRationaleCache"("contextHash");

-- CreateIndex
CREATE INDEX "OpenAIRationaleCache_contextHash_idx" ON "OpenAIRationaleCache"("contextHash");

-- CreateIndex
CREATE INDEX "OpenAIRationaleCache_expiresAt_idx" ON "OpenAIRationaleCache"("expiresAt");
