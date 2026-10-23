import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { getSignedCatalogUrl } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const expiresIn = Math.min(
      86400, // 24h max
      Math.max(60, parseInt(searchParams.get("expiresIn") || "3600", 10))
    );

    const catalog = await prisma.catalog.findUnique({
      where: { id },
      select: { id: true, title: true, pdfPath: true },
    });

    if (!catalog) {
      return NextResponse.json(
        { error: "Catálogo não encontrado." },
        { status: 404 }
      );
    }

    if (!catalog.pdfPath) {
      return NextResponse.json(
        { error: "Este catálogo não possui arquivo PDF anexado." },
        { status: 400 }
      );
    }

    const signedUrl = await getSignedCatalogUrl(catalog.pdfPath, expiresIn);

    return NextResponse.json({
      success: true,
      data: {
        catalogId: catalog.id,
        title: catalog.title,
        signedUrl,
        expiresIn,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar URL assinada do catálogo:", error);
    return NextResponse.json(
      { error: "Erro ao gerar URL temporária do catálogo." },
      { status: 500 }
    );
  }
}
