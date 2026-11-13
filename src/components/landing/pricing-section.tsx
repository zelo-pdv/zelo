"use client";

import { useState } from "react";
import Link from "next/link";
import { BoxIcon } from "@/components/ui/box-icon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PricingSection() {
  const [selectedMobilePlan, setSelectedMobilePlan] = useState<"gratis" | "pro">("gratis");

  return (
    <section id="planos" className="py-14 sm:py-16 md:py-24 bg-muted/20 border-t border-border/50">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6">
        {/* Cabeçalho */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h2 className="font-heading text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Planos simples, sem pegadinhas nem comissões
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Você não paga nenhuma porcentagem sobre o que vende. O seu faturamento é 100% seu.
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* VERSÃO MOBILE: SELEÇÃO EXCLUSIVA POR ABAS (SEM SLIDE)              */}
        {/* ------------------------------------------------------------------ */}
        <div className="block md:hidden max-w-sm mx-auto">
          {/* Abas de Troca Rápida */}
          <div className="flex rounded-full bg-muted/80 p-1 mb-5 border border-border/60">
            <button
              type="button"
              onClick={() => setSelectedMobilePlan("gratis")}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer",
                selectedMobilePlan === "gratis"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Plano Gratuito
            </button>
            <button
              type="button"
              onClick={() => setSelectedMobilePlan("pro")}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer flex items-center justify-center gap-1",
                selectedMobilePlan === "pro"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Plano Pro</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950">
                Top
              </span>
            </button>
          </div>

          {/* Card do Plano Selecionado no Mobile */}
          {selectedMobilePlan === "gratis" ? (
            <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-6 shadow-xs animate-in fade-in duration-200">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading text-xl font-bold text-foreground">
                    Plano Gratuito
                  </h3>
                  <span className="text-xs font-semibold text-muted-foreground px-2.5 py-0.5 rounded-full bg-muted">
                    Para Começar
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">
                  Ideal para autônomos e pequenos revendedores organizarem suas vendas hoje mesmo.
                </p>

                <div className="mb-5 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">
                    R$ 0
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / para sempre
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-foreground/90 mb-6">
                  <li className="flex items-center gap-2">
                    <BoxIcon name="bx-check" className="text-emerald-500 text-base shrink-0" />
                    <span>Vendas e pedidos ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BoxIcon name="bx-check" className="text-emerald-500 text-base shrink-0" />
                    <span>PDV com leitor de código na câmera</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BoxIcon name="bx-check" className="text-emerald-500 text-base shrink-0" />
                    <span>Catálogo de produtos com variações</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BoxIcon name="bx-check" className="text-emerald-500 text-base shrink-0" />
                    <span>Emissão de comprovantes no WhatsApp</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BoxIcon name="bx-check" className="text-emerald-500 text-base shrink-0" />
                    <span>Cadastro e histórico de clientes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BoxIcon name="bx-check" className="text-emerald-500 text-base shrink-0" />
                    <span>Acesso no celular (PWA) e PC</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/cadastro"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full h-11 rounded-full font-semibold justify-center text-foreground border-border/80 hover:bg-muted"
                )}
              >
                <span>Começar Grátis Agora</span>
              </Link>
            </div>
          ) : (
            <div className="relative flex flex-col justify-between rounded-3xl border-2 border-primary bg-card p-6 shadow-md shadow-primary/10 animate-in fade-in duration-200">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-xs">
                Mais Recomendado
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading text-xl font-bold text-foreground">
                    Plano Pro
                  </h3>
                  <span className="text-xs font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                    Loja Completa
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">
                  Para quem tem equipe de vendas, quer relatórios aprofundados e suporte VIP.
                </p>

                <div className="mb-5 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">
                    R$ 29,90
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / mês
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-foreground/90 mb-6">
                  <li className="flex items-center gap-2 font-medium text-foreground">
                    <BoxIcon name="bxs-check-circle" className="text-primary text-base shrink-0" />
                    <span>Tudo incluso no Plano Gratuito</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BoxIcon name="bx-check" className="text-emerald-500 text-base shrink-0" />
                    <span>Múltiplos operadores e equipe (RBAC)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BoxIcon name="bx-check" className="text-emerald-500 text-base shrink-0" />
                    <span>Teto de descontos por operador</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BoxIcon name="bx-check" className="text-emerald-500 text-base shrink-0" />
                    <span>Relatórios avançados de margem</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BoxIcon name="bx-check" className="text-emerald-500 text-base shrink-0" />
                    <span>Alertas de reposição de estoque</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BoxIcon name="bx-check" className="text-emerald-500 text-base shrink-0" />
                    <span>Suporte prioritário via WhatsApp</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/cadastro"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "w-full h-11 rounded-full font-semibold justify-center shadow-md shadow-primary/25"
                )}
              >
                <span>Experimentar Pro Grátis</span>
              </Link>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* VERSÃO DESKTOP: GRID LADO A LADO                                   */}
        {/* ------------------------------------------------------------------ */}
        <div className="hidden md:grid md:grid-cols-2 gap-6 sm:gap-8 items-stretch max-w-4xl mx-auto">
          {/* Plano Gratuito */}
          <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-xl font-bold text-foreground">
                  Plano Gratuito
                </h3>
                <span className="text-xs font-semibold text-muted-foreground px-2.5 py-0.5 rounded-full bg-muted">
                  Para Começar
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6">
                Ideal para autônomos e pequenos revendedores organizarem suas vendas hoje mesmo.
              </p>

              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-foreground">
                  R$ 0
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  / para sempre
                </span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-foreground/90 mb-8">
                <li className="flex items-center gap-2.5">
                  <BoxIcon name="bx-check" className="text-emerald-500 text-lg shrink-0" />
                  <span>Vendas e pedidos ilimitados</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <BoxIcon name="bx-check" className="text-emerald-500 text-lg shrink-0" />
                  <span>PDV com leitor de código de barras na câmera</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <BoxIcon name="bx-check" className="text-emerald-500 text-lg shrink-0" />
                  <span>Catálogo de produtos com variações</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <BoxIcon name="bx-check" className="text-emerald-500 text-lg shrink-0" />
                  <span>Emissão de comprovantes no WhatsApp</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <BoxIcon name="bx-check" className="text-emerald-500 text-lg shrink-0" />
                  <span>Cadastro e histórico de clientes</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <BoxIcon name="bx-check" className="text-emerald-500 text-lg shrink-0" />
                  <span>Acesso no celular (PWA) e computador</span>
                </li>
              </ul>
            </div>

            <Link
              href="/cadastro"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full h-11 rounded-full font-semibold justify-center text-foreground border-border/80 hover:bg-muted"
              )}
            >
              <span>Começar Grátis Agora</span>
            </Link>
          </div>

          {/* Plano Profissional (Destaque) */}
          <div className="relative flex flex-col justify-between rounded-3xl border-2 border-primary bg-card p-6 sm:p-8 shadow-lg shadow-primary/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
              Mais Recomendado
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-xl font-bold text-foreground">
                  Plano Pro
                </h3>
                <span className="text-xs font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                  Loja Completa
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6">
                Para quem tem equipe de vendas, quer relatórios aprofundados e suporte VIP.
              </p>

              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-foreground">
                  R$ 29,90
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  / mês
                </span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-foreground/90 mb-8">
                <li className="flex items-center gap-2.5 font-medium text-foreground">
                  <BoxIcon name="bxs-check-circle" className="text-primary text-lg shrink-0" />
                  <span>Tudo incluso no Plano Gratuito</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <BoxIcon name="bx-check" className="text-emerald-500 text-lg shrink-0" />
                  <span>Múltiplos operadores e controle de acesso (RBAC)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <BoxIcon name="bx-check" className="text-emerald-500 text-lg shrink-0" />
                  <span>Teto de descontos personalizável por operador</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <BoxIcon name="bx-check" className="text-emerald-500 text-lg shrink-0" />
                  <span>Relatórios avançados de margem e faturamento</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <BoxIcon name="bx-check" className="text-emerald-500 text-lg shrink-0" />
                  <span>Alertas automáticos de reposição de estoque</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <BoxIcon name="bx-check" className="text-emerald-500 text-lg shrink-0" />
                  <span>Suporte prioritário via WhatsApp</span>
                </li>
              </ul>
            </div>

            <Link
              href="/cadastro"
              className={cn(
                buttonVariants({ variant: "default" }),
                "w-full h-11 rounded-full font-semibold justify-center shadow-md shadow-primary/25"
              )}
            >
              <span>Experimentar Pro Gratuitamente</span>
            </Link>
          </div>
        </div>

        {/* Garantias Adicionais */}
        <div className="mt-10 text-center text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          <span className="flex items-center gap-1.5">
            <BoxIcon name="bx-shield-quarter" className="text-base text-primary" />
            <span>0% de comissão sobre suas vendas</span>
          </span>
          <span className="flex items-center gap-1.5">
            <BoxIcon name="bx-check-shield" className="text-base text-primary" />
            <span>Cancele a qualquer momento sem burocracia</span>
          </span>
          <span className="flex items-center gap-1.5">
            <BoxIcon name="bx-credit-card" className="text-base text-primary" />
            <span>Sem necessidade de cartão para começar</span>
          </span>
        </div>
      </div>
    </section>
  );
}
