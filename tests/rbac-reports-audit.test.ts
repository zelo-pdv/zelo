import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || "test-jwt-secret-min-32-chars-for-unit-tests";
});

const mockPrisma = vi.hoisted(() => ({
  loja: { findUnique: vi.fn(), create: vi.fn() },
  user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  sale: { findMany: vi.fn() },
  product: { findMany: vi.fn() },
  auditLog: { count: vi.fn(), findMany: vi.fn() },
  accessGroup: { create: vi.fn() },
  client: { create: vi.fn() },
  category: { create: vi.fn() },
  settings: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ success: true }),
}));
vi.mock("@/lib/cookies", () => ({
  setAuthCookies: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_pwd") },
}));

import * as authModule from "@/lib/auth";
import { GET as getReports } from "@/app/api/reports/route";
import { GET as getAudit } from "@/app/api/audit/route";
import { POST as postRegister } from "@/app/api/auth/register/route";

describe("Plano 01 — RBAC de Relatórios, Registros e Grupos de Acesso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/reports", () => {
    it("retorna 403 quando usuário tem historico:Visualizar mas não tem relatorios:Visualizar", async () => {
      vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
        id: "u1",
        name: "Operador",
        email: "op@loja.com",
        active: true,
        groupId: "g1",
        groupName: "Operador de Caixa",
        isAdmin: false,
        isOwner: false,
        permissions: { historico: ["Visualizar"] },
        lojaId: "loja-1",
        onboardingCompleted: true,
      });

      const res = await getReports(
        new Request("http://localhost:3000/api/reports?type=financial-summary")
      );
      expect(res.status).toBe(403);
    });

    it("retorna 200 quando usuário tem relatorios:Visualizar mesmo sem historico", async () => {
      vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
        id: "u2",
        name: "Analista",
        email: "analista@loja.com",
        active: true,
        groupId: "g2",
        groupName: "Analista",
        isAdmin: false,
        isOwner: false,
        permissions: { relatorios: ["Visualizar"] },
        lojaId: "loja-1",
        onboardingCompleted: true,
      });
      mockPrisma.loja.findUnique.mockResolvedValue({
        name: "Loja Teste",
        ownerName: "Dono",
        phone: "",
      });
      mockPrisma.sale.findMany.mockResolvedValue([]);

      const res = await getReports(
        new Request("http://localhost:3000/api/reports?type=financial-summary")
      );
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/audit", () => {
    it("retorna 403 quando usuário tem historico:Visualizar mas não tem registros:Visualizar", async () => {
      vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
        id: "u1",
        name: "Operador",
        email: "op@loja.com",
        active: true,
        groupId: "g1",
        groupName: "Operador de Caixa",
        isAdmin: false,
        isOwner: false,
        permissions: { historico: ["Visualizar"] },
        lojaId: "loja-1",
        onboardingCompleted: true,
      });

      const res = await getAudit(new Request("http://localhost:3000/api/audit"));
      expect(res.status).toBe(403);
    });

    it("retorna 200 quando usuário tem registros:Visualizar mesmo sem historico", async () => {
      vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
        id: "u2",
        name: "Auditor",
        email: "auditor@loja.com",
        active: true,
        groupId: "g2",
        groupName: "Auditor",
        isAdmin: false,
        isOwner: false,
        permissions: { registros: ["Visualizar"] },
        lojaId: "loja-1",
        onboardingCompleted: true,
      });
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const res = await getAudit(new Request("http://localhost:3000/api/audit"));
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/auth/register — Grupos padrão", () => {
    it("cria grupo ADMIN com estoque, relatorios e registros, e Operador sem relatorios/registros", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.loja.findUnique.mockResolvedValue(null);

      const createdGroups: Array<{ name: string; permissions: Record<string, string[]> }> = [];
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          loja: {
            create: vi.fn().mockImplementation(async ({ data }: { data: { name: string; accessGroups?: { create?: Array<{ name: string; permissions: Record<string, string[]> }> } } }) => {
              const groups = (data.accessGroups?.create || []).map((g, idx) => ({
                id: `grp-${idx}`,
                ...g,
              }));
              createdGroups.push(...groups);
              return { id: "loja-new", name: data.name, accessGroups: groups };
            }),
            update: vi.fn().mockResolvedValue({ id: "loja-new" }),
          },
          user: {
            create: vi.fn().mockResolvedValue({
              id: "usr-owner",
              name: "Dono",
              email: "dono@loja.com",
              lojaId: "loja-new",
            }),
          },
        };
        return cb(tx);
      });

      const res = await postRegister(
        new Request("http://localhost:3000/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerName: "Dono Teste",
            storeName: "Loja Nova Teste",
            email: "dono@loja.com",
            password: "Password@123",
            confirmPassword: "Password@123",
            phone: "11999990000",
          }),
        })
      );

      expect(res).toBeDefined();
      expect(res?.status).toBe(201);

      const adminGroup = createdGroups.find((g) => g.name === "ADMIN");
      const gerenteGroup = createdGroups.find((g) => g.name === "Gerente");
      const operadorGroup = createdGroups.find((g) => g.name === "Operador de Caixa");

      expect(adminGroup?.permissions.estoque).toEqual(["Visualizar", "Adicionar"]);
      expect(adminGroup?.permissions.relatorios).toEqual(["Visualizar"]);
      expect(adminGroup?.permissions.registros).toEqual(["Visualizar"]);

      expect(gerenteGroup?.permissions.estoque).toEqual(["Visualizar", "Adicionar"]);
      expect(operadorGroup?.permissions.relatorios).toBeUndefined();
      expect(operadorGroup?.permissions.registros).toBeUndefined();
    });
  });
});
