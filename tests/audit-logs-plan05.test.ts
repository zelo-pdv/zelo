import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || "test-jwt-secret-min-32-chars-for-unit-tests";
});

const { mockPrisma, createAuditLogMock } = vi.hoisted(() => ({
  mockPrisma: {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    client: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  createAuditLogMock: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/audit", () => ({
  createAuditLog: (...args: any[]) => createAuditLogMock(...args),
}));
vi.mock("@/lib/validations/uniqueness", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/validations/uniqueness")>();
  return {
    ...actual,
    checkEmailConflict: vi.fn().mockResolvedValue(null),
    checkPhoneConflict: vi.fn().mockResolvedValue(null),
  };
});

import * as authModule from "@/lib/auth";
import { formatAuditLog } from "@/lib/audit-formatter";
import { GET as getAudit } from "@/app/api/audit/route";
import { POST as importProducts } from "@/app/api/import/products/route";
import { POST as importClients } from "@/app/api/import/clients/route";

describe("Plano 05 — Formatadores de Auditoria, Filtros /api/audit e Logs de Importação", () => {
  const adminUser = {
    id: "admin-1",
    name: "Admin Teste",
    email: "admin@loja.com",
    active: true,
    groupId: "g-admin",
    groupName: "Admins",
    isAdmin: true,
    isOwner: true,
    permissions: {},
    lojaId: "loja-1",
    onboardingCompleted: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(adminUser as any);
  });

  it("formatAuditLog formata STOCK_ENTRY (ENTRY/OUT/ADJUSTMENT), STOCK_REVERT, SYNC_OFFLINE_SALES e importações sem cair no fallback", () => {
    const entry = formatAuditLog({
      action: "STOCK_ENTRY",
      entity: "StockMovement",
      details: {
        type: "ENTRY",
        productName: "Sabonete",
        quantity: 10,
        previousStock: 5,
        resultStock: 15,
      },
      createdAt: new Date(),
    });
    expect(entry.title).toBe("Entrada de estoque");
    expect(entry.primaryDetail).toContain("Sabonete");
    expect(entry.secondaryDetail).toContain("5 → 15");

    const out = formatAuditLog({
      action: "STOCK_ENTRY",
      entity: "StockMovement",
      details: { type: "OUT", productName: "Perfume", quantity: 2, previousStock: 8, resultStock: 6 },
      createdAt: new Date(),
    });
    expect(out.title).toBe("Saída de estoque");

    const adj = formatAuditLog({
      action: "STOCK_ENTRY",
      entity: "StockMovement",
      details: { type: "ADJUSTMENT", productName: "Creme", quantity: 12, previousStock: 10, resultStock: 12 },
      createdAt: new Date(),
    });
    expect(adj.title).toBe("Ajuste de estoque");

    const revert = formatAuditLog({
      action: "STOCK_REVERT",
      entity: "StockMovement",
      details: {
        productName: "Sabonete",
        originalType: "ENTRY",
        originalQuantity: 10,
        resultStock: 5,
      },
      createdAt: new Date(),
    });
    expect(revert.title).toBe("Reversão de movimentação");
    expect(revert.title).not.toBe("Ação no sistema registrada");

    const sync = formatAuditLog({
      action: "SYNC_OFFLINE_SALES",
      entity: "Sale",
      details: { count: 2, sales: [{ saleNumber: 12 }, { saleNumber: 13 }] },
      createdAt: new Date(),
    });
    expect(sync.title).toBe("Sincronização de vendas offline");
    expect(sync.secondaryDetail).toContain("#12, #13");

    const catImport = formatAuditLog({
      action: "IMPORT_CATALOG_PRODUCTS",
      entity: "Product",
      details: { importedCount: 4, skippedCount: 1 },
      createdAt: new Date(),
    });
    expect(catImport.title).toBe("Importação de catálogo");

    const csvProd = formatAuditLog({
      action: "IMPORT_PRODUCTS",
      entity: "Product",
      details: { importedCount: 3, sampleNames: ["A", "B"] },
      createdAt: new Date(),
    });
    expect(csvProd.title).toBe("Importação de produtos via planilha");

    const csvCli = formatAuditLog({
      action: "IMPORT_CLIENTS",
      entity: "Client",
      details: { importedCount: 2, sampleNames: ["Maria"] },
      createdAt: new Date(),
    });
    expect(csvCli.title).toBe("Importação de clientes via planilha");
  });

  it("GET /api/audit inclui StockMovement em category=produtos, SYNC_OFFLINE_SALES em vendas e busca dentro de details com fuso local", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([]) // users search
      .mockResolvedValueOnce([{ id: "log_match_1" }]); // details search

    await getAudit(
      new Request(
        "http://localhost:3000/api/audit?category=produtos&search=Sabonete&startDate=2026-11-26&tzOffset=180"
      )
    );

    const callArg = mockPrisma.auditLog.findMany.mock.calls[0][0];
    expect(callArg.where.OR).toEqual(
      expect.arrayContaining([
        { entity: { in: ["Product", "StockMovement"] } },
        expect.objectContaining({
          action: {
            in: expect.arrayContaining([
              "STOCK_ENTRY",
              "STOCK_REVERT",
              "IMPORT_CATALOG_PRODUCTS",
              "IMPORT_PRODUCTS",
            ]),
          },
        }),
      ])
    );
    // Data inicial BRT (-03:00) para 2026-11-26 equivale a 2026-11-26T03:00:00.000Z
    expect(callArg.where.createdAt.gte.toISOString()).toBe("2026-11-26T03:00:00.000Z");
    expect(callArg.where.AND[0].OR).toEqual(
      expect.arrayContaining([{ id: { in: ["log_match_1"] } }])
    );

    vi.clearAllMocks();
    vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(adminUser as any);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.user.findMany.mockResolvedValue([]);

    await getAudit(new Request("http://localhost:3000/api/audit?category=vendas"));
    const vendasWhere = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(vendasWhere.OR[1].action.in).toContain("SYNC_OFFLINE_SALES");
  });

  it("POST /api/import/products e POST /api/import/clients gravam AuditLog após persistência", async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        category: {
          findMany: vi.fn().mockResolvedValue([{ id: "cat-1", name: "Geral" }]),
          create: vi.fn(),
        },
        product: { create: vi.fn().mockResolvedValue({ id: "p-1" }) },
      })
    );

    const prodRes = await importProducts(
      new Request("http://localhost:3000/api/import/products", {
        method: "POST",
        body: JSON.stringify({
          headers: ["nome", "preco de venda", "estoque"],
          items: [{ nome: "Batom Matte", "preco de venda": "39.90", estoque: "5" }],
        }),
      })
    );
    expect(prodRes.status).toBe(200);
    expect(createAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "IMPORT_PRODUCTS",
        entity: "Product",
        lojaId: "loja-1",
      })
    );

    vi.clearAllMocks();
    vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(adminUser as any);
    mockPrisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        client: { create: vi.fn().mockResolvedValue({ id: "c-1" }) },
      })
    );

    const cliRes = await importClients(
      new Request("http://localhost:3000/api/import/clients", {
        method: "POST",
        body: JSON.stringify({
          headers: ["nome", "telefone"],
          items: [{ nome: "Joana Silva", telefone: "11999998888" }],
        }),
      })
    );
    expect(cliRes.status).toBe(200);
    expect(createAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "IMPORT_CLIENTS",
        entity: "Client",
        lojaId: "loja-1",
      })
    );
  });
});
