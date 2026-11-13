import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { AppShowcase } from "@/components/landing/app-showcase";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "Zelo | Gestão de Vendas, Catálogo e PDV Ágil",
  description:
    "Sistema de gestão comercial e Ponto de Venda (PDV) ágil com leitor de código de barras na câmera do celular, comprovante no WhatsApp, catálogo com variações e controle flexível de estoque.",
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const isAuthenticated = Boolean(token);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* Barra de Navegação Superior */}
      <LandingHeader isAuthenticated={isAuthenticated} />

      {/* Conteúdo Principal da Landing Page */}
      <main className="flex-1">
        {/* Seção Hero com Proposta de Valor e Botões de Ação */}
        <HeroSection isAuthenticated={isAuthenticated} />

        {/* Vitrine Interativa com Prints e Telas Reais do Zelo */}
        <AppShowcase />

        {/* Grade de Recursos e Benefícios Principais */}
        <FeaturesGrid />

        {/* Planos e Preços Transparentes */}
        <PricingSection />

        {/* Perguntas Frequentes (FAQ) */}
        <FaqSection />

        {/* Banner de Conversão Final */}
        <CtaSection isAuthenticated={isAuthenticated} />
      </main>

      {/* Rodapé Institucional */}
      <LandingFooter />
    </div>
  );
}
