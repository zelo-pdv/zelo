-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Movimentação de Estoque',
ADD COLUMN "isReverted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "revertedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "StockMovement_isReverted_idx" ON "StockMovement"("isReverted");
