import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { verifyAdminToken, type AdminRole } from "@/lib/jwt-auth";
import { ADMIN_TOKEN_COOKIE_NAME } from "@/lib/admin-auth";

export interface AuthenticatedAdmin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
}

/**
 * Guarda para Route Handlers (/api/admin/*)
 * Retorna { authorized: true, admin } ou { authorized: false, response: NextResponse }
 */
export async function requirePlatformAdmin(requiredRole?: AdminRole) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Acesso administrativo não autorizado." },
        { status: 401 }
      ),
    };
  }

  const payload = await verifyAdminToken(token);
  if (!payload || !payload.sub || payload.scope !== "platform") {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Sessão administrativa inválida ou não autorizada." },
        { status: 401 }
      ),
    };
  }

  // Consulta obrigatória ao banco de dados: confere se a conta ainda está ativa
  const admin = await prisma.platformAdmin.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
    },
  });

  if (!admin || !admin.active) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Administrador inativo ou inexistente." },
        { status: 403 }
      ),
    };
  }

  if (requiredRole && admin.role !== requiredRole && admin.role !== "SUPERADMIN") {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Permissão insuficiente para esta operação administrativa." },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true as const,
    admin: admin as AuthenticatedAdmin,
  };
}

/**
 * Guarda para Server Components e Layouts (/admin/*)
 * Se não autenticado ou desativado, redireciona imediatamente para /admin/login
 */
export async function requirePlatformAdminPage(): Promise<AuthenticatedAdmin> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/admin/login");
  }

  const payload = await verifyAdminToken(token);
  if (!payload || !payload.sub || payload.scope !== "platform") {
    redirect("/admin/login");
  }

  const admin = await prisma.platformAdmin.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
    },
  });

  if (!admin || !admin.active) {
    redirect("/admin/login");
  }

  return admin as AuthenticatedAdmin;
}
