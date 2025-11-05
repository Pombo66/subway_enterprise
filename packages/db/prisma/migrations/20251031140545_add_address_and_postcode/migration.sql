-- AlterTable
ALTER TABLE "Store" ADD COLUMN "address" TEXT;
ALTER TABLE "Store" ADD COLUMN "postcode" TEXT;

-- CreateIndex
CREATE INDEX "Store_postcode_idx" ON "Store"("postcode");
