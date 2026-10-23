import "dotenv/config";
import { describe, it, expect } from "vitest";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { SignJWT } from "jose";
import { JWT_SECRET } from "@/lib/jwt-secret";
import type { LojistaJwtPayload } from "@/lib/jwt-auth";

// Mock de cookies do Next.js para testes unitários/integração
let mockCookiesMap = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = mockCookiesMap.get(name);
      return value ? { value } : undefined;
    },
    set: (name: string, value: string) => {
      mockCookiesMap.set(name, value);
    },
    delete: (name: string) => {
      mockCookiesMap.delete(name);
    },
  }),
}));

import { vi } from "vitest";

describe("Gestão de Lojas e Revogação Imediata de Sessão (Sprint 2)", () => {
  let testLojaId: string;
  let testUserId: string;
  let testUserToken: string;

  it("deve carregar métricas consolidadas da plataforma", async () => {
    const totalStores = await prisma.loja.count();
    const activeStores = await prisma.loja.count({ where: { active: true } });
    const totalUsers = await prisma.user.count();

    expect(totalStores).toBeGreaterThanOrEqual(1);
    expect(activeStores).toBeGreaterThanOrEqual(1);
    expect(totalUsers).toBeGreaterThanOrEqual(1);
  });

  it("deve criar uma loja de teste e um usuário vinculado para validação de ativação/desativação", async () => {
    const randomSuffix = Math.floor(Math.random() * 100000);
    const loja = await prisma.loja.create({
      data: {
        name: `Loja Teste Sprint 2 - ${randomSuffix}`,
        ownerName: "Proprietário Teste",
        email: `proprietario_${randomSuffix}@test.com`,
        active: true,
      },
    });
    testLojaId = loja.id;

    // Busca um grupo de acesso padrão
    let group = await prisma.accessGroup.findFirst({
      where: { lojaId: loja.id },
    });
    if (!group) {
      group = await prisma.accessGroup.create({
        data: {
          name: "ADMIN",
          lojaId: loja.id,
          permissions: { dashboard: ["Visualizar"] },
        },
      });
    }

    const user = await prisma.user.create({
      data: {
        name: "Lojista Ativo",
        email: `lojista_${randomSuffix}@test.com`,
        password: "hash_de_teste",
        lojaId: loja.id,
        groupId: group.id,
        active: true,
      },
    });
    testUserId = user.id;

    // Cria token JWT válido para o lojista
    const payload: LojistaJwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      groupName: "ADMIN",
      isAdmin: true,
      permissions: { dashboard: ["Visualizar"] },
      lojaId: loja.id,
      onboardingCompleted: true,
    };

    testUserToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(JWT_SECRET);

    // Configura o cookie mockado
    mockCookiesMap.set("token", testUserToken);

    // Com loja ativa, getCurrentUser DEVE autenticar o lojista com sucesso
    const authUser = await getCurrentUser();
    expect(authUser).not.toBeNull();
    expect(authUser?.id).toBe(user.id);
    expect(authUser?.lojaId).toBe(loja.id);
  });

  it("REGRA CRÍTICA: deve revogar IMEDIATAMENTE a sessão do lojista se a loja for desativada (Loja.active = false)", async () => {
    // 1. O administrador global desativa a loja no banco
    await prisma.loja.update({
      where: { id: testLojaId },
      data: { active: false },
    });

    // 2. O lojista ainda possui o mesmo cookie JWT válido
    mockCookiesMap.set("token", testUserToken);

    // 3. Mas a verificação definitiva em tempo real no servidor DEVE retornar null
    const authUser = await getCurrentUser();
    expect(authUser).toBeNull();
  });

  it("deve restaurar o acesso do lojista assim que a loja for reativada (Loja.active = true)", async () => {
    // 1. O administrador reativa a loja
    await prisma.loja.update({
      where: { id: testLojaId },
      data: { active: true },
    });

    // 2. O lojista faz a requisição com seu token
    mockCookiesMap.set("token", testUserToken);

    // 3. O acesso é liberado normalmente
    const authUser = await getCurrentUser();
    expect(authUser).not.toBeNull();
    expect(authUser?.id).toBe(testUserId);
    expect(authUser?.lojaId).toBe(testLojaId);
  });

  it("deve criar um registro de auditoria ao registrar ações no PlatformAuditLog", async () => {
    const admin = await prisma.platformAdmin.findUnique({
      where: { email: "admin@zelo.app" },
    });
    expect(admin).not.toBeNull();

    const auditLog = await prisma.platformAuditLog.create({
      data: {
        adminId: admin!.id,
        action: "STORE_DEACTIVATED",
        targetType: "Loja",
        targetId: testLojaId,
        details: { reason: "Teste automatizado da Sprint 2" },
      },
    });

    expect(auditLog.id).toBeDefined();
    expect(auditLog.action).toBe("STORE_DEACTIVATED");
    expect(auditLog.targetId).toBe(testLojaId);

    // Limpa dados de teste
    await prisma.platformAuditLog.delete({ where: { id: auditLog.id } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.loja.delete({ where: { id: testLojaId } });
  });
});
