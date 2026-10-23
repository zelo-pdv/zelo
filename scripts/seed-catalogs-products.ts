import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("[Seed] Iniciando seed de Catálogos e Produtos Globais da Sprint 4...");

  // 1. Busca marcas
  const natura = await prisma.brand.findUnique({ where: { slug: "natura" } });
  const boticario = await prisma.brand.findUnique({ where: { slug: "o-boticario" } });
  const eudora = await prisma.brand.findUnique({ where: { slug: "eudora" } });

  if (!natura || !boticario) {
    console.error("[Seed] Marcas Natura ou O Boticário não encontradas. Execute o seed da Sprint 3 primeiro.");
    process.exit(1);
  }

  // 2. Busca categorias
  const perfumaria = await prisma.globalCategory.findUnique({ where: { slug: "perfumaria" } });
  const corpo = await prisma.globalCategory.findUnique({ where: { slug: "corpo-e-banho" } });
  const cabelos = await prisma.globalCategory.findUnique({ where: { slug: "cabelos" } });

  // 3. Cadastra Produtos Globais
  const sampleProducts = [
    {
      name: "Essencial Exclusivo Deo Parfum Masculino 100ml",
      brandId: natura.id,
      globalCategoryId: perfumaria?.id,
      barcode: "7908132204561",
      referenceSku: "50412",
      description: "Amadeirado intenso. Copaíba, patchouli e cardamomo para momentos especiais.",
      suggestedPrice: 249.90,
      costPrice: 174.93,
    },
    {
      name: "Kaiak Tradicional Desodorante Colônia 100ml",
      brandId: natura.id,
      globalCategoryId: perfumaria?.id,
      barcode: "7908132201237",
      referenceSku: "22560",
      description: "Aromático aquático. Notas florais e frescor vibrante.",
      suggestedPrice: 179.90,
      costPrice: 125.93,
    },
    {
      name: "Óleo Desodorante Corporal Trifásico Ekos Castanha 200ml",
      brandId: natura.id,
      globalCategoryId: corpo?.id,
      barcode: "7908132208873",
      referenceSku: "70984",
      description: "Hidratação de 24 horas realçando o tom natural da pele.",
      suggestedPrice: 89.90,
      costPrice: 62.93,
    },
    {
      name: "Malbec Desodorante Colônia 100ml",
      brandId: boticario.id,
      globalCategoryId: perfumaria?.id,
      barcode: "7891033252267",
      referenceSku: "25226",
      description: "A primeira fragrância do mundo feita com álcool vínico macerado em barris de carvalho.",
      suggestedPrice: 209.90,
      costPrice: 146.93,
    },
    {
      name: "Lily Eau de Parfum 75ml",
      brandId: boticario.id,
      globalCategoryId: perfumaria?.id,
      barcode: "7891033260002",
      referenceSku: "26000",
      description: "Floral bouquet elegante produzido através da rara técnica de enfleurage de lírios.",
      suggestedPrice: 299.90,
      costPrice: 209.93,
    },
    {
      name: "Nativa SPA Ameixa Loção Hidratante Corporal 400ml",
      brandId: boticario.id,
      globalCategoryId: corpo?.id,
      barcode: "7891033704513",
      referenceSku: "70451",
      description: "Gotas purificadas de quinoa para uma pele profundamente hidratada e macia.",
      suggestedPrice: 79.90,
      costPrice: 55.93,
    },
  ];

  const createdGlobalProducts: any[] = [];
  for (const prod of sampleProducts) {
    const existing = await prisma.globalProduct.findFirst({
      where: { brandId: prod.brandId, referenceSku: prod.referenceSku },
    });

    if (existing) {
      createdGlobalProducts.push(existing);
      console.log(`[Seed GlobalProduct] Já existente: ${existing.name}`);
    } else {
      const created = await prisma.globalProduct.create({
        data: {
          name: prod.name,
          brandId: prod.brandId,
          globalCategoryId: prod.globalCategoryId,
          barcode: prod.barcode,
          referenceSku: prod.referenceSku,
          description: prod.description,
          suggestedPrice: prod.suggestedPrice,
          costPrice: prod.costPrice,
          active: true,
        },
      });
      createdGlobalProducts.push(created);
      console.log(`[Seed GlobalProduct] Criado: ${created.name}`);
    }
  }

  // 4. Cria Catálogo Natura
  let naturaCatalog = await prisma.catalog.findFirst({
    where: { brandId: natura.id, cycle: "Ciclo 05/2026" },
  });

  if (!naturaCatalog) {
    naturaCatalog = await prisma.catalog.create({
      data: {
        title: "Natura - Ciclo 05/2026 Especial Mães",
        brandId: natura.id,
        cycle: "Ciclo 05/2026",
        description: "Campanha especial com lançamentos e kits exclusivos para o Dia das Mães.",
        status: "PUBLISHED",
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2026-05-15T23:59:59.000Z"),
        pdfPath: "samples/natura-ciclo-05-2026.pdf",
      },
    });
    console.log(`[Seed Catalog] Catálogo criado: ${naturaCatalog.title}`);
  }

  // 5. Cria Catálogo Boticário
  let boticarioCatalog = await prisma.catalog.findFirst({
    where: { brandId: boticario.id, cycle: "Ciclo 04/2026" },
  });

  if (!boticarioCatalog) {
    boticarioCatalog = await prisma.catalog.create({
      data: {
        title: "O Boticário - Ciclo 04/2026 Perfumaria & Cuidados",
        brandId: boticario.id,
        cycle: "Ciclo 04/2026",
        description: "Destaques na linha Malbec, Lily e lançamentos de Nativa SPA.",
        status: "PUBLISHED",
        startDate: new Date("2026-03-15T00:00:00.000Z"),
        endDate: new Date("2026-04-30T23:59:59.000Z"),
        pdfPath: "samples/boticario-ciclo-04-2026.pdf",
      },
    });
    console.log(`[Seed Catalog] Catálogo criado: ${boticarioCatalog.title}`);
  }

  // 6. Vincula produtos ao catálogo Natura
  const naturaProds = createdGlobalProducts.filter((p) => p.brandId === natura.id);
  for (let i = 0; i < naturaProds.length; i++) {
    const prod = naturaProds[i];
    await prisma.catalogProduct.upsert({
      where: {
        catalogId_globalProductId: {
          catalogId: naturaCatalog.id,
          globalProductId: prod.id,
        },
      },
      update: {
        pageNumber: 12 + i * 4,
        cyclePrice: Number(prod.suggestedPrice) * 0.85, // 15% de desconto no ciclo
      },
      create: {
        catalogId: naturaCatalog.id,
        globalProductId: prod.id,
        pageNumber: 12 + i * 4,
        cyclePrice: Number(prod.suggestedPrice) * 0.85,
      },
    });
  }

  // 7. Vincula produtos ao catálogo Boticário
  const boticarioProds = createdGlobalProducts.filter((p) => p.brandId === boticario.id);
  for (let i = 0; i < boticarioProds.length; i++) {
    const prod = boticarioProds[i];
    await prisma.catalogProduct.upsert({
      where: {
        catalogId_globalProductId: {
          catalogId: boticarioCatalog.id,
          globalProductId: prod.id,
        },
      },
      update: {
        pageNumber: 8 + i * 6,
        cyclePrice: Number(prod.suggestedPrice) * 0.9, // 10% de desconto no ciclo
      },
      create: {
        catalogId: boticarioCatalog.id,
        globalProductId: prod.id,
        pageNumber: 8 + i * 6,
        cyclePrice: Number(prod.suggestedPrice) * 0.9,
      },
    });
  }

  console.log("[Seed] Catálogos e Produtos Globais concluídos com sucesso!");
}

main()
  .catch((e) => {
    console.error("[Seed] Erro durante execução:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
