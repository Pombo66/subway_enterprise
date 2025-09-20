-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "country" TEXT,
ADD COLUMN     "region" TEXT;

-- CreateIndex
CREATE INDEX "Store_country_idx" ON "Store"("country");

-- CreateIndex
CREATE INDEX "Store_region_idx" ON "Store"("region");
