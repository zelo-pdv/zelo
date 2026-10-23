import "dotenv/config";
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { SignJWT } from "jose";
import { JWT_SECRET } from "@/lib/jwt-secret";
import type { AdminJwtPayload, LojistaJwtPayload } from "@/lib/jwt-auth";

function createMockRequest(path: string, cookies: Record<string, string> = {}) {
  const url = `http://localhost:3000${path}`;
  const req = new NextRequest(url);
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

describe("Middleware Global (Next.js 15.5.20) - Matriz de Rotas", () => {
  it("deve bypassar assets estáticos e Service Worker da PWA sem checagem de cookie", async () => {
    const swReq = createMockRequest("/sw.js");
    const swRes = await middleware(swReq);
    expect(swRes.status).toBe(200);

    const manifestReq = createMockRequest("/site.webmanifest");
    const manifestRes = await middleware(manifestReq);
    expect(manifestRes.status).toBe(200);

    const imgReq = createMockRequest("/zelo-black.png");
    const imgRes = await middleware(imgReq);
    expect(imgRes.status).toBe(200);
  });

  it("deve permitir requisições a APIs públicas sem cookie", async () => {
    const loginApiReq = createMockRequest("/api/auth/login");
    const loginApiRes = await middleware(loginApiReq);
    expect(loginApiRes.status).toBe(200);

    const adminLoginApiReq = createMockRequest("/api/admin/auth/login");
    const adminLoginApiRes = await middleware(adminLoginApiReq);
    expect(adminLoginApiRes.status).toBe(200);
  });

  it("deve responder com 401 JSON (sem redirect) em APIs privadas sem sessão", async () => {
    const lojistaApiReq = createMockRequest("/api/products");
    const lojistaApiRes = await middleware(lojistaApiReq);
    expect(lojistaApiRes.status).toBe(401);
    const lojistaData = await lojistaApiRes.json();
    expect(lojistaData.error).toBe("Não autenticado.");

    const adminApiReq = createMockRequest("/api/admin/metrics");
    const adminApiRes = await middleware(adminApiReq);
    expect(adminApiRes.status).toBe(401);
    const adminData = await adminApiRes.json();
    expect(adminData.error).toBe("Acesso administrativo não autorizado.");
  });

  it("deve rejeitar API administrativa chamada com token de lojista com 401 JSON", async () => {
    const lojistaPayload: LojistaJwtPayload = {
      sub: "lojista_1",
      email: "lojista@zelo.app",
      name: "Lojista",
      groupName: "ADMIN",
      isAdmin: true,
      permissions: {},
      lojaId: "loja_1",
      onboardingCompleted: true,
    };
    const lojistaToken = await new SignJWT(lojistaPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(JWT_SECRET);

    // Envia o token de lojista no cookie admin_token
    const adminApiReq = createMockRequest("/api/admin/metrics", {
      admin_token: lojistaToken,
    });
    const adminApiRes = await middleware(adminApiReq);
    expect(adminApiRes.status).toBe(401);
    const data = await adminApiRes.json();
    expect(data.error).toBe("Sessão administrativa inválida ou expirada.");
  });

  it("deve redirecionar páginas privadas do admin para /admin/login se não autenticado", async () => {
    const adminDashReq = createMockRequest("/admin/dashboard");
    const adminDashRes = await middleware(adminDashReq);
    expect(adminDashRes.status).toBe(307);
    expect(adminDashRes.headers.get("location")).toBe("http://localhost:3000/admin/login");

    const adminRootReq = createMockRequest("/admin");
    const adminRootRes = await middleware(adminRootReq);
    expect(adminRootRes.status).toBe(307);
    expect(adminRootRes.headers.get("location")).toBe("http://localhost:3000/admin/login");
  });

  it("deve redirecionar admin autenticado tentando acessar /admin/login para /admin/dashboard", async () => {
    const adminPayload: AdminJwtPayload = {
      sub: "admin_1",
      email: "admin@zelo.app",
      name: "Admin",
      role: "SUPERADMIN",
      scope: "platform",
    };
    const adminToken = await new SignJWT(adminPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("4h")
      .sign(JWT_SECRET);

    const loginReq = createMockRequest("/admin/login", {
      admin_token: adminToken,
    });
    const loginRes = await middleware(loginReq);
    expect(loginRes.status).toBe(307);
    expect(loginRes.headers.get("location")).toBe("http://localhost:3000/admin/dashboard");
  });

  it("deve redirecionar páginas privadas do lojista para /login se não autenticado", async () => {
    const dashReq = createMockRequest("/dashboard");
    const dashRes = await middleware(dashReq);
    expect(dashRes.status).toBe(307);
    expect(dashRes.headers.get("location")).toBe("http://localhost:3000/login");

    const produtosReq = createMockRequest("/produtos");
    const produtosRes = await middleware(produtosReq);
    expect(produtosRes.status).toBe(307);
    expect(produtosRes.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("deve redirecionar lojista com onboarding pendente para /onboarding", async () => {
    const lojistaPayload: LojistaJwtPayload = {
      sub: "lojista_novo",
      email: "novo@loja.com",
      name: "Novo Lojista",
      groupName: "ADMIN",
      isAdmin: true,
      permissions: {},
      lojaId: "loja_nova",
      onboardingCompleted: false, // Onboarding pendente
    };
    const lojistaToken = await new SignJWT(lojistaPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(JWT_SECRET);

    const dashReq = createMockRequest("/dashboard", {
      token: lojistaToken,
    });
    const dashRes = await middleware(dashReq);
    expect(dashRes.status).toBe(307);
    expect(dashRes.headers.get("location")).toBe("http://localhost:3000/onboarding");
  });

  it("deve redirecionar lojista autenticado com onboarding concluído de /onboarding para /dashboard", async () => {
    const lojistaPayload: LojistaJwtPayload = {
      sub: "lojista_concluido",
      email: "ok@loja.com",
      name: "Lojista Ok",
      groupName: "ADMIN",
      isAdmin: true,
      permissions: {},
      lojaId: "loja_ok",
      onboardingCompleted: true,
    };
    const lojistaToken = await new SignJWT(lojistaPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(JWT_SECRET);

    const onboardingReq = createMockRequest("/onboarding", {
      token: lojistaToken,
    });
    const onboardingRes = await middleware(onboardingReq);
    expect(onboardingRes.status).toBe(307);
    expect(onboardingRes.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });
});
