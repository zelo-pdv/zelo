-- AlterTable
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "offlineTempId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Sale_lojaId_offlineTempId_key" ON "Sale"("lojaId", "offlineTempId");
