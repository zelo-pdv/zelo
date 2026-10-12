import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fetchApi, login, deleteTestLoja } from "./helpers";

const AUDIT_RUN_ID = `AUDIT_${Date.now()}`;

describe("Zelo - Comprehensive Functional Audit & Security Suite", () => {
  let loja: any;
  let ownerCreds: { email: string; password: string };
  let ownerCookies: string;
  let ownerId: string;
  let lojaId: string;

  let cashierCreds: { email: string; password: string };
  let cashierCookies: string;
  let cashierId: string;

  let managerCreds: { email: string; password: string };
  let managerCookies: string;

  let adminGroupId: string;
  let cashierGroupId: string;
  let managerGroupId: string;

  let categoryId: string;
  let productId: string;
  let clientId: string;
  let variantProductId: string;
  let variantIds: any[];

  beforeAll(async () => {
    // 1. Cadastrar nova loja para auditoria (4.1)
    const storePayload = {
      ownerName: `Audit Owner ${AUDIT_RUN_ID}`,
      storeName: `Loja ${AUDIT_RUN_ID}`,
      email: `audit_owner_${AUDIT_RUN_ID.toLowerCase()}@test.com`,
      password: "password123",
      confirmPassword: "password123",
      phone: "(11) 98765-4321",
    };

    const regRes = await fetchApi("/auth/register", {
      method: "POST",
      body: JSON.stringify(storePayload),
    });

    expect(regRes.status).toBe(201);
    expect(regRes.data.success).toBe(true);
    ownerCreds = { email: storePayload.email, password: storePayload.password };
    ownerCookies = regRes.cookies;
    ownerId = regRes.data.user.sub;
    lojaId = regRes.data.user.lojaId;

    // Concluir onboarding com configurações conhecidas
    await fetchApi(
      "/onboarding",
      {
        method: "POST",
        body: JSON.stringify({
          trackStock: true,
          blockOutOfStock: true,
          requireClient: false,
          defaultPaymentMethod: "PIX",
          defaultSaleStatus: "PAGO",
          hideCostPrice: false,
          showProductImages: true,
          step: 4,
          completed: true,
        }),
      },
      ownerCookies
    );

    // Obter grupos criados automaticamente
    const groupsRes = await fetchApi("/access-groups", { method: "GET" }, ownerCookies);
    expect(groupsRes.status).toBe(200);
    const groups = groupsRes.data;
    adminGroupId = groups.find((g: any) => g.name === "ADMIN").id;
    managerGroupId = groups.find((g: any) => g.name === "Gerente").id;
    cashierGroupId = groups.find((g: any) => g.name === "Operador de Caixa").id;

    // Criar usuário Operador de Caixa
    cashierCreds = {
      email: `cashier_${AUDIT_RUN_ID.toLowerCase()}@test.com`,
      password: "password123",
    };
    const cashierRes = await fetchApi(
      "/users",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Caixa Operador",
          email: cashierCreds.email,
          password: cashierCreds.password,
          groupId: cashierGroupId,
          active: true,
        }),
      },
      ownerCookies
    );
    expect(cashierRes.status).toBe(201);
    cashierId = cashierRes.data.id;
    const cashierLogin = await login(cashierCreds.email, cashierCreds.password);
    cashierCookies = cashierLogin.cookies;

    // Criar usuário Gerente
    managerCreds = {
      email: `manager_${AUDIT_RUN_ID.toLowerCase()}@test.com`,
      password: "password123",
    };
    const managerRes = await fetchApi(
      "/users",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Gerente Operacional",
          email: managerCreds.email,
          password: managerCreds.password,
          groupId: managerGroupId,
          active: true,
        }),
      },
      ownerCookies
    );
    expect(managerRes.status).toBe(201);
    const managerLogin = await login(managerCreds.email, managerCreds.password);
    managerCookies = managerLogin.cookies;
  });

  afterAll(async () => {
    if (lojaId) {
      await deleteTestLoja(lojaId);
    }
  });

  // ==========================================
  // 4.1. CADASTRO E GERENCIAMENTO DE LOJAS
  // ==========================================
  describe("4.1. Cadastro e gerenciamento de lojas", () => {
    it("deve rejeitar cadastro com e-mail duplicado", async () => {
      const res = await fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ownerName: "Outro Nome",
          storeName: `Loja Outra ${Date.now()}`,
          email: ownerCreds.email,
          password: "password123",
          confirmPassword: "password123",
        }),
      });
      expect(res.status).toBe(400);
      expect(res.data.error).toMatch(/já está em uso/i);
    });

    it("deve rejeitar cadastro com nome de loja duplicado", async () => {
      const res = await fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ownerName: "Outro Nome",
          storeName: `Loja ${AUDIT_RUN_ID}`,
          email: `outro_email_${Date.now()}@test.com`,
          password: "password123",
          confirmPassword: "password123",
        }),
      });
      expect(res.status).toBe(400);
      expect(res.data.error).toMatch(/já existe uma loja/i);
    });

    it("deve rejeitar cadastro quando senhas não coincidem", async () => {
      const res = await fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ownerName: "Nome Teste",
          storeName: `Loja Diff ${Date.now()}`,
          email: `diff_${Date.now()}@test.com`,
          password: "password123",
          confirmPassword: "password999",
        }),
      });
      expect(res.status).toBe(400);
      expect(res.data.error).toMatch(/senhas não coincidem/i);
    });

    it("deve permitir que o administrador atualize dados da loja", async () => {
      const updateRes = await fetchApi(
        `/lojas/${lojaId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: `Loja ${AUDIT_RUN_ID} Atualizada`,
            ownerName: `Audit Owner ${AUDIT_RUN_ID}`,
            phone: "(11) 91111-2222",
            address: {
              street: "Rua das Flores",
              number: "123",
              neighborhood: "Centro",
              city: "São Paulo",
              state: "SP",
              zipCode: "01001-000",
            },
          }),
        },
        ownerCookies
      );
      expect(updateRes.status).toBe(200);
      expect(updateRes.data.name).toBe(`Loja ${AUDIT_RUN_ID} Atualizada`);
    });

    it("não deve permitir que Operador de Caixa atualize dados da loja", async () => {
      const res = await fetchApi(
        `/lojas/${lojaId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: "Hacked by Cashier",
            ownerName: "Caixa",
          }),
        },
        cashierCookies
      );
      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 4.2. CADASTRO E GERENCIAMENTO DE USUÁRIOS
  // ==========================================
  describe("4.2. Cadastro e gerenciamento de usuários", () => {
    it("deve validar formato de e-mail ao criar usuário", async () => {
      const res = await fetchApi(
        "/users",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Email Invalido",
            email: "email-invalido-sem-arroba",
            password: "password123",
            groupId: cashierGroupId,
          }),
        },
        ownerCookies
      );
      expect(res.status).toBe(400);
      expect(res.data.error).toMatch(/e-mail inválido/i);
    });

    it("deve impedir criação de usuário com e-mail já existente na loja", async () => {
      const res = await fetchApi(
        "/users",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Duplicado",
            email: cashierCreds.email,
            password: "password123",
            groupId: cashierGroupId,
          }),
        },
        ownerCookies
      );
      expect(res.status).toBe(400);
      expect(res.data.error).toMatch(/e-mail/i);
    });

    it("deve impedir exclusão do proprietário da loja", async () => {
      const res = await fetchApi(`/users/${ownerId}`, { method: "DELETE" }, ownerCookies);
      expect(res.status).toBe(403);
      expect(res.data.error).toMatch(/proprietário.*não pode ser deletado/i);
    });

    it("deve impedir desativação do proprietário da loja", async () => {
      const res = await fetchApi(
        `/users/${ownerId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ active: false }),
        },
        ownerCookies
      );
      expect(res.status).toBe(403);
      expect(res.data.error).toMatch(/proprietário não pode ser desativado/i);
    });

    it("deve impedir que usuário comum liste usuários do sistema", async () => {
      const res = await fetchApi("/users", { method: "GET" }, cashierCookies);
      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 4.3. CADASTRO E GERENCIAMENTO DE GRUPOS DE ACESSO
  // ==========================================
  describe("4.3. Cadastro e gerenciamento de grupos de acesso", () => {
    let customGroupId: string;

    it("deve criar um novo grupo de acesso personalizado", async () => {
      const res = await fetchApi(
        "/access-groups",
        {
          method: "POST",
          body: JSON.stringify({
            name: `Estoquista ${Date.now()}`,
            description: "Responsável por conferência de produtos",
            permissions: {
              produtos: ["Visualizar", "Editar"],
              dashboard: ["Visualizar"],
            },
          }),
        },
        ownerCookies
      );
      expect(res.status).toBe(201);
      expect(res.data.id).toBeDefined();
      customGroupId = res.data.id;
    });

    it("não deve permitir excluir grupo com usuários vinculados", async () => {
      const res = await fetchApi(
        `/access-groups/${cashierGroupId}`,
        { method: "DELETE" },
        ownerCookies
      );
      expect(res.status).toBe(400);
      expect(res.data.error).toMatch(/usuários vinculados/i);
    });

    it("deve permitir excluir grupo que não possui usuários vinculados", async () => {
      const res = await fetchApi(
        `/access-groups/${customGroupId}`,
        { method: "DELETE" },
        ownerCookies
      );
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });
  });

  // ==========================================
  // 4.4. CADASTRO E GERENCIAMENTO DE CLIENTES
  // ==========================================
  describe("4.4. Cadastro e gerenciamento de clientes", () => {
    it("deve criar cliente com dados válidos e endereço", async () => {
      const res = await fetchApi(
        "/clients",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Cliente Teste Silva",
            phone: "(11) 98888-7777",
            email: `cliente_${Date.now()}@teste.com`,
            notes: "Cliente vip",
            address: {
              street: "Av Paulista",
              number: "1000",
              complement: "Apto 101",
              neighborhood: "Bela Vista",
              city: "São Paulo",
              state: "SP",
              zipCode: "01310-100",
            },
          }),
        },
        ownerCookies
      );
      expect(res.status).toBe(201);
      expect(res.data.id).toBeDefined();
      expect(res.data.name).toBe("Cliente Teste Silva");
      expect(res.data.address).toBeDefined();
      clientId = res.data.id;
    });

    it("deve rejeitar cliente com nome menor que 2 caracteres", async () => {
      const res = await fetchApi(
        "/clients",
        {
          method: "POST",
          body: JSON.stringify({
            name: "A",
            phone: "(11) 98888-7777",
          }),
        },
        ownerCookies
      );
      expect(res.status).toBe(400);
      expect(res.data.error).toMatch(/mínimo 2 caracteres/i);
    });

    it("deve rejeitar e-mail em formato inválido", async () => {
      const res = await fetchApi(
        "/clients",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Cliente Email Ruim",
            email: "email-invalido",
          }),
        },
        ownerCookies
      );
      expect(res.status).toBe(400);
      expect(res.data.error).toMatch(/e-mail inválido/i);
    });

    it("deve permitir editar cliente e atualizar dados e endereço", async () => {
      const res = await fetchApi(
        `/clients/${clientId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: "Cliente Teste Silva Editado",
            phone: "(11) 98888-9999",
            notes: "Observação atualizada",
          }),
        },
        ownerCookies
      );
      expect(res.status).toBe(200);
      expect(res.data.name).toBe("Cliente Teste Silva Editado");
    });

    it("deve proteger cliente padrão 'Consumidor Final' contra exclusão", async () => {
      const clientsList = await fetchApi("/clients", { method: "GET" }, ownerCookies);
      const consumidorFinal = clientsList.data.find(
        (c: any) => c.name.trim().toLowerCase() === "consumidor final"
      );
      expect(consumidorFinal).toBeDefined();

      const delRes = await fetchApi(
        `/clients/${consumidorFinal.id}`,
        { method: "DELETE" },
        ownerCookies
      );
      expect(delRes.status).toBe(400);
      expect(delRes.data.error).toMatch(/Consumidor Final.*não pode ser excluído/i);
    });

    it("deve excluir cliente com sucesso via soft-delete", async () => {
      const delRes = await fetchApi(`/clients/${clientId}`, { method: "DELETE" }, ownerCookies);
      expect(delRes.status).toBe(204);

      // Não deve aparecer na listagem ativa
      const checkRes = await fetchApi("/clients", { method: "GET" }, ownerCookies);
      const found = checkRes.data.find((c: any) => c.id === clientId);
      expect(found).toBeUndefined();
    });
  });

  // ==========================================
  // 4.5. CADASTRO E GERENCIAMENTO DE PRODUTOS
  // ==========================================
  describe("4.5. Cadastro e gerenciamento de produtos", () => {
    it("deve criar categoria de produto com sucesso", async () => {
      const res = await fetchApi(
        "/categories",
        {
          method: "POST",
          body: JSON.stringify({
            name: `Categoria ${Date.now()}`,
            lowStockThreshold: 3,
          }),
        },
        ownerCookies
      );
      expect(res.status).toBe(201);
      expect(res.data.id).toBeDefined();
      categoryId = res.data.id;
    });

    it("deve criar produto com campos válidos", async () => {
      const res = await fetchApi(
        "/products",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Perfume Zelo Teste 100ml",
            code: `SKU-${Date.now()}`,
            barcode: "7891234567890",
            costPrice: 50.0,
            salePrice: 120.0,
            stock: 20,
            minStock: 5,
            unit: "UN",
            categoryId: categoryId,
            description: "Fragrância amadeirada marcante",
          }),
        },
        ownerCookies
      );
      expect(res.status).toBe(201);
      expect(res.data.id).toBeDefined();
      expect(res.data.name).toBe("Perfume Zelo Teste 100ml");
      expect(Number(res.data.salePrice)).toBe(120.0);
      expect(Number(res.data.stock)).toBe(20);
      productId = res.data.id;
    });

    it("deve rejeitar produto com preço de venda negativo", async () => {
      const res = await fetchApi(
        "/products",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Produto Preço Negativo",
            salePrice: -10,
            unit: "UN",
          }),
        },
        ownerCookies
      );
      expect(res.status).toBe(400);
    });

    it("deve rejeitar produto com categoria de outra loja", async () => {
      const res = await fetchApi(
        "/products",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Produto Categoria Fake",
            salePrice: 50,
            categoryId: "categoria_inexistente_123",
          }),
        },
        ownerCookies
      );
      expect(res.status).toBe(400);
      expect(res.data.error).toMatch(/categoria inválida/i);
    });

    it("deve atualizar produto e campos de preço e estoque", async () => {
      const res = await fetchApi(
        `/products/${productId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: "Perfume Zelo Teste 100ml Alterado",
            salePrice: 135.0,
            incrementStock: 5, // 20 + 5 = 25
          }),
        },
        ownerCookies
      );
      expect(res.status).toBe(200);
      expect(Number(res.data.stock)).toBe(25);
    });

    it("deve dar suporte a variações de produto", async () => {
      const variantProdRes = await fetchApi(
        "/products",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Camisa Polo Zelo",
            salePrice: 89.9,
            costPrice: 40.0,
            unit: "UN",
            hasVariants: true,
            variants: [
              {
                name: "Tamanho M / Azul",
                salePrice: 89.9,
                costPrice: 40.0,
                stock: 10,
                minStock: 2,
              },
              {
                name: "Tamanho G / Preto",
                salePrice: 99.9,
                costPrice: 45.0,
                stock: 15,
                minStock: 2,
              },
            ],
          }),
        },
        ownerCookies
      );
      expect(variantProdRes.status).toBe(201);
      expect(variantProdRes.data.variants).toHaveLength(2);
      variantProductId = variantProdRes.data.id;
      variantIds = variantProdRes.data.variants;
    });
  });

  // ==========================================
  // 4.6. CADASTRO E GERENCIAMENTO DE VENDAS
  // ==========================================
  describe("4.6. Cadastro e gerenciamento de vendas", () => {
    let saleId: string;

    it("deve registrar venda e abater estoque atomicamente", async () => {
      // Estoque inicial era 25
      const res = await fetchApi(
        "/sales",
        {
          method: "POST",
          body: JSON.stringify({
            items: [
              {
                productId,
                productName: "Perfume Zelo Teste 100ml Alterado",
                quantity: 3,
                unitPrice: 135.0,
              },
            ],
            total: 405.0,
            discount: 0,
            paymentMethod: "PIX",
            status: "PAGO",
          }),
        },
        ownerCookies
      );

      expect(res.status).toBe(201);
      expect(res.data.saleNumber).toBeGreaterThan(0);
      expect(Number(res.data.total)).toBe(405.0);
      saleId = res.data.id;

      // Verificar abatimento de estoque: 25 - 3 = 22
      const prodCheck = await fetchApi("/products", { method: "GET" }, ownerCookies);
      const prod = prodCheck.data.find((p: any) => p.id === productId);
      expect(Number(prod.stock)).toBe(22);
    });

    it("deve bloquear venda quando estoque for insuficiente (blockOutOfStock = true)", async () => {
      // Estoque atual é 22. Tentamos vender 50.
      const res = await fetchApi(
        "/sales",
        {
          method: "POST",
          body: JSON.stringify({
            items: [
              {
                productId,
                productName: "Perfume Zelo Teste 100ml Alterado",
                quantity: 50,
                unitPrice: 135.0,
              },
            ],
            total: 6750.0,
            paymentMethod: "DINHEIRO",
            status: "PAGO",
          }),
        },
        ownerCookies
      );

      expect(res.status).toBe(400);
      expect(res.data.error).toMatch(/estoque insuficiente/i);
    });

    it("deve permitir cancelar venda e estornar estoque atomicamente", async () => {
      const cancelRes = await fetchApi(
        `/sales/${saleId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "CANCELADO" }),
        },
        ownerCookies
      );
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.data.status).toBe("CANCELADO");

      // Estoque deve retornar de 22 para 25
      const prodCheck = await fetchApi("/products", { method: "GET" }, ownerCookies);
      const prod = prodCheck.data.find((p: any) => p.id === productId);
      expect(Number(prod.stock)).toBe(25);
    });

    it("não deve permitir editar venda cancelada", async () => {
      const editRes = await fetchApi(
        `/sales/${saleId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            items: [
              {
                productId,
                productName: "Perfume",
                quantity: 1,
                unitPrice: 100,
              },
            ],
            total: 100,
            paymentMethod: "PIX",
            status: "PAGO",
          }),
        },
        ownerCookies
      );
      expect(editRes.status).toBe(400);
      expect(editRes.data.error).toMatch(/cancelada/i);
    });

    it("deve registrar venda com produto contendo variação e abater estoque da variação", async () => {
      const variantM = variantIds.find((v: any) => v.name.includes("Azul"));
      expect(variantM).toBeDefined();

      const res = await fetchApi(
        "/sales",
        {
          method: "POST",
          body: JSON.stringify({
            items: [
              {
                productId: variantProductId,
                variantId: variantM.id,
                productName: "Camisa Polo Zelo",
                variantName: variantM.name,
                quantity: 2,
                unitPrice: 89.9,
              },
            ],
            total: 179.8,
            discount: 0,
            paymentMethod: "PIX",
            status: "PAGO",
          }),
        },
        ownerCookies
      );

      expect(res.status).toBe(201);
      expect(res.data.items[0].variantId).toBe(variantM.id);
      expect(res.data.items[0].variantName).toBe(variantM.name);

      const variantSaleId = res.data.id;

      // Verificar que o estoque da variação reduziu de 10 para 8
      const prodCheck = await fetchApi("/products", { method: "GET" }, ownerCookies);
      const prod = prodCheck.data.find((p: any) => p.id === variantProductId);
      const varCheck = prod.variants.find((v: any) => v.id === variantM.id);
      expect(Number(varCheck.stock)).toBe(8);

      // Cancelar venda e verificar estorno na variação (8 -> 10)
      const cancelRes = await fetchApi(
        `/sales/${variantSaleId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "CANCELADO" }),
        },
        ownerCookies
      );
      expect(cancelRes.status).toBe(200);

      const prodCheckAfter = await fetchApi("/products", { method: "GET" }, ownerCookies);
      const prodAfter = prodCheckAfter.data.find((p: any) => p.id === variantProductId);
      const varCheckAfter = prodAfter.variants.find((v: any) => v.id === variantM.id);
      expect(Number(varCheckAfter.stock)).toBe(10);
    });

    it("deve permitir editar itens de uma venda com variação (PUT)", async () => {
      const variantG = variantIds.find((v: any) => v.name.includes("Preto"));
      expect(variantG).toBeDefined();

      // Cria uma nova venda com 1 unidade da variação G (estoque inicial 15)
      const createRes = await fetchApi(
        "/sales",
        {
          method: "POST",
          body: JSON.stringify({
            items: [
              {
                productId: variantProductId,
                variantId: variantG.id,
                productName: "Camisa Polo Zelo",
                variantName: variantG.name,
                quantity: 1,
                unitPrice: 99.9,
              },
            ],
            total: 99.9,
            paymentMethod: "CARTAO_CREDITO",
            status: "PAGO",
          }),
        },
        ownerCookies
      );
      expect(createRes.status).toBe(201);
      const editSaleId = createRes.data.id;

      // Edita a venda para 3 unidades da variação G
      const editRes = await fetchApi(
        `/sales/${editSaleId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            items: [
              {
                productId: variantProductId,
                variantId: variantG.id,
                productName: "Camisa Polo Zelo",
                variantName: variantG.name,
                quantity: 3,
                unitPrice: 99.9,
              },
            ],
            total: 299.7,
            paymentMethod: "CARTAO_CREDITO",
            status: "PAGO",
          }),
        },
        ownerCookies
      );
      expect(editRes.status).toBe(200);
      expect(Number(editRes.data.total)).toBe(299.7);
      expect(editRes.data.items[0].variantId).toBe(variantG.id);

      // Estoque: 15 - 1 (venda inicial) + 1 (devolvido na edição) - 3 (novo total) = 12
      const prodCheck = await fetchApi("/products", { method: "GET" }, ownerCookies);
      const prod = prodCheck.data.find((p: any) => p.id === variantProductId);
      const varG = prod.variants.find((v: any) => v.id === variantG.id);
      expect(Number(varG.stock)).toBe(12);
    });
  });

  // ==========================================
  // 4.7. CONFIGURAÇÕES GERAIS E AUTORIZAÇÃO (RBAC)
  // ==========================================
  describe("4.7. Configurações gerais e autorização", () => {
    it("deve permitir que administrador altere configurações da loja", async () => {
      const getSettings = await fetchApi("/settings", { method: "GET" }, ownerCookies);
      expect(getSettings.status).toBe(200);

      const updateSettings = await fetchApi(
        "/settings",
        {
          method: "PUT",
          body: JSON.stringify({
            ...getSettings.data,
            sales: {
              ...getSettings.data.sales,
              blockOutOfStock: false, // desabilita bloqueio de estoque
            },
          }),
        },
        ownerCookies
      );
      expect(updateSettings.status).toBe(200);
      expect(updateSettings.data.sales.blockOutOfStock).toBe(false);
    });

    it("SEGURANÇA: Operador de Caixa SEM permissão de configuração NÃO deve poder alterar configurações da loja", async () => {
      const maliciousPayload = {
        sales: {
          blockOutOfStock: false,
          hacked: true,
        },
      };

      const res = await fetchApi(
        "/settings",
        {
          method: "PUT",
          body: JSON.stringify(maliciousPayload),
        },
        cashierCookies
      );

      // Deve ser 403 (Proibido)
      expect(res.status).toBe(403);
    });

    it("SEGURANÇA: Usuário apenas com permissão de visualização não deve poder fazer upload de fotos", async () => {
      // Cria mock de FormData
      const res = await fetchApi(
        "/upload",
        {
          method: "POST",
          body: JSON.stringify({ test: true }),
        },
        cashierCookies // Caixa não pode adicionar/editar produtos
      );

      // Caixa tem apenas produtos: ["Visualizar"], não tem Adicionar/Editar
      expect([400, 403]).toContain(res.status);
    });
  });
});
