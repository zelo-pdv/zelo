import { PrismaClient } from '../src/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const items = await prisma.catalogProduct.findMany({
    include: {
      globalProduct: {
        include: {
          variants: true
        }
      }
    }
  });

  const serializedItems = items.map((item) => ({
    ...item,
    regularPrice: item.regularPrice !== null ? Number(item.regularPrice) : null,
    promoPrice: item.promoPrice !== null ? Number(item.promoPrice) : null,
    cyclePrice: item.cyclePrice !== null ? Number(item.cyclePrice) : null,
  }));

  console.log(`Found ${serializedItems.length} items. Sample prices:`);
  for (const it of serializedItems.slice(0, 3)) {
    console.log(`- ${it.globalProduct.referenceSku}: regularPrice=${it.regularPrice} (${typeof it.regularPrice}), promoPrice=${it.promoPrice} (${typeof it.promoPrice})`);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
