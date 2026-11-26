import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/jwt-secret", () => {
  const secret = "test-secret-at-least-32-characters-long";
  return {
    JWT_SECRET_RAW: secret,
    JWT_SECRET: new TextEncoder().encode(secret),
  };
});

import { GET as getSync, POST as postSync } from "@/app/api/sync/route";
import prisma from "@/lib/prisma";
import * as authModule from "@/lib/auth";
import * as requirePermissionModule from "@/lib/require-permission";

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      settings: {
        findUnique: vi.fn(),
      },
      client: {
        findFirst: vi.fn(),
        create: vi.fn(),
        aggregate: vi.fn(),
      },
      product: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        aggregate: vi.fn(),
      },
      productVariant: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      sale: {
        findFirst: vi.fn(),
        create: vi.fn(),
        aggregate: vi.fn(),
      },
      category: {
        aggregate: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        aggregate: vi.fn(),
      },
      accessGroup: {
        aggregate: vi.fn(),
      },
      stockMovement: {
        create: vi.fn(),
        aggregate: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@/lib/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}));

describe("Offline Batch Sync Endpoint (/api/sync)", () => {
  const mockAdminUser = {
    id: "user-1",
    name: "Operador Teste",
    lojaId: "loja-1",
    isAdmin: true,
    isOwner: true,
    groupId: "grp-1",
    groupName: "Admins",
    active: true,
    permissions: {
      "nova-venda": ["Visualizar", "Adicionar"],
      clientes: ["Visualizar", "Adicionar"],
      produtos: ["Visualizar", "Adicionar"],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(requirePermissionModule, "requirePermission").mockResolvedValue({
      authorized: true as const,
      user: mockAdminUser as any,
    });
    vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(mockAdminUser as any);
  });

  it("GET /api/sync deve incluir hash de stock_movements junto aos demais hashes", async () => {
    const ts = new Date("2026-11-26T10:00:00Z");
    (prisma.product.aggregate as any).mockResolvedValue({ _max: { updatedAt: ts }, _count: { id: 3 } });
    (prisma.client.aggregate as any).mockResolvedValue({ _max: { updatedAt: ts }, _count: { id: 2 } });
    (prisma.sale.aggregate as any).mockResolvedValue({ _max: { updatedAt: ts }, _count: { id: 5 } });
    (prisma.category.aggregate as any).mockResolvedValue({ _max: { updatedAt: ts }, _count: { id: 1 } });
    (prisma.user.aggregate as any).mockResolvedValue({ _max: { updatedAt: ts }, _count: { id: 1 } });
    (prisma.accessGroup.aggregate as any).mockResolvedValue({ _max: { updatedAt: ts }, _count: { id: 1 } });
    (prisma.stockMovement.aggregate as any).mockResolvedValue({ _max: { createdAt: ts }, _count: { id: 12 } });
    (prisma.settings.findUnique as any).mockResolvedValue({ updatedAt: ts });

    const res = await getSync();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stock_movements).toBe(`${ts.getTime()}_12`);
    expect(json.products).toBe(`${ts.getTime()}_3`);
  });

  it("deve retornar sucesso com mapas vazios se o payload estiver vazio", async () => {
    const req = new Request("http://localhost:3000/api/sync", {
      method: "POST",
      body: JSON.stringify({ clients: [], products: [], sales: [] }),
    });

    const res = await postSync(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.idMap).toEqual({});
    expect(json.syncedSales).toEqual([]);
  });

  it("deve bloquear com 403 quando usuário sem permissão tenta sincronizar novos clientes ou produtos", async () => {
    vi.spyOn(requirePermissionModule, "requirePermission").mockResolvedValue({
      authorized: true as const,
      user: {
        ...mockAdminUser,
        isAdmin: false,
        isOwner: false,
        permissions: {
          "nova-venda": ["Visualizar", "Adicionar"],
        },
      } as any,
    });

    const reqClient = new Request("http://localhost:3000/api/sync", {
      method: "POST",
      body: JSON.stringify({
        clients: [{ tempId: "temp_cli_1", name: "Novo Cliente", phone: "11999998888" }],
        products: [],
        sales: [],
      }),
    });
    const resClient = await postSync(reqClient);
    expect(resClient.status).toBe(403);

    const reqProd = new Request("http://localhost:3000/api/sync", {
      method: "POST",
      body: JSON.stringify({
        clients: [],
        products: [{ tempId: "temp_prod_1", name: "Novo Prod", salePrice: 20 }],
        sales: [],
      }),
    });
    const resProd = await postSync(reqProd);
    expect(resProd.status).toBe(403);
  });

  it("deve sincronizar novos clientes, produtos e vendas mapeando IDs provisórios e gravando offlineTempId", async () => {
    const tempClientId = "temp_cli_12345";
    const tempProductId = "temp_prod_67890";
    const tempSaleId = "temp_sale_abcde";

    (prisma.settings.findUnique as any).mockResolvedValue({
      config: { products: { trackStock: true } },
    });

    const saleCreateMock = vi.fn().mockResolvedValue({
      id: "real_sale_1",
      saleNumber: 51,
    });

    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const txMock = {
        client: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce(null) // dedup by phone
            .mockResolvedValueOnce({ id: "real_client_1" }), // clientExists check
          create: vi.fn().mockResolvedValue({ id: "real_client_1", name: "Cliente Offline" }),
        },
        product: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: "real_product_1",
            name: "Produto Offline",
            salePrice: 45,
            stock: 10,
          }),
          findUnique: vi.fn().mockResolvedValue({ stock: 10 }),
          update: vi.fn().mockResolvedValue({ stock: 8 }),
        },
        productVariant: {
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        sale: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce(null) // idempotency check by offlineTempId
            .mockResolvedValueOnce({ saleNumber: 50 }) // last sale
            .mockResolvedValueOnce(null), // verify next sale number doesn't collide
          create: saleCreateMock,
        },
        stockMovement: {
          create: vi.fn().mockResolvedValue({ id: "mov_1" }),
        },
        user: {
          findUnique: vi.fn(),
        },
      };
      return callback(txMock);
    });

    const payload = {
      clients: [
        { tempId: tempClientId, name: "Cliente Offline", phone: "11999998888" },
      ],
      products: [
        { tempId: tempProductId, name: "Produto Offline", salePrice: 45.0, stock: 10 },
      ],
      sales: [
        {
          tempId: tempSaleId,
          clientId: tempClientId,
          clientName: "Cliente Offline",
          items: [
            {
              productId: tempProductId,
              productName: "Produto Offline",
              quantity: 2,
              unitPrice: 45.0,
            },
          ],
          total: 90.0,
          paymentMethod: "DINHEIRO",
          status: "PAGO",
        },
      ],
    };

    const req = new Request("http://localhost:3000/api/sync", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await postSync(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.idMap[tempClientId]).toBe("real_client_1");
    expect(data.idMap[tempProductId]).toBe("real_product_1");
    expect(data.idMap[tempSaleId]).toBe("real_sale_1");
    expect(data.syncedSales[0]).toEqual({
      tempId: tempSaleId,
      serverId: "real_sale_1",
      saleNumber: 51,
    });
    expect(saleCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          offlineTempId: tempSaleId,
          total: 90,
        }),
      })
    );
  });

  it("deve garantir idempotência quando offlineTempId já foi sincronizado anteriormente", async () => {
    (prisma.settings.findUnique as any).mockResolvedValue({
      config: { products: { trackStock: true } },
    });

    const saleCreateMock = vi.fn();
    const productUpdateMock = vi.fn();

    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const txMock = {
        client: { findFirst: vi.fn(), create: vi.fn() },
        product: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: productUpdateMock },
        productVariant: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        sale: {
          findFirst: vi.fn().mockResolvedValueOnce({
            id: "existing_sale_99",
            saleNumber: 77,
          }),
          create: saleCreateMock,
        },
        stockMovement: { create: vi.fn() },
        user: { findUnique: vi.fn() },
      };
      return callback(txMock);
    });

    const req = new Request("http://localhost:3000/api/sync", {
      method: "POST",
      body: JSON.stringify({
        clients: [],
        products: [],
        sales: [
          {
            tempId: "temp_sale_replay",
            items: [{ productId: "prod-1", productName: "Prod", quantity: 1, unitPrice: 10 }],
            total: 10,
            paymentMethod: "PIX",
            status: "PAGO",
          },
        ],
      }),
    });

    const res = await postSync(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.idMap.temp_sale_replay).toBe("existing_sale_99");
    expect(json.syncedSales).toEqual([
      { tempId: "temp_sale_replay", serverId: "existing_sale_99", saleNumber: 77 },
    ]);
    expect(saleCreateMock).not.toHaveBeenCalled();
    expect(productUpdateMock).not.toHaveBeenCalled();
  });

  it("deve recalcular preço pelo servidor (ignorando adulteração do cliente), validar blockOutOfStock e limite de desconto", async () => {
    (prisma.settings.findUnique as any).mockResolvedValue({
      config: {
        products: { trackStock: true },
        sales: {
          blockOutOfStock: true,
          openPriceEnabled: false,
          discountLimitEnabled: true,
          maxDiscountPercentage: 10,
        },
      },
    });

    const saleCreateMock = vi.fn().mockResolvedValue({ id: "sale_server_price", saleNumber: 12 });

    // Caso 1: Preço adulterado no cliente é ignorado e substituído pelo preço do servidor
    (prisma.$transaction as any).mockImplementationOnce(async (callback: any) => {
      const txMock = {
        client: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
        product: {
          findFirst: vi.fn().mockResolvedValue({
            id: "prod-1",
            name: "Camiseta",
            salePrice: 50,
            stock: 5,
          }),
          findUnique: vi.fn().mockResolvedValue({ stock: 5 }),
          update: vi.fn().mockResolvedValue({ stock: 3 }),
        },
        productVariant: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        sale: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ saleNumber: 11 })
            .mockResolvedValueOnce(null),
          create: saleCreateMock,
        },
        stockMovement: { create: vi.fn() },
        user: { findUnique: vi.fn() },
      };
      return callback(txMock);
    });

    const resPrice = await postSync(
      new Request("http://localhost:3000/api/sync", {
        method: "POST",
        body: JSON.stringify({
          clients: [],
          products: [],
          sales: [
            {
              tempId: "temp_sale_price",
              items: [{ productId: "prod-1", productName: "Camiseta", quantity: 2, unitPrice: 0.01 }],
              total: 0.02,
              paymentMethod: "DINHEIRO",
              status: "PAGO",
            },
          ],
        }),
      })
    );
    expect(resPrice.status).toBe(200);
    expect(saleCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          total: 100,
        }),
      })
    );

    // Caso 2: blockOutOfStock bloqueia venda offline com estoque insuficiente
    (prisma.$transaction as any).mockImplementationOnce(async (callback: any) => {
      const txMock = {
        client: { findFirst: vi.fn(), create: vi.fn() },
        product: {
          findFirst: vi.fn().mockResolvedValue({
            id: "prod-1",
            name: "Camiseta",
            salePrice: 50,
            stock: 1,
          }),
        },
        productVariant: { findFirst: vi.fn() },
        sale: { findFirst: vi.fn().mockResolvedValueOnce(null) },
        stockMovement: { create: vi.fn() },
        user: { findUnique: vi.fn() },
      };
      return callback(txMock);
    });

    const resOos = await postSync(
      new Request("http://localhost:3000/api/sync", {
        method: "POST",
        body: JSON.stringify({
          clients: [],
          products: [],
          sales: [
            {
              tempId: "temp_sale_oos",
              items: [{ productId: "prod-1", productName: "Camiseta", quantity: 3, unitPrice: 50 }],
              total: 150,
              paymentMethod: "DINHEIRO",
              status: "PAGO",
            },
          ],
        }),
      })
    );
    expect(resOos.status).toBe(400);

    // Caso 3: Desconto acima do limite permitido é rejeitado com 400
    vi.spyOn(requirePermissionModule, "requirePermission").mockResolvedValueOnce({
      authorized: true as const,
      user: { ...mockAdminUser, isAdmin: false, isOwner: false } as any,
    });
    (prisma.$transaction as any).mockImplementationOnce(async (callback: any) => {
      const txMock = {
        client: { findFirst: vi.fn(), create: vi.fn() },
        product: {
          findFirst: vi.fn().mockResolvedValue({
            id: "prod-1",
            name: "Camiseta",
            salePrice: 100,
            stock: 10,
          }),
        },
        productVariant: { findFirst: vi.fn() },
        sale: { findFirst: vi.fn().mockResolvedValueOnce(null) },
        stockMovement: { create: vi.fn() },
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: "user-1",
            discountLimitMode: "INHERIT",
            group: null,
          }),
        },
      };
      return callback(txMock);
    });

    const resDiscount = await postSync(
      new Request("http://localhost:3000/api/sync", {
        method: "POST",
        body: JSON.stringify({
          clients: [],
          products: [],
          sales: [
            {
              tempId: "temp_sale_disc",
              items: [{ productId: "prod-1", productName: "Camiseta", quantity: 1, unitPrice: 100 }],
              total: 50,
              discount: 50,
              paymentMethod: "DINHEIRO",
              status: "PAGO",
            },
          ],
        }),
      })
    );
    expect(resDiscount.status).toBe(400);
  });
});
