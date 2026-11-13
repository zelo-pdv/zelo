"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BoxIcon } from "@/components/ui/box-icon";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: "bx-barcode-reader",
    title: "PDV com Leitor de Câmera",
    description:
      "Transforme a câmera do seu celular em um leitor de código de barras instantâneo. Agilize vendas no balcão sem precisar comprar aparelhos caros.",
    badge: "Agilidade",
  },
  {
    icon: "bx-slider-alt",
    title: "Estoque Flexível",
    description:
      "Controle a quantidade física com alertas de estoque baixo ou trabalhe com vendas sob encomenda sem travar seu caixa. Você escolhe.",
    badge: "Liberdade",
  },
  {
    icon: "bxl-whatsapp",
    title: "Comprovante no WhatsApp",
    description:
      "Emita comprovantes térmicos digitais com o nome da sua loja e envie para o WhatsApp do cliente ou baixe em PDF com apenas um clique.",
    badge: "Profissionalismo",
  },
  {
    icon: "bx-user-check",
    title: "Clientes & Fiado Organizado",
    description:
      "Busca automática de endereço por CEP, histórico completo de compras e controle claro de pagamentos a prazo para nunca mais tomar prejuízo.",
    badge: "Organização",
  },
  {
    icon: "bx-mobile-alt",
    title: "Funciona no Celular e PC (PWA)",
    description:
      "Instale como aplicativo nativo no Android ou iPhone sem precisar de loja de apps, ou use no navegador do seu computador.",
    badge: "Praticidade",
  },
  {
    icon: "bx-shield-quarter",
    title: "Segurança e Equipe (RBAC)",
    description:
      "Dê acesso aos seus operadores com permissões personalizadas e limite de descontos, mantendo seus dados seguros e isolados.",
    badge: "Controle",
  },
];

export function FeaturesGrid() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToSlide = useCallback((index: number) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const slideWidth = container.clientWidth;
    container.scrollTo({
      left: index * slideWidth,
      behavior: "smooth",
    });
    setCurrentSlide(index);
  }, []);

  const handleNext = useCallback(() => {
    const next = (currentSlide + 1) % FEATURES.length;
    scrollToSlide(next);
  }, [currentSlide, scrollToSlide]);

  const handlePrev = useCallback(() => {
    const prev = (currentSlide - 1 + FEATURES.length) % FEATURES.length;
    scrollToSlide(prev);
  }, [currentSlide, scrollToSlide]);

  // Transição automática a cada 4.5 segundos
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      handleNext();
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused, handleNext]);

  // Sincronização do slide ativo com o scroll nativo (swipe com dedo)
  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    if (width === 0) return;
    const newIndex = Math.round(container.scrollLeft / width);
    if (newIndex >= 0 && newIndex < FEATURES.length && newIndex !== currentSlide) {
      setCurrentSlide(newIndex);
    }
  };

  return (
    <section id="recursos" className="py-14 sm:py-16 md:py-24">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h2 className="font-heading text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Projetado para simplificar sua rotina de vendas
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Sem sistemas complicados ou telas confusas. O Zelo entrega exatamente as ferramentas essenciais para o seu negócio crescer.
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* VERSÃO MOBILE: SLIDER / CAROUSEL COM TOUCH SWIPE E AUTOPLAY        */}
        {/* ------------------------------------------------------------------ */}
        <div
          className="block md:hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => {
            // Retoma autoplay após 4 segundos de inatividade
            setTimeout(() => setIsPaused(false), 4000);
          }}
        >
          {/* Container Deslizável */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-2"
          >
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="w-full shrink-0 snap-center px-1"
              >
                <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-xs min-h-[210px] flex flex-col justify-between">
                  {/* Topo do card: Ícone & Tag */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <BoxIcon name={feature.icon} className="text-2xl" />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-md bg-muted">
                        {feature.badge}
                      </span>
                    </div>

                    <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Controles do Slider Mobile (Setas e Indicadores / Dots) */}
          <div className="flex items-center justify-between px-2 mt-4">
            <button
              type="button"
              onClick={handlePrev}
              className="size-8 rounded-full border border-border/70 bg-card text-foreground flex items-center justify-center shadow-2xs hover:bg-muted active:scale-95 transition-all"
              aria-label="Recurso anterior"
            >
              <BoxIcon name="bx-chevron-left" className="text-xl" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {FEATURES.map((feature, idx) => (
                <button
                  key={feature.title}
                  type="button"
                  onClick={() => scrollToSlide(idx)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    currentSlide === idx
                      ? "w-6 bg-primary"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  )}
                  aria-label={`Ir para o recurso ${idx + 1}`}
                  aria-current={currentSlide === idx ? "true" : undefined}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="size-8 rounded-full border border-border/70 bg-card text-foreground flex items-center justify-center shadow-2xs hover:bg-muted active:scale-95 transition-all"
              aria-label="Próximo recurso"
            >
              <BoxIcon name="bx-chevron-right" className="text-xl" />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* VERSÃO DESKTOP: GRID COMPLETO DE CARDS                            */}
        {/* ------------------------------------------------------------------ */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border border-border/70 bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
            >
              {/* Ícone & Tag */}
              <div className="flex items-center justify-between mb-4">
                <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <BoxIcon name={feature.icon} className="text-2xl" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-md bg-muted">
                  {feature.badge}
                </span>
              </div>

              {/* Título & Descrição */}
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
