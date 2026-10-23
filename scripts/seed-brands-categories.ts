import "dotenv/config";
import prisma from "../src/lib/prisma";

const DEFAULT_BRANDS = [
  {
    name: "Natura",
    slug: "natura",
    description: "Líder brasileira em cosméticos, perfumaria e produtos de cuidado pessoal sustentáveis.",
  },
  {
    name: "O Boticário",
    slug: "o-boticario",
    description: "Uma das maiores redes de franquias de perfumaria e cosméticos do mundo.",
  },
  {
    name: "Avon",
    slug: "avon",
    description: "Marca global icônica de venda direta em maquiagem, perfumaria e cuidados faciais.",
  },
  {
    name: "Eudora",
    slug: "eudora",
    description: "Marca do Grupo Boticário com sofisticação em fragrâncias, maquiagens e produtos capilares.",
  },
  {
    name: "Jequiti",
    slug: "jequiti",
    description: "Empresa de cosméticos do Grupo Silvio Santos, famosa por fragrâncias de celebridades e cuidados.",
  },
  {
    name: "Mary Kay",
    slug: "mary-kay",
    description: "Multinacional reconhecida globalmente por cuidados avançados com a pele e maquiagens premium.",
  },
];

const DEFAULT_CATEGORIES = [
  {
    name: "Perfumaria",
    slug: "perfumaria",
    icon: "spray-can",
    description: "Fragrâncias femininas, masculinas, unissex, colônias e eau de parfum.",
  },
  {
    name: "Maquiagem",
    slug: "maquiagem",
    icon: "brush",
    description: "Batons, bases, corretivos, máscaras para cílios e maquiagens em geral.",
  },
  {
    name: "Cuidados Diários",
    slug: "cuidados-diarios",
    icon: "sparkles",
    description: "Higiene pessoal, sabonetes, desodorantes e hidratação básica diária.",
  },
  {
    name: "Cabelos",
    slug: "cabelos",
    icon: "droplet",
    description: "Shampoos, condicionadores, óleos capilares, máscaras e finalizadores.",
  },
  {
    name: "Rosto",
    slug: "rosto",
    icon: "smile",
    description: "Skincare facial, antissinais, limpeza profunda, séruns e proteção solar.",
  },
  {
    name: "Corpo e Banho",
    slug: "corpo-e-banho",
    icon: "heart",
    description: "Óleos corporais trifásicos, esfoliantes, cremes corporais e manteigas hidratantes.",
  },
];

async function main() {
  console.log("[Seed] Iniciando seed de Marcas e Categorias Globais...");

  // 1. Seed Brands
  for (const brand of DEFAULT_BRANDS) {
    const record = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {
        name: brand.name,
        description: brand.description,
        active: true,
      },
      create: {
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        active: true,
      },
    });
    console.log(`[Seed Brand] ${record.name} (${record.slug}) - ID: ${record.id}`);
  }

  // 2. Seed Categories
  for (const cat of DEFAULT_CATEGORIES) {
    const record = await prisma.globalCategory.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        icon: cat.icon,
        description: cat.description,
        active: true,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        active: true,
      },
    });
    console.log(`[Seed Category] ${record.name} (${record.slug}) - ID: ${record.id}`);
  }

  console.log("[Seed] Concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("[Seed] Erro durante execução:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
