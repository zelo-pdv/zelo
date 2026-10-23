-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "globalProductId" TEXT;

-- CreateTable
CREATE TABLE "Catalog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "cycle" TEXT,
    "description" TEXT,
    "coverUrl" TEXT,
    "pdfPath" TEXT,
    "status" "CatalogStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "globalCategoryId" TEXT,
    "barcode" TEXT,
    "referenceSku" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "suggestedPrice" DECIMAL(10,2),
    "costPrice" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogProduct" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "globalProductId" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "cyclePrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_globalProductId_idx" ON "Product"("globalProductId");

-- CreateIndex
CREATE INDEX "Catalog_brandId_idx" ON "Catalog"("brandId");
CREATE INDEX "Catalog_status_idx" ON "Catalog"("status");
CREATE INDEX "Catalog_startDate_idx" ON "Catalog"("startDate");
CREATE INDEX "Catalog_endDate_idx" ON "Catalog"("endDate");

-- CreateIndex
CREATE INDEX "GlobalProduct_brandId_idx" ON "GlobalProduct"("brandId");
CREATE INDEX "GlobalProduct_globalCategoryId_idx" ON "GlobalProduct"("globalCategoryId");
CREATE INDEX "GlobalProduct_barcode_idx" ON "GlobalProduct"("barcode");
CREATE INDEX "GlobalProduct_referenceSku_idx" ON "GlobalProduct"("referenceSku");
CREATE INDEX "GlobalProduct_active_idx" ON "GlobalProduct"("active");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProduct_catalogId_globalProductId_key" ON "CatalogProduct"("catalogId", "globalProductId");
CREATE INDEX "CatalogProduct_catalogId_idx" ON "CatalogProduct"("catalogId");
CREATE INDEX "CatalogProduct_globalProductId_idx" ON "CatalogProduct"("globalProductId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_globalProductId_fkey" FOREIGN KEY ("globalProductId") REFERENCES "GlobalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Catalog" ADD CONSTRAINT "Catalog_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalProduct" ADD CONSTRAINT "GlobalProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalProduct" ADD CONSTRAINT "GlobalProduct_globalCategoryId_fkey" FOREIGN KEY ("globalCategoryId") REFERENCES "GlobalCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "Catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_globalProductId_fkey" FOREIGN KEY ("globalProductId") REFERENCES "GlobalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
