import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/jwt-secret", () => {
  const secret = "test-secret-at-least-32-characters-long";
  return {
    JWT_SECRET_RAW: secret,
    JWT_SECRET: new TextEncoder().encode(secret),
  };
});

import { GET as getSettings, PUT as putSettings } from "@/app/api/settings/route";
import { GET as getSync } from "@/app/api/sync/route";
import prisma from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { useSettingsStore, defaultDashboardSettings, defaultProductsSettings, defaultSalesSettings } from "@/store/useSettingsStore";
import { settingsService } from "@/services/settings.service";
import * as dataSyncHooks from "@/hooks/use-data-sync";

// Mocking prisma, auth, and audit
vi.mock("@/lib/prisma", () => {
  return {
    default: {
      settings: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      product: {
        aggregate: vi.fn().mockResolvedValue({ _max: { updatedAt: new Date(1000) }, _count: { id: 5 } }),
      },
      client: {
        aggregate: vi.fn().mockResolvedValue({ _max: { updatedAt: new Date(2000) }, _count: { id: 3 } }),
      },
      sale: {
        aggregate: vi.fn().mockResolvedValue({ _max: { updatedAt: new Date(3000) }, _count: { id: 8 } }),
      },
      category: {
        aggregate: vi.fn().mockResolvedValue({ _max: { updatedAt: new Date(4000) }, _count: { id: 2 } }),
      },
      user: {
        aggregate: vi.fn().mockResolvedValue({ _max: { updatedAt: new Date(5000) }, _count: { id: 1 } }),
      },
      accessGroup: {
        aggregate: vi.fn().mockResolvedValue({ _max: { updatedAt: new Date(6000) }, _count: { id: 1 } }),
      },
    },
  };
});

vi.mock("@/lib/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}));

describe("Sincronização de Configurações de Páginas entre Dispositivos", () => {
  const storeAId = "loja_alpha_123";
  const storeBId = "loja_beta_456";

  const adminUserLojaA: any = {
    id: "user_admin_a",
    lojaId: storeAId,
    isAdmin: true,
    permissions: {},
  };

  const operatorUserLojaA: any = {
    id: "user_op_a",
    lojaId: storeAId,
    isAdmin: false,
    permissions: {
      dashboard: ["Visualizar"],
      produtos: ["Visualizar", "Editar"],
    },
  };

  const restrictedUserLojaA: any = {
    id: "user_rest_a",
    lojaId: storeAId,
    isAdmin: false,
    permissions: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Isolamento Multi-tenant (Requisitos 1, 3 e 9)", () => {
    it("deve buscar as configurações exclusivamente da loja do usuário autenticado", async () => {
      vi.spyOn(authLib, "getCurrentUser").mockResolvedValue(adminUserLojaA);

      const storeAConfig = {
        products: { trackStock: true },
        dashboard: { hideLowStockCard: false },
      };

      (prisma.settings.findUnique as any).mockResolvedValue({
        id: "settings_a",
        lojaId: storeAId,
        config: storeAConfig,
      });

      const response = await getSettings();
      expect(response.status).toBe(200);
      const json = await response.json();

      expect(prisma.settings.findUnique).toHaveBeenCalledWith({
        where: { lojaId: storeAId },
      });
      expect(json).toEqual(storeAConfig);
    });

    it("não deve permitir que uma alteração da Loja A afete ou acesse a Loja B", async () => {
      vi.spyOn(authLib, "getCurrentUser").mockResolvedValue(adminUserLojaA);

      (prisma.settings.findUnique as any).mockResolvedValue(null);
      (prisma.settings.upsert as any).mockResolvedValue({
        id: "settings_a",
        lojaId: storeAId,
        config: { dashboard: { hideLowStockCard: true } },
      });

      const req = new Request("http://localhost:3000/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboard: { hideLowStockCard: true } }),
      });

      await putSettings(req);

      // Garante que o upsert foi estritamente filtrado por lojaId da Loja A
      expect(prisma.settings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { lojaId: storeAId },
          create: expect.objectContaining({ lojaId: storeAId }),
        })
      );
      expect(prisma.settings.upsert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: { lojaId: storeBId },
        })
      );
    });
  });

  describe("2. Autorização RBAC no Servidor (Requisito 10)", () => {
    it("deve rejeitar com 401 se não houver usuário autenticado", async () => {
      vi.spyOn(authLib, "getCurrentUser").mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/settings", {
        method: "PUT",
        body: JSON.stringify({ dashboard: { hideLowStockCard: true } }),
      });

      const res = await putSettings(req);
      expect(res.status).toBe(401);
    });

    it("deve permitir que usuário não-admin com permissão altere sua seção permitida (ex: dashboard)", async () => {
      vi.spyOn(authLib, "getCurrentUser").mockResolvedValue(operatorUserLojaA);

      (prisma.settings.findUnique as any).mockResolvedValue({
        config: { dashboard: { hideLowStockCard: false } },
      });
      (prisma.settings.upsert as any).mockResolvedValue({
        id: "settings_a",
        config: { dashboard: { hideLowStockCard: true } },
      });

      const req = new Request("http://localhost:3000/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboard: { hideLowStockCard: true } }),
      });

      const res = await putSettings(req);
      expect(res.status).toBe(200);
    });

    it("deve rejeitar com 403 se usuário não tiver permissão para a seção que está tentando alterar", async () => {
      vi.spyOn(authLib, "getCurrentUser").mockResolvedValue(restrictedUserLojaA);

      const req = new Request("http://localhost:3000/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboard: { hideLowStockCard: true } }),
      });

      const res = await putSettings(req);
      expect(res.status).toBe(403);
    });

    it("deve rejeitar com 403 se usuário não-admin tentar alterar seções restritas de administração (ex: store, groups)", async () => {
      vi.spyOn(authLib, "getCurrentUser").mockResolvedValue(operatorUserLojaA);

      const req = new Request("http://localhost:3000/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store: { name: "Novo Nome Inválido" } }),
      });

      const res = await putSettings(req);
      expect(res.status).toBe(403);
    });
  });

  describe("3. Concorrência e Merge em Nível de Seção (Requisito 8 - Dispositivo A vs Dispositivo B)", () => {
    it("não deve sobrescrever configurações de outras seções ao salvar (Dispositivo A alterando dashboard e Dispositivo B alterando produtos)", async () => {
      vi.spyOn(authLib, "getCurrentUser").mockResolvedValue(adminUserLojaA);

      // Estado inicial no Banco de Dados
      let currentDbConfig: any = {
        products: { trackStock: true, showProductImages: true },
        dashboard: { hideLowStockCard: false, hideRecentSales: false },
        sales: { requireClient: false },
      };

      (prisma.settings.findUnique as any).mockImplementation(() =>
        Promise.resolve({ config: currentDbConfig })
      );

      (prisma.settings.upsert as any).mockImplementation(({ update }: any) => {
        currentDbConfig = update.config;
        return Promise.resolve({ id: "settings_a", config: currentDbConfig });
      });

      // Dispositivo A envia atualização APENAS da página de dashboard:
      const reqDevA = new Request("http://localhost:3000/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboard: { hideRecentSales: true },
        }),
      });

      const resDevA = await putSettings(reqDevA);
      expect(resDevA.status).toBe(200);
      const jsonDevA = await resDevA.json();

      expect(jsonDevA.dashboard.hideRecentSales).toBe(true);
      expect(jsonDevA.dashboard.hideLowStockCard).toBe(false); // Preservou outro campo do dashboard
      expect(jsonDevA.products.trackStock).toBe(true); // Preservou produtos
      expect(jsonDevA.products.showProductImages).toBe(true);

      // Agora, Dispositivo B envia atualização APENAS da página de produtos:
      const reqDevB = new Request("http://localhost:3000/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: { showProductImages: false },
        }),
      });

      const resDevB = await putSettings(reqDevB);
      expect(resDevB.status).toBe(200);
      const jsonDevB = await resDevB.json();

      // Ambos os dispositivos tiveram suas configurações integradas com sucesso!
      expect(jsonDevB.products.showProductImages).toBe(false);
      expect(jsonDevB.products.trackStock).toBe(true);
      expect(jsonDevB.dashboard.hideRecentSales).toBe(true); // A alteração do Dispositivo A NÃO foi perdida!
      expect(jsonDevB.sales.requireClient).toBe(false);
    });
  });

  describe("4. Endpoint /api/sync e Sincronização Reativa (Requisitos 4, 5 e 6)", () => {
    it("deve expor o timestamp de atualização de settings para detecção pelos clientes", async () => {
      vi.spyOn(authLib, "getCurrentUser").mockResolvedValue(adminUserLojaA);

      const settingsDate = new Date("2026-10-17T15:30:00Z");
      (prisma.settings.findUnique as any).mockResolvedValue({
        updatedAt: settingsDate,
      });

      const res = await getSync();
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.settings).toBe(`${settingsDate.getTime()}`);
    });
  });

  describe("5. Zustand Store: Atualização Otimista com Rollback em Falha de Rede (Requisitos 11 e 12)", () => {
    beforeEach(() => {
      useSettingsStore.setState({
        dashboard: { ...defaultDashboardSettings, hideLowStockCard: false },
        products: { ...defaultProductsSettings, showProductImages: true },
        sales: { ...defaultSalesSettings, requireClient: false },
      });
    });

    it("deve aplicar atualização otimista e chamar notifyLocalSync em sucesso", async () => {
      const notifySpy = vi.spyOn(dataSyncHooks, "notifyLocalSync");
      vi.spyOn(settingsService, "update").mockResolvedValue({
        dashboard: { hideLowStockCard: true },
      } as any);

      await useSettingsStore.getState().setDashboardSettings({ hideLowStockCard: true });

      expect(useSettingsStore.getState().dashboard.hideLowStockCard).toBe(true);
      expect(settingsService.update).toHaveBeenCalledWith({
        dashboard: { hideLowStockCard: true },
      });
      expect(notifySpy).toHaveBeenCalledWith("settings");
    });

    it("deve reverter o estado local para o anterior em caso de erro de rede ou recusa do servidor", async () => {
      const initialDashboard = useSettingsStore.getState().dashboard;
      expect(initialDashboard.hideLowStockCard).toBe(false);

      vi.spyOn(settingsService, "update").mockRejectedValue(
        new Error("Network Error: Conexão indisponível")
      );

      await expect(
        useSettingsStore.getState().setDashboardSettings({ hideLowStockCard: true })
      ).rejects.toThrow("Network Error: Conexão indisponível");

      // Deve ter revertido com perfeição para o estado inicial
      expect(useSettingsStore.getState().dashboard.hideLowStockCard).toBe(false);
    });

    it("deve reverter o estado de produtos em caso de erro na atualização de showProductImages", async () => {
      expect(useSettingsStore.getState().products.showProductImages).toBe(true);

      vi.spyOn(settingsService, "update").mockRejectedValue(new Error("500 Internal Server Error"));

      await expect(
        useSettingsStore.getState().setProductsSettings({ showProductImages: false })
      ).rejects.toThrow("500 Internal Server Error");

      // Rollback verificado
      expect(useSettingsStore.getState().products.showProductImages).toBe(true);
    });
  });
});
