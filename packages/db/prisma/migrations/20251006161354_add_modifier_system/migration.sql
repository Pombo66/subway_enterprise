-- AlterTable
ALTER TABLE "Store" ADD COLUMN "city" TEXT;

-- CreateIndex
CREATE INDEX "Store_city_idx" ON "Store"("city");
