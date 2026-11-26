import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || "test-jwt-secret-min-32-chars-for-unit-tests";
});

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    catalogProduct: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    globalCategory: {
      findUnique: vi.fn(),
    },
    globalProduct: {
      update: vi.fn(),
      upsert: vi.fn(),
    },
    globalProductVariant: {
      upsert: vi.fn(),
    },
    catalogIngestionSheet: {
      upsert: vi.fn(),
    },
    product: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    productVariant: {
      findFirst: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    platformAuditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/require-platform-admin", () => ({
  requirePlatformAdmin: vi.fn().mockResolvedValue({
    authorized: true,
    admin: { id: "adm-1", role: "SUPERADMIN", email: "adm@zelo.test" },
  }),
}));
vi.mock("@/lib/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/catalog-ingestion/pdf-splitter", () => ({
  slicePdfSheet: vi.fn().mockResolvedValue({ pdfBytes: new Uint8Array([1, 2, 3]) }),
}));
vi.mock("@/lib/catalog-ingestion/page-renderer", () => ({
  renderPdfSheetToImage: vi.fn().mockResolvedValue({
    imageBuffer: Buffer.from("fake-img"),
    width: 1000,
    height: 1400,
  }),
}));
vi.mock("@/lib/catalog-ingestion/gemini-extractor", () => ({
  extractProductsFromSheet: vi.fn().mockResolvedValue({
    products: [
      {
        sku: "SKU-100",
        nome: "Produto Pipeline",
        preco_regular: 80,
        preco_promocional: 65,
        regra_promocional: "Promoção especial de ciclo",
        tamanhos: [],
        cores: [],
        box_2d: [],
      },
    ],
    modelUsed: "gemini-3.8-flash",
    durationMs: 100,
    inputTokens: 10,
    outputTokens: 10,
  }),
}));

import * as authModule from "@/lib/auth";
import { PATCH as patchCatalogProducts } from "@/app/api/admin/catalogs/[id]/products/route";
import { POST as importCatalogToStore } from "@/app/api/catalogs/[id]/import/route";
import {
  processCatalogSheet,
  extractPromoMinQuantity,
} from "@/lib/catalog-ingestion/ingestion-pipeline";

describe("Plano 06 — Segurança, Pipeline e Curadoria de Catálogos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH /api/admin/catalogs/[id]/products bloqueia IDOR cross-catalog com 404 e suporta batch_update_status + globalCategoryId", async () => {
    mockPrisma.catalogProduct.findFirst.mockResolvedValueOnce(null);

    const idorRes = await patchCatalogProducts(
      new Request("http://localhost:3000/api/admin/catalogs/cat-A/products", {
        method: "PATCH",
        body: JSON.stringify({
          catalogProductId: "cp-from-cat-B",
          curationStatus: "APPROVED",
        }),
      }),
      { params: Promise.resolve({ id: "cat-A" }) }
    );
    expect(idorRes.status).toBe(404);
    expect(mockPrisma.catalogProduct.update).not.toHaveBeenCalled();

    mockPrisma.catalogProduct.updateMany.mockResolvedValueOnce({ count: 2 });
    const batchRes = await patchCatalogProducts(
      new Request("http://localhost:3000/api/admin/catalogs/cat-A/products", {
        method: "PATCH",
        body: JSON.stringify({
          action: "batch_update_status",
          catalogProductIds: ["cp-1", "cp-2"],
          curationStatus: "PENDING_REVIEW",
        }),
      }),
      { params: Promise.resolve({ id: "cat-A" }) }
    );
    expect(batchRes.status).toBe(200);
    expect(mockPrisma.catalogProduct.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["cp-1", "cp-2"] }, catalogId: "cat-A" },
      data: { curationStatus: "PENDING_REVIEW" },
    });

    mockPrisma.catalogProduct.findFirst.mockResolvedValueOnce({
      id: "cp-1",
      catalogId: "cat-A",
      globalProductId: "gp-1",
    });
    mockPrisma.globalCategory.findUnique.mockResolvedValueOnce({ id: "gcat-1" });
    mockPrisma.globalProduct.update.mockResolvedValueOnce({});
    mockPrisma.catalogProduct.update.mockResolvedValueOnce({ id: "cp-1" });

    const editRes = await patchCatalogProducts(
      new Request("http://localhost:3000/api/admin/catalogs/cat-A/products", {
        method: "PATCH",
        body: JSON.stringify({
          catalogProductId: "cp-1",
          globalCategoryId: "gcat-1",
          productName: "Nome Corrigido",
        }),
      }),
      { params: Promise.resolve({ id: "cat-A" }) }
    );
    expect(editRes.status).toBe(200);
    expect(mockPrisma.globalProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Nome Corrigido",
          globalCategoryId: "gcat-1",
        }),
      })
    );
  });

  it("extractPromoMinQuantity extrai apenas quantidade explícita e processCatalogSheet preserva variantes sem null mismatch e curadoria APPROVED", async () => {
    expect(extractPromoMinQuantity(null, null)).toBeNull();
    expect(extractPromoMinQuantity(17.99, "3 ou + por 17,99 CADA")).toBe(3);
    expect(extractPromoMinQuantity(19.99, "Oferta de lançamento")).toBe(1);

    mockPrisma.globalProduct.upsert.mockResolvedValueOnce({ id: "gp-100" });
    mockPrisma.globalProductVariant.upsert.mockResolvedValueOnce({});
    mockPrisma.catalogProduct.findUnique.mockResolvedValueOnce({
      id: "cp-100",
      curationStatus: "APPROVED",
    });
    mockPrisma.catalogProduct.upsert.mockResolvedValueOnce({});

    await processCatalogSheet({
      catalogId: "cat-1",
      brandId: "brand-1",
      brandName: "Natura",
      catalogTitle: "Ciclo 01",
      pdfBuffer: Buffer.from("fake-pdf"),
      sheetNumber: 1,
    });

    // Variantes devem gravar size="" e colorCode="" consistentes com a chave única
    expect(mockPrisma.globalProductVariant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          globalProductId_size_colorCode: {
            globalProductId: "gp-100",
            size: "",
            colorCode: "",
          },
        },
        create: expect.objectContaining({
          size: "",
          colorCode: "",
        }),
      })
    );

    // Update do CatalogProduct NÃO deve sobrescrever curationStatus APPROVED para PENDING_REVIEW
    const catalogUpsertCall = mockPrisma.catalogProduct.upsert.mock.calls[0][0];
    expect(catalogUpsertCall.update.curationStatus).toBeUndefined();
    expect(catalogUpsertCall.update.promoMinQuantity).toBe(1);
  });

  it("POST /api/catalogs/[id]/import aplica defaultStock, suporta priceMode promo/regular e preserva oferta em notes", async () => {
    vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
      id: "u-1",
      name: "Lojista",
      lojaId: "loja-1",
      isAdmin: true,
      isOwner: true,
      permissions: {},
    } as any);

    mockPrisma.catalogProduct.findMany.mockResolvedValueOnce([
      {
        catalogId: "cat-1",
        globalProductId: "gp-1",
        regularPrice: 100,
        promoPrice: 75,
        promoRule: "Somente nesta semana",
        cyclePrice: null,
        cropUrl: null,
        globalProduct: {
          id: "gp-1",
          name: "Hidratante Premium",
          description: "200ml",
          barcode: null,
          referenceSku: "HID200",
          suggestedPrice: 100,
          costPrice: 50,
          imageUrl: null,
          globalCategory: null,
          variants: [],
        },
      },
    ]);
    mockPrisma.product.findMany.mockResolvedValueOnce([]);
    mockPrisma.category.findMany.mockResolvedValueOnce([{ id: "cat-geral", name: "Geral" }]);
    mockPrisma.product.findFirst.mockResolvedValueOnce(null);
    mockPrisma.product.create.mockResolvedValueOnce({ id: "store-prod-1" });

    const res = await importCatalogToStore(
      new Request("http://localhost:3000/api/catalogs/cat-1/import", {
        method: "POST",
        body: JSON.stringify({
          globalProductIds: ["gp-1"],
          defaultStock: 12,
          priceMode: "promo",
        }),
      }),
      { params: Promise.resolve({ id: "cat-1" }) }
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          salePrice: 75,
          stock: 12,
          notes: expect.stringContaining("R$ 75,00"),
        }),
      })
    );
  });
});
