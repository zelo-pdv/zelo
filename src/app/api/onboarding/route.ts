import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { onboardingSchema } from "@/lib/validations/onboarding";
import { setAuthCookies } from "@/lib/cookies";
import { JWT_SECRET } from "@/lib/jwt-secret";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const [loja, settings] = await Promise.all([
      prisma.loja.findUnique({
        where: { id: user.lojaId },
        select: {
          id: true,
          name: true,
          ownerName: true,
          phone: true,
          email: true,
        },
      }),
      prisma.settings.findUnique({
        where: { lojaId: user.lojaId },
      }),
    ]);

    if (!loja) {
      return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });
    }

    const config = (settings?.config as any) ?? {};
    const onboarding = config.onboarding ?? {
      completed: false,
      step: 1,
    };

    return NextResponse.json({
      loja,
      config,
      onboarding,
    });
  } catch (error: any) {
    console.error("Erro ao obter dados de onboarding:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = onboardingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Dados de configuração inválidos.",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      trackStock,
      blockOutOfStock,
      requireClient,
      defaultPaymentMethod,
      defaultSaleStatus,
      showProductImages,
      storePhone,
      step,
      completed,
    } = parseResult.data;

    // Busca configurações atuais para manter integridade das demais chaves
    const currentSettings = await prisma.settings.findUnique({
      where: { lojaId: user.lojaId },
    });

    const currentConfig = (currentSettings?.config as any) ?? {};

    const updatedConfig = {
      ...currentConfig,
      onboarding: {
        completed: Boolean(completed),
        step: step ?? (completed ? 4 : 1),
        updatedAt: new Date().toISOString(),
        ...(completed ? { completedAt: new Date().toISOString() } : {}),
      },
      products: (() => {
        const p = { ...(currentConfig.products || {}) };
        delete p.hideCostPrice;
        return {
          ...p,
          trackStock,
          showProductImages,
          globalLowStockThreshold:
            currentConfig.products?.globalLowStockThreshold ?? 5,
        };
      })(),
      sales: {
        ...(currentConfig.sales || {}),
        requireClient,
        blockOutOfStock: trackStock ? blockOutOfStock : false,
        defaultPaymentMethod: defaultPaymentMethod || "PIX",
        defaultSaleStatus: defaultSaleStatus || "PAGO",
      },
      dashboard: {
        ...(currentConfig.dashboard || {}),
        hideLowStockCard: !trackStock,
      },
      notifications: {
        ...(currentConfig.notifications || {}),
        outOfStockWarning: trackStock,
      },
      store: {
        ...(currentConfig.store || {}),
        ...(storePhone ? { phone: storePhone } : {}),
      },
    };

    // Atualiza Loja se informado novo telefone
    if (storePhone && storePhone.trim() !== "") {
      await prisma.loja.update({
        where: { id: user.lojaId },
        data: { phone: storePhone.trim() },
      });
    }

    // Persiste as configurações no modelo Settings
    await prisma.settings.upsert({
      where: { lojaId: user.lojaId },
      update: { config: updatedConfig },
      create: {
        lojaId: user.lojaId,
        config: updatedConfig,
      },
    });

    // Se o onboarding foi concluído com sucesso, renova o token e os cookies
    if (completed) {
      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        groupName: user.groupName,
        isAdmin: user.isAdmin,
        permissions: user.permissions,
        lojaId: user.lojaId,
        onboardingCompleted: true,
      };

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("8h")
        .sign(JWT_SECRET);

      await setAuthCookies(token, payload);
    }

    return NextResponse.json({
      success: true,
      onboarding: updatedConfig.onboarding,
      redirectTo: completed ? "/dashboard" : undefined,
    });
  } catch (error: any) {
    console.error("Erro ao salvar onboarding:", error);
    return NextResponse.json(
      { error: "Erro interno ao salvar configurações do onboarding." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  return POST(req);
}
