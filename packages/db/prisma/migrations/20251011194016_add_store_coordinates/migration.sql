-- AlterTable
ALTER TABLE "Store" ADD COLUMN "latitude" REAL;
ALTER TABLE "Store" ADD COLUMN "longitude" REAL;

-- CreateIndex
CREATE INDEX "Store_latitude_longitude_idx" ON "Store"("latitude", "longitude");
