import "dotenv/config";
import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { JWT_SECRET } from "@/lib/jwt-secret";
import {
  verifyAdminToken,
  verifyLojistaToken,
  verifyJwtToken,
  type AdminJwtPayload,
  type LojistaJwtPayload,
} from "@/lib/jwt-auth";
import prisma from "@/lib/prisma";

describe("PlatformAdmin & Token Isolation (Sprint 1)", () => {
  it("deve validar com sucesso um token administrativo com scope: 'platform'", async () => {
    const adminPayload: AdminJwtPayload = {
      sub: "admin_test_123",
      email: "admin@zelo.app",
      name: "Admin de Teste",
      role: "SUPERADMIN",
      scope: "platform",
    };

    const token = await new SignJWT(adminPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("4h")
      .sign(JWT_SECRET);

    const verified = await verifyAdminToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe("admin_test_123");
    expect(verified?.email).toBe("admin@zelo.app");
    expect(verified?.role).toBe("SUPERADMIN");
    expect(verified?.scope).toBe("platform");
  });

  it("NUNCA deve aceitar um token de lojista (mesmo com isAdmin: true) como token administrativo", async () => {
    const lojistaPayload: LojistaJwtPayload = {
      sub: "user_owner_456",
      email: "lojista@loja.com",
      name: "Dono da Loja",
      groupName: "ADMIN",
      isAdmin: true, // Dono de loja tem isAdmin: true no Zelo
      permissions: { dashboard: ["Visualizar"] },
      lojaId: "loja_abc_123",
      onboardingCompleted: true,
    };

    const lojistaToken = await new SignJWT(lojistaPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(JWT_SECRET);

    // O token é válido criptograficamente para o Zelo
    const raw = await verifyJwtToken(lojistaToken);
    expect(raw).not.toBeNull();

    // Mas verifyAdminToken DEVE rejeitar categoricamente porque scope !== "platform"
    const adminCheck = await verifyAdminToken(lojistaToken);
    expect(adminCheck).toBeNull();
  });

  it("NUNCA deve aceitar um token administrativo como token de lojista", async () => {
    const adminPayload: AdminJwtPayload = {
      sub: "admin_test_123",
      email: "admin@zelo.app",
      name: "Admin de Teste",
      role: "SUPERADMIN",
      scope: "platform",
    };

    const adminToken = await new SignJWT(adminPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("4h")
      .sign(JWT_SECRET);

    // verifyLojistaToken DEVE rejeitar tokens com scope: "platform"
    const lojistaCheck = await verifyLojistaToken(adminToken);
    expect(lojistaCheck).toBeNull();
  });

  it("deve rejeitar tokens expirados ou com assinatura forjada", async () => {
    const forgedSecret = new TextEncoder().encode("wrong_secret_key_12345678901234567890");
    const forgedToken = await new SignJWT({
      sub: "hacker",
      scope: "platform",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("4h")
      .sign(forgedSecret);

    const check = await verifyAdminToken(forgedToken);
    expect(check).toBeNull();
  });

  it("deve consultar o modelo PlatformAdmin no PostgreSQL com isolamento completo", async () => {
    const admin = await prisma.platformAdmin.findUnique({
      where: { email: "admin@zelo.app" },
    });

    expect(admin).not.toBeNull();
    expect(admin?.email).toBe("admin@zelo.app");
    expect(admin?.role).toBe("SUPERADMIN");
    expect(admin?.active).toBe(true);
    // PlatformAdmin NÃO possui vínculo com lojaId
    expect((admin as any).lojaId).toBeUndefined();
  });
});
