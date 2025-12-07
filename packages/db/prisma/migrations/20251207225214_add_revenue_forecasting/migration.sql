-- CreateTable
CREATE TABLE "RevenueForecast" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "forecastMonth" INTEGER NOT NULL,
    "forecastYear" INTEGER NOT NULL,
    "predictedRevenue" DOUBLE PRECISION NOT NULL,
    "confidenceLow" DOUBLE PRECISION NOT NULL,
    "confidenceHigh" DOUBLE PRECISION NOT NULL,
    "baselineRevenue" DOUBLE PRECISION NOT NULL,
    "seasonalFactor" DOUBLE PRECISION NOT NULL,
    "trendFactor" DOUBLE PRECISION NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT '1.0',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonalPattern" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "dayOfWeek" INTEGER,
    "seasonalIndex" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sampleSize" INTEGER NOT NULL,

    CONSTRAINT "SeasonalPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastJob" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "region" TEXT,
    "country" TEXT,
    "horizonMonths" INTEGER NOT NULL DEFAULT 12,
    "includeConfidence" BOOLEAN NOT NULL DEFAULT true,
    "regenerate" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "storesProcessed" INTEGER NOT NULL DEFAULT 0,
    "forecastsGenerated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "tokensUsed" INTEGER,
    "aiExplanations" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ForecastJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevenueForecast_storeId_idx" ON "RevenueForecast"("storeId");

-- CreateIndex
CREATE INDEX "RevenueForecast_forecastDate_idx" ON "RevenueForecast"("forecastDate");

-- CreateIndex
CREATE INDEX "RevenueForecast_forecastYear_forecastMonth_idx" ON "RevenueForecast"("forecastYear", "forecastMonth");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueForecast_storeId_forecastDate_key" ON "RevenueForecast"("storeId", "forecastDate");

-- CreateIndex
CREATE INDEX "SeasonalPattern_storeId_idx" ON "SeasonalPattern"("storeId");

-- CreateIndex
CREATE INDEX "SeasonalPattern_month_idx" ON "SeasonalPattern"("month");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonalPattern_storeId_month_key" ON "SeasonalPattern"("storeId", "month");

-- CreateIndex
CREATE INDEX "ForecastJob_status_idx" ON "ForecastJob"("status");

-- CreateIndex
CREATE INDEX "ForecastJob_createdAt_idx" ON "ForecastJob"("createdAt");

-- CreateIndex
CREATE INDEX "ForecastJob_storeId_idx" ON "ForecastJob"("storeId");
