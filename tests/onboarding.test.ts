import { describe, it, expect, afterAll } from "vitest";
import { registerUser, login, fetchApi, deleteTestLoja } from "./helpers";

describe("Registration & Onboarding Flow", () => {
  const prefix = Date.now().toString();
  let userCookies: string;
  let userEmail: string;
  let userStoreName: string;
  let userLojaId: string;
  let skipLojaId: string;

  afterAll(async () => {
    if (userLojaId) await deleteTestLoja(userLojaId);
    if (skipLojaId) await deleteTestLoja(skipLojaId);
  });

  it("should successfully register a new user and store", async () => {
    const res = await registerUser(prefix);
    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.user.email).toBe(`reg_${prefix}@test.com`);
    expect(res.data.user.isAdmin).toBe(true);
    expect(res.data.user.onboardingCompleted).toBe(false);
    expect(res.data.redirectTo).toBe("/onboarding");
    expect(res.cookies).toContain("token=");

    userCookies = res.cookies;
    userEmail = res.payload.email;
    userStoreName = res.payload.storeName;
    userLojaId = res.data.user.lojaId;
  });

  it("should fail registration with duplicate email", async () => {
    const { status, data } = await fetchApi("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        ownerName: "Outro Nome",
        storeName: `Loja Outra ${prefix}`,
        email: userEmail,
        password: "password123",
        confirmPassword: "password123",
      }),
    });
    expect(status).toBe(400);
    expect(data.error).toContain("e-mail já está em uso");
  });

  it("should fail registration with duplicate store name", async () => {
    const { status, data } = await fetchApi("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        ownerName: "Outro Dono",
        storeName: userStoreName,
        email: `outro_${prefix}@test.com`,
        password: "password123",
        confirmPassword: "password123",
      }),
    });
    expect(status).toBe(400);
    expect(data.error).toContain("Já existe uma loja cadastrada com este nome");
  });

  it("should fail registration with non-matching passwords", async () => {
    const { status, data } = await fetchApi("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        ownerName: "Dono Teste",
        storeName: `Loja Diferente ${prefix}`,
        email: `diferente_${prefix}@test.com`,
        password: "password123",
        confirmPassword: "password456",
      }),
    });
    expect(status).toBe(400);
    expect(data.error).toContain("senhas não coincidem");
  });

  it("should reject unauthenticated access to /api/onboarding", async () => {
    const { status } = await fetchApi("/onboarding");
    expect(status).toBe(401);
  });

  it("should fetch initial onboarding state for newly registered user", async () => {
    const { status, data } = await fetchApi("/onboarding", {}, userCookies);
    expect(status).toBe(200);
    expect(data.loja.name).toBe(userStoreName);
    expect(data.onboarding.completed).toBe(false);
    expect(data.onboarding.step).toBe(1);
  });

  it("should save intermediate onboarding progress (step 2)", async () => {
    const { status, data } = await fetchApi(
      "/onboarding",
      {
        method: "POST",
        body: JSON.stringify({
          trackStock: false,
          blockOutOfStock: false,
          requireClient: true,
          defaultPaymentMethod: "CARTAO_DE_CREDITO",
          defaultSaleStatus: "PENDENTE",
          showProductImages: false,
          storePhone: "(11) 99999-8888",
          step: 2,
          completed: false,
        }),
      },
      userCookies
    );

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.onboarding.completed).toBe(false);
    expect(data.onboarding.step).toBe(2);

    // Verifica se os dados persistiram no GET
    const check = await fetchApi("/onboarding", {}, userCookies);
    expect(check.data.onboarding.step).toBe(2);
    expect(check.data.config.products.trackStock).toBe(false);
    expect(check.data.config.sales.requireClient).toBe(true);
    expect(check.data.config.sales.defaultPaymentMethod).toBe("CARTAO_DE_CREDITO");
    expect(check.data.config.sales.defaultSaleStatus).toBe("PENDENTE");
  });

  it("should complete onboarding and apply configurations to store", async () => {
    const { status, data, cookies: refreshedCookies } = await fetchApi(
      "/onboarding",
      {
        method: "POST",
        body: JSON.stringify({
          trackStock: true,
          blockOutOfStock: true,
          requireClient: false,
          defaultPaymentMethod: "PIX",
          defaultSaleStatus: "PAGO",
          showProductImages: true,
          storePhone: "(11) 98888-7777",
          step: 4,
          completed: true,
        }),
      },
      userCookies
    );

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.onboarding.completed).toBe(true);
    expect(data.redirectTo).toBe("/dashboard");
    expect(refreshedCookies).toContain("token=");

    // Verifica em /api/settings que as configurações foram realmente aplicadas na loja
    const settingsRes = await fetchApi("/settings", {}, refreshedCookies);
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.data.products.trackStock).toBe(true);
    expect(settingsRes.data.sales.blockOutOfStock).toBe(true);
    expect(settingsRes.data.sales.requireClient).toBe(false);
    expect(settingsRes.data.sales.defaultPaymentMethod).toBe("PIX");
    expect(settingsRes.data.sales.defaultSaleStatus).toBe("PAGO");
  });

  it("should return onboardingCompleted true when logging in again after completion", async () => {
    const { status, data } = await login(userEmail, "password123");
    expect(status).toBe(200);
    expect(data.user.email).toBe(userEmail);
    expect(data.user.onboardingCompleted).toBe(true);
  });

  it("should successfully skip onboarding for a new store", async () => {
    const skipPrefix = `${prefix}_skip`;
    const regRes = await registerUser(skipPrefix);
    expect(regRes.status).toBe(201);
    skipLojaId = regRes.data.user.lojaId;

    const { status, data, cookies: skipCookies } = await fetchApi(
      "/onboarding",
      {
        method: "POST",
        body: JSON.stringify({
          trackStock: true,
          blockOutOfStock: true,
          requireClient: false,
          defaultPaymentMethod: "PIX",
          defaultSaleStatus: "PAGO",
          showProductImages: true,
          step: 4,
          completed: true,
        }),
      },
      regRes.cookies
    );

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.onboarding.completed).toBe(true);
    expect(data.redirectTo).toBe("/dashboard");
    expect(skipCookies).toContain("token=");

    // Verifica que pode acessar /api/settings imediatamente
    const settingsRes = await fetchApi("/settings", {}, skipCookies);
    expect(settingsRes.status).toBe(200);
  });
});
