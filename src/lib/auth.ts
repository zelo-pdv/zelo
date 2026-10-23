import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import type { Permissions } from "@/store/useSettingsStore";
import { JWT_SECRET } from "@/lib/jwt-secret";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
  groupId: string | null;
  groupName: string;
  isAdmin: boolean;
  isOwner: boolean;
  permissions: Permissions;
  lojaId: string;
  storeName?: string;
  onboardingCompleted: boolean;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (!payload.sub) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub as string,
      },
      include: {
        group: true,
        loja: {
          select: {
            name: true,
            ownerId: true,
            active: true,
            settings: {
              select: { config: true },
            },
          },
        },
      },
    });

    if (!user || !user.active) {
      return null;
    }

    if (!user.group || !user.group.active) {
      return null;
    }

    // Regra de segurança da Sprint 2: Se a loja estiver inativa/desativada pela plataforma,
    // o acesso da sessão é revogado imediatamente em tempo real.
    if (!user.loja || !user.loja.active) {
      return null;
    }

    const isOwner = user.loja?.ownerId === user.id;
    const isAdmin = user.group.name === "ADMIN" || isOwner;

    const storeConfig = (user.loja?.settings?.config as any) ?? {};
    // Se a loja tiver o objeto onboarding configurado, usa seu status;
    // Lojas antigas/existentes sem o objeto onboarding são consideradas concluídas por compatibilidade.
    const onboardingCompleted =
      storeConfig.onboarding !== undefined
        ? Boolean(storeConfig.onboarding.completed)
        : true;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      active: user.active,
      groupId: user.groupId,
      groupName: user.group.name,
      isAdmin,
      isOwner,
      permissions: user.group.permissions as unknown as Permissions,
      lojaId: user.lojaId,
      storeName: user.loja?.name,
      onboardingCompleted,
    };
  } catch (error: any) {
    // Relança erros internos de controle de fluxo do Next.js (ex: DYNAMIC_SERVER_USAGE no prerender)
    if (
      error?.digest === "DYNAMIC_SERVER_USAGE" ||
      error?.message?.includes("Dynamic server usage") ||
      error?.name === "DynamicServerError"
    ) {
      throw error;
    }

    console.error("Erro ao obter usuário autenticado:", error);
    return null;
  }
}
