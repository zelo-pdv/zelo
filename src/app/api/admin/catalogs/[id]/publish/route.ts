import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";

export const dynamic = "force-dynamic";

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

    const catalog = await prisma.catalog.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!catalog) {
      return NextResponse.json(
        { error: "Catálogo não encontrado." },
        { status: 404 }
      );
    }

    if (catalog._count.products === 0) {
      return NextResponse.json(
        {
          error:
            "Não é possível publicar um catálogo sem nenhum produto cadastrado.",
        },
        { status: 400 }
      );
    }

    // Verifica se ainda existem produtos com status REJECTED e quantos APPROVED
    const counts = await prisma.catalogProduct.groupBy({
      by: ["curationStatus"],
      where: { catalogId: id },
      _count: { id: true },
    });

    const approvedCount =
      counts.find((c) => c.curationStatus === "APPROVED")?._count.id || 0;
    const pendingCount =
      counts.find((c) => c.curationStatus === "PENDING_REVIEW")?._count.id || 0;

    if (approvedCount === 0 && pendingCount > 0) {
      // Se todos estiverem pendentes, aprova automaticamente os não rejeitados ao publicar
      await prisma.catalogProduct.updateMany({
        where: {
          catalogId: id,
          curationStatus: "PENDING_REVIEW",
        },
        data: {
          curationStatus: "APPROVED",
        },
      });
    }

    const updated = await prisma.catalog.update({
      where: { id },
      data: {
        status: "PUBLISHED",
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "CATALOG_PUBLISHED",
        targetType: "Catalog",
        targetId: id,
        details: {
          catalogTitle: catalog.title,
          totalProducts: catalog._count.products,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Catálogo publicado com sucesso e disponível para as lojas.",
      catalog: updated,
    });
  } catch (error: any) {
    console.error("Erro ao publicar catálogo:", error);
    return NextResponse.json(
      { error: "Erro interno ao publicar catálogo." },
      { status: 500 }
    );
  }
}
