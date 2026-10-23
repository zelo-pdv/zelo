import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";

const updateGlobalProductSchema = z.object({
  name: z.string().min(2, "O nome do produto deve ter pelo menos 2 caracteres").optional(),
  brandId: z.string().min(1, "A marca é obrigatória").optional(),
  globalCategoryId: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  referenceSku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url("URL de imagem inválida").optional().nullable().or(z.literal("")),
  suggestedPrice: z.number().nonnegative().optional().nullable(),
  costPrice: z.number().nonnegative().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const product = await prisma.globalProduct.findUnique({
      where: { id },
      include: {
        brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
        globalCategory: { select: { id: true, name: true, icon: true } },
        catalogProducts: {
          include: {
            catalog: { select: { id: true, title: true, cycle: true, status: true } },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto global não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Erro ao obter produto global:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao obter produto global." },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const parsed = updateGlobalProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const current = await prisma.globalProduct.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json(
        { error: "Produto global não encontrado." },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
    if (parsed.data.brandId !== undefined) {
      const brand = await prisma.brand.findUnique({ where: { id: parsed.data.brandId } });
      if (!brand) return NextResponse.json({ error: "Marca não encontrada." }, { status: 404 });
      updateData.brandId = parsed.data.brandId;
    }
    if (parsed.data.globalCategoryId !== undefined) {
      if (parsed.data.globalCategoryId) {
        const cat = await prisma.globalCategory.findUnique({ where: { id: parsed.data.globalCategoryId } });
        if (!cat) return NextResponse.json({ error: "Categoria global não encontrada." }, { status: 404 });
        updateData.globalCategoryId = parsed.data.globalCategoryId;
      } else {
        updateData.globalCategoryId = null;
      }
    }
    if (parsed.data.barcode !== undefined) updateData.barcode = parsed.data.barcode?.trim() || null;
    if (parsed.data.referenceSku !== undefined) updateData.referenceSku = parsed.data.referenceSku?.trim() || null;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description?.trim() || null;
    if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl?.trim() || null;
    if (parsed.data.suggestedPrice !== undefined) updateData.suggestedPrice = parsed.data.suggestedPrice;
    if (parsed.data.costPrice !== undefined) updateData.costPrice = parsed.data.costPrice;
    if (parsed.data.active !== undefined) updateData.active = parsed.data.active;

    const updated = await prisma.globalProduct.update({
      where: { id },
      data: updateData,
      include: {
        brand: { select: { id: true, name: true, logoUrl: true } },
        globalCategory: { select: { id: true, name: true, icon: true } },
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "GLOBAL_PRODUCT_UPDATED",
        targetType: "GlobalProduct",
        targetId: id,
        details: {
          name: updated.name,
          updatedFields: Object.keys(updateData),
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Produto global atualizado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao atualizar produto global:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao atualizar produto global." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin("OPERATOR");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const current = await prisma.globalProduct.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!current) {
      return NextResponse.json(
        { error: "Produto global não encontrado." },
        { status: 404 }
      );
    }

    await prisma.globalProduct.delete({ where: { id } });

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "GLOBAL_PRODUCT_DELETED",
        targetType: "GlobalProduct",
        targetId: id,
        details: { name: current.name },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Produto global removido com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao remover produto global:", error);
    return NextResponse.json(
      { error: "Erro interno ao remover produto global." },
      { status: 500 }
    );
  }
}
