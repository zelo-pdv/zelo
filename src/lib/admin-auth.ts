import { cookies } from "next/headers";
import { verifyAdminToken, type AdminJwtPayload } from "@/lib/jwt-auth";
import { shouldUseSecureCookies } from "@/lib/cookies";

export const ADMIN_TOKEN_COOKIE_NAME = "admin_token";
export const ADMIN_TOKEN_MAX_AGE = 60 * 60 * 4; // 4 horas

export async function setAdminAuthCookie(token: string) {
  const cookieStore = await cookies();
  const secure = await shouldUseSecureCookies();

  cookieStore.set(ADMIN_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_TOKEN_MAX_AGE,
  });
}

export async function deleteAdminAuthCookie() {
  const cookieStore = await cookies();
  const secure = await shouldUseSecureCookies();

  cookieStore.delete({
    name: ADMIN_TOKEN_COOKIE_NAME,
    path: "/",
    secure,
    sameSite: "strict",
  });
}

export async function getAdminSession(): Promise<AdminJwtPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyAdminToken(token);
  } catch {
    return null;
  }
}
