import { cookies, headers } from "next/headers";

const TOKEN_MAX_AGE = 60 * 60 * 8; // 8h

/**
 * Determina dinamicamente se os cookies devem levar o atributo `Secure`,
 * respeitando HTTPS em produção (Vercel/proxies) sem quebrar deploys HTTP locais em Docker.
 */
export async function shouldUseSecureCookies(): Promise<boolean> {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  if (process.env.VERCEL === "1") return true;

  try {
    const hdrs = await headers();
    const forwardedProto = hdrs.get("x-forwarded-proto");
    if (forwardedProto) {
      return forwardedProto.split(",")[0].trim() === "https";
    }
  } catch {
    // Sem contexto HTTP (ex.: testes unitários isolados)
  }

  return Boolean(process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://"));
}

export async function setAuthCookies(token: string, payload: any) {
  const cookieStore = await cookies();
  const secure = await shouldUseSecureCookies();

  cookieStore.set("token", token, {
    httpOnly: true,
    secure,
    sameSite: "strict", // Strict para proteção máxima CSRF
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  });

  const contextBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  cookieStore.set("user_context", contextBase64, {
    httpOnly: false,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  });
}

export async function deleteAuthCookies() {
  const cookieStore = await cookies();
  const secure = await shouldUseSecureCookies();

  cookieStore.delete({
    name: "token",
    path: "/",
    secure,
    sameSite: "strict",
  });

  cookieStore.delete({
    name: "user_context",
    path: "/",
    secure,
    sameSite: "strict",
  });
}
