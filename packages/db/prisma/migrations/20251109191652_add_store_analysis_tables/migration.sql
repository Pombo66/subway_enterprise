-- CreateTable
CREATE TABLE "StoreAnalysisJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "userId" TEXT NOT NULL,
    "params" TEXT NOT NULL,
    "result" TEXT,
    "error" TEXT,
    "storesAnalyzed" INTEGER,
    "tokensUsed" INTEGER,
    "actualCost" REAL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StoreAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "analysisDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationQualityScore" INTEGER NOT NULL,
    "locationRating" TEXT NOT NULL,
    "locationStrengths" TEXT NOT NULL,
    "locationWeaknesses" TEXT NOT NULL,
    "expectedRevenue" REAL,
    "actualRevenue" REAL,
    "performanceGap" REAL,
    "performanceGapPercent" REAL,
    "primaryFactor" TEXT NOT NULL,
    "franchiseeRating" TEXT,
    "franchiseeStrengths" TEXT,
    "franchiseeConcerns" TEXT,
    "recommendationPriority" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "estimatedImpact" REAL,
    "model" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "analysisVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreAnalysisJob_idempotencyKey_key" ON "StoreAnalysisJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StoreAnalysisJob_idempotencyKey_idx" ON "StoreAnalysisJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StoreAnalysisJob_status_createdAt_idx" ON "StoreAnalysisJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StoreAnalysisJob_userId_createdAt_idx" ON "StoreAnalysisJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StoreAnalysis_storeId_analysisDate_idx" ON "StoreAnalysis"("storeId", "analysisDate");

-- CreateIndex
CREATE INDEX "StoreAnalysis_locationQualityScore_idx" ON "StoreAnalysis"("locationQualityScore");

-- CreateIndex
CREATE INDEX "StoreAnalysis_primaryFactor_idx" ON "StoreAnalysis"("primaryFactor");

-- CreateIndex
CREATE INDEX "StoreAnalysis_recommendationPriority_idx" ON "StoreAnalysis"("recommendationPriority");
