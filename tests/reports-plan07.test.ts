import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.hoisted(() => {
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || "test-jwt-secret-min-32-chars-for-unit-tests";
});

const mockPrisma = vi.hoisted(() => ({
  loja: { findUnique: vi.fn() },
  sale: { findMany: vi.fn() },
  product: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import * as authModule from "@/lib/auth";
import { GET as getReports } from "@/app/api/reports/route";

function mockAuthorizedUser() {
  vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
    id: "user-1",
    name: "Admin",
    email: "admin@zelo.com",
    active: true,
    groupId: "group-1",
    groupName: "Administrador",
    isAdmin: true,
    isOwner: true,
    permissions: { relatorios: ["Visualizar"] },
    lojaId: "loja-1",
    onboardingCompleted: true,
  });
  mockPrisma.loja.findUnique.mockResolvedValue({
    name: "Loja Teste",
    ownerName: "Admin",
    phone: "11999999999",
  });
}

describe("Plano 07 — Precisão Financeira, Soft Delete e Fuso em /api/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizedUser();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("filtra deletedAt: null e calcula datas com tzOffset em todas as consultas", async () => {
    mockPrisma.sale.findMany.mockResolvedValue([]);
    mockPrisma.product.findMany.mockResolvedValue([]);

    for (const type of [
      "top-products",
      "least-products",
      "top-clients",
      "debtor-clients",
      "financial-summary",
    ]) {
      const res = await getReports(
        new Request(
          `http://localhost:3000/api/reports?type=${type}&startDate=2026-11-01&endDate=2026-11-26&tzOffset=180`
        )
      );
      expect(res.status).toBe(200);
    }

    expect(mockPrisma.sale.findMany).toHaveBeenCalledTimes(5);
    for (const call of mockPrisma.sale.findMany.mock.calls) {
      const where = call[0].where;
      expect(where.lojaId).toBe("loja-1");
      expect(where.deletedAt).toBeNull();
      expect(where.date.gte).toEqual(new Date("2026-11-01T03:00:00.000Z"));
      expect(where.date.lte).toEqual(new Date("2026-11-27T02:59:59.999Z"));
    }
  });

  it("financial-summary ignora descontos e acréscimos de vendas CANCELADO e retorna totalSurcharge", async () => {
    mockPrisma.sale.findMany.mockResolvedValue([
      {
        id: "s1",
        status: "PAGO",
        total: 90,
        discount: 10,
        surcharge: 0,
        paymentMethod: "PIX",
      },
      {
        id: "s2",
        status: "PENDENTE",
        total: 115,
        discount: 0,
        surcharge: 15,
        paymentMethod: "FIADO",
      },
      {
        id: "s3",
        status: "CANCELADO",
        total: 200,
        discount: 50,
        surcharge: 20,
        paymentMethod: "DINHEIRO",
      },
    ]);

    const res = await getReports(
      new Request("http://localhost:3000/api/reports?type=financial-summary")
    );
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.summary.totalSalesCount).toBe(3);
    expect(json.summary.validSalesCount).toBe(2);
    expect(json.summary.grossRevenue).toBe(205);
    expect(json.summary.netRevenue).toBe(90);
    expect(json.summary.pendingRevenue).toBe(115);
    expect(json.summary.cancelledRevenue).toBe(200);
    expect(json.summary.totalDiscount).toBe(10);
    expect(json.summary.totalSurcharge).toBe(15);
    expect(json.paymentsBreakdown.map((p: any) => p.method)).toEqual([
      "FIADO",
      "PIX",
    ]);
  });

  it("least-products calcula resumo no universo total antes do slice(0, limit) e sinaliza fallback de preço", async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: "p1",
        name: "Produto A (custo ok)",
        code: "A",
        stock: 10,
        costPrice: 5,
        salePrice: 20,
        category: { name: "Geral" },
        variants: [],
      },
      {
        id: "p2",
        name: "Produto B (sem custo)",
        code: "B",
        stock: 4,
        costPrice: 0,
        salePrice: 30,
        category: { name: "Geral" },
        variants: [],
      },
      {
        id: "p3",
        name: "Produto C (vendeu 2)",
        code: "C",
        stock: 2,
        costPrice: 8,
        salePrice: 25,
        category: { name: "Geral" },
        variants: [],
      },
    ]);
    mockPrisma.sale.findMany.mockResolvedValue([
      {
        total: 50,
        items: [{ productId: "p3", quantity: 2, subtotal: 50 }],
      },
    ]);

    const res = await getReports(
      new Request("http://localhost:3000/api/reports?type=least-products&limit=1")
    );
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.data[0].productId).toBe("p1");
    expect(json.summary.totalProductsCount).toBe(3);
    expect(json.summary.displayedCount).toBe(1);
    expect(json.summary.zeroSalesCount).toBe(2);
    expect(json.summary.totalStockItems).toBe(16);
    expect(json.summary.totalStockValue).toBe(10 * 5 + 4 * 30 + 2 * 8);
    expect(json.summary.costValuedCount).toBe(2);
    expect(json.summary.saleFallbackCount).toBe(1);
  });

  it("top-products separa variações distintas e rateia desconto da venda na receita", async () => {
    mockPrisma.sale.findMany.mockResolvedValue([
      {
        id: "sale-1",
        total: 90,
        items: [
          {
            productId: "prod-1",
            productName: "Camiseta",
            variantId: "var-p",
            variantName: "P",
            quantity: 1,
            unitPrice: 50,
            subtotal: 50,
            variant: { id: "var-p", name: "P", stock: 7 },
            product: {
              name: "Camiseta",
              code: "CAM",
              categoryId: "cat-1",
              category: { name: "Roupas" },
              variants: [
                { id: "var-p", stock: 7 },
                { id: "var-g", stock: 3 },
              ],
            },
          },
          {
            productId: "prod-1",
            productName: "Camiseta",
            variantId: "var-g",
            variantName: "G",
            quantity: 1,
            unitPrice: 50,
            subtotal: 50,
            variant: { id: "var-g", name: "G", stock: 3 },
            product: {
              name: "Camiseta",
              code: "CAM",
              categoryId: "cat-1",
              category: { name: "Roupas" },
              variants: [
                { id: "var-p", stock: 7 },
                { id: "var-g", stock: 3 },
              ],
            },
          },
        ],
      },
    ]);

    const res = await getReports(
      new Request("http://localhost:3000/api/reports?type=top-products")
    );
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.data).toHaveLength(2);
    expect(json.data[0].variantName).toBe("P");
    expect(json.data[0].currentStock).toBe(7);
    expect(json.data[0].totalRevenue).toBeCloseTo(45, 5);
    expect(json.data[0].salePrice).toBeCloseTo(45, 5);
    expect(json.data[1].variantName).toBe("G");
    expect(json.data[1].currentStock).toBe(3);
    expect(json.summary.totalRevenue).toBeCloseTo(90, 5);
  });

  it("debtor-clients avalia atraso pela data local conforme tzOffset", async () => {
    vi.useFakeTimers();
    // 2026-11-27 01:00 UTC = 2026-11-26 22:00 BRT (-03:00, tzOffset=180)
    vi.setSystemTime(new Date("2026-11-27T01:00:00.000Z"));

    mockPrisma.sale.findMany.mockResolvedValue([
      {
        clientId: "c-hoje",
        clientName: "Cliente Hoje",
        total: 100,
        date: new Date("2026-11-20T15:00:00.000Z"),
        dueDate: new Date("2026-11-26T12:00:00.000Z"),
        client: { id: "c-hoje", name: "Cliente Hoje", phone: "", email: "" },
      },
      {
        clientId: "c-vencido",
        clientName: "Cliente Vencido",
        total: 80,
        date: new Date("2026-11-18T15:00:00.000Z"),
        dueDate: new Date("2026-11-25T12:00:00.000Z"),
        client: { id: "c-vencido", name: "Cliente Vencido", phone: "", email: "" },
      },
    ]);

    const res = await getReports(
      new Request("http://localhost:3000/api/reports?type=debtor-clients&tzOffset=180")
    );
    expect(res.status).toBe(200);
    const json = await res.json();

    const hoje = json.data.find((d: any) => d.clientId === "c-hoje");
    const vencido = json.data.find((d: any) => d.clientId === "c-vencido");
    expect(hoje.isOverdue).toBe(false);
    expect(vencido.isOverdue).toBe(true);
    expect(json.summary.totalOverdueDebt).toBe(80);
  });
});
