"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BoxIcon } from "@/components/ui/box-icon";
import { cn } from "@/lib/utils";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "Preciso de maquininha ou leitor de código de barras para usar o Zelo?",
    answer:
      "Não! O Zelo possui um leitor inteligente integrado que usa a própria câmera do seu celular para escanear qualquer código de barras (EAN-13) ou QR Code instantaneamente. Se você preferir usar no computador com um leitor USB tradicional, ele também funciona perfeitamente.",
  },
  {
    question: "Posso usar se eu não quiser controlar a quantidade do estoque?",
    answer:
      "Com certeza! O Zelo tem modo de estoque flexível. Você pode optar por controlar estoque com alertas de quantidade mínima ou simplesmente desativar o controle físico de estoque para vender por encomenda, revenda de catálogos ou serviços.",
  },
  {
    question: "Como funciona o envio do comprovante no WhatsApp?",
    answer:
      "Assim que você fecha a venda no PDV, o Zelo gera um comprovante térmico digital profissional com o nome da sua loja, produtos, descontos e total. Basta clicar no botão verde para abrir a conversa no WhatsApp do cliente com o comprovante pronto para envio.",
  },
  {
    question: "Funciona no meu celular Android ou iPhone?",
    answer:
      "Sim! O Zelo foi desenvolvido com tecnologia PWA (Progressive Web App). Isso significa que você pode adicioná-lo à tela inicial do seu celular com um clique, funcionando como um aplicativo nativo rápido, sem precisar ocupar a memória do celular baixando arquivos pesados.",
  },
  {
    question: "Preciso de cartão de crédito para criar a conta?",
    answer:
      "Não! O cadastro é 100% gratuito e não exige nenhum dado financeiro. Você só precisa informar seu nome, e-mail e o nome da sua loja para começar a usar em menos de 2 minutos.",
  },
  {
    question: "O Zelo cobra porcentagem ou comissão sobre o que eu vender?",
    answer:
      "Zero! O Zelo não cobra nenhuma porcentagem sobre suas vendas. Todo o dinheiro recebido por Pix, Dinheiro ou Cartão vai direto para você.",
  },
  {
    question: "Meus dados e histórico de clientes ficam seguros?",
    answer:
      "Sim. O Zelo utiliza arquitetura multi-tenant com isolamento total dos dados de cada loja, criptografia de senhas e total conformidade com a Lei Geral de Proteção de Dados (LGPD). Seus dados pertencem apenas a você.",
  },
];

export function FaqSection() {
  // Estado para o Accordion Desktop
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Estados para o Slider Mobile
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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
    const next = (currentSlide + 1) % FAQS.length;
    scrollToSlide(next);
  }, [currentSlide, scrollToSlide]);

  const handlePrev = useCallback(() => {
    const prev = (currentSlide - 1 + FAQS.length) % FAQS.length;
    scrollToSlide(prev);
  }, [currentSlide, scrollToSlide]);

  // Transição automática no mobile a cada 6 segundos
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      handleNext();
    }, 6000);

    return () => clearInterval(timer);
  }, [isPaused, handleNext]);

  // Sincronização do slide ativo com o swipe do usuário no mobile
  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    if (width === 0) return;
    const newIndex = Math.round(container.scrollLeft / width);
    if (newIndex >= 0 && newIndex < FAQS.length && newIndex !== currentSlide) {
      setCurrentSlide(newIndex);
    }
  };

  return (
    <section id="faq" className="py-14 sm:py-16 md:py-24">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        {/* Cabeçalho */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h2 className="font-heading text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Perguntas Frequentes
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Reunimos as respostas para as perguntas mais comuns de quem está conhecendo o Zelo.
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* VERSÃO MOBILE: SLIDER / CAROUSEL COM TOUCH SWIPE E AUTOPLAY        */}
        {/* ------------------------------------------------------------------ */}
        <div
          className="block md:hidden max-w-md mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => {
            setTimeout(() => setIsPaused(false), 4000);
          }}
        >
          {/* Container Deslizável (Touch Swipe) */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-2"
          >
            {FAQS.map((faq, idx) => (
              <div
                key={faq.question}
                className="w-full shrink-0 snap-center px-1"
              >
                <div className="rounded-2xl border border-primary/30 bg-card p-6 shadow-xs min-h-[260px] flex flex-col justify-between">
                  <div>
                    {/* Badge do número da dúvida */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                        Dúvida {idx + 1} de {FAQS.length}
                      </span>
                      <BoxIcon name="bx-help-circle" className="text-primary text-lg" />
                    </div>

                    <h3 className="font-heading text-base font-bold text-foreground mb-3 leading-snug">
                      {faq.question}
                    </h3>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Controles de Navegação e Dots no Mobile */}
          <div className="flex items-center justify-between px-2 mt-4">
            <button
              type="button"
              onClick={handlePrev}
              className="size-8 rounded-full border border-border/70 bg-card text-foreground flex items-center justify-center shadow-2xs hover:bg-muted active:scale-95 transition-all"
              aria-label="Dúvida anterior"
            >
              <BoxIcon name="bx-chevron-left" className="text-xl" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {FAQS.map((faq, idx) => (
                <button
                  key={faq.question}
                  type="button"
                  onClick={() => scrollToSlide(idx)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    currentSlide === idx
                      ? "w-6 bg-primary"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  )}
                  aria-label={`Ir para a dúvida ${idx + 1}`}
                  aria-current={currentSlide === idx ? "true" : undefined}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="size-8 rounded-full border border-border/70 bg-card text-foreground flex items-center justify-center shadow-2xs hover:bg-muted active:scale-95 transition-all"
              aria-label="Próxima dúvida"
            >
              <BoxIcon name="bx-chevron-right" className="text-xl" />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* VERSÃO DESKTOP: ACCORDION INTERATIVO EXPANSÍVEL                    */}
        {/* ------------------------------------------------------------------ */}
        <div className="hidden md:block space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className={cn(
                  "rounded-2xl border transition-all duration-200 overflow-hidden",
                  isOpen
                    ? "border-primary/40 bg-card shadow-xs"
                    : "border-border/70 bg-card/60 hover:border-border"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(index)}
                  className="flex w-full items-center justify-between p-4 sm:p-5 text-left transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="font-heading text-sm sm:text-base font-bold text-foreground pr-4">
                    {faq.question}
                  </span>
                  <div
                    className={cn(
                      "size-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 bg-muted/80 text-foreground",
                      isOpen && "rotate-180 bg-primary/15 text-primary"
                    )}
                  >
                    <BoxIcon name="bx-chevron-down" className="text-lg" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
