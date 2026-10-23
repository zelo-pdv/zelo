import "dotenv/config";
import { describe, it, expect, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
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

describe("Sprint 3 - Marcas e Categorias Globais", () => {
  const createdBrandIds: string[] = [];
  const createdCategoryIds: string[] = [];
  let superAdminToken: string;
  let adminId: string;

  afterAll(async () => {
    // Limpeza de entidades de teste
    if (createdBrandIds.length > 0) {
      await prisma.brand.deleteMany({
        where: { id: { in: createdBrandIds } },
      });
    }
    if (createdCategoryIds.length > 0) {
      await prisma.globalCategory.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
    }
  });

  describe("1. Utilitário Slugify", () => {
    it("deve converter nomes acentuados e com caracteres especiais em slugs limpos", () => {
      expect(slugify("O Boticário")).toBe("o-boticario");
      expect(slugify("Cuidados Diários & Higiene")).toBe("cuidados-diarios-higiene");
      expect(slugify("Maquiagem / Rosto 2026!")).toBe("maquiagem-rosto-2026");
      expect(slugify("  Natura   Ekos  ")).toBe("natura-ekos");
      expect(slugify("Perfumes---Masculinos")).toBe("perfumes-masculinos");
    });
  });

  describe("2. Gestão de Marcas (Brand CRUD & Unicidade)", () => {
    it("deve criar uma nova marca com slug único", async () => {
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const brandName = `Marca Teste Unit ${randomSuffix}`;
      const brandSlug = slugify(brandName);

      const brand = await prisma.brand.create({
        data: {
          name: brandName,
          slug: brandSlug,
          description: "Descrição da marca para testes automatizados",
          logoUrl: "https://example.com/logo.png",
          active: true,
        },
      });

      createdBrandIds.push(brand.id);

      expect(brand.id).toBeDefined();
      expect(brand.name).toBe(brandName);
      expect(brand.slug).toBe(brandSlug);
      expect(brand.active).toBe(true);
    });

    it("deve rejeitar a criação de marca com slug duplicado", async () => {
      const existingBrand = await prisma.brand.findFirst();
      expect(existingBrand).not.toBeNull();

      if (!existingBrand) return;

      await expect(
        prisma.brand.create({
          data: {
            name: `Outro Nome ${Date.now()}`,
            slug: existingBrand.slug, // Slug já existente
            active: true,
          },
        })
      ).rejects.toThrow();
    });

    it("deve atualizar dados de uma marca existente", async () => {
      const brandId = createdBrandIds[0];
      expect(brandId).toBeDefined();

      const updated = await prisma.brand.update({
        where: { id: brandId },
        data: {
          description: "Descrição atualizada via teste",
          active: false,
        },
      });

      expect(updated.description).toBe("Descrição atualizada via teste");
      expect(updated.active).toBe(false);
    });
  });

  describe("3. Gestão de Categorias Globais (Category CRUD & Unicidade)", () => {
    it("deve criar uma nova categoria global com ícone e slug", async () => {
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const catName = `Categoria Teste ${randomSuffix}`;
      const catSlug = slugify(catName);

      const category = await prisma.globalCategory.create({
        data: {
          name: catName,
          slug: catSlug,
          icon: "spray-can",
          description: "Categoria de teste para perfumes e colônias",
          active: true,
        },
      });

      createdCategoryIds.push(category.id);

      expect(category.id).toBeDefined();
      expect(category.name).toBe(catName);
      expect(category.slug).toBe(catSlug);
      expect(category.icon).toBe("spray-can");
      expect(category.active).toBe(true);
    });

    it("deve rejeitar a criação de categoria com slug duplicado", async () => {
      const existingCat = await prisma.globalCategory.findFirst();
      expect(existingCat).not.toBeNull();

      if (!existingCat) return;

      await expect(
        prisma.globalCategory.create({
          data: {
            name: `Categoria Conflitante ${Date.now()}`,
            slug: existingCat.slug,
            active: true,
          },
        })
      ).rejects.toThrow();
    });

    it("deve listar categorias filtrando por status ativo", async () => {
      const activeCats = await prisma.globalCategory.findMany({
        where: { active: true },
      });
      expect(activeCats.length).toBeGreaterThanOrEqual(1);
      expect(activeCats.every((c) => c.active === true)).toBe(true);
    });
  });

  describe("4. Autorização RBAC para APIs de Marcas e Categorias", () => {
    it("deve barrar requisições sem cookie admin_token", async () => {
      mockCookiesMap.clear();

      const auth = await requirePlatformAdmin("OPERATOR");
      expect(auth.authorized).toBe(false);
      if (!auth.authorized) {
        expect(auth.response.status).toBe(401);
      }
    });

    it("deve permitir requisições quando houver token de SUPERADMIN ativo", async () => {
      // Busca ou cria o superadmin padrão
      const admin = await prisma.platformAdmin.findUnique({
        where: { email: "admin@zelo.app" },
      });
      expect(admin).not.toBeNull();
      if (!admin) return;

      adminId = admin.id;

      const payload: AdminJwtPayload = {
        sub: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        scope: "platform",
      };

      superAdminToken = await new SignJWT(payload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("4h")
        .sign(JWT_SECRET);

      mockCookiesMap.set("admin_token", superAdminToken);

      const auth = await requirePlatformAdmin("OPERATOR");
      expect(auth.authorized).toBe(true);
      if (auth.authorized) {
        expect(auth.admin.email).toBe("admin@zelo.app");
        expect(auth.admin.role).toBe("SUPERADMIN");
      }
    });

    it("deve rejeitar token com escopo incorreto (lojista tentando acessar como admin)", async () => {
      const lojistaPayload = {
        sub: "user-123",
        email: "lojista@zelo.app",
        name: "Lojista",
        lojaId: "loja-123",
        scope: "lojista", // Não é "platform"
      };

      const invalidToken = await new SignJWT(lojistaPayload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("4h")
        .sign(JWT_SECRET);

      mockCookiesMap.set("admin_token", invalidToken);

      const auth = await requirePlatformAdmin("OPERATOR");
      expect(auth.authorized).toBe(false);
      if (!auth.authorized) {
        expect(auth.response.status).toBe(401);
      }
    });
  });
});
