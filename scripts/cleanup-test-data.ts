import prisma from "../src/lib/prisma";

const REAL_STORE_IDS = [
  "cmuj1lhcc0000ccpsadmjlyyf", // Zelo Shop
  "cmuj1ljrg000bccpscqe8rwfo", // crislainefernandesoli
  "cmv5fos8c000006kzwvfde2dk", // Lidiane Silva Santos
  "cmv4po0vy0000psps0y05h8kc", // L Perfumes
];

const REAL_STORE_NAMES = [
  "Zelo Shop",
  "crislainefernandesoli",
  "Lidiane Silva Santos",
  "L Perfumes",
];

async function main() {
  console.log("=== INICIANDO LIMPEZA SEGURA DE DADOS DE TESTE ===");

  // 1. Verificar lojas reais
  const realStores = await prisma.loja.findMany({
    where: { id: { in: REAL_STORE_IDS } },
    include: {
      users: true,
      products: true,
      clients: true,
      sales: true,
    },
  });

  console.log(`Lojas reais encontradas: ${realStores.length}/4`);
  for (const store of realStores) {
    console.log(
      ` - [${store.id}] "${store.name}": ${store.users.length} usuários, ${store.products.length} produtos, ${store.clients.length} clientes, ${store.sales.length} vendas`,
    );
  }

  if (realStores.length !== 4) {
    throw new Error(
      "ALERTA DE SEGURANÇA: Menos de 4 lojas reais foram encontradas. Abortando operação!",
    );
  }

  // 2. Identificar lojas de teste para exclusão
  const testStores = await prisma.loja.findMany({
    where: {
      id: { notIn: REAL_STORE_IDS },
      name: { notIn: REAL_STORE_NAMES },
    },
    select: { id: true, name: true },
  });

  console.log(`Total de lojas de teste a serem removidas: ${testStores.length}`);

  if (testStores.length === 0) {
    console.log("Nenhuma loja de teste para remover.");
    return;
  }

  const testStoreIds = testStores.map((s) => s.id);

  // 3. Quebrar dependência circular de ownerId nas lojas de teste
  console.log("1/13. Removendo vínculo de ownerId nas lojas de teste...");
  await prisma.loja.updateMany({
    where: { id: { in: testStoreIds } },
    data: { ownerId: null },
  });

  // 4. Excluir dados filhos na ordem correta de integridade referencial
  console.log("2/13. Excluindo itens de venda de teste...");
  await prisma.saleItem.deleteMany({
    where: { sale: { lojaId: { in: testStoreIds } } },
  });

  console.log("3/13. Excluindo vendas de teste...");
  await prisma.sale.deleteMany({
    where: { lojaId: { in: testStoreIds } },
  });

  console.log("4/13. Excluindo variações de produtos de teste...");
  await prisma.productVariant.deleteMany({
    where: { lojaId: { in: testStoreIds } },
  });

  console.log("5/13. Excluindo produtos de teste...");
  await prisma.product.deleteMany({
    where: { lojaId: { in: testStoreIds } },
  });

  console.log("6/13. Excluindo endereços de clientes de teste...");
  await prisma.address.deleteMany({
    where: { client: { lojaId: { in: testStoreIds } } },
  });

  console.log("7/13. Excluindo clientes de teste...");
  await prisma.client.deleteMany({
    where: { lojaId: { in: testStoreIds } },
  });

  console.log("8/13. Excluindo logs de auditoria de teste...");
  await prisma.auditLog.deleteMany({
    where: { lojaId: { in: testStoreIds } },
  });

  console.log("9/13. Excluindo usuários de teste...");
  await prisma.user.deleteMany({
    where: { lojaId: { in: testStoreIds } },
  });

  console.log("10/13. Excluindo grupos de acesso de teste...");
  await prisma.accessGroup.deleteMany({
    where: { lojaId: { in: testStoreIds } },
  });

  console.log("11/12. Excluindo categorias de teste...");
  await prisma.category.deleteMany({
    where: { lojaId: { in: testStoreIds } },
  });

  console.log("12/12. Excluindo configurações e lojas de teste...");
  await prisma.settings.deleteMany({
    where: { lojaId: { in: testStoreIds } },
  });

  const BATCH_SIZE = 100;
  let deletedCount = 0;
  for (let i = 0; i < testStoreIds.length; i += BATCH_SIZE) {
    const batch = testStoreIds.slice(i, i + BATCH_SIZE);
    const result = await prisma.loja.deleteMany({
      where: { id: { in: batch } },
    });
    deletedCount += result.count;
    console.log(`Lojas excluídas: ${deletedCount}/${testStoreIds.length}...`);
  }

  console.log(`\nLimpeza concluída com sucesso! Total de lojas de teste removidas: ${deletedCount}`);

  // 5. Auditoria final de conferência
  const remainingStores = await prisma.loja.findMany({
    select: { id: true, name: true },
  });

  console.log("\n=== CONFERÊNCIA FINAL ===");
  console.log(`Lojas restantes no banco: ${remainingStores.length}`);
  for (const s of remainingStores) {
    console.log(` - ID: ${s.id} | Nome: "${s.name}"`);
  }

  const userCount = await prisma.user.count();
  const clientCount = await prisma.client.count();
  const productCount = await prisma.product.count();
  const saleCount = await prisma.sale.count();

  console.log(`Usuários restantes: ${userCount}`);
  console.log(`Clientes restantes: ${clientCount}`);
  console.log(`Produtos restantes: ${productCount}`);
  console.log(`Vendas restantes: ${saleCount}`);
}

main()
  .catch((e) => {
    console.error("Erro durante a limpeza:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
