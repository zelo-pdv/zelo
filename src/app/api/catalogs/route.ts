import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CatalogStatus } from "@/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Não autenticado." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const brandId = searchParams.get("brandId")?.trim() || "";

    const where: any = {
      status: CatalogStatus.PUBLISHED,
    };

    if (brandId && brandId !== "all") {
      where.brandId = brandId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { cycle: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const catalogs = await prisma.catalog.findMany({
      where,
      include: {
        brand: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    const catalogIds = catalogs.map((c) => c.id);
    const approvedCounts = catalogIds.length > 0
      ? await prisma.catalogProduct.groupBy({
          by: ["catalogId"],
          where: {
            catalogId: { in: catalogIds },
            curationStatus: "APPROVED",
          },
          _count: { id: true },
        })
      : [];

    const approvedMap = new Map(
      approvedCounts.map((ac) => [ac.catalogId, ac._count.id])
    );

    const enriched = catalogs.map((c) => ({
      ...c,
      approvedProductsCount: approvedMap.get(c.id) || 0,
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error("Erro ao listar catálogos públicos para lojista:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar catálogos disponíveis." },
      { status: 500 }
    );
  }
}
