import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiRequestError } from "@/lib/api-request";

const mockQueue: Array<{
  id?: number;
  type: "CREATE_SALE" | "CREATE_CLIENT" | "CREATE_PRODUCT";
  tempId?: string;
  payload: any;
  createdAt: string;
  attempts: number;
  lastError?: string;
}> = [];

const mockSales: Array<any> = [];
const mockClients: Array<any> = [];
const mockProducts: Array<any> = [];

const makeTable = (arr: any[]) => ({
  count: vi.fn(async () => arr.length),
  toArray: vi.fn(async () => arr.map((x) => ({ ...x }))),
  get: vi.fn(async (id: any) => arr.find((x) => x.id === id) ?? null),
  put: vi.fn(async (item: any) => {
    const idx = arr.findIndex((x) => x.id === item.id);
    if (idx >= 0) arr[idx] = item;
    else arr.push(item);
  }),
  update: vi.fn(async (id: any, patch: Record<string, any>) => {
    const item = arr.find((x) => x.id === id);
    if (item) Object.assign(item, patch);
  }),
  delete: vi.fn(async (id: any) => {
    const idx = arr.findIndex((x) => x.id === id);
    if (idx >= 0) arr.splice(idx, 1);
  }),
  bulkDelete: vi.fn(async (ids: any[]) => {
    for (const id of ids) {
      const idx = arr.findIndex((x) => x.id === id);
      if (idx >= 0) arr.splice(idx, 1);
    }
  }),
  filter: vi.fn((fn: (item: any) => boolean) => ({
    toArray: async () => arr.filter(fn).map((x) => ({ ...x })),
  })),
});

const mockDb = {
  syncQueue: makeTable(mockQueue),
  sales: makeTable(mockSales),
  clients: makeTable(mockClients),
  products: makeTable(mockProducts),
  transaction: vi.fn(async (_mode: string, _tables: unknown[], cb: () => Promise<void>) => cb()),
};

vi.mock("@/lib/offline/db", () => ({
  getOfflineDb: () => mockDb,
}));

vi.mock("@/hooks/use-data-sync", () => ({
  notifyLocalSync: vi.fn(),
}));

const apiRequestMock = vi.fn();
vi.mock("@/lib/api-request", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-request")>();
  return {
    ...actual,
    apiRequest: (...args: any[]) => apiRequestMock(...args),
  };
});

// Garantir ambiente browser mockado antes de importar syncManager
vi.stubGlobal("window", { addEventListener: vi.fn() });
vi.stubGlobal("navigator", { onLine: true });

import { syncManager } from "@/lib/offline/sync-manager";

describe("Plano 03 — SyncManager (Backoff, Erro 4xx e Propagação idMap)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue.length = 0;
    mockSales.length = 0;
    mockClients.length = 0;
    mockProducts.length = 0;
    (globalThis as any).navigator.onLine = true;
  });

  it("interrompe retentativa automática após erro 4xx permanente e só retenta no sync manual (force=true)", async () => {
    mockQueue.push({
      id: 1,
      type: "CREATE_SALE",
      payload: { tempId: "temp_sale_bad", items: [], total: 10 },
      createdAt: "2026-11-26T10:00:00Z",
      attempts: 0,
    });

    apiRequestMock.mockRejectedValueOnce(new ApiRequestError("Estoque insuficiente", 400));

    const firstResult = await syncManager.sync(false);
    expect(firstResult.success).toBe(false);
    expect(mockQueue[0].attempts).toBe(5);

    // Novo sync automático deve ignorar item travado e não chamar a API
    const autoSkipResult = await syncManager.sync(false);
    expect(autoSkipResult.success).toBe(true);
    expect(autoSkipResult.syncedCount).toBe(0);
    expect(apiRequestMock).toHaveBeenCalledTimes(1);

    // Sync manual (force=true) deve tentar novamente
    apiRequestMock.mockResolvedValueOnce({
      success: true,
      idMap: { temp_sale_bad: "real_sale_bad" },
      syncedSales: [{ tempId: "temp_sale_bad", serverId: "real_sale_bad", saleNumber: 1 }],
    });
    const manualResult = await syncManager.sync(true);
    expect(manualResult.success).toBe(true);
    expect(manualResult.syncedCount).toBe(1);
    expect(apiRequestMock).toHaveBeenCalledTimes(2);
    expect(mockQueue).toHaveLength(0);
  });

  it("propaga idMap para vendas restantes e itens CREATE_SALE pendentes na fila", async () => {
    mockClients.push({ id: "temp_cli_1", name: "Cliente", isLocalOnly: true });
    mockProducts.push({ id: "temp_prod_1", name: "Produto", isLocalOnly: true });
    mockSales.push({
      id: "temp_sale_1",
      clientId: "temp_cli_1",
      items: [{ productId: "temp_prod_1", productName: "Produto", quantity: 1, unitPrice: 20 }],
      synced: false,
    });
    // Outra venda ainda pendente (simulada como tendo atingido attempts=5, logo excluída de sync(false))
    mockSales.push({
      id: "temp_sale_2",
      clientId: "temp_cli_1",
      items: [{ productId: "temp_prod_1", productName: "Produto", quantity: 2, unitPrice: 20 }],
      synced: false,
    });
    mockQueue.push(
      {
        id: 1,
        type: "CREATE_CLIENT",
        payload: { tempId: "temp_cli_1", name: "Cliente", phone: "11999999999" },
        createdAt: "2026-11-26T10:00:00Z",
        attempts: 0,
      },
      {
        id: 2,
        type: "CREATE_PRODUCT",
        payload: { tempId: "temp_prod_1", name: "Produto", salePrice: 20 },
        createdAt: "2026-11-26T10:00:00Z",
        attempts: 0,
      },
      {
        id: 3,
        type: "CREATE_SALE",
        payload: {
          tempId: "temp_sale_1",
          clientId: "temp_cli_1",
          items: [{ productId: "temp_prod_1", productName: "Produto", quantity: 1, unitPrice: 20 }],
        },
        createdAt: "2026-11-26T10:00:00Z",
        attempts: 0,
      },
      {
        id: 4,
        type: "CREATE_SALE",
        payload: {
          tempId: "temp_sale_2",
          clientId: "temp_cli_1",
          items: [{ productId: "temp_prod_1", productName: "Produto", quantity: 2, unitPrice: 20 }],
        },
        createdAt: "2026-11-26T10:00:00Z",
        attempts: 5,
      }
    );

    apiRequestMock.mockResolvedValueOnce({
      success: true,
      idMap: {
        temp_cli_1: "real_cli_1",
        temp_prod_1: "real_prod_1",
        temp_sale_1: "real_sale_1",
      },
      syncedSales: [{ tempId: "temp_sale_1", serverId: "real_sale_1", saleNumber: 15 }],
    });

    const result = await syncManager.sync(false);
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(3);

    // A venda restante (temp_sale_2) na fila e no IndexedDB deve receber os IDs reais
    expect(mockSales.find((s) => s.id === "temp_sale_2")?.clientId).toBe("real_cli_1");
    expect(mockSales.find((s) => s.id === "temp_sale_2")?.items[0].productId).toBe("real_prod_1");
    expect(mockQueue).toHaveLength(1);
    expect(mockQueue[0].payload.clientId).toBe("real_cli_1");
    expect(mockQueue[0].payload.items[0].productId).toBe("real_prod_1");
  });

  it("injeta tempId do item da fila caso payload antigo de venda offline não tenha payload.tempId", async () => {
    mockSales.push({
      id: "temp_sale_legacy",
      items: [{ productId: "prod-1", productName: "P1", quantity: 1, unitPrice: 10 }],
      synced: false,
    });
    mockQueue.push({
      id: 1,
      type: "CREATE_SALE",
      tempId: "temp_sale_legacy",
      payload: {
        id: "temp_sale_legacy",
        items: [{ productId: "prod-1", productName: "P1", quantity: 1, unitPrice: 10 }],
      },
      createdAt: "2026-11-26T10:00:00Z",
      attempts: 0,
    });

    apiRequestMock.mockResolvedValueOnce({
      success: true,
      idMap: { temp_sale_legacy: "real_sale_legacy" },
      syncedSales: [{ tempId: "temp_sale_legacy", serverId: "real_sale_legacy", saleNumber: 99 }],
    });

    const result = await syncManager.sync(true);
    expect(result.success).toBe(true);
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/sync",
      expect.objectContaining({
        body: expect.stringContaining('"tempId":"temp_sale_legacy"'),
      })
    );
    expect(mockQueue).toHaveLength(0);
  });

  it("coalesce chamadas simultâneas (mutex síncrono) para enviar POST /api/sync apenas uma vez", async () => {
    mockQueue.push({
      id: 1,
      type: "CREATE_SALE",
      tempId: "temp_sale_concurrent",
      payload: {
        tempId: "temp_sale_concurrent",
        items: [{ productId: "prod-1", productName: "P1", quantity: 1, unitPrice: 10 }],
      },
      createdAt: "2026-11-26T10:00:00Z",
      attempts: 0,
    });

    apiRequestMock.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                idMap: { temp_sale_concurrent: "real_sale_concurrent" },
                syncedSales: [
                  { tempId: "temp_sale_concurrent", serverId: "real_sale_concurrent", saleNumber: 1 },
                ],
              }),
            30
          )
        )
    );

    const [r1, r2] = await Promise.all([syncManager.sync(false), syncManager.sync(false)]);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(mockQueue).toHaveLength(0);
  });
});
