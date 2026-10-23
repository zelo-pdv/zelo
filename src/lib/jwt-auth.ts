import { jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { JWT_SECRET } from "@/lib/jwt-secret";

export type AdminRole = "SUPERADMIN" | "OPERATOR" | "CURATOR";

export interface LojistaJwtPayload extends JWTPayload {
  sub: string;
  email: string;
  name: string;
  groupName: string;
  isAdmin: boolean;
  permissions: Record<string, string[]>;
  lojaId: string;
  onboardingCompleted: boolean;
}

export interface AdminJwtPayload extends JWTPayload {
  sub: string;
  email: string;
  name: string;
  role: AdminRole;
  scope: "platform";
}

/**
 * Verificação genérica de JWT apenas criptográfica (sem acesso a banco).
 * Funciona tanto em Node.js runtime quanto em Edge runtime.
 */
export async function verifyJwtToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Valida token de lojista (sessão normal do Zelo).
 * Garante que não é um token corrompido ou de escopo inválido.
 */
export async function verifyLojistaToken(token: string): Promise<LojistaJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub || payload.scope === "platform") {
      return null;
    }
    return payload as unknown as LojistaJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Valida token administrativo (PlatformAdmin).
 * EXIGE estritamente scope === "platform" e presença de sub.
 * Qualquer token de lojista ou token forjado sem esse claim é rejeitado.
 */
export async function verifyAdminToken(token: string): Promise<AdminJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub || payload.scope !== "platform") {
      return null;
    }
    return payload as unknown as AdminJwtPayload;
  } catch {
    return null;
  }
}
