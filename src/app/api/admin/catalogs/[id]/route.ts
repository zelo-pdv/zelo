import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { getSignedCatalogUrl } from "@/lib/supabase";
import { CatalogStatus } from "@/prisma";

const updateCatalogSchema = z.object({
  title: z.string().min(2, "O título do catálogo deve ter pelo menos 2 caracteres").optional(),
  brandId: z.string().min(1, "A marca é obrigatória").optional(),
  cycle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  coverUrl: z.string().url("URL de capa inválida").optional().nullable().or(z.literal("")),
  pdfPath: z.string().optional().nullable(),
  status: z.nativeEnum(CatalogStatus).optional(),
  startDate: z.string().datetime().optional().nullable().or(z.literal("")),
  endDate: z.string().datetime().optional().nullable().or(z.literal("")),
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
    const catalog = await prisma.catalog.findUnique({
      where: { id },
      include: {
        brand: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        products: {
          include: {
            globalProduct: {
              include: {
                globalCategory: {
                  select: { id: true, name: true, icon: true },
                },
              },
            },
          },
          orderBy: [{ pageNumber: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!catalog) {
      return NextResponse.json(
        { error: "Catálogo não encontrado." },
        { status: 404 }
      );
    }

    let signedPdfUrl: string | null = null;
    if (catalog.pdfPath) {
      try {
        signedPdfUrl = await getSignedCatalogUrl(catalog.pdfPath, 3600); // 1 hora
      } catch (err) {
        console.warn("Falha ao gerar URL assinada do PDF:", err);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...catalog,
        signedPdfUrl,
      },
    });
  } catch (error) {
    console.error("Erro ao obter catálogo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao obter catálogo." },
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
    const parsed = updateCatalogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const currentCatalog = await prisma.catalog.findUnique({ where: { id } });
    if (!currentCatalog) {
      return NextResponse.json(
        { error: "Catálogo não encontrado." },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.brandId !== undefined) {
      const brand = await prisma.brand.findUnique({ where: { id: parsed.data.brandId } });
      if (!brand) {
        return NextResponse.json({ error: "Marca não encontrada." }, { status: 404 });
      }
      updateData.brandId = parsed.data.brandId;
    }
    if (parsed.data.cycle !== undefined) updateData.cycle = parsed.data.cycle?.trim() || null;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description?.trim() || null;
    if (parsed.data.coverUrl !== undefined) updateData.coverUrl = parsed.data.coverUrl?.trim() || null;
    if (parsed.data.pdfPath !== undefined) updateData.pdfPath = parsed.data.pdfPath?.trim() || null;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.startDate !== undefined) {
      updateData.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
    }
    if (parsed.data.endDate !== undefined) {
      updateData.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
    }

    const updatedCatalog = await prisma.catalog.update({
      where: { id },
      data: updateData,
      include: {
        brand: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "CATALOG_UPDATED",
        targetType: "Catalog",
        targetId: updatedCatalog.id,
        details: {
          previousStatus: currentCatalog.status,
          newStatus: updatedCatalog.status,
          updatedFields: Object.keys(updateData),
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCatalog,
      message: "Catálogo atualizado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao atualizar catálogo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao atualizar catálogo." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin("SUPERADMIN");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const currentCatalog = await prisma.catalog.findUnique({
      where: { id },
      select: { id: true, title: true, brandId: true },
    });

    if (!currentCatalog) {
      return NextResponse.json(
        { error: "Catálogo não encontrado." },
        { status: 404 }
      );
    }

    await prisma.catalog.delete({ where: { id } });

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "CATALOG_DELETED",
        targetType: "Catalog",
        targetId: id,
        details: {
          title: currentCatalog.title,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Catálogo removido com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir catálogo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao excluir catálogo." },
      { status: 500 }
    );
  }
}
