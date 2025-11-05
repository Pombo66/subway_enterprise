-- CreateTable
CREATE TABLE "AIContextAnalysisCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contextHash" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "marketAssessment" TEXT NOT NULL,
    "competitiveAdvantages" TEXT NOT NULL,
    "riskFactors" TEXT NOT NULL,
    "demographicInsights" TEXT NOT NULL,
    "accessibilityAnalysis" TEXT NOT NULL,
    "uniqueSellingPoints" TEXT NOT NULL,
    "confidenceScore" REAL NOT NULL,
    "model" TEXT,
    "temperature" REAL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIContextualInsightsCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contextHash" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "primaryStrengths" TEXT NOT NULL,
    "marketOpportunities" TEXT NOT NULL,
    "potentialChallenges" TEXT NOT NULL,
    "recommendedPositioning" TEXT NOT NULL,
    "seasonalConsiderations" TEXT NOT NULL,
    "model" TEXT,
    "temperature" REAL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIRationaleDiversityCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contextHash" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "rationaleText" TEXT NOT NULL,
    "keyFactors" TEXT NOT NULL,
    "uniquenessScore" REAL NOT NULL,
    "contextualElements" TEXT NOT NULL,
    "differentiators" TEXT NOT NULL,
    "aiGeneratedInsights" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "dataCompleteness" REAL NOT NULL,
    "model" TEXT,
    "temperature" REAL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExpansionJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "userId" TEXT NOT NULL,
    "params" TEXT NOT NULL,
    "result" TEXT,
    "error" TEXT,
    "tokenEstimate" INTEGER,
    "tokensUsed" INTEGER,
    "costEstimate" REAL,
    "actualCost" REAL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AIContextAnalysisCache_contextHash_key" ON "AIContextAnalysisCache"("contextHash");

-- CreateIndex
CREATE INDEX "AIContextAnalysisCache_contextHash_idx" ON "AIContextAnalysisCache"("contextHash");

-- CreateIndex
CREATE INDEX "AIContextAnalysisCache_expiresAt_idx" ON "AIContextAnalysisCache"("expiresAt");

-- CreateIndex
CREATE INDEX "AIContextAnalysisCache_lat_lng_idx" ON "AIContextAnalysisCache"("lat", "lng");

-- CreateIndex
CREATE UNIQUE INDEX "AIContextualInsightsCache_contextHash_key" ON "AIContextualInsightsCache"("contextHash");

-- CreateIndex
CREATE INDEX "AIContextualInsightsCache_contextHash_idx" ON "AIContextualInsightsCache"("contextHash");

-- CreateIndex
CREATE INDEX "AIContextualInsightsCache_expiresAt_idx" ON "AIContextualInsightsCache"("expiresAt");

-- CreateIndex
CREATE INDEX "AIContextualInsightsCache_lat_lng_idx" ON "AIContextualInsightsCache"("lat", "lng");

-- CreateIndex
CREATE UNIQUE INDEX "AIRationaleDiversityCache_contextHash_key" ON "AIRationaleDiversityCache"("contextHash");

-- CreateIndex
CREATE INDEX "AIRationaleDiversityCache_contextHash_idx" ON "AIRationaleDiversityCache"("contextHash");

-- CreateIndex
CREATE INDEX "AIRationaleDiversityCache_expiresAt_idx" ON "AIRationaleDiversityCache"("expiresAt");

-- CreateIndex
CREATE INDEX "AIRationaleDiversityCache_uniquenessScore_idx" ON "AIRationaleDiversityCache"("uniquenessScore");

-- CreateIndex
CREATE INDEX "AIRationaleDiversityCache_lat_lng_idx" ON "AIRationaleDiversityCache"("lat", "lng");

-- CreateIndex
CREATE UNIQUE INDEX "ExpansionJob_idempotencyKey_key" ON "ExpansionJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ExpansionJob_idempotencyKey_idx" ON "ExpansionJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ExpansionJob_status_createdAt_idx" ON "ExpansionJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ExpansionJob_userId_createdAt_idx" ON "ExpansionJob"("userId", "createdAt");
