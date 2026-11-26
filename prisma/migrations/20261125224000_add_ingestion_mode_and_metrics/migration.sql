-- CreateEnum
CREATE TYPE "IngestionMode" AS ENUM ('MULTIMODAL', 'TEXT_ONLY');

-- AlterTable
ALTER TABLE "CatalogIngestionJob"
ADD COLUMN "mode" "IngestionMode" NOT NULL DEFAULT 'MULTIMODAL',
ADD COLUMN "metrics" JSONB;

-- CreateIndex
CREATE INDEX "CatalogIngestionJob_mode_idx" ON "CatalogIngestionJob"("mode");
