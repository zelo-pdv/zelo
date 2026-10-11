import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { getEffectiveDiscountLimit } from "@/lib/discount-limit";

export async function GET() {
  try {
    const auth = await requirePermission("nova-venda", "Visualizar");
    if (!auth.authorized) return auth.response;

    const dbUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      include: {
        group: true,
        loja: { select: { ownerId: true } },
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const storeSettings = await prisma.settings.findUnique({
      where: { lojaId: auth.user.lojaId },
    });
    const config = (storeSettings?.config as any) ?? {};
    const salesConfig = config?.sales ?? {};

    const effectiveLimit = getEffectiveDiscountLimit(
      {
        id: dbUser.id,
        isAdmin: auth.user.isAdmin,
        isOwner: auth.user.isOwner,
        discountLimitMode: dbUser.discountLimitMode,
        maxDiscountPercentage: dbUser.maxDiscountPercentage,
        maxDiscountValue: dbUser.maxDiscountValue,
      },
      dbUser.group,
      salesConfig,
    );

    return NextResponse.json(effectiveLimit);
  } catch (error) {
    console.error("Erro ao obter limite de desconto:", error);
    return NextResponse.json(
      { error: "Erro interno ao obter limite de desconto." },
      { status: 500 }
    );
  }
}
