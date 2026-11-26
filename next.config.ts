import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/~offline", revision: "zelo-offline-v1" }],
});

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  serverExternalPackages: ["@napi-rs/canvas", "tesseract.js", "playwright", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/admin/catalogs/**": [
      "./node_modules/pdfjs-dist/build/**/*",
      "./node_modules/pdfjs-dist/legacy/build/**/*",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    const isHttpsOrigin =
      process.env.VERCEL === "1" ||
      process.env.FORCE_HTTPS_HEADERS === "1" ||
      process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://");

    const cspDirectives = [
      "default-src 'self'",
      "connect-src 'self' https://*.supabase.co",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://*.supabase.co",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(isHttpsOrigin ? ["upgrade-insecure-requests"] : []),
    ].join("; ") + ";";

    const securityHeaders = [
      { key: "Content-Security-Policy", value: cspDirectives },
      ...(isHttpsOrigin
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
          ]
        : []),
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSerwist(nextConfig);
