-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "franchiseeId" TEXT;

-- CreateTable
CREATE TABLE "Franchisee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "taxId" TEXT,
    "joinedDate" TIMESTAMP(3) NOT NULL,
    "yearsExperience" INTEGER,
    "previousIndustry" TEXT,
    "totalStores" INTEGER NOT NULL DEFAULT 0,
    "activeStores" INTEGER NOT NULL DEFAULT 0,
    "avgStoreRevenue" DOUBLE PRECISION,
    "totalRevenue" DOUBLE PRECISION,
    "performanceScore" DOUBLE PRECISION,
    "expansionScore" DOUBLE PRECISION,
    "riskScore" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Franchisee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FranchiseeAnalysis" (
    "id" TEXT NOT NULL,
    "franchiseeId" TEXT NOT NULL,
    "analysisDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avgRevenuePerStore" DOUBLE PRECISION NOT NULL,
    "revenueGrowthRate" DOUBLE PRECISION NOT NULL,
    "profitabilityIndex" DOUBLE PRECISION NOT NULL,
    "avgStoreAge" DOUBLE PRECISION NOT NULL,
    "storeOpeningRate" DOUBLE PRECISION NOT NULL,
    "storeClosureRate" DOUBLE PRECISION NOT NULL,
    "customerSatisfaction" DOUBLE PRECISION,
    "operationalCompliance" DOUBLE PRECISION,
    "brandStandards" DOUBLE PRECISION,
    "peerRanking" INTEGER,
    "industryRanking" INTEGER,
    "expansionReady" BOOLEAN NOT NULL DEFAULT false,
    "recommendedStores" INTEGER,
    "expansionRationale" TEXT,
    "churnRisk" TEXT NOT NULL,
    "riskFactors" TEXT NOT NULL,
    "aiSummary" TEXT,
    "recommendations" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-5-mini',
    "tokensUsed" INTEGER,

    CONSTRAINT "FranchiseeAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Franchisee_performanceScore_idx" ON "Franchisee"("performanceScore");

-- CreateIndex
CREATE INDEX "Franchisee_expansionScore_idx" ON "Franchisee"("expansionScore");

-- CreateIndex
CREATE INDEX "Franchisee_status_idx" ON "Franchisee"("status");

-- CreateIndex
CREATE INDEX "Franchisee_totalStores_idx" ON "Franchisee"("totalStores");

-- CreateIndex
CREATE INDEX "FranchiseeAnalysis_franchiseeId_analysisDate_idx" ON "FranchiseeAnalysis"("franchiseeId", "analysisDate");

-- CreateIndex
CREATE INDEX "FranchiseeAnalysis_expansionReady_idx" ON "FranchiseeAnalysis"("expansionReady");

-- CreateIndex
CREATE INDEX "FranchiseeAnalysis_churnRisk_idx" ON "FranchiseeAnalysis"("churnRisk");

-- CreateIndex
CREATE INDEX "Store_franchiseeId_idx" ON "Store"("franchiseeId");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchiseeAnalysis" ADD CONSTRAINT "FranchiseeAnalysis_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
