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
