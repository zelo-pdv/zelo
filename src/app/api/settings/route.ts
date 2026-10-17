import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { lojaId } = user;
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    // Validação de autorização por seção
    if (!user.isAdmin) {
      const allowedTopLevelKeys = new Set(["dashboard", "products", "sales"]);
      const requestedKeys = Object.keys(body);

      for (const key of requestedKeys) {
        if (!allowedTopLevelKeys.has(key)) {
          return NextResponse.json(
            { error: "Você não possui permissão para alterar estas configurações." },
            { status: 403 }
          );
        }

        if (key === "dashboard") {
          if (!hasPermission(user.permissions, "dashboard", "Visualizar")) {
            return NextResponse.json(
              { error: "Você não possui permissão para alterar configurações do painel." },
              { status: 403 }
            );
          }
        } else if (key === "products") {
          if (!hasPermission(user.permissions, "produtos", "Editar")) {
            return NextResponse.json(
              { error: "Você não possui permissão para alterar configurações de produtos." },
              { status: 403 }
            );
          }
        } else if (key === "sales") {
          const salesKeys = Object.keys(body.sales || {});
          const openPriceOnly = salesKeys.length > 0 && salesKeys.every((k) =>
            ["openPriceEnabled", "openPriceMode", "openPriceProductIds"].includes(k)
          );
          if (openPriceOnly && hasPermission(user.permissions, "produtos", "Editar")) {
            // Permitido para operadores que editam produtos
          } else {
            return NextResponse.json(
              { error: "Você não possui permissão para alterar configurações de vendas." },
              { status: 403 }
            );
          }
        }
      }
    }

    // Merge em nível de seção para evitar que dispositivos com estado defasado
    // sobrescrevam configurações mais recentes de outras seções
    const existingSettings = await prisma.settings.findUnique({
      where: { lojaId },
    });

    const existingConfig = (existingSettings?.config as Record<string, any>) || {};
    const mergedConfig: Record<string, any> = { ...existingConfig };

    for (const [key, val] of Object.entries(body)) {
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        mergedConfig[key] = {
          ...(mergedConfig[key] || {}),
          ...val,
        };
      } else {
        mergedConfig[key] = val;
      }
    }

    const updated = await prisma.settings.upsert({
      where: { lojaId },
      update: { config: mergedConfig },
      create: {
        lojaId,
        config: mergedConfig,
      },
    });

    await createAuditLog({
      action: "UPDATE_SETTINGS",
      entity: "Settings",
      entityId: updated.id,
      details: {
        summary: `Configurações atualizadas: ${Object.keys(body).join(", ")}`,
        sections: Object.keys(body),
      },
      userId: user.id,
      lojaId,
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
