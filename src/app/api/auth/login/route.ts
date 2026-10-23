import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";
import { setAuthCookies } from "@/lib/cookies";
import { JWT_SECRET } from "@/lib/jwt-secret";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.success) return rateLimit.response;

  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        group: true,
        loja: {
          select: {
            ownerId: true,
            active: true,
            settings: {
              select: { config: true },
            },
          },
        },
      },
    });

    let senhaValida = false;
    if (user) {
      senhaValida = await bcrypt.compare(password, user.password);
    } else {
      // Dummy hash comparison to mitigate timing attacks for non-existent users
      await bcrypt.compare(password, "$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa");
    }

    if (!user || !senhaValida) {
      // Generic message to prevent user enumeration
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
    }

    if (!user.active) {
      return NextResponse.json({ error: "Este usuário está inativo." }, { status: 403 });
    }

    if (user.loja && !user.loja.active) {
      return NextResponse.json({ error: "Esta loja está inativa." }, { status: 403 });
    }

    const isOwner = user.loja?.ownerId === user.id;
    const isAdmin = user.group?.name === "ADMIN" || isOwner;

    const storeConfig = (user.loja?.settings?.config as any) ?? {};
    const onboardingCompleted =
      storeConfig.onboarding !== undefined
        ? Boolean(storeConfig.onboarding.completed)
        : true;

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      groupName: user.group?.name || "",
      isAdmin,
      permissions: user.group?.permissions || {},
      lojaId: user.lojaId,
      onboardingCompleted,
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(JWT_SECRET);

    await setAuthCookies(token, payload);

    return NextResponse.json({ success: true, user: payload });
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
