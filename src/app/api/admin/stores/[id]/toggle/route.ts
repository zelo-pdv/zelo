import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";

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

    let reason = "Alteração de status realizada pelo administrador.";
    try {
      const body = await req.json();
      if (body?.reason) {
        reason = body.reason;
      }
    } catch {
      // Body opcional
    }

    const store = await prisma.loja.findUnique({
      where: { id },
      select: { id: true, name: true, active: true },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Loja não encontrada." },
        { status: 404 }
      );
    }

    const newActiveState = !store.active;

    const [updatedStore] = await prisma.$transaction([
      prisma.loja.update({
        where: { id },
        data: { active: newActiveState },
        select: { id: true, name: true, active: true, updatedAt: true },
      }),
      prisma.platformAuditLog.create({
        data: {
          adminId: auth.admin.id,
          action: newActiveState ? "STORE_ACTIVATED" : "STORE_DEACTIVATED",
          targetType: "Loja",
          targetId: store.id,
          details: {
            storeName: store.name,
            previousStatus: store.active,
            newStatus: newActiveState,
            reason,
          },
          ipAddress: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
          userAgent: req.headers.get("user-agent") ?? undefined,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: newActiveState
        ? `Loja "${store.name}" ativada com sucesso.`
        : `Loja "${store.name}" desativada com sucesso. Os usuários desta loja não poderão mais acessar o sistema.`,
      store: updatedStore,
    });
  } catch (error) {
    console.error("Erro ao alternar status da loja:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
