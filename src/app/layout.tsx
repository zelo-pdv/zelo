import type { Metadata, Viewport } from "next";
import { Montserrat, Outfit, Noto_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import "boxicons/css/boxicons.min.css";
import { ThemeProvider } from "@/components/theme-provider";
import { PWAUpdater } from "@/components/pwa-updater";
import { ThemeColorUpdater } from "@/components/theme-color-updater";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { cn } from "@/lib/utils";

const notoSansHeading = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://zelo.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Zelo | Gestão de Vendas",
    template: "Zelo | %s",
  },
  description:
    "Zelo: Gestão de vendas, estoque e pedidos para revendedores e pequenos negócios. Caderno de pedidos digital e controle de cobranças sem complicação.",
  keywords: [
    "zelo",
    "gestão de vendas",
    "ponto de venda",
    "caderno de pedidos",
    "controle de estoque",
    "revendedores",
    "pequenos negócios",
    "catálogo digital",
    "cobranças",
  ],
  authors: [{ name: "Zelo" }],
  creator: "Zelo",
  publisher: "Zelo",
  applicationName: "Zelo",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico?v=4" },
      { url: "/favicon-32x32.png?v=4", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=4", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=4", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Zelo",
    title: "Zelo | Gestão de Vendas, Catálogo",
    description:
      "Sistema inteligente e prático para pequenos negócios e revendedores. Caderno de pedidos digital, controle de estoque e cobranças sem complicação.",
    images: [
      {
        url: "/zelo.jpeg",
        width: 1200,
        height: 1200,
        alt: "Zelo - Gestão Comercial",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zelo | Gestão de Vendas",
    description:
      "Sistema inteligente e prático para pequenos negócios e revendedores. Caderno de pedidos digital, controle de estoque.",
    images: ["/zelo.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#app`,
      name: "Zelo",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android, iOS (PWA)",
      description:
        "Sistema de gestão de pedidos, vendas e catálogo de produtos para revendedores e microempreendedores.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "BRL",
      },
      featureList: [
        "Leitor de código de barras e QR Code via câmera",
        "Controle de estoque flexível e alertas de reposição",
        "Gestão de clientes com busca automática por CEP",
        "Emissão e compartilhamento de comprovantes digitais",
        "Histórico detalhado de vendas e controle de equipe RBAC",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Zelo",
      description:
        "Plataforma de gestão comercial, vendas e catálogo para revendedores.",
      inLanguage: "pt-BR",
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#org`,
      name: "Zelo",
      url: siteUrl,
      logo: `${siteUrl}/zelo-black.png`,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-br"
      suppressHydrationWarning
      className={cn("font-sans", outfit.variable, notoSansHeading.variable)}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${montserrat.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange>
          {children}
          <PWAUpdater />
          <ThemeColorUpdater />
          <Toaster position="top-right" richColors />
          <ScrollToTop />
        </ThemeProvider>
      </body>
    </html>
  );
}
