import { PrismaClient } from '../src/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const published = await prisma.catalog.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, title: true }
  });
  for (const cat of published) {
    const res = await prisma.catalogProduct.updateMany({
      where: { catalogId: cat.id, curationStatus: 'PENDING_REVIEW' },
      data: { curationStatus: 'APPROVED' }
    });
    console.log(`Updated ${cat.title}: ${res.count} products approved`);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
