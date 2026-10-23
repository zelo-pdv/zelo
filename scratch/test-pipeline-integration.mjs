import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire("c:/projetos/zelo/package.json");
const dotenv = require("dotenv");
dotenv.config({ path: "c:/projetos/zelo/.env" });

const { PrismaClient } = require("./src/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testPipeline() {
  console.log("=== TESTANDO PIPELINE DE INGESTÃO (FOLHA 4) ===");
  const pdfPath = "C:\\Users\\José Lucas\\Downloads\\2026-15 DeMillus.pdf";
  const pdfBuffer = fs.readFileSync(pdfPath);

  const brand = await prisma.brand.findUnique({ where: { slug: "demillus" } });
  const catalog = await prisma.catalog.findFirst({ where: { brandId: brand.id } });

  console.log(`Catálogo Alvo: ${catalog.title} (${catalog.id})`);

  // Importa dinamicamente a pipeline transpilada/ts-node ou mjs
  // Vamos criar um job de teste no banco
  const job = await prisma.catalogIngestionJob.create({
    data: {
      catalogId: catalog.id,
      status: "PROCESSING",
      totalPages: 83,
      currentSheet: 4,
      startedAt: new Date(),
    },
  });

  console.log(`Job criado: ${job.id}`);

  // Carrega os módulos da pipeline via tsx ou dynamic import
  const { processCatalogSheet, closeRenderer } = await import("../src/lib/catalog-ingestion/index.ts");

  console.log("Executando processCatalogSheet para Folha 4...");
  const result = await processCatalogSheet({
    catalogId: catalog.id,
    brandId: brand.id,
    pdfBuffer,
    sheetNumber: 4,
    jobId: job.id,
  });

  console.log("\nResultado da Folha 4:", {
    sheetNumber: result.sheetNumber,
    extractedCount: result.extractedCount,
    durationMs: result.durationMs,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    modelUsed: result.modelUsed,
    products: result.products,
  });

  // Validação no banco de dados
  const catalogProducts = await prisma.catalogProduct.findMany({
    where: { catalogId: catalog.id },
    include: {
      globalProduct: {
        include: {
          variants: true,
        },
      },
    },
  });

  console.log(`\nProdutos no banco vinculados ao catálogo: ${catalogProducts.length}`);
  for (const cp of catalogProducts) {
    console.log(`- SKU: ${cp.globalProduct.referenceSku} | Nome: ${cp.globalProduct.name} | Reg: R$ ${cp.regularPrice} | Promo: R$ ${cp.promoPrice || "N/A"} (${cp.promoRule || "Sem promo"}) | Variantes: ${cp.globalProduct.variants.length} | Status: ${cp.curationStatus} | Foto: ${cp.cropUrl ? "Sim" : "Não"}`);
  }

  // Atualiza job para COMPLETED
  await prisma.catalogIngestionJob.update({
    where: { id: job.id },
    data: {
      status: "COMPLETED",
      processedPages: 1,
      totalProductsFound: result.extractedCount,
      totalTokensUsed: result.inputTokens + result.outputTokens,
      completedAt: new Date(),
    },
  });

  await closeRenderer();
  await pool.end();
  console.log("\n=== TESTE CONCLUÍDO COM SUCESSO! ===");
}

testPipeline().catch(async (err) => {
  console.error("Erro no teste da pipeline:", err);
  await pool.end();
  process.exit(1);
});
