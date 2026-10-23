import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { uploadImageToSupabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const auth = await requirePlatformAdmin("OPERATOR");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
      "image/avif",
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato inválido. Tipos suportados: PNG, JPG, WEBP, SVG, AVIF." },
        { status: 400 }
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "A imagem não pode exceder 5MB." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const timestamp = Date.now();
    const fileName = `brands/logo_${timestamp}_${uniqueId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url, path } = await uploadImageToSupabase(
      buffer,
      fileName,
      file.type
    );

    return NextResponse.json({
      success: true,
      url,
      path,
    });
  } catch (error: any) {
    console.error("Erro no upload do logotipo da marca:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao processar upload do logotipo." },
      { status: 500 }
    );
  }
}
