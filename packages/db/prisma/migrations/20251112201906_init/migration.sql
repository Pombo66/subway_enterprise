-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "firstName" TEXT,
    "lastName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "status" TEXT,
    "ownerName" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "annualTurnover" DOUBLE PRECISION,
    "openedAt" TIMESTAMP(3),
    "cityPopulationBand" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "basePrice" DECIMAL(65,30),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT,
    "total" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minSelection" INTEGER NOT NULL DEFAULT 0,
    "maxSelection" INTEGER,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemModifier" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "properties" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemCategory" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modifier" (
    "id" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceAdjustment" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Modifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceOverride" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "diff" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeArea" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'legacy',
    "scopeType" TEXT NOT NULL DEFAULT 'region',
    "customAreaPolygon" TEXT,
    "centroidLat" DOUBLE PRECISION NOT NULL,
    "centroidLng" DOUBLE PRECISION NOT NULL,
    "population" INTEGER NOT NULL,
    "footfallIndex" DOUBLE PRECISION NOT NULL,
    "incomeIndex" DOUBLE PRECISION NOT NULL,
    "competitorIdx" DOUBLE PRECISION NOT NULL,
    "existingStoreDist" DOUBLE PRECISION NOT NULL,
    "demandScore" DOUBLE PRECISION NOT NULL,
    "supplyPenalty" DOUBLE PRECISION NOT NULL,
    "competitionPenalty" DOUBLE PRECISION NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "dataMode" TEXT NOT NULL DEFAULT 'live',
    "modelVersion" TEXT NOT NULL DEFAULT 'v0.1',
    "dataSnapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cacheKey" TEXT NOT NULL DEFAULT '',
    "isLive" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpansionCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "intensity" INTEGER NOT NULL,
    "dataMode" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "suggestions" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpansionCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpansionScenario" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "regionFilter" TEXT NOT NULL,
    "aggressionLevel" INTEGER NOT NULL,
    "populationBias" DOUBLE PRECISION NOT NULL,
    "proximityBias" DOUBLE PRECISION NOT NULL,
    "turnoverBias" DOUBLE PRECISION NOT NULL,
    "minDistanceM" INTEGER NOT NULL,
    "seed" INTEGER NOT NULL,
    "sourceDataVersion" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpansionScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpansionSuggestion" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT NOT NULL,
    "rationaleText" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "urbanDensityIndex" DOUBLE PRECISION,
    "roadDistanceM" INTEGER,
    "buildingDistanceM" INTEGER,
    "landuseType" TEXT,
    "mapboxValidated" BOOLEAN NOT NULL DEFAULT false,
    "aiRationaleCached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpansionSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapboxTilequeryCache" (
    "id" TEXT NOT NULL,
    "coordinateHash" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "landuseType" TEXT,
    "roadDistanceM" INTEGER,
    "buildingDistanceM" INTEGER,
    "urbanDensityIndex" DOUBLE PRECISION,
    "isSuitable" BOOLEAN NOT NULL,
    "rawResponse" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapboxTilequeryCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenAIRationaleCache" (
    "id" TEXT NOT NULL,
    "contextHash" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "rationaleText" TEXT NOT NULL,
    "factors" TEXT,
    "confidence" DOUBLE PRECISION,
    "dataCompleteness" DOUBLE PRECISION,
    "model" TEXT,
    "temperature" DOUBLE PRECISION,
    "tokensUsed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenAIRationaleCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandValidationCache" (
    "id" TEXT NOT NULL,
    "coordinateHash" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "isOnLand" BOOLEAN NOT NULL,
    "distanceToCoastM" DOUBLE PRECISION,
    "landPolygonId" TEXT,
    "rawResponse" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandValidationCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnappingCache" (
    "id" TEXT NOT NULL,
    "coordinateHash" TEXT NOT NULL,
    "originalLat" DOUBLE PRECISION NOT NULL,
    "originalLng" DOUBLE PRECISION NOT NULL,
    "snappedLat" DOUBLE PRECISION,
    "snappedLng" DOUBLE PRECISION,
    "snapTargetType" TEXT,
    "snapDistanceM" DOUBLE PRECISION,
    "roadClass" TEXT,
    "buildingType" TEXT,
    "rawResponse" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SnappingCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemographicCache" (
    "id" TEXT NOT NULL,
    "coordinateHash" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "population" INTEGER,
    "populationGrowthRate" DOUBLE PRECISION,
    "medianIncome" DOUBLE PRECISION,
    "nationalMedianIncome" DOUBLE PRECISION,
    "incomeIndex" DOUBLE PRECISION,
    "areaClassification" TEXT,
    "dataSource" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemographicCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OSMPOICache" (
    "id" TEXT NOT NULL,
    "coordinateHash" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radius" INTEGER NOT NULL,
    "poiType" TEXT NOT NULL,
    "features" TEXT NOT NULL,
    "featureCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OSMPOICache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceCluster" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "centroidLat" DOUBLE PRECISION NOT NULL,
    "centroidLng" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL,
    "storeIds" TEXT NOT NULL,
    "storeCount" INTEGER NOT NULL,
    "averageTurnover" DOUBLE PRECISION NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "demographics" TEXT NOT NULL,
    "anchorPatterns" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyScoringCache" (
    "id" TEXT NOT NULL,
    "coordinateHash" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "whiteSpaceScore" DOUBLE PRECISION,
    "economicScore" DOUBLE PRECISION,
    "anchorScore" DOUBLE PRECISION,
    "clusterScore" DOUBLE PRECISION,
    "strategyBreakdown" TEXT NOT NULL,
    "dominantStrategy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyScoringCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenAIStrategyCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "responseData" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "candidateCount" INTEGER NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenAIStrategyCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIContextAnalysisCache" (
    "id" TEXT NOT NULL,
    "contextHash" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "marketAssessment" TEXT NOT NULL,
    "competitiveAdvantages" TEXT NOT NULL,
    "riskFactors" TEXT NOT NULL,
    "demographicInsights" TEXT NOT NULL,
    "accessibilityAnalysis" TEXT NOT NULL,
    "uniqueSellingPoints" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "model" TEXT,
    "temperature" DOUBLE PRECISION,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIContextAnalysisCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIContextualInsightsCache" (
    "id" TEXT NOT NULL,
    "contextHash" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "primaryStrengths" TEXT NOT NULL,
    "marketOpportunities" TEXT NOT NULL,
    "potentialChallenges" TEXT NOT NULL,
    "recommendedPositioning" TEXT NOT NULL,
    "seasonalConsiderations" TEXT NOT NULL,
    "model" TEXT,
    "temperature" DOUBLE PRECISION,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIContextualInsightsCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRationaleDiversityCache" (
    "id" TEXT NOT NULL,
    "contextHash" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "rationaleText" TEXT NOT NULL,
    "keyFactors" TEXT NOT NULL,
    "uniquenessScore" DOUBLE PRECISION NOT NULL,
    "contextualElements" TEXT NOT NULL,
    "differentiators" TEXT NOT NULL,
    "aiGeneratedInsights" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "dataCompleteness" DOUBLE PRECISION NOT NULL,
    "model" TEXT,
    "temperature" DOUBLE PRECISION,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIRationaleDiversityCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpansionJob" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "userId" TEXT NOT NULL,
    "params" TEXT NOT NULL,
    "result" TEXT,
    "error" TEXT,
    "tokenEstimate" INTEGER,
    "tokensUsed" INTEGER,
    "costEstimate" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpansionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreAnalysisJob" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "userId" TEXT NOT NULL,
    "params" TEXT NOT NULL,
    "result" TEXT,
    "error" TEXT,
    "storesAnalyzed" INTEGER,
    "tokensUsed" INTEGER,
    "actualCost" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreAnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreAnalysis" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "analysisDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationQualityScore" INTEGER NOT NULL,
    "locationRating" TEXT NOT NULL,
    "locationStrengths" TEXT NOT NULL,
    "locationWeaknesses" TEXT NOT NULL,
    "expectedRevenue" DOUBLE PRECISION,
    "actualRevenue" DOUBLE PRECISION,
    "performanceGap" DOUBLE PRECISION,
    "performanceGapPercent" DOUBLE PRECISION,
    "primaryFactor" TEXT NOT NULL,
    "franchiseeRating" TEXT,
    "franchiseeStrengths" TEXT,
    "franchiseeConcerns" TEXT,
    "recommendationPriority" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "estimatedImpact" DOUBLE PRECISION,
    "model" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "analysisVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceDemographicCache" (
    "id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radius" INTEGER NOT NULL,
    "demographicData" TEXT NOT NULL,
    "dataSource" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntelligenceDemographicCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Store_country_idx" ON "Store"("country");

-- CreateIndex
CREATE INDEX "Store_region_idx" ON "Store"("region");

-- CreateIndex
CREATE INDEX "Store_city_idx" ON "Store"("city");

-- CreateIndex
CREATE INDEX "Store_status_idx" ON "Store"("status");

-- CreateIndex
CREATE INDEX "Store_latitude_longitude_idx" ON "Store"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Store_annualTurnover_idx" ON "Store"("annualTurnover");

-- CreateIndex
CREATE INDEX "Store_postcode_idx" ON "Store"("postcode");

-- CreateIndex
CREATE INDEX "MenuItem_storeId_active_createdAt_idx" ON "MenuItem"("storeId", "active", "createdAt");

-- CreateIndex
CREATE INDEX "MenuItem_active_updatedAt_idx" ON "MenuItem"("active", "updatedAt");

-- CreateIndex
CREATE INDEX "MenuItem_name_idx" ON "MenuItem"("name");

-- CreateIndex
CREATE INDEX "MenuItem_storeId_price_idx" ON "MenuItem"("storeId", "price");

-- CreateIndex
CREATE INDEX "Order_storeId_createdAt_idx" ON "Order"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "ModifierGroup_active_idx" ON "ModifierGroup"("active");

-- CreateIndex
CREATE INDEX "MenuItemModifier_menuItemId_idx" ON "MenuItemModifier"("menuItemId");

-- CreateIndex
CREATE INDEX "MenuItemModifier_modifierGroupId_idx" ON "MenuItemModifier"("modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemModifier_menuItemId_modifierGroupId_key" ON "MenuItemModifier"("menuItemId", "modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

-- CreateIndex
CREATE INDEX "TelemetryEvent_eventType_idx" ON "TelemetryEvent"("eventType");

-- CreateIndex
CREATE INDEX "TelemetryEvent_timestamp_idx" ON "TelemetryEvent"("timestamp");

-- CreateIndex
CREATE INDEX "TelemetryEvent_userId_idx" ON "TelemetryEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_name_key" ON "Experiment"("name");

-- CreateIndex
CREATE INDEX "Experiment_status_idx" ON "Experiment"("status");

-- CreateIndex
CREATE INDEX "Experiment_startDate_idx" ON "Experiment"("startDate");

-- CreateIndex
CREATE INDEX "Category_active_sortOrder_idx" ON "Category"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "MenuItemCategory_menuItemId_idx" ON "MenuItemCategory"("menuItemId");

-- CreateIndex
CREATE INDEX "MenuItemCategory_categoryId_idx" ON "MenuItemCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemCategory_menuItemId_categoryId_key" ON "MenuItemCategory"("menuItemId", "categoryId");

-- CreateIndex
CREATE INDEX "Modifier_modifierGroupId_active_idx" ON "Modifier"("modifierGroupId", "active");

-- CreateIndex
CREATE INDEX "PriceOverride_storeId_idx" ON "PriceOverride"("storeId");

-- CreateIndex
CREATE INDEX "PriceOverride_menuItemId_idx" ON "PriceOverride"("menuItemId");

-- CreateIndex
CREATE INDEX "PriceOverride_effectiveFrom_idx" ON "PriceOverride"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PriceOverride_storeId_menuItemId_effectiveFrom_key" ON "PriceOverride"("storeId", "menuItemId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "AuditEntry_entity_entityId_idx" ON "AuditEntry"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditEntry_timestamp_idx" ON "AuditEntry"("timestamp");

-- CreateIndex
CREATE INDEX "AuditEntry_actor_idx" ON "AuditEntry"("actor");

-- CreateIndex
CREATE INDEX "TradeArea_scope_scopeType_finalScore_idx" ON "TradeArea"("scope", "scopeType", "finalScore");

-- CreateIndex
CREATE INDEX "TradeArea_cacheKey_idx" ON "TradeArea"("cacheKey");

-- CreateIndex
CREATE INDEX "TradeArea_dataMode_modelVersion_idx" ON "TradeArea"("dataMode", "modelVersion");

-- CreateIndex
CREATE INDEX "TradeArea_region_finalScore_idx" ON "TradeArea"("region", "finalScore");

-- CreateIndex
CREATE INDEX "TradeArea_confidence_isLive_idx" ON "TradeArea"("confidence", "isLive");

-- CreateIndex
CREATE UNIQUE INDEX "ExpansionCache_cacheKey_key" ON "ExpansionCache"("cacheKey");

-- CreateIndex
CREATE INDEX "ExpansionCache_cacheKey_expiresAt_idx" ON "ExpansionCache"("cacheKey", "expiresAt");

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

-- CreateIndex
CREATE UNIQUE INDEX "DemographicCache_coordinateHash_key" ON "DemographicCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "DemographicCache_coordinateHash_idx" ON "DemographicCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "DemographicCache_expiresAt_idx" ON "DemographicCache"("expiresAt");

-- CreateIndex
CREATE INDEX "DemographicCache_areaClassification_idx" ON "DemographicCache"("areaClassification");

-- CreateIndex
CREATE UNIQUE INDEX "OSMPOICache_coordinateHash_key" ON "OSMPOICache"("coordinateHash");

-- CreateIndex
CREATE INDEX "OSMPOICache_coordinateHash_poiType_idx" ON "OSMPOICache"("coordinateHash", "poiType");

-- CreateIndex
CREATE INDEX "OSMPOICache_expiresAt_idx" ON "OSMPOICache"("expiresAt");

-- CreateIndex
CREATE INDEX "OSMPOICache_poiType_idx" ON "OSMPOICache"("poiType");

-- CreateIndex
CREATE INDEX "PerformanceCluster_region_idx" ON "PerformanceCluster"("region");

-- CreateIndex
CREATE INDEX "PerformanceCluster_expiresAt_idx" ON "PerformanceCluster"("expiresAt");

-- CreateIndex
CREATE INDEX "PerformanceCluster_strength_idx" ON "PerformanceCluster"("strength");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyScoringCache_coordinateHash_key" ON "StrategyScoringCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "StrategyScoringCache_coordinateHash_idx" ON "StrategyScoringCache"("coordinateHash");

-- CreateIndex
CREATE INDEX "StrategyScoringCache_expiresAt_idx" ON "StrategyScoringCache"("expiresAt");

-- CreateIndex
CREATE INDEX "StrategyScoringCache_dominantStrategy_idx" ON "StrategyScoringCache"("dominantStrategy");

-- CreateIndex
CREATE UNIQUE INDEX "OpenAIStrategyCache_cacheKey_key" ON "OpenAIStrategyCache"("cacheKey");

-- CreateIndex
CREATE INDEX "OpenAIStrategyCache_cacheKey_idx" ON "OpenAIStrategyCache"("cacheKey");

-- CreateIndex
CREATE INDEX "OpenAIStrategyCache_createdAt_idx" ON "OpenAIStrategyCache"("createdAt");

-- CreateIndex
CREATE INDEX "OpenAIStrategyCache_model_idx" ON "OpenAIStrategyCache"("model");

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

-- CreateIndex
CREATE INDEX "IntelligenceDemographicCache_lat_lng_radius_idx" ON "IntelligenceDemographicCache"("lat", "lng", "radius");

-- CreateIndex
CREATE INDEX "IntelligenceDemographicCache_expiresAt_idx" ON "IntelligenceDemographicCache"("expiresAt");

-- CreateIndex
CREATE INDEX "IntelligenceDemographicCache_dataSource_idx" ON "IntelligenceDemographicCache"("dataSource");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemModifier" ADD CONSTRAINT "MenuItemModifier_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemModifier" ADD CONSTRAINT "MenuItemModifier_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemCategory" ADD CONSTRAINT "MenuItemCategory_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemCategory" ADD CONSTRAINT "MenuItemCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceOverride" ADD CONSTRAINT "PriceOverride_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceOverride" ADD CONSTRAINT "PriceOverride_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpansionSuggestion" ADD CONSTRAINT "ExpansionSuggestion_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ExpansionScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
