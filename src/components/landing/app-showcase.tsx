"use client";

import { useState } from "react";
import { BoxIcon } from "@/components/ui/box-icon";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TabKey = "pdv" | "dashboard" | "produtos" | "comprovante";

interface TabItem {
  key: TabKey;
  label: string;
  icon: string;
  badge?: string;
  description: string;
}

const TABS: TabItem[] = [
  {
    key: "pdv",
    label: "Ponto de Venda (PDV)",
    icon: "bx-cart",
    badge: "Mais Usado",
    description: "Venda rápida com leitor de código de barras na câmera e múltiplos pagamentos.",
  },
  {
    key: "dashboard",
    label: "Painel & Métricas",
    icon: "bx-line-chart",
    description: "Acompanhe faturamento, ticket médio e alertas de estoque em tempo real.",
  },
  {
    key: "produtos",
    label: "Catálogo & Variações",
    icon: "bx-package",
    description: "Controle de estoque flexível com variações de cor, tamanho e custo.",
  },
  {
    key: "comprovante",
    label: "Comprovante no WhatsApp",
    icon: "bx-receipt",
    badge: "Exclusivo",
    description: "Envio instantâneo de comprovante térmico digital direto no WhatsApp do cliente.",
  },
];

export function AppShowcase() {
  const [activeTab, setActiveTab] = useState<TabKey>("pdv");

  return (
    <section id="demonstracao" className="py-16 md:py-24 bg-muted/30 border-y border-border/50">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h2 className="font-heading text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Veja como o Zelo funciona na prática
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Uma interface pensada para ser rápida no celular e poderosa no computador.
            Clique nas abas abaixo para conhecer as principais telas:
          </p>
        </div>

        {/* Abas de Navegação */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                )}
                aria-pressed={isActive}
              >
                <BoxIcon name={tab.icon} className="text-base" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={cn(
                      "hidden sm:inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full tracking-wider",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/15 text-primary"
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Descrição da Tela Atual */}
        <p className="text-center text-xs sm:text-sm text-muted-foreground mb-6 font-medium">
          {TABS.find((t) => t.key === activeTab)?.description}
        </p>

        {/* Moldura da Janela do Aplicativo (Mockup de Alta Fidelidade) */}
        <div className="relative mx-auto max-w-4xl rounded-2xl sm:rounded-3xl border border-border/80 bg-card shadow-xl overflow-hidden transition-all">
          {/* Top Bar da Janela */}
          <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-2.5 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="size-2.5 sm:size-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="size-2.5 sm:size-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="size-2.5 sm:size-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div className="flex items-center gap-2 rounded-md bg-background/60 px-3 py-1 text-[11px] sm:text-xs font-mono text-muted-foreground border border-border/40">
              <BoxIcon name="bx-lock-alt" className="text-emerald-500 text-xs" />
              <span className="truncate max-w-[200px] sm:max-w-xs">
                app.zelo.com.br/{activeTab === "pdv" ? "nova-venda" : activeTab}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline text-[11px] font-medium">Online</span>
            </div>
          </div>

          {/* Conteúdo Renderizado da Aba */}
          <div className="p-4 sm:p-6 md:p-8 bg-background min-h-[380px] sm:min-h-[440px] flex flex-col justify-center">
            {activeTab === "pdv" && <PdvMockup />}
            {activeTab === "dashboard" && <DashboardMockup />}
            {activeTab === "produtos" && <ProdutosMockup />}
            {activeTab === "comprovante" && <ComprovanteMockup />}
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------
// Mockup 1: Ponto de Venda (PDV)
// ----------------------------------------------------
function PdvMockup() {
  return (
    <div className="w-full space-y-4 max-w-2xl mx-auto animate-in fade-in duration-300">
      {/* Topo do PDV: Cliente & Leitor */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-card border border-border/70">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            <BoxIcon name="bx-user" className="text-lg" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Cliente selecionado</div>
            <div className="text-sm font-semibold text-foreground">Camila Souza (WhatsApp)</div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold self-start sm:self-auto border border-emerald-500/20">
          <BoxIcon name="bx-barcode-reader" className="text-base" />
          <span>Leitor de Câmera Ativo</span>
        </div>
      </div>

      {/* Itens do Carrinho */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
        <div className="p-3 bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground flex justify-between">
          <span>ITENS DA VENDA (2 PRODUTOS)</span>
          <span>VALOR</span>
        </div>
        <div className="divide-y divide-border/50">
          <div className="p-3 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                1x
              </div>
              <div>
                <div className="font-medium text-foreground">Perfume Floratta Red 75ml</div>
                <div className="text-xs text-muted-foreground">Cód: EAN-78912345 • Pronta Entrega</div>
              </div>
            </div>
            <div className="font-semibold text-foreground">R$ 139,90</div>
          </div>

          <div className="p-3 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                2x
              </div>
              <div>
                <div className="font-medium text-foreground">Batom Matte Rosa Nude</div>
                <div className="text-xs text-muted-foreground">Variação: Tom 04 • R$ 29,90 cada</div>
              </div>
            </div>
            <div className="font-semibold text-foreground">R$ 59,80</div>
          </div>
        </div>
      </div>

      {/* Formas de Pagamento e Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Métodos */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Forma de Pagamento:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg border border-primary bg-primary/10 text-primary font-semibold flex items-center justify-center gap-1.5">
              <BoxIcon name="bx-qr" className="text-sm" />
              <span>Pix (Selecionado)</span>
            </div>
            <div className="p-2 rounded-lg border border-border/60 bg-muted/50 text-foreground/80 flex items-center justify-center gap-1.5">
              <BoxIcon name="bx-money" className="text-sm" />
              <span>Dinheiro</span>
            </div>
            <div className="p-2 rounded-lg border border-border/60 bg-muted/50 text-foreground/80 flex items-center justify-center gap-1.5">
              <BoxIcon name="bx-credit-card" className="text-sm" />
              <span>Cartão</span>
            </div>
            <div className="p-2 rounded-lg border border-border/60 bg-muted/50 text-foreground/80 flex items-center justify-center gap-1.5">
              <BoxIcon name="bx-time-five" className="text-sm" />
              <span>A Prazo / Fiado</span>
            </div>
          </div>
        </div>

        {/* Totalizador */}
        <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal:</span>
              <span>R$ 199,70</span>
            </div>
            <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span>Desconto de cortesia:</span>
              <span>- R$ 9,70</span>
            </div>
            <div className="flex justify-between items-baseline pt-1 border-t border-border/60">
              <span className="text-xs font-bold text-foreground">TOTAL A COBRAR:</span>
              <span className="text-xl font-extrabold text-primary">R$ 190,00</span>
            </div>
          </div>

          <div className="mt-3 w-full h-9 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm">
            <BoxIcon name="bx-check-circle" className="text-base" />
            <span>Confirmar e Emitir Comprovante</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Mockup 2: Dashboard & Métricas
// ----------------------------------------------------
function DashboardMockup() {
  return (
    <div className="w-full space-y-4 max-w-2xl mx-auto animate-in fade-in duration-300">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-border/70 bg-card border-l-4 border-l-primary space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            Faturamento Hoje
          </div>
          <div className="text-xl font-bold text-foreground">R$ 780,00</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <BoxIcon name="bx-trending-up" className="text-sm" />
            <span>+24% vs ontem</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card border-l-4 border-l-emerald-500 space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            Vendas do Mês
          </div>
          <div className="text-xl font-bold text-foreground">58 vendas</div>
          <div className="text-[11px] text-muted-foreground">
            Ticket médio R$ 94,50
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card border-l-4 border-l-amber-500 space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            Alerta de Estoque
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            2 itens
          </div>
          <div className="text-[11px] text-muted-foreground">
            Abaixo do limite de reposição
          </div>
        </div>
      </div>

      {/* Gráfico Simulado & Últimas Vendas */}
      <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Evolução de Vendas na Semana
          </div>
          <Badge variant="outline" className="text-[11px] font-normal">
            Segunda a Domingo
          </Badge>
        </div>

        {/* Barras do Gráfico */}
        <div className="flex items-end justify-between gap-2 h-24 pt-4 px-2 border-b border-border/50">
          {[
            { day: "Seg", h: "35%", val: "R$ 310" },
            { day: "Ter", h: "48%", val: "R$ 440" },
            { day: "Qua", h: "62%", val: "R$ 580" },
            { day: "Qui", h: "40%", val: "R$ 390" },
            { day: "Sex", h: "85%", val: "R$ 820" },
            { day: "Sáb", h: "95%", val: "R$ 960", highlight: true },
            { day: "Dom", h: "55%", val: "R$ 510" },
          ].map((bar) => (
            <div key={bar.day} className="flex flex-col items-center gap-1.5 flex-1 group">
              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {bar.val}
              </span>
              <div
                style={{ height: bar.h }}
                className={cn(
                  "w-full max-w-[28px] rounded-t-sm transition-all",
                  bar.highlight ? "bg-primary" : "bg-primary/40 hover:bg-primary/70"
                )}
              />
              <span className="text-[10px] text-muted-foreground font-medium">
                {bar.day}
              </span>
            </div>
          ))}
        </div>

        {/* Últimas Vendas */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase">
            Últimas Operações
          </div>
          <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="font-medium">Juliana Lima</span>
              <span className="text-muted-foreground">• Pix</span>
            </div>
            <span className="font-semibold text-foreground">R$ 125,00</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="font-medium">Marcos Andrade</span>
              <span className="text-muted-foreground">• Cartão</span>
            </div>
            <span className="font-semibold text-foreground">R$ 68,00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Mockup 3: Catálogo & Variações
// ----------------------------------------------------
function ProdutosMockup() {
  return (
    <div className="w-full space-y-4 max-w-2xl mx-auto animate-in fade-in duration-300">
      {/* Barra de Filtro */}
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-card border border-border/70">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-1">
          <BoxIcon name="bx-search" className="text-base text-muted-foreground ml-1" />
          <span>Filtrar produtos por nome, código de barras ou categoria...</span>
        </div>
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
          <BoxIcon name="bx-plus" className="text-sm" />
          <span>Novo Produto</span>
        </div>
      </div>

      {/* Lista de Produtos com Variações */}
      <div className="rounded-xl border border-border/70 bg-card divide-y divide-border/60 overflow-hidden">
        {/* Produto 1 */}
        <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="size-11 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              <BoxIcon name="bx-package" className="text-xl" />
            </div>
            <div>
              <div className="font-semibold text-foreground">Camiseta Algodão Egípcio</div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <span className="bg-muted px-1.5 py-0.5 rounded text-[11px]">Variações: P, M, G</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">18 un em estoque</span>
              </div>
            </div>
          </div>
          <div className="sm:text-right">
            <div className="font-bold text-foreground text-base">R$ 89,90</div>
            <div className="text-[11px] text-muted-foreground">Custo: R$ 39,00 (Margem: 56%)</div>
          </div>
        </div>

        {/* Produto 2 */}
        <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="size-11 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
              <BoxIcon name="bx-error" className="text-xl" />
            </div>
            <div>
              <div className="font-semibold text-foreground">Creme Facial Hidratante Noite</div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4">
                  Estoque Baixo (1 un)
                </Badge>
                <span className="text-muted-foreground">• Mínimo configurado: 3 un</span>
              </div>
            </div>
          </div>
          <div className="sm:text-right">
            <div className="font-bold text-foreground text-base">R$ 54,90</div>
            <div className="text-[11px] text-muted-foreground">Custo: R$ 26,00 (Margem: 52%)</div>
          </div>
        </div>

        {/* Produto 3 */}
        <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="size-11 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
              <BoxIcon name="bx-infinite" className="text-xl" />
            </div>
            <div>
              <div className="font-semibold text-foreground">Consultoria de Estilo & Make</div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <span className="bg-muted px-1.5 py-0.5 rounded text-[11px]">Serviço / Sob Encomenda</span>
                <span>• Sem controle de quantidade física</span>
              </div>
            </div>
          </div>
          <div className="sm:text-right">
            <div className="font-bold text-foreground text-base">R$ 120,00</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">100% de margem</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Mockup 4: Comprovante no WhatsApp
// ----------------------------------------------------
function ComprovanteMockup() {
  return (
    <div className="w-full max-w-sm mx-auto animate-in fade-in duration-300">
      {/* Cupom Térmico Digital */}
      <div className="p-5 rounded-2xl border border-dashed border-border/80 bg-card shadow-sm space-y-3 font-mono text-xs text-foreground">
        {/* Cabeçalho */}
        <div className="text-center space-y-1 pb-3 border-b border-dashed border-border/70">
          <div className="font-bold text-sm tracking-wider uppercase font-sans">
            Espaço Beleza & Bem-Estar
          </div>
          <div className="text-[11px] text-muted-foreground">
            Comprovante Não-Fiscal • Venda #1042
          </div>
          <div className="text-[10px] text-muted-foreground">
            Data: Hoje às 15:42
          </div>
        </div>

        {/* Cliente */}
        <div className="text-[11px] space-y-0.5">
          <div className="text-muted-foreground">CLIENTE:</div>
          <div className="font-semibold font-sans">Renata Albuquerque</div>
        </div>

        {/* Itens */}
        <div className="space-y-1.5 py-2 border-y border-dashed border-border/70 text-[11px]">
          <div className="flex justify-between">
            <span>1x Kit Shampoo + Condicionador</span>
            <span>R$ 68,00</span>
          </div>
          <div className="flex justify-between">
            <span>1x Máscara de Cílios Volume</span>
            <span>R$ 34,00</span>
          </div>
        </div>

        {/* Totais */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal:</span>
            <span>R$ 102,00</span>
          </div>
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Desconto no Pix:</span>
            <span>- R$ 7,00</span>
          </div>
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-border/40 font-sans">
            <span>TOTAL PAGO:</span>
            <span className="text-primary font-extrabold">R$ 95,00</span>
          </div>
          <div className="text-[10px] text-muted-foreground pt-0.5">
            Forma de pagamento: Pix • Transação aprovada
          </div>
        </div>

        {/* Rodapé do comprovante */}
        <div className="text-center text-[10px] text-muted-foreground pt-2">
          Obrigado pela preferência! Volte sempre.
        </div>
      </div>

      {/* Ação de Compartilhamento WhatsApp */}
      <div className="mt-3.5 flex flex-col gap-2">
        <div className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer">
          <BoxIcon name="bxl-whatsapp" className="text-lg" />
          <span>Enviar Comprovante no WhatsApp</span>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-8 rounded-lg border border-border/70 bg-card text-foreground font-sans text-[11px] font-medium flex items-center justify-center gap-1">
            <BoxIcon name="bx-download" className="text-sm" />
            <span>Baixar Imagem / PDF</span>
          </div>
          <div className="flex-1 h-8 rounded-lg border border-border/70 bg-card text-foreground font-sans text-[11px] font-medium flex items-center justify-center gap-1">
            <BoxIcon name="bx-printer" className="text-sm" />
            <span>Imprimir Cupom</span>
          </div>
        </div>
      </div>
    </div>
  );
}
