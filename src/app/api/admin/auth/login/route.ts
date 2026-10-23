import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { JWT_SECRET } from "@/lib/jwt-secret";
import { checkRateLimit } from "@/lib/rate-limit";
import { setAdminAuthCookie } from "@/lib/admin-auth";
import type { AdminJwtPayload } from "@/lib/jwt-auth";

const adminLoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "A senha é obrigatória"),
});

export async function POST(req: Request) {
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.success) return rateLimit.response;

  try {
    const body = await req.json();
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Busca exclusivamente na tabela de PlatformAdmin (nunca User)
    const admin = await prisma.platformAdmin.findUnique({
      where: { email },
    });

    let senhaValida = false;
    if (admin) {
      senhaValida = await bcrypt.compare(password, admin.passwordHash);
    } else {
      // Dummy compare contra timing attack
      await bcrypt.compare(password, "$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa");
    }

    if (!admin || !senhaValida) {
      return NextResponse.json(
        { error: "Credenciais administrativas inválidas." },
        { status: 401 }
      );
    }

    if (!admin.active) {
      return NextResponse.json(
        { error: "Esta conta administrativa está inativa." },
        { status: 403 }
      );
    }

    // Atualiza lastLoginAt
    await prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      scope: "platform",
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("4h")
      .sign(JWT_SECRET);

    await setAdminAuthCookie(token);

    // Registro de auditoria
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const userAgent = req.headers.get("user-agent") ?? undefined;
    await prisma.platformAuditLog.create({
      data: {
        adminId: admin.id,
        action: "ADMIN_LOGIN",
        targetType: "PlatformAdmin",
        targetId: admin.id,
        details: { email: admin.email, role: admin.role },
        ipAddress: ip,
        userAgent,
      },
    }).catch((err) => {
      console.error("[AuditLog] Falha ao registrar login admin:", err);
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Erro no login administrativo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
