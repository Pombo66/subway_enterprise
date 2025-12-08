-- CreateTable
CREATE TABLE "CompetitorPlace" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "postcode" TEXT,
    "googlePlaceId" TEXT,
    "osmId" TEXT,
    "sources" TEXT NOT NULL,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "phoneNumber" TEXT,
    "website" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "priceLevel" INTEGER,
    "threatLevel" TEXT,
    "marketShare" DOUBLE PRECISION,

    CONSTRAINT "CompetitorPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorRefreshJob" (
    "id" TEXT NOT NULL,
    "region" TEXT,
    "country" TEXT,
    "boundingBox" TEXT,
    "sources" TEXT NOT NULL,
    "categories" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "placesFound" INTEGER NOT NULL DEFAULT 0,
    "placesAdded" INTEGER NOT NULL DEFAULT 0,
    "placesUpdated" INTEGER NOT NULL DEFAULT 0,
    "placesDeactivated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "googleApiCalls" INTEGER NOT NULL DEFAULT 0,
    "osmApiCalls" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompetitorRefreshJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitiveAnalysis" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "region" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radiusKm" DOUBLE PRECISION,
    "analysisDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCompetitors" INTEGER NOT NULL,
    "competitorsByBrand" TEXT NOT NULL,
    "competitorsByCategory" TEXT NOT NULL,
    "marketSaturation" DOUBLE PRECISION NOT NULL,
    "competitivePressure" DOUBLE PRECISION NOT NULL,
    "threatLevel" TEXT NOT NULL,
    "nearestCompetitor" TEXT,
    "nearestDistance" DOUBLE PRECISION,
    "estimatedMarketShare" DOUBLE PRECISION,
    "dominantCompetitor" TEXT,
    "aiSummary" TEXT,
    "strategicRecommendations" TEXT,
    "model" TEXT DEFAULT 'gpt-5.1',
    "tokensUsed" INTEGER,

    CONSTRAINT "CompetitiveAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorPlace_googlePlaceId_key" ON "CompetitorPlace"("googlePlaceId");

-- CreateIndex
CREATE INDEX "CompetitorPlace_brand_category_idx" ON "CompetitorPlace"("brand", "category");

-- CreateIndex
CREATE INDEX "CompetitorPlace_latitude_longitude_idx" ON "CompetitorPlace"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "CompetitorPlace_country_city_idx" ON "CompetitorPlace"("country", "city");

-- CreateIndex
CREATE INDEX "CompetitorPlace_isActive_idx" ON "CompetitorPlace"("isActive");

-- CreateIndex
CREATE INDEX "CompetitorPlace_lastVerified_idx" ON "CompetitorPlace"("lastVerified");

-- CreateIndex
CREATE INDEX "CompetitorRefreshJob_status_idx" ON "CompetitorRefreshJob"("status");

-- CreateIndex
CREATE INDEX "CompetitorRefreshJob_createdAt_idx" ON "CompetitorRefreshJob"("createdAt");

-- CreateIndex
CREATE INDEX "CompetitiveAnalysis_storeId_idx" ON "CompetitiveAnalysis"("storeId");

-- CreateIndex
CREATE INDEX "CompetitiveAnalysis_region_idx" ON "CompetitiveAnalysis"("region");

-- CreateIndex
CREATE INDEX "CompetitiveAnalysis_analysisDate_idx" ON "CompetitiveAnalysis"("analysisDate");

-- CreateIndex
CREATE INDEX "CompetitiveAnalysis_threatLevel_idx" ON "CompetitiveAnalysis"("threatLevel");
