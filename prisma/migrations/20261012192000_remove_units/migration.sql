-- DropForeignKey
ALTER TABLE "Unit" DROP CONSTRAINT IF EXISTS "Unit_lojaId_fkey";

-- DropTable
DROP TABLE IF EXISTS "Unit";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN IF EXISTS "unit";
