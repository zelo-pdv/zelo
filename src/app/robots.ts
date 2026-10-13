import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://zelo.com.br";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/cadastro", "/privacidade"],
        disallow: [
          "/dashboard",
          "/produtos",
          "/clientes",
          "/historico",
          "/usuarios",
          "/configuracoes",
          "/registros",
          "/relatorios",
          "/nova-venda",
          "/mais",
          "/onboarding",
          "/api/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
