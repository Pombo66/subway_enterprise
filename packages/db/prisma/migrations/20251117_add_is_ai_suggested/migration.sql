-- AlterTable
ALTER TABLE "Store" ADD COLUMN "isAISuggested" BOOLEAN DEFAULT false;

-- CreateIndex
CREATE INDEX "Store_isAISuggested_idx" ON "Store"("isAISuggested");
