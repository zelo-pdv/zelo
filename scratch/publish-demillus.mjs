import { PrismaClient } from '../src/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const demillus = await prisma.catalog.findFirst({
    where: { title: { contains: 'DeMillus' } }
  });
  if (!demillus) {
    console.log('DeMillus catalog not found.');
    return;
  }
  await prisma.catalogProduct.updateMany({
    where: { catalogId: demillus.id },
    data: { curationStatus: 'APPROVED' }
  });
  await prisma.catalog.update({
    where: { id: demillus.id },
    data: { status: 'PUBLISHED' }
  });
  console.log('DeMillus published with approved items:', demillus.id);
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
