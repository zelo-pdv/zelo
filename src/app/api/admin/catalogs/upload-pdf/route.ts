import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { uploadCatalogPdf } from "@/lib/supabase";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePlatformAdmin("OPERATOR");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const catalogId = formData.get("catalogId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    // Validação de tipo MIME
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Apenas arquivos em formato PDF são permitidos." },
        { status: 400 }
      );
    }

    // Limite de 60MB
    const MAX_SIZE = 60 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "O arquivo PDF excede o limite máximo permitido de 60MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const cleanFileName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "-")
      .replace(/-+/g, "-");
    const storagePath = `pdf/${timestamp}-${cleanFileName}`;

    const { path } = await uploadCatalogPdf(buffer, storagePath);

    // Se informou catalogId, vincula automaticamente
    if (catalogId) {
      await prisma.catalog.update({
        where: { id: catalogId },
        data: { pdfPath: path },
      });
    }

    return NextResponse.json({
      success: true,
      path,
      message: "PDF do catálogo enviado com sucesso.",
    });
  } catch (error) {
    console.error("Erro no upload de PDF do catálogo:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar o upload do PDF." },
      { status: 500 }
    );
  }
}
