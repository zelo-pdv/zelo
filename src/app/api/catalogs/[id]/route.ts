import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSignedCatalogUrl } from "@/lib/supabase";
import { CatalogStatus } from "@/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Não autenticado." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const catalog = await prisma.catalog.findFirst({
      where: {
        id,
        status: CatalogStatus.PUBLISHED,
      },
      include: {
        brand: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        products: {
          where: {
            curationStatus: "APPROVED",
          },
          include: {
            globalProduct: {
              include: {
                globalCategory: {
                  select: { id: true, name: true, icon: true },
                },
                variants: {
                  where: { active: true },
                  orderBy: [{ size: "asc" }, { colorName: "asc" }],
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
        { error: "Catálogo não encontrado ou ainda não publicado." },
        { status: 404 }
      );
    }

    // Identifica quais produtos o lojista já importou em sua loja
    const globalProductIds = catalog.products.map((p) => p.globalProductId);
    const alreadyImported = await prisma.product.findMany({
      where: {
        lojaId: user.lojaId,
        globalProductId: { in: globalProductIds },
        deletedAt: null,
      },
      select: { globalProductId: true, id: true },
    });
    const importedSet = new Set(alreadyImported.map((p) => p.globalProductId));

    let signedPdfUrl: string | null = null;
    if (catalog.pdfPath) {
      try {
        signedPdfUrl = await getSignedCatalogUrl(catalog.pdfPath, 3600); // 1 hora de acesso
      } catch (err) {
        console.warn("Falha ao gerar URL assinada do catálogo:", err);
      }
    }

    const productsWithImportStatus = catalog.products.map((cp) => ({
      ...cp,
      isImported: importedSet.has(cp.globalProductId),
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...catalog,
        signedPdfUrl,
        products: productsWithImportStatus,
      },
    });
  } catch (error) {
    console.error("Erro ao carregar catálogo para lojista:", error);
    return NextResponse.json(
      { error: "Erro interno ao carregar detalhes do catálogo." },
      { status: 500 }
    );
  }
}
