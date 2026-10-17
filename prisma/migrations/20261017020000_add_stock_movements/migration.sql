-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ENTRY', 'OUT', 'ADJUSTMENT', 'SALE', 'SALE_CANCEL');

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL DEFAULT 'ENTRY',
    "quantity" DECIMAL(10,3) NOT NULL,
    "previousStock" DECIMAL(10,3) NOT NULL,
    "resultStock" DECIMAL(10,3) NOT NULL,
    "notes" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "lojaId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_lojaId_idx" ON "StockMovement"("lojaId");

-- CreateIndex
CREATE INDEX "StockMovement_lojaId_createdAt_idx" ON "StockMovement"("lojaId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_lojaId_type_idx" ON "StockMovement"("lojaId", "type");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_variantId_idx" ON "StockMovement"("variantId");

-- CreateIndex
CREATE INDEX "StockMovement_userId_idx" ON "StockMovement"("userId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
