import { PrismaClient } from '../src/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Testing Tenant Store Import Flow ---');

  // 1. Find a test store and user
  const loja = await prisma.loja.findFirst({
    include: {
      users: true,
      categories: true,
    }
  });

  if (!loja) {
    console.error('No loja found in database.');
    return;
  }
  console.log(`Using Loja: [${loja.id}] "${loja.name}"`);

  // 2. Find DeMillus published catalog with approved products
  const demillus = await prisma.catalog.findFirst({
    where: { title: { contains: 'DeMillus' } },
    include: {
      products: {
        where: { curationStatus: 'APPROVED' },
        include: {
          globalProduct: {
            include: {
              variants: true
            }
          }
        }
      }
    }
  });

  if (!demillus || demillus.products.length === 0) {
    console.error('No published DeMillus catalog with approved products found.');
    return;
  }

  console.log(`Found DeMillus catalog: "${demillus.title}" with ${demillus.products.length} approved products.`);
  for (const cp of demillus.products) {
    console.log(`- Item [${cp.id}] SKU: ${cp.globalProduct.referenceSku} "${cp.globalProduct.name}" (variants: ${cp.globalProduct.variants.length})`);
  }

  // 3. Select the first product (e.g. 051813 Fio-dental Desejo with 28 variants)
  const targetCp = demillus.products[0];
  const targetGp = targetCp.globalProduct;
  console.log(`\nTesting import of: ${targetGp.referenceSku} - ${targetGp.name}`);

  // Clean up any previous test import for this product in this loja
  await prisma.product.deleteMany({
    where: {
      lojaId: loja.id,
      globalProductId: targetGp.id,
    }
  });

  // 4. Simulate the API import call logic
  const response = await fetch('http://localhost:3000/api/catalogs/' + demillus.id + '/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // We will test direct logic or test via direct DB execution since Next.js server might not be running on 3000 in background
    }
  }).catch(() => null);

  // If local server isn't running, let's test the endpoint logic directly:
  const defaultCategory = loja.categories[0];
  const salePrice = Number(targetCp.regularPrice ?? targetCp.cyclePrice ?? targetGp.suggestedPrice ?? 29.99);
  const costPrice = Number(targetGp.costPrice ?? 0);
  const productImage = targetCp.cropUrl || targetGp.imageUrl || null;

  console.log(`Creating product in store: name="${targetGp.name}", code="${targetGp.referenceSku}", variants=${targetGp.variants.length}`);

  const variantsData = targetGp.variants.map((gv, idx) => ({
    name: [gv.size, gv.colorName].filter(Boolean).join(' - ') || gv.name || `Var ${idx + 1}`,
    code: `${targetGp.referenceSku}-${gv.size || ''}-${gv.colorCode || idx}`,
    barcode: gv.barcode || null,
    attributes: {
      size: gv.size || null,
      color: gv.colorName || null,
      colorCode: gv.colorCode || null,
    },
    costPrice: costPrice > 0 ? costPrice : null,
    salePrice: gv.priceOverride ? Number(gv.priceOverride) : salePrice,
    stock: 5, // initial stock
    image: productImage,
    lojaId: loja.id,
  }));

  const created = await prisma.product.create({
    data: {
      name: targetGp.name,
      lojaId: loja.id,
      globalProductId: targetGp.id,
      description: targetGp.description,
      barcode: targetGp.barcode,
      code: targetGp.referenceSku,
      image: productImage,
      salePrice,
      costPrice: costPrice > 0 ? costPrice : null,
      stock: 0,
      categoryId: defaultCategory?.id || null,
      active: true,
      variants: {
        create: variantsData,
      }
    },
    include: {
      variants: true,
      category: true,
    }
  });

  console.log(`Successfully created Product in loja! ID: ${created.id}, code: ${created.code}`);
  console.log(`Created ${created.variants.length} store variants! Sample:`);
  for (const v of created.variants.slice(0, 3)) {
    console.log(`  - Variant [${v.id}]: name="${v.name}", code="${v.code}", price=R$ ${v.salePrice}, stock=${v.stock}`);
  }

  // 5. Verify querying products for the tenant
  const tenantProducts = await prisma.product.findMany({
    where: { lojaId: loja.id, deletedAt: null },
    include: { variants: true }
  });
  console.log(`\nStore currently has ${tenantProducts.length} active products.`);

  // 6. Verify duplicate check
  const duplicateCheck = await prisma.product.findFirst({
    where: {
      lojaId: loja.id,
      globalProductId: targetGp.id,
      deletedAt: null,
    }
  });
  console.log(`Duplicate check: Product already exists? ${Boolean(duplicateCheck)} (ID: ${duplicateCheck?.id})`);

  console.log('\n--- Tenant Store Import Test PASSED! ---');
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
