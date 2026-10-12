import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/require-permission";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const settings = await prisma.settings.findUnique({
      where: { lojaId: user.lojaId },
    });

    return NextResponse.json(settings?.config ?? {});
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar configurações da loja." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;
    const { lojaId } = auth.user;

    const body = await request.json();

    const updated = await prisma.settings.upsert({
      where: { lojaId },
      update: { config: body },
      create: {
        lojaId,
        config: body,
      },
    });

    return NextResponse.json(updated.config);
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações da loja." },
      { status: 500 }
    );
  }
}
