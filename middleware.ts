import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyLojistaToken, verifyAdminToken } from "@/lib/jwt-auth";

// Matcher estático em conformidade com o Next.js 15.5.20
export const config = {
  runtime: "nodejs",
  matcher: [
    /*
     * Intercepta todas as requisições EXCETO:
     * - _next/static (arquivos JS/CSS estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico, sitemap.xml, robots.txt, llms.txt
     * - PWA: sw.js, workbox-*.js, site.webmanifest, manifest.json
     * - Extensões de mídia e fontes: .svg, .png, .jpg, .jpeg, .gif, .webp, .ico, .css, .woff, .woff2, .ttf, .eot
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|llms.txt|sw\\.js|workbox-[a-zA-Z0-9]+\\.js|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|woff|woff2|ttf|eot)).*)",
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Guarda Preventiva Defensiva: bypass imediato para recursos estáticos e PWA
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/site.webmanifest") ||
    pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|css|woff2?|js)$/)
  ) {
    return NextResponse.next();
  }

  // -------------------------------------------------------------
  // 2. CONTEXTO ADMINISTRATIVO GLOBAL (/admin/* e /api/admin/*)
  // -------------------------------------------------------------
  const isAdminApiLogin = pathname === "/api/admin/auth/login";
  const isAdminApi = pathname.startsWith("/api/admin");
  const isAdminLogin = pathname === "/admin/login";
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminApiLogin) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    const adminToken = req.cookies.get("admin_token")?.value;
    if (!adminToken) {
      return NextResponse.json(
        { error: "Acesso administrativo não autorizado." },
        { status: 401 }
      );
    }

    const payload = await verifyAdminToken(adminToken);
    if (!payload) {
      return NextResponse.json(
        { error: "Sessão administrativa inválida ou expirada." },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  if (isAdminLogin) {
    const adminToken = req.cookies.get("admin_token")?.value;
    if (adminToken) {
      const payload = await verifyAdminToken(adminToken);
      if (payload) {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url), 307);
      }
    }
    return NextResponse.next();
  }

  if (isAdminPage) {
    const adminToken = req.cookies.get("admin_token")?.value;
    if (!adminToken) {
      return NextResponse.redirect(new URL("/admin/login", req.url), 307);
    }

    const payload = await verifyAdminToken(adminToken);
    if (!payload) {
      return NextResponse.redirect(new URL("/admin/login", req.url), 307);
    }

    if (pathname === "/admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url), 307);
    }

    return NextResponse.next();
  }

  // -------------------------------------------------------------
  // 3. CONTEXTO DOS LOJISTAS (/api/*, /dashboard, /produtos, etc.)
  // -------------------------------------------------------------
  const isLojistaPublicApi =
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/register" ||
    pathname === "/api/auth/logout";

  const isLojistaApi = pathname.startsWith("/api/");

  if (isLojistaPublicApi) {
    return NextResponse.next();
  }

  if (isLojistaApi) {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Não autenticado." },
        { status: 401 }
      );
    }

    const payload = await verifyLojistaToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Sessão inválida ou expirada." },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  const isGuestOnlyPage = pathname === "/login" || pathname === "/cadastro";
  const isOnboardingPage = pathname === "/onboarding";

  const isPrivateLojistaPage =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/produtos" ||
    pathname.startsWith("/produtos/") ||
    pathname === "/nova-venda" ||
    pathname.startsWith("/nova-venda/") ||
    pathname === "/clientes" ||
    pathname.startsWith("/clientes/") ||
    pathname === "/historico" ||
    pathname.startsWith("/historico/") ||
    pathname === "/usuarios" ||
    pathname.startsWith("/usuarios/") ||
    pathname === "/registros" ||
    pathname.startsWith("/registros/") ||
    pathname === "/configuracoes" ||
    pathname.startsWith("/configuracoes/") ||
    pathname === "/estoque" ||
    pathname.startsWith("/estoque/") ||
    pathname === "/relatorios" ||
    pathname.startsWith("/relatorios/") ||
    pathname === "/mais" ||
    pathname.startsWith("/mais/");

  if (isGuestOnlyPage) {
    const token = req.cookies.get("token")?.value;
    if (token) {
      const payload = await verifyLojistaToken(token);
      if (payload) {
        if (payload.onboardingCompleted === false) {
          return NextResponse.redirect(new URL("/onboarding", req.url), 307);
        }
        return NextResponse.redirect(new URL("/dashboard", req.url), 307);
      }
    }
    return NextResponse.next();
  }

  if (isOnboardingPage) {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url), 307);
    }

    const payload = await verifyLojistaToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL("/login", req.url), 307);
    }

    if (payload.onboardingCompleted !== false) {
      return NextResponse.redirect(new URL("/dashboard", req.url), 307);
    }

    return NextResponse.next();
  }

  if (isPrivateLojistaPage) {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url), 307);
    }

    const payload = await verifyLojistaToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL("/login", req.url), 307);
    }

    if (payload.onboardingCompleted === false) {
      return NextResponse.redirect(new URL("/onboarding", req.url), 307);
    }

    return NextResponse.next();
  }

  // Demais páginas públicas (ex.: landing page "/" ou termos)
  return NextResponse.next();
}
