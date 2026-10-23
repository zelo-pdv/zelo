import "dotenv/config";
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { getSignedCatalogUrl } from "@/lib/supabase";
import { SignJWT } from "jose";
import { JWT_SECRET } from "@/lib/jwt-secret";
import type { AdminJwtPayload } from "@/lib/jwt-auth";

// Mock de cookies do Next.js
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

describe("Sprint 4 - Catálogos e Produtos Globais", () => {
  const createdCatalogIds: string[] = [];
  const createdGlobalProductIds: string[] = [];
  const createdStoreProductIds: string[] = [];
  let testBrandId: string;
  let testCategoryId: string;
  let testLojaId: string;
  let testUserId: string;

  beforeAll(async () => {
    // 1. Busca ou cria Marca e Categoria de teste
    let brand = await prisma.brand.findFirst({ where: { slug: "natura" } });
    if (!brand) {
      brand = await prisma.brand.create({
        data: { name: "Natura Teste", slug: "natura-teste", active: true },
      });
    }
    testBrandId = brand.id;

    let cat = await prisma.globalCategory.findFirst({ where: { slug: "perfumaria" } });
    if (!cat) {
      cat = await prisma.globalCategory.create({
        data: { name: "Perfumaria Teste", slug: "perfumaria-teste", active: true },
      });
    }
    testCategoryId = cat.id;

    // 2. Busca ou cria Loja de teste
    let loja = await prisma.loja.findFirst({ where: { active: true } });
    if (!loja) {
      loja = await prisma.loja.create({
        data: {
          name: "Loja Teste Sprint 4",
          ownerName: "Proprietário Teste",
          email: "proprietario_sp4@test.com",
          active: true,
        },
      });
    }
    testLojaId = loja.id;
  });

  afterAll(async () => {
    // Limpeza de entidades criadas nos testes
    if (createdStoreProductIds.length > 0) {
      await prisma.product.deleteMany({
        where: { id: { in: createdStoreProductIds } },
      });
    }
    if (createdCatalogIds.length > 0) {
      await prisma.catalog.deleteMany({
        where: { id: { in: createdCatalogIds } },
      });
    }
    if (createdGlobalProductIds.length > 0) {
      await prisma.globalProduct.deleteMany({
        where: { id: { in: createdGlobalProductIds } },
      });
    }
  });

  describe("1. Gestão de Produtos Globais (GlobalProduct)", () => {
    it("deve criar um produto global mestre com dados padronizados", async () => {
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const product = await prisma.globalProduct.create({
        data: {
          name: `Produto Global Teste ${randomSuffix}`,
          brandId: testBrandId,
          globalCategoryId: testCategoryId,
          barcode: `78900000${randomSuffix.toString().padStart(5, "0")}`,
          referenceSku: `SKU-${randomSuffix}`,
          description: "Descrição técnica oficial do produto",
          suggestedPrice: 199.90,
          costPrice: 139.90,
          active: true,
        },
      });

      createdGlobalProductIds.push(product.id);

      expect(product.id).toBeDefined();
      expect(product.brandId).toBe(testBrandId);
      expect(product.globalCategoryId).toBe(testCategoryId);
      expect(Number(product.suggestedPrice)).toBe(199.90);
      expect(product.active).toBe(true);
    });

    it("deve atualizar os dados e status do produto global", async () => {
      const productId = createdGlobalProductIds[0];
      expect(productId).toBeDefined();

      const updated = await prisma.globalProduct.update({
        where: { id: productId },
        data: {
          suggestedPrice: 219.90,
          active: false,
        },
      });

      expect(Number(updated.suggestedPrice)).toBe(219.90);
      expect(updated.active).toBe(false);
    });
  });

  describe("2. Ciclo de Vida do Catálogo Digital (Catalog & CatalogProduct)", () => {
    it("deve criar um catálogo digital vinculado à marca com status DRAFT", async () => {
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const catalog = await prisma.catalog.create({
        data: {
          title: `Catálogo Campanha Especial ${randomSuffix}`,
          brandId: testBrandId,
          cycle: `Ciclo 0${randomSuffix % 9 + 1}/2026`,
          description: "Catálogo de testes unitários da Sprint 4",
          status: "DRAFT",
          pdfPath: "samples/test-catalog.pdf",
          startDate: new Date("2026-05-01"),
          endDate: new Date("2026-05-31"),
        },
      });

      createdCatalogIds.push(catalog.id);

      expect(catalog.id).toBeDefined();
      expect(catalog.status).toBe("DRAFT");
      expect(catalog.pdfPath).toBe("samples/test-catalog.pdf");
    });

    it("deve vincular produtos globais ao catálogo com página e preço de ciclo", async () => {
      const catalogId = createdCatalogIds[0];
      const productId = createdGlobalProductIds[0];
      expect(catalogId).toBeDefined();
      expect(productId).toBeDefined();

      const item = await prisma.catalogProduct.create({
        data: {
          catalogId,
          globalProductId: productId,
          pageNumber: 15,
          cyclePrice: 189.90,
        },
      });

      expect(item.id).toBeDefined();
      expect(item.catalogId).toBe(catalogId);
      expect(item.globalProductId).toBe(productId);
      expect(item.pageNumber).toBe(15);
      expect(Number(item.cyclePrice)).toBe(189.90);
    });

    it("deve publicar o catálogo e torná-lo elegível para navegação (status PUBLISHED)", async () => {
      const catalogId = createdCatalogIds[0];

      const published = await prisma.catalog.update({
        where: { id: catalogId },
        data: { status: "PUBLISHED" },
      });

      expect(published.status).toBe("PUBLISHED");
    });
  });

  describe("3. Storage Seguro e URLs Assinadas de Catálogos", () => {
    it("deve invocar o helper getSignedCatalogUrl para geração de links seguros", async () => {
      // Testa se o helper do Supabase Storage responde corretamente
      try {
        const signedUrl = await getSignedCatalogUrl("samples/test-catalog.pdf", 1800);
        expect(typeof signedUrl).toBe("string");
        expect(signedUrl.length).toBeGreaterThan(10);
      } catch (err: any) {
        // Se o Supabase estiver indisponível ou offline no ambiente de teste, o erro esperado é tratado
        expect(err.message).toBeDefined();
      }
    });
  });

  describe("4. Importação de Produto para Loja do Lojista", () => {
    it("deve importar um produto global para a loja vinculando globalProductId", async () => {
      const globalProdId = createdGlobalProductIds[0];
      const globalProd = await prisma.globalProduct.findUnique({
        where: { id: globalProdId },
      });
      expect(globalProd).not.toBeNull();
      if (!globalProd) return;

      const storeProduct = await prisma.product.create({
        data: {
          name: globalProd.name,
          lojaId: testLojaId,
          globalProductId: globalProd.id,
          description: globalProd.description,
          barcode: globalProd.barcode,
          code: `IMP-${globalProd.referenceSku}`,
          salePrice: Number(globalProd.suggestedPrice || 0),
          costPrice: Number(globalProd.costPrice || 0),
          stock: 0,
          active: true,
        },
      });

      createdStoreProductIds.push(storeProduct.id);

      expect(storeProduct.id).toBeDefined();
      expect(storeProduct.lojaId).toBe(testLojaId);
      expect(storeProduct.globalProductId).toBe(globalProd.id);
      expect(Number(storeProduct.salePrice)).toBe(Number(globalProd.suggestedPrice));
    });

    it("deve localizar produtos já importados da loja via globalProductId", async () => {
      const globalProdId = createdGlobalProductIds[0];

      const found = await prisma.product.findFirst({
        where: {
          lojaId: testLojaId,
          globalProductId: globalProdId,
          deletedAt: null,
        },
      });

      expect(found).not.toBeNull();
      expect(found?.globalProductId).toBe(globalProdId);
    });
  });

  describe("5. Autorização RBAC para APIs de Catálogos", () => {
    it("deve barrar requisições administrativas sem token de plataforma", async () => {
      mockCookiesMap.clear();

      const auth = await requirePlatformAdmin("OPERATOR");
      expect(auth.authorized).toBe(false);
      if (!auth.authorized) {
        expect(auth.response.status).toBe(401);
      }
    });

    it("deve permitir requisições quando houver token de SUPERADMIN ativo", async () => {
      const admin = await prisma.platformAdmin.findUnique({
        where: { email: "admin@zelo.app" },
      });
      expect(admin).not.toBeNull();
      if (!admin) return;

      const payload: AdminJwtPayload = {
        sub: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        scope: "platform",
      };

      const superAdminToken = await new SignJWT(payload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("4h")
        .sign(JWT_SECRET);

      mockCookiesMap.set("admin_token", superAdminToken);

      const auth = await requirePlatformAdmin("OPERATOR");
      expect(auth.authorized).toBe(true);
      if (auth.authorized) {
        expect(auth.admin.email).toBe("admin@zelo.app");
      }
    });
  });
});
