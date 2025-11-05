-- AlterTable
ALTER TABLE "OpenAIRationaleCache" ADD COLUMN "confidence" REAL;
ALTER TABLE "OpenAIRationaleCache" ADD COLUMN "dataCompleteness" REAL;
ALTER TABLE "OpenAIRationaleCache" ADD COLUMN "factors" TEXT;
ALTER TABLE "OpenAIRationaleCache" ADD COLUMN "model" TEXT;
ALTER TABLE "OpenAIRationaleCache" ADD COLUMN "temperature" REAL;

-- CreateTable
CREATE TABLE "LandValidationCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coordinateHash" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "isOnLand" BOOLEAN NOT NULL,
    "distanceToCoastM" REAL,
    "landPolygonId" TEXT,
    "rawResponse" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SnappingCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coordinateHash" TEXT NOT NULL,
    "originalLat" REAL NOT NULL,
    "originalLng" REAL NOT NULL,
    "snappedLat" REAL,
    "snappedLng" REAL,
    "snapTargetType" TEXT,
    "snapDistanceM" REAL,
    "roadClass" TEXT,
    "buildingType" TEXT,
    "rawResponse" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LandValidationCache_coordinateHash_key" ON "LandValidationCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "LandValidationCache_coordinateHash_idx" ON "LandValidationCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "LandValidationCache_expiresAt_idx" ON "LandValidationCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SnappingCache_coordinateHash_key" ON "SnappingCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "SnappingCache_coordinateHash_idx" ON "SnappingCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "SnappingCache_expiresAt_idx" ON "SnappingCache"("expiresAt");
