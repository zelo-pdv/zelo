import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";

const catalogProductItemSchema = z.object({
  globalProductId: z.string().min(1, "ID do produto global é obrigatório"),
  pageNumber: z.number().int().positive().optional().nullable(),
  cyclePrice: z.number().nonnegative().optional().nullable(),
});

const associateProductsSchema = z.object({
  mode: z.enum(["append", "replace"]).default("append"),
  products: z.array(catalogProductItemSchema).min(1, "Ao menos um produto deve ser informado"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin("OPERATOR");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = associateProductsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const catalog = await prisma.catalog.findUnique({
      where: { id },
      select: { id: true, title: true, brandId: true },
    });

    if (!catalog) {
      return NextResponse.json(
        { error: "Catálogo não encontrado." },
        { status: 404 }
      );
    }

    const { mode, products } = parsed.data;

    // Se o modo for 'replace', remove associações prévias
    if (mode === "replace") {
      await prisma.catalogProduct.deleteMany({
        where: { catalogId: id },
      });
    }

    // Executa upserts atômicos
    const upserts = products.map((item) =>
      prisma.catalogProduct.upsert({
        where: {
          catalogId_globalProductId: {
            catalogId: id,
            globalProductId: item.globalProductId,
          },
        },
        update: {
          pageNumber: item.pageNumber ?? null,
          cyclePrice: item.cyclePrice ?? null,
        },
        create: {
          catalogId: id,
          globalProductId: item.globalProductId,
          pageNumber: item.pageNumber ?? null,
          cyclePrice: item.cyclePrice ?? null,
        },
      })
    );

    await prisma.$transaction(upserts);

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "CATALOG_PRODUCTS_UPDATED",
        targetType: "Catalog",
        targetId: id,
        details: {
          catalogTitle: catalog.title,
          productCount: products.length,
          mode,
        },
      },
    });

    const totalInCatalog = await prisma.catalogProduct.count({
      where: { catalogId: id },
    });

    return NextResponse.json({
      success: true,
      message: `${products.length} produto(s) associado(s) com sucesso.`,
      totalInCatalog,
    });
  } catch (error) {
    console.error("Erro ao vincular produtos ao catálogo:", error);
    return NextResponse.json(
      { error: "Erro interno ao associar produtos ao catálogo." },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin("OPERATOR");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    const where: any = { catalogId: id };

    if (status && status !== "ALL") {
      where.curationStatus = status;
    }

    if (search) {
      where.OR = [
        { globalProduct: { name: { contains: search, mode: "insensitive" } } },
        { globalProduct: { referenceSku: { contains: search, mode: "insensitive" } } },
      ];
    }

    const items = await prisma.catalogProduct.findMany({
      where,
      orderBy: [{ pageNumber: "asc" }, { createdAt: "asc" }],
      include: {
        globalProduct: {
          include: {
            globalCategory: {
              select: { id: true, name: true },
            },
            variants: {
              orderBy: [{ size: "asc" }, { colorName: "asc" }],
            },
          },
        },
      },
    });

    const statusCounts = await prisma.catalogProduct.groupBy({
      by: ["curationStatus"],
      where: { catalogId: id },
      _count: { id: true },
    });

    const countsMap: Record<string, number> = {
      TOTAL: 0,
      PENDING_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
      FLAGGED: 0,
    };

    statusCounts.forEach((sc) => {
      countsMap[sc.curationStatus] = sc._count.id;
      countsMap.TOTAL += sc._count.id;
    });

    const serializedItems = items.map((item) => ({
      ...item,
      regularPrice: item.regularPrice !== null ? Number(item.regularPrice) : null,
      promoPrice: item.promoPrice !== null ? Number(item.promoPrice) : null,
      cyclePrice: item.cyclePrice !== null ? Number(item.cyclePrice) : null,
      globalProduct: {
        ...item.globalProduct,
        suggestedPrice:
          item.globalProduct.suggestedPrice !== null
            ? Number(item.globalProduct.suggestedPrice)
            : null,
        costPrice:
          item.globalProduct.costPrice !== null
            ? Number(item.globalProduct.costPrice)
            : null,
        variants: item.globalProduct.variants?.map((v) => ({
          ...v,
          priceOverride:
            v.priceOverride !== null ? Number(v.priceOverride) : null,
        })),
      },
    }));

    return NextResponse.json({
      success: true,
      items: serializedItems,
      counts: countsMap,
    });
  } catch (error) {
    console.error("Erro ao listar produtos do catálogo:", error);
    return NextResponse.json(
      { error: "Erro interno ao listar produtos do catálogo." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin("OPERATOR");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const body = await req.json();

    // Ação em lote: Aprovar todos os pendentes
    if (body.action === "approve_all_pending") {
      const updateResult = await prisma.catalogProduct.updateMany({
        where: {
          catalogId: id,
          curationStatus: "PENDING_REVIEW",
        },
        data: {
          curationStatus: "APPROVED",
        },
      });

      await prisma.platformAuditLog.create({
        data: {
          adminId: auth.admin.id,
          action: "CATALOG_CURATION_BATCH_APPROVED",
          targetType: "Catalog",
          targetId: id,
          details: { updatedCount: updateResult.count },
        },
      });

      return NextResponse.json({
        success: true,
        message: `${updateResult.count} produto(s) aprovado(s) com sucesso.`,
      });
    }

    // Ação em lote para itens selecionados (aprovar, rejeitar, sinalizar ou retornar a pendente)
    if (body.action === "batch_update_status") {
      const ids: string[] = Array.isArray(body.catalogProductIds)
        ? body.catalogProductIds.filter((v: unknown): v is string => typeof v === "string" && v.length > 0)
        : [];
      const targetStatus = body.curationStatus;
      const validStatuses = ["PENDING_REVIEW", "APPROVED", "REJECTED", "FLAGGED"];

      if (ids.length === 0 || !validStatuses.includes(targetStatus)) {
        return NextResponse.json(
          { error: "Informe ao menos um produto e um status de curadoria válido." },
          { status: 400 }
        );
      }

      const updateResult = await prisma.catalogProduct.updateMany({
        where: {
          id: { in: ids },
          catalogId: id,
        },
        data: {
          curationStatus: targetStatus,
        },
      });

      await prisma.platformAuditLog.create({
        data: {
          adminId: auth.admin.id,
          action: "CATALOG_CURATION_BATCH_STATUS_UPDATED",
          targetType: "Catalog",
          targetId: id,
          details: { updatedCount: updateResult.count, curationStatus: targetStatus },
        },
      });

      return NextResponse.json({
        success: true,
        updatedCount: updateResult.count,
        message: `${updateResult.count} produto(s) atualizado(s) com sucesso.`,
      });
    }

    // Atualização de item individual
    const {
      catalogProductId,
      curationStatus,
      regularPrice,
      promoPrice,
      promoRule,
      promoMinQuantity,
      curationNotes,
      productName,
      referenceSku,
      description,
      globalCategoryId,
    } = body;

    if (!catalogProductId) {
      return NextResponse.json(
        { error: "ID do produto do catálogo é obrigatório." },
        { status: 400 }
      );
    }

    const existingItem = await prisma.catalogProduct.findFirst({
      where: { id: catalogProductId, catalogId: id },
      select: { id: true, catalogId: true, globalProductId: true },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Item de catálogo não encontrado." },
        { status: 404 }
      );
    }

    if (globalCategoryId !== undefined && globalCategoryId !== null && globalCategoryId !== "") {
      const categoryExists = await prisma.globalCategory.findUnique({
        where: { id: globalCategoryId },
        select: { id: true },
      });
      if (!categoryExists) {
        return NextResponse.json(
          { error: "Categoria global não encontrada." },
          { status: 400 }
        );
      }
    }

    if (
      productName !== undefined ||
      referenceSku !== undefined ||
      description !== undefined ||
      globalCategoryId !== undefined
    ) {
      await prisma.globalProduct.update({
        where: { id: existingItem.globalProductId },
        data: {
          name: typeof productName === "string" && productName.trim() ? productName.trim() : undefined,
          referenceSku:
            referenceSku !== undefined
              ? referenceSku?.trim() || null
              : undefined,
          description:
            description !== undefined
              ? description?.trim() || null
              : undefined,
          globalCategoryId:
            globalCategoryId !== undefined
              ? globalCategoryId || null
              : undefined,
        },
      });
    }

    const validSingleStatuses = ["PENDING_REVIEW", "APPROVED", "REJECTED", "FLAGGED"];
    const sanitizedStatus =
      curationStatus && validSingleStatuses.includes(curationStatus)
        ? curationStatus
        : undefined;

    const updated = await prisma.catalogProduct.update({
      where: { id: existingItem.id },
      data: {
        curationStatus: sanitizedStatus,
        regularPrice: regularPrice !== undefined ? regularPrice : undefined,
        promoPrice: promoPrice !== undefined ? promoPrice : undefined,
        promoRule: promoRule !== undefined ? promoRule : undefined,
        promoMinQuantity:
          promoMinQuantity !== undefined ? promoMinQuantity : undefined,
        curationNotes: curationNotes !== undefined ? curationNotes : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Item atualizado com sucesso.",
      item: updated,
    });
  } catch (error) {
    console.error("Erro ao atualizar curadoria do produto:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar curadoria." },
      { status: 500 }
    );
  }
}
