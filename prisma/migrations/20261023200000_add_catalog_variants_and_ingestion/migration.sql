-- CreateEnum
CREATE TYPE "CatalogItemCurationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "IngestionJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SheetStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- AlterEnum
ALTER TYPE "CatalogStatus" ADD VALUE 'CURATION';

-- AlterTable
ALTER TABLE "CatalogProduct" ADD COLUMN     "cropBox" JSONB,
ADD COLUMN     "cropUrl" TEXT,
ADD COLUMN     "curationNotes" TEXT,
ADD COLUMN     "curationStatus" "CatalogItemCurationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
ADD COLUMN     "promoMinQuantity" INTEGER DEFAULT 1,
ADD COLUMN     "promoPrice" DECIMAL(10,2),
ADD COLUMN     "promoRule" TEXT,
ADD COLUMN     "regularPrice" DECIMAL(10,2),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "GlobalProductVariant" (
    "id" TEXT NOT NULL,
    "globalProductId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT,
    "colorName" TEXT,
    "colorCode" TEXT,
    "barcode" TEXT,
    "skuSuffix" TEXT,
    "priceOverride" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogIngestionJob" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "status" "IngestionJobStatus" NOT NULL DEFAULT 'QUEUED',
    "totalPages" INTEGER NOT NULL,
    "processedPages" INTEGER NOT NULL DEFAULT 0,
    "failedPages" INTEGER NOT NULL DEFAULT 0,
    "totalProductsFound" INTEGER NOT NULL DEFAULT 0,
    "totalTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DECIMAL(10,4),
    "currentSheet" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogIngestionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogIngestionSheet" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "sheetNumber" INTEGER NOT NULL,
    "editorialPages" TEXT,
    "status" "SheetStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "modelUsed" TEXT,
    "durationMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "extractedCount" INTEGER NOT NULL DEFAULT 0,
    "rawExtraction" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogIngestionSheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GlobalProductVariant_globalProductId_idx" ON "GlobalProductVariant"("globalProductId");

-- CreateIndex
CREATE INDEX "GlobalProductVariant_barcode_idx" ON "GlobalProductVariant"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalProductVariant_globalProductId_size_colorCode_key" ON "GlobalProductVariant"("globalProductId", "size", "colorCode");

-- CreateIndex
CREATE INDEX "CatalogIngestionJob_catalogId_idx" ON "CatalogIngestionJob"("catalogId");

-- CreateIndex
CREATE INDEX "CatalogIngestionJob_status_idx" ON "CatalogIngestionJob"("status");

-- CreateIndex
CREATE INDEX "CatalogIngestionSheet_jobId_status_idx" ON "CatalogIngestionSheet"("jobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogIngestionSheet_jobId_sheetNumber_key" ON "CatalogIngestionSheet"("jobId", "sheetNumber");

-- CreateIndex
CREATE INDEX "CatalogProduct_curationStatus_idx" ON "CatalogProduct"("curationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalProduct_brandId_referenceSku_key" ON "GlobalProduct"("brandId", "referenceSku");

-- AddForeignKey
ALTER TABLE "GlobalProductVariant" ADD CONSTRAINT "GlobalProductVariant_globalProductId_fkey" FOREIGN KEY ("globalProductId") REFERENCES "GlobalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogIngestionJob" ADD CONSTRAINT "CatalogIngestionJob_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "Catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogIngestionSheet" ADD CONSTRAINT "CatalogIngestionSheet_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CatalogIngestionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
