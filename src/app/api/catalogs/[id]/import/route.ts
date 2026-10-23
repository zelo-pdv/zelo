import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const importProductsSchema = z.object({
  globalProductIds: z
    .array(z.string().min(1))
    .min(1, "Selecione ao menos um produto para importar."),
  categoryId: z.string().optional().nullable(),
  defaultStock: z.number().min(0).default(0),
});

async function getUniqueStoreCode(
  lojaId: string,
  baseCode: string | null,
  isVariant = false
): Promise<string | null> {
  if (!baseCode) return null;
  let code = baseCode.trim();
  let counter = 1;
  while (true) {
    const existing = isVariant
      ? await prisma.productVariant.findFirst({
          where: { lojaId, code, deletedAt: null },
          select: { id: true },
        })
      : await prisma.product.findFirst({
          where: { lojaId, code, deletedAt: null },
          select: { id: true },
        });
    if (!existing) return code;
    code = `${baseCode}-${counter++}`;
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Não autenticado." },
      { status: 401 }
    );
  }

  // Verifica permissão do lojista
  const canAddProduct =
    user.isAdmin ||
    user.isOwner ||
    user.permissions?.produtos?.includes("Adicionar");
  if (!canAddProduct) {
    return NextResponse.json(
      { error: "Você não tem permissão para adicionar produtos nesta loja." },
      { status: 403 }
    );
  }

  try {
    const { id: catalogId } = await params;
    const body = await req.json();
    const parsed = importProductsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { globalProductIds, categoryId: requestedCategoryId, defaultStock } =
      parsed.data;

    // Busca os produtos e a relação de ciclo, incluindo variantes globais
    const catalogProducts = await prisma.catalogProduct.findMany({
      where: {
        catalogId,
        globalProductId: { in: globalProductIds },
        curationStatus: "APPROVED",
      },
      include: {
        globalProduct: {
          include: {
            globalCategory: true,
            variants: {
              where: { active: true },
              orderBy: [{ size: "asc" }, { colorName: "asc" }],
            },
          },
        },
      },
    });

    if (catalogProducts.length === 0) {
      return NextResponse.json(
        { error: "Nenhum produto aprovado encontrado no catálogo para importação." },
        { status: 404 }
      );
    }

    // Busca produtos já cadastrados na loja para evitar duplicidade
    const existingProducts = await prisma.product.findMany({
      where: {
        lojaId: user.lojaId,
        globalProductId: { in: globalProductIds },
        deletedAt: null,
      },
      select: { globalProductId: true, id: true },
    });
    const alreadyImportedIds = new Set(
      existingProducts.map((p) => p.globalProductId)
    );

    // Mapeamento de categorias da loja
    const lojaCategories = await prisma.category.findMany({
      where: { lojaId: user.lojaId, deletedAt: null },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(
      lojaCategories.map((c) => [c.name.toLowerCase().trim(), c.id])
    );

    let defaultCategory = lojaCategories.find(
      (c) => c.name.toLowerCase() === "geral" || c.name.toLowerCase() === "diversos"
    );
    if (!defaultCategory && lojaCategories.length > 0) {
      defaultCategory = lojaCategories[0];
    }

    // Valida categoria explicitamente requisitada se fornecida
    let explicitCategoryId: string | null = null;
    if (requestedCategoryId) {
      const cat = lojaCategories.find((c) => c.id === requestedCategoryId);
      if (cat) {
        explicitCategoryId = cat.id;
      }
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const cp of catalogProducts) {
      const gp = cp.globalProduct;
      if (alreadyImportedIds.has(gp.id)) {
        skippedCount++;
        continue;
      }

      // Mapeia categoria
      let localCategoryId: string | null = explicitCategoryId;
      if (!localCategoryId) {
        if (gp.globalCategory?.name) {
          const normalized = gp.globalCategory.name.toLowerCase().trim();
          if (categoryMap.has(normalized)) {
            localCategoryId = categoryMap.get(normalized)!;
          } else {
            try {
              const newCat = await prisma.category.create({
                data: {
                  name: gp.globalCategory.name,
                  lojaId: user.lojaId,
                  active: true,
                },
              });
              categoryMap.set(normalized, newCat.id);
              localCategoryId = newCat.id;
            } catch {
              localCategoryId = defaultCategory?.id || null;
            }
          }
        } else {
          localCategoryId = defaultCategory?.id || null;
        }
      }

      // Preço de venda: usa o preço de catálogo ou o sugerido
      const salePrice = Number(
        cp.regularPrice ?? cp.cyclePrice ?? gp.suggestedPrice ?? 0
      );
      const costPrice = Number(gp.costPrice ?? 0);
      const productImage = cp.cropUrl || gp.imageUrl || null;

      // Garante código único para o produto
      const productCode = await getUniqueStoreCode(
        user.lojaId,
        gp.referenceSku || null,
        false
      );

      // Prepara variações se existirem
      const hasVariants = gp.variants && gp.variants.length > 0;
      let variantCreateData: any[] | undefined = undefined;

      if (hasVariants) {
        variantCreateData = [];
        for (let i = 0; i < gp.variants.length; i++) {
          const gv = gp.variants[i];
          const variantName =
            [gv.size, gv.colorName].filter(Boolean).join(" - ") ||
            gv.name ||
            `Variante ${i + 1}`;

          const baseVariantCode = gv.skuSuffix
            ? `${productCode || "PROD"}-${gv.skuSuffix}`
            : gv.size || gv.colorCode
            ? `${productCode || "PROD"}-${[gv.size, gv.colorCode].filter(Boolean).join("-")}`
            : `${productCode || "PROD"}-V${i + 1}`;

          const variantCode = await getUniqueStoreCode(
            user.lojaId,
            baseVariantCode,
            true
          );

          variantCreateData.push({
            name: variantName,
            code: variantCode,
            barcode: gv.barcode || null,
            attributes: {
              size: gv.size || null,
              color: gv.colorName || null,
              colorCode: gv.colorCode || null,
            },
            costPrice: costPrice > 0 ? costPrice : null,
            salePrice: gv.priceOverride
              ? Number(gv.priceOverride)
              : salePrice,
            stock: defaultStock,
            image: productImage,
            lojaId: user.lojaId,
          });
        }
      }

      await prisma.product.create({
        data: {
          name: gp.name,
          lojaId: user.lojaId,
          globalProductId: gp.id,
          description: gp.description,
          barcode: gp.barcode,
          code: productCode,
          image: productImage,
          salePrice,
          costPrice: costPrice > 0 ? costPrice : null,
          stock: hasVariants ? 0 : defaultStock,
          categoryId: localCategoryId,
          active: true,
          variants:
            variantCreateData && variantCreateData.length > 0
              ? {
                  create: variantCreateData,
                }
              : undefined,
        },
      });

      importedCount++;
    }

    if (importedCount > 0) {
      await createAuditLog({
        action: "IMPORT_CATALOG_PRODUCTS",
        entity: "Product",
        entityId: catalogId,
        details: {
          catalogId,
          importedCount,
          skippedCount,
          totalRequested: globalProductIds.length,
        },
        userId: user.id,
        lojaId: user.lojaId,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${importedCount} produto(s) importado(s) com sucesso para o estoque da sua loja.${
        skippedCount > 0 ? ` (${skippedCount} já constavam cadastrados)` : ""
      }`,
      importedCount,
      skippedCount,
    });
  } catch (error) {
    console.error("Erro ao importar produtos do catálogo:", error);
    return NextResponse.json(
      { error: "Erro interno ao importar produtos para a sua loja." },
      { status: 500 }
    );
  }
}
