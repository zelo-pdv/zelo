import { PrismaClient } from '../src/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const catalogs = await prisma.catalog.findMany({
    include: {
      brand: true,
      _count: { select: { products: true } }
    }
  });
  console.log('Catalogs:', JSON.stringify(catalogs, null, 2));

  const items = await prisma.catalogProduct.findMany({
    include: {
      globalProduct: {
        include: {
          variants: true
        }
      }
    }
  });
  console.log('Total catalog products:', items.length);
  for (const item of items) {
    console.log(`- [${item.id}] ${item.globalProduct.referenceSku}: ${item.globalProduct.name} (status: ${item.curationStatus}, variants: ${item.globalProduct.variants.length})`);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
