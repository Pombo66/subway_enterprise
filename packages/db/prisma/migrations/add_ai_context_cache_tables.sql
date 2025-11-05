-- Migration: Add AI Context Analysis Cache Tables
-- This migration adds tables for caching AI-generated context analysis and rationale diversity

-- AI Context Analysis Cache
-- Stores AI-generated demographic, competition, and accessibility analysis
CREATE TABLE IF NOT EXISTS "AIContextAnalysisCache" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "contextHash" TEXT NOT NULL UNIQUE,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "marketAssessment" TEXT NOT NULL,
    "competitiveAdvantages" TEXT NOT NULL, -- JSON array
    "riskFactors" TEXT NOT NULL, -- JSON array
    "demographicInsights" TEXT NOT NULL,
    "accessibilityAnalysis" TEXT NOT NULL,
    "uniqueSellingPoints" TEXT NOT NULL, -- JSON array
    "confidenceScore" REAL NOT NULL,
    "model" TEXT, -- e.g., "gpt-4o-mini"
    "temperature" REAL, -- e.g., 0.3
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "AIContextAnalysisCache_contextHash_idx" ON "AIContextAnalysisCache"("contextHash");
CREATE INDEX IF NOT EXISTS "AIContextAnalysisCache_expiresAt_idx" ON "AIContextAnalysisCache"("expiresAt");
CREATE INDEX IF NOT EXISTS "AIContextAnalysisCache_lat_lng_idx" ON "AIContextAnalysisCache"("lat", "lng");

-- AI Contextual Insights Cache
-- Stores AI-generated competitive insights and positioning recommendations
CREATE TABLE IF NOT EXISTS "AIContextualInsightsCache" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "contextHash" TEXT NOT NULL UNIQUE,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "primaryStrengths" TEXT NOT NULL, -- JSON array
    "marketOpportunities" TEXT NOT NULL, -- JSON array
    "potentialChallenges" TEXT NOT NULL, -- JSON array
    "recommendedPositioning" TEXT NOT NULL,
    "seasonalConsiderations" TEXT NOT NULL, -- JSON array
    "model" TEXT, -- e.g., "gpt-4o-mini"
    "temperature" REAL, -- e.g., 0.3
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "AIContextualInsightsCache_contextHash_idx" ON "AIContextualInsightsCache"("contextHash");
CREATE INDEX IF NOT EXISTS "AIContextualInsightsCache_expiresAt_idx" ON "AIContextualInsightsCache"("expiresAt");
CREATE INDEX IF NOT EXISTS "AIContextualInsightsCache_lat_lng_idx" ON "AIContextualInsightsCache"("lat", "lng");

-- AI Rationale Diversity Cache
-- Stores AI-generated unique rationales with diversity tracking
CREATE TABLE IF NOT EXISTS "AIRationaleDiversityCache" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "contextHash" TEXT NOT NULL UNIQUE,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "rationaleText" TEXT NOT NULL,
    "keyFactors" TEXT NOT NULL, -- JSON: { population, proximity, turnover }
    "uniquenessScore" REAL NOT NULL,
    "contextualElements" TEXT NOT NULL, -- JSON array
    "differentiators" TEXT NOT NULL, -- JSON array
    "aiGeneratedInsights" TEXT NOT NULL, -- JSON array
    "confidence" REAL NOT NULL,
    "dataCompleteness" REAL NOT NULL,
    "model" TEXT, -- e.g., "gpt-4o-mini"
    "temperature" REAL, -- e.g., 0.2
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "AIRationaleDiversityCache_contextHash_idx" ON "AIRationaleDiversityCache"("contextHash");
CREATE INDEX IF NOT EXISTS "AIRationaleDiversityCache_expiresAt_idx" ON "AIRationaleDiversityCache"("expiresAt");
CREATE INDEX IF NOT EXISTS "AIRationaleDiversityCache_uniquenessScore_idx" ON "AIRationaleDiversityCache"("uniquenessScore");
CREATE INDEX IF NOT EXISTS "AIRationaleDiversityCache_lat_lng_idx" ON "AIRationaleDiversityCache"("lat", "lng");