-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "minStock" DROP NOT NULL,
ALTER COLUMN "minStock" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductVariant" ALTER COLUMN "minStock" DROP NOT NULL,
ALTER COLUMN "minStock" DROP DEFAULT;

-- Update existing 0 minStock to NULL where minStock was previously not configured
UPDATE "Product" SET "minStock" = NULL WHERE "minStock" = 0;
UPDATE "ProductVariant" SET "minStock" = NULL WHERE "minStock" = 0;
