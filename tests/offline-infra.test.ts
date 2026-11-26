import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockHeadersMap = new Map<string, string>();
const mockCookieStore = {
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (key: string) => mockHeadersMap.get(key.toLowerCase()) ?? null,
  }),
  cookies: async () => mockCookieStore,
}));

const mockDb = {
  products: {
    _data: [] as any[],
    filter(fn: (item: any) => boolean) {
      return { toArray: async () => mockDb.products._data.filter(fn) };
    },
    bulkPut: vi.fn(async (items: any[]) => {
      for (const item of items) {
        const idx = mockDb.products._data.findIndex((p) => p.id === item.id);
        if (idx >= 0) mockDb.products._data[idx] = item;
        else mockDb.products._data.push(item);
      }
    }),
  },
  clients: {
    _data: [] as any[],
    filter(fn: (item: any) => boolean) {
      return { toArray: async () => mockDb.clients._data.filter(fn) };
    },
    bulkPut: vi.fn(async (items: any[]) => {
      for (const item of items) {
        const idx = mockDb.clients._data.findIndex((c) => c.id === item.id);
        if (idx >= 0) mockDb.clients._data[idx] = item;
        else mockDb.clients._data.push(item);
      }
    }),
  },
  sales: {
    _data: [] as any[],
    filter(fn: (item: any) => boolean) {
      return { toArray: async () => mockDb.sales._data.filter(fn) };
    },
  },
  settings: {
    put: vi.fn(),
  },
  transaction: async (_mode: string, _tables: unknown[], cb: () => Promise<void>) => cb(),
};

vi.mock("@/lib/offline/db", () => ({
  getOfflineDb: () => mockDb,
}));

import {
  cacheCatalogData,
  getOfflineProducts,
  getOfflineClients,
  getPendingOfflineSales,
} from "@/lib/offline/offline-service";
import { shouldUseSecureCookies } from "@/lib/cookies";
import { apiRequest } from "@/lib/api-request";

describe("Plano 02 — Infraestrutura Offline, API Request e Cookies", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHeadersMap.clear();
    mockDb.products._data = [];
    mockDb.clients._data = [];
    mockDb.sales._data = [];
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("retorna produtos e clientes ativos booleanos e preserva registros isLocalOnly no cacheCatalogData", async () => {
    mockDb.products._data = [
      { id: "temp_prod_1", name: "Local Prod", active: true, isLocalOnly: true, salePrice: 10, stock: 5 },
    ];
    mockDb.clients._data = [
      { id: "temp_cli_1", name: "Local Cli", phone: "11999999999", active: true, isLocalOnly: true },
    ];

    await cacheCatalogData({
      products: [
        { id: "temp_prod_1", name: "Overwrite Attempt", salePrice: 99, stock: 0, active: true },
        { id: "prod_1", name: "Ativo", salePrice: 25, stock: 10, active: true },
        { id: "prod_2", name: "Inativo", salePrice: 30, stock: 1, active: false },
      ],
      clients: [
        { id: "temp_cli_1", name: "Overwrite Cli", phone: "000", active: true },
        { id: "cli_1", name: "Cliente Ativo", phone: "11988887777", active: true },
        { id: "cli_2", name: "Cliente Inativo", phone: "11977776666", active: false },
      ],
    });

    const activeProducts = await getOfflineProducts();
    expect(activeProducts.map((p) => p.id)).toEqual(["temp_prod_1", "prod_1"]);
    expect(activeProducts[0].name).toBe("Local Prod");

    const activeClients = await getOfflineClients();
    expect(activeClients.map((c) => c.id)).toEqual(["temp_cli_1", "cli_1"]);
    expect(activeClients[0].name).toBe("Local Cli");
  });

  it("retorna apenas vendas não sincronizadas em getPendingOfflineSales", async () => {
    mockDb.sales._data = [
      { id: "s1", synced: false },
      { id: "s2", synced: true },
      { id: "s3", synced: false },
    ];

    const pending = await getPendingOfflineSales();
    expect(pending.map((s) => s.id)).toEqual(["s1", "s3"]);
  });

  it("usa caminho relativo /api no navegador quando NEXT_PUBLIC_API_URL aponta para localhost/127.0.0.1", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("window", { location: { origin: "http://127.0.0.1:3000" } });
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/settings");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/settings",
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  it("define secure=false em HTTP local e secure=true em HTTPS/Vercel", async () => {
    delete process.env.VERCEL;
    delete process.env.COOKIE_SECURE;
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(await shouldUseSecureCookies()).toBe(false);

    mockHeadersMap.set("x-forwarded-proto", "https");
    expect(await shouldUseSecureCookies()).toBe(true);

    mockHeadersMap.clear();
    process.env.VERCEL = "1";
    expect(await shouldUseSecureCookies()).toBe(true);
  });
});
