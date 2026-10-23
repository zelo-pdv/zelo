import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const importProductsSchema = z.object({
  globalProductIds: z.array(z.string().min(1)).min(1, "Selecione ao menos um produto para importar."),
});

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
  const canAddProduct = user.isAdmin || user.isOwner || user.permissions?.produtos?.includes("Adicionar");
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

    const { globalProductIds } = parsed.data;

    // Busca os produtos e a relação de ciclo
    const catalogProducts = await prisma.catalogProduct.findMany({
      where: {
        catalogId,
        globalProductId: { in: globalProductIds },
      },
      include: {
        globalProduct: {
          include: {
            globalCategory: true,
          },
        },
      },
    });

    if (catalogProducts.length === 0) {
      return NextResponse.json(
        { error: "Nenhum produto correspondente encontrado no catálogo." },
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
    const alreadyImportedIds = new Set(existingProducts.map((p) => p.globalProductId));

    // Busca ou cria categorias na loja dos lojistas correspondentes às categorias globais
    const lojaCategories = await prisma.category.findMany({
      where: { lojaId: user.lojaId, deletedAt: null },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(lojaCategories.map((c) => [c.name.toLowerCase().trim(), c.id]));

    // Categoria padrão da loja ("Geral")
    let defaultCategory = lojaCategories.find((c) => c.name.toLowerCase() === "geral");
    if (!defaultCategory && lojaCategories.length > 0) {
      defaultCategory = lojaCategories[0];
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
      let localCategoryId: string | null = null;
      if (gp.globalCategory?.name) {
        const normalized = gp.globalCategory.name.toLowerCase().trim();
        if (categoryMap.has(normalized)) {
          localCategoryId = categoryMap.get(normalized)!;
        } else {
          // Cria a categoria local correspondente
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

      // Preço de venda: usa o preço promocional do ciclo ou o sugerido
      const salePrice = Number(cp.cyclePrice ?? gp.suggestedPrice ?? 0);
      const costPrice = Number(gp.costPrice ?? 0);

      // Garante código único
      let productCode = gp.referenceSku?.trim() || null;
      if (productCode) {
        const existingCode = await prisma.product.findFirst({
          where: { lojaId: user.lojaId, code: productCode, deletedAt: null },
        });
        if (existingCode) {
          productCode = `${productCode}-${Math.floor(Math.random() * 1000)}`;
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
          image: gp.imageUrl,
          salePrice,
          costPrice: costPrice > 0 ? costPrice : null,
          stock: 0,
          categoryId: localCategoryId,
          active: true,
        },
      });

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `${importedCount} produto(s) importado(s) com sucesso para o seu estoque.${skippedCount > 0 ? ` (${skippedCount} já constavam cadastrados)` : ""}`,
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
