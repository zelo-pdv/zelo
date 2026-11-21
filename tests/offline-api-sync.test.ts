import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/jwt-secret", () => {
  const secret = "test-secret-at-least-32-characters-long";
  return {
    JWT_SECRET_RAW: secret,
    JWT_SECRET: new TextEncoder().encode(secret),
  };
});

import { POST as postSync } from "@/app/api/sync/route";
import prisma from "@/lib/prisma";
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
      },
      product: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      productVariant: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      sale: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      stockMovement: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@/lib/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}));

describe("Offline Batch Sync Endpoint (/api/sync)", () => {
  const mockUser = {
    id: "user-1",
    name: "Operador Teste",
    lojaId: "loja-1",
    isAdmin: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(requirePermissionModule, "requirePermission").mockResolvedValue({
      authorized: true as const,
      user: mockUser as any,
    });
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

  it("deve sincronizar novos clientes, produtos e vendas mapeando IDs provisórios", async () => {
    const tempClientId = "temp_cli_12345";
    const tempProductId = "temp_prod_67890";
    const tempSaleId = "temp_sale_abcde";

    // Mock do settings
    (prisma.settings.findUnique as any).mockResolvedValue({
      config: { products: { trackStock: true } },
    });

    // Simula transação do Prisma
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const txMock = {
        client: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "real_client_1", name: "Cliente Offline" }),
        },
        product: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "real_product_1", name: "Produto Offline" }),
          findUnique: vi.fn().mockResolvedValue({ stock: 10 }),
          update: vi.fn().mockResolvedValue({ stock: 8 }),
        },
        productVariant: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        sale: {
          findFirst: vi.fn()
            .mockResolvedValueOnce({ saleNumber: 50 }) // last sale
            .mockResolvedValueOnce(null), // verify next sale number doesn't collide
          create: vi.fn().mockResolvedValue({
            id: "real_sale_1",
            saleNumber: 51,
          }),
        },
        stockMovement: {
          create: vi.fn().mockResolvedValue({ id: "mov_1" }),
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
  });
});
