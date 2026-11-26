import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || "test-jwt-secret-min-32-chars-for-unit-tests";
});

const mockTx = vi.hoisted(() => ({
  product: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  productVariant: { findUnique: vi.fn(), update: vi.fn() },
  client: { findMany: vi.fn(), updateMany: vi.fn() },
  loja: { findUnique: vi.fn() },
  user: { findMany: vi.fn(), deleteMany: vi.fn() },
  settings: { findUnique: vi.fn() },
  sale: { findMany: vi.fn(), update: vi.fn() },
  stockMovement: { create: vi.fn() },
}));

const mockPrisma = vi.hoisted(() => ({
  ...mockTx,
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
}));

const mockListMovements = vi.hoisted(() => vi.fn());
const mockDownloadCsv = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/services/stock-movements.service", () => ({
  stockMovementsService: {
    list: mockListMovements,
  },
}));
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

import * as authModule from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { POST as bulkDeleteProducts } from "@/app/api/products/bulk-delete/route";
import { POST as bulkDeleteClients } from "@/app/api/clients/bulk-delete/route";
import { POST as bulkDeleteUsers } from "@/app/api/users/bulk-delete/route";
import { POST as bulkCancelSales } from "@/app/api/sales/bulk-cancel/route";
import { POST as postStockMovement } from "@/app/api/stock-movements/route";
import { formatAuditLog } from "@/lib/audit-formatter";
import { handleExportStockMovements } from "@/lib/export";

function mockAdmin() {
  vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
    id: "admin-1",
    name: "Admin",
    email: "admin@zelo.com",
    active: true,
    groupId: "g-admin",
    groupName: "Administrador",
    isAdmin: true,
    isOwner: true,
    permissions: {
      produtos: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      clientes: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      historico: ["Visualizar", "Editar", "Excluir"],
      estoque: ["Visualizar", "Adicionar"],
    },
    lojaId: "loja-1",
    onboardingCompleted: true,
  });
}

describe("Plano 08 — Bulk Transacional, Controle de Estoque e Exportação Paginada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
  });

  it("POST /api/products/bulk-delete exclui válidos transacionalmente, reporta faltantes e gera 1 log", async () => {
    mockTx.product.findMany.mockResolvedValue([
      { id: "p1", name: "Camisa", code: "CAM-1", barcode: "7891" },
    ]);
    mockTx.product.update.mockResolvedValue({});

    const res = await bulkDeleteProducts(
      new Request("http://localhost:3000/api/products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["p1", "p-inexistente"] }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deletedIds).toEqual(["p1"]);
    expect(json.failed).toEqual([
      { id: "p-inexistente", reason: "Produto não encontrado." },
    ]);
    expect(createAuditLog).toHaveBeenCalledTimes(1);
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "BULK_DELETE_PRODUCTS", entity: "Product" }),
    );
  });

  it("POST /api/clients/bulk-delete protege Consumidor Final case-insensitive em falha parcial", async () => {
    mockTx.client.findMany.mockResolvedValue([
      { id: "c-cf", name: "  consumidor final  " },
      { id: "c-2", name: "Maria Silva" },
    ]);
    mockTx.client.updateMany.mockResolvedValue({ count: 1 });

    const res = await bulkDeleteClients(
      new Request("http://localhost:3000/api/clients/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["c-cf", "c-2"] }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deletedIds).toEqual(["c-2"]);
    expect(json.failed).toHaveLength(1);
    expect(json.failed[0].id).toBe("c-cf");
    expect(createAuditLog).toHaveBeenCalledTimes(1);
  });

  it("POST /api/users/bulk-delete bloqueia owner e o próprio usuário em lote", async () => {
    mockTx.loja.findUnique.mockResolvedValue({ ownerId: "owner-1" });
    mockTx.user.findMany.mockResolvedValue([
      { id: "owner-1", name: "Dono", email: "dono@loja.com" },
      { id: "admin-1", name: "Admin", email: "admin@zelo.com" },
      { id: "u-3", name: "Caixa", email: "caixa@loja.com" },
    ]);
    mockTx.user.deleteMany.mockResolvedValue({ count: 1 });

    const res = await bulkDeleteUsers(
      new Request("http://localhost:3000/api/users/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["owner-1", "admin-1", "u-3"] }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deletedIds).toEqual(["u-3"]);
    expect(json.failed.map((f: any) => f.id)).toEqual(["owner-1", "admin-1"]);
    expect(createAuditLog).toHaveBeenCalledTimes(1);
  });

  it("POST /api/sales/bulk-cancel cancela apenas ativas, estorna estoque e ignora já canceladas", async () => {
    mockTx.settings.findUnique.mockResolvedValue({
      config: { products: { trackStock: true } },
    });
    mockTx.sale.findMany.mockResolvedValue([
      {
        id: "s-cancel",
        saleNumber: 101,
        status: "CANCELADO",
        items: [],
      },
      {
        id: "s-pago",
        saleNumber: 102,
        status: "PAGO",
        items: [{ productId: "p1", variantId: null, quantity: 2 }],
      },
    ]);
    mockTx.sale.update.mockResolvedValue({});
    mockTx.product.findUnique.mockResolvedValue({ stock: 5 });
    mockTx.product.update.mockResolvedValue({ stock: 7 });
    mockTx.stockMovement.create.mockResolvedValue({});

    const res = await bulkCancelSales(
      new Request("http://localhost:3000/api/sales/bulk-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["s-cancel", "s-pago"] }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.cancelledIds).toEqual(["s-pago"]);
    expect(json.failed).toEqual([
      { id: "s-cancel", reason: "Esta venda já está cancelada." },
    ]);
    expect(mockTx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p1" } }),
    );
    expect(mockTx.stockMovement.create).toHaveBeenCalledTimes(1);
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "BULK_CANCEL_SALES", entity: "Sale" }),
    );
  });

  it("POST /api/stock-movements retorna 400 quando trackStock === false", async () => {
    mockPrisma.settings.findUnique.mockResolvedValue({
      config: { products: { trackStock: false } },
    });

    const res = await postStockMovement(
      new Request("http://localhost:3000/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Entrada teste",
          productId: "p1",
          type: "ENTRY",
          quantity: 5,
        }),
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("controle de estoque está desativado");
  });

  it("handleExportStockMovements pagina além de 100 registros sem truncar", async () => {
    const makeItem = (i: number) => ({
      id: `m-${i}`,
      title: `Mov ${i}`,
      type: "ENTRY",
      quantity: 1,
      previousStock: 0,
      resultStock: 1,
      isReverted: false,
      createdAt: "2026-11-26T15:00:00.000Z",
      product: { name: `Prod ${i}`, code: `C${i}`, barcode: "" },
      variant: null,
      user: { name: "Admin" },
      notes: "",
    });

    mockListMovements
      .mockResolvedValueOnce({
        items: Array.from({ length: 100 }, (_, i) => makeItem(i)),
        page: 1,
        limit: 100,
        total: 125,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: Array.from({ length: 25 }, (_, i) => makeItem(100 + i)),
        page: 2,
        limit: 100,
        total: 125,
        totalPages: 2,
      });

    // Simula ambiente DOM mínimo para downloadCsv
    const clickSpy = vi.fn();
    const createElementSpy = vi.fn(() => ({
      setAttribute: vi.fn(),
      click: clickSpy,
      style: {},
    }));
    vi.stubGlobal("document", {
      createElement: createElementSpy,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("Blob", class {
      content: unknown[];
      constructor(content: unknown[]) {
        this.content = content;
        mockDownloadCsv(content.join(""));
      }
    });

    await handleExportStockMovements("ALL", "");

    expect(mockListMovements).toHaveBeenCalledTimes(2);
    expect(mockListMovements).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ page: 1, limit: 100 }),
    );
    expect(mockListMovements).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 2, limit: 100 }),
    );
    expect(clickSpy).toHaveBeenCalledTimes(1);
    const csvOutput = mockDownloadCsv.mock.calls[0]?.[0] as string;
    const dataLines = csvOutput.trim().split("\n").length - 1;
    expect(dataLines).toBe(125);

    vi.unstubAllGlobals();
  });

  it("formatAuditLog formata ações em lote de vendas, produtos, clientes e usuários", () => {
    expect(
      formatAuditLog({
        action: "BULK_CANCEL_SALES",
        entity: "Sale",
        details: { count: 3, saleNumbers: ["#10", "#11", "#12"] },
        createdAt: new Date(),
      }).title,
    ).toBe("Cancelamento de vendas em lote");

    expect(
      formatAuditLog({
        action: "BULK_DELETE_PRODUCTS",
        entity: "Product",
        details: { count: 2, deletedNames: ["Prod A", "Prod B"] },
        createdAt: new Date(),
      }).categoryLabel,
    ).toBe("Produtos");

    expect(
      formatAuditLog({
        action: "BULK_DELETE_CLIENTS",
        entity: "Client",
        details: { count: 2 },
        createdAt: new Date(),
      }).categoryLabel,
    ).toBe("Clientes");

    expect(
      formatAuditLog({
        action: "BULK_DELETE_USERS",
        entity: "User",
        details: { count: 2 },
        createdAt: new Date(),
      }).categoryLabel,
    ).toBe("Equipe");
  });
});
