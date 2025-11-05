-- CreateTable
CREATE TABLE "OpenAIStrategyCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheKey" TEXT NOT NULL,
    "responseData" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "temperature" REAL NOT NULL,
    "candidateCount" INTEGER NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "OpenAIStrategyCache_cacheKey_key" ON "OpenAIStrategyCache"("cacheKey");

-- CreateIndex
CREATE INDEX "OpenAIStrategyCache_cacheKey_idx" ON "OpenAIStrategyCache"("cacheKey");

-- CreateIndex
CREATE INDEX "OpenAIStrategyCache_createdAt_idx" ON "OpenAIStrategyCache"("createdAt");

-- CreateIndex
CREATE INDEX "OpenAIStrategyCache_model_idx" ON "OpenAIStrategyCache"("model");
