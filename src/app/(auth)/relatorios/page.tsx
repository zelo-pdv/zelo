"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { currency } from "@/lib/format";
import { maskPhone } from "@/lib/masks";
import { PAYMENT_METHOD_NAMES } from "@/lib/audit-formatter";
import { toast } from "sonner";

type ReportType =
  | "top-products"
  | "least-products"
  | "top-clients"
  | "debtor-clients"
  | "financial-summary";

interface ReportDef {
  id: ReportType;
  title: string;
  short: string;
  description: string;
  icon: string;
  color: string;
}

const REPORTS: ReportDef[] = [
  {
    id: "top-products",
    title: "Produtos Mais Vendidos",
    short: "Mais Vendidos",
    description: "Itens com maior giro de estoque e faturamento no período.",
    icon: "trending-up",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "least-products",
    title: "Produtos Menos Vendidos",
    short: "Menos Vendidos",
    description: "Produtos com baixo giro e capital parado em estoque.",
    icon: "trending-down",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "top-clients",
    title: "Clientes que Mais Compram",
    short: "Melhores Clientes",
    description: "Clientes com maior volume de compras e faturamento.",
    icon: "group",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "debtor-clients",
    title: "Clientes que Devem (Pendências)",
    short: "Contas a Receber",
    description: "Vendas pendentes, vendas fiado e títulos em atraso.",
    icon: "error-circle",
    color: "text-red-500 bg-red-500/10 border-red-500/20",
  },
  {
    id: "financial-summary",
    title: "Resumo Financeiro de Vendas",
    short: "Resumo Financeiro",
    description: "Faturamento bruto, descontos e métodos de pagamento.",
    icon: "dollar-circle",
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
];

const DATE_PRESETS = [
  { id: "esteMes", label: "Este mês" },
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "ultimos7dias", label: "Últimos 7 dias" },
  { id: "ultimos30dias", label: "Últimos 30 dias" },
  { id: "mesPassado", label: "Mês passado" },
  { id: "esteAno", label: "Este ano" },
  { id: "todos", label: "Todo o histórico" },
  { id: "personalizado", label: "Personalizado" },
];

export default function RelatoriosPage() {
  const isMobile = useIsMobile();
  const [selectedReport, setSelectedReport] =
    useState<ReportType>("top-products");
  const [datePreset, setDatePreset] = useState("esteMes");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const handleSelectReport = (repId: ReportType) => {
    if (repId !== selectedReport) {
      setSelectedReport(repId);
      setReportData(null);
    }
  };

  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Carrega categorias da loja para o filtro de produtos
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadCategories();
  }, []);

  // Calcula intervalo de datas a partir do preset selecionado
  const getDateRange = useCallback(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (datePreset === "hoje") {
      return { start: todayStr, end: todayStr };
    }
    if (datePreset === "ontem") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      return { start: yStr, end: yStr };
    }
    if (datePreset === "ultimos7dias") {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      return { start: past.toISOString().slice(0, 10), end: todayStr };
    }
    if (datePreset === "ultimos30dias") {
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      return { start: past.toISOString().slice(0, 10), end: todayStr };
    }
    if (datePreset === "esteMes") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: firstDay.toISOString().slice(0, 10), end: todayStr };
    }
    if (datePreset === "mesPassado") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: firstDay.toISOString().slice(0, 10),
        end: lastDay.toISOString().slice(0, 10),
      };
    }
    if (datePreset === "esteAno") {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      return { start: firstDay.toISOString().slice(0, 10), end: todayStr };
    }
    if (datePreset === "personalizado") {
      return { start: customStartDate, end: customEndDate };
    }
    return { start: "", end: "" };
  }, [datePreset, customStartDate, customEndDate]);

  // Busca dados do relatório
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", selectedReport);

      const { start, end } = getDateRange();
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);

      if (
        (selectedReport === "top-products" ||
          selectedReport === "least-products") &&
        selectedCategory !== "todos"
      ) {
        params.set("categoryId", selectedCategory);
      }

      if (selectedReport === "debtor-clients" && onlyOverdue) {
        params.set("onlyOverdue", "true");
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao gerar relatório");
      const data = await res.json();
      setReportData(data);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar os dados do relatório.");
    } finally {
      setLoading(false);
    }
  }, [selectedReport, getDateRange, selectedCategory, onlyOverdue]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const currentReportDef = REPORTS.find((r) => r.id === selectedReport)!;
  const selectedDateLabel =
    DATE_PRESETS.find((d) => d.id === datePreset)?.label || "Este mês";

  // Quantidade de filtros específicos ativos
  const activeFiltersCount =
    (datePreset !== "esteMes" ? 1 : 0) +
    (selectedCategory !== "todos" ? 1 : 0) +
    (onlyOverdue ? 1 : 0);

  const handleClearFilters = () => {
    setDatePreset("esteMes");
    setCustomStartDate("");
    setCustomEndDate("");
    setSelectedCategory("todos");
    setOnlyOverdue(false);
    setIsFilterDrawerOpen(false);
  };

  // Geração do PDF
  const handleDownloadPdf = async () => {
    if (!reportData) {
      toast.warning("Aguarde o carregamento dos dados para gerar o PDF.");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const storeName = reportData.store?.name || "Zelo - Gestão & PDV";
      const { start, end } = getDateRange();
      const periodLabel =
        start && end
          ? `Período: ${new Date(start + "T12:00:00").toLocaleDateString("pt-BR")} até ${new Date(end + "T12:00:00").toLocaleDateString("pt-BR")}`
          : "Período: Todo o histórico";
      const emitDate = new Date().toLocaleString("pt-BR");

      // Cabeçalho Oficial
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(storeName.toUpperCase(), 14, 15);

      doc.setFontSize(15);
      doc.setTextColor(30, 41, 59);
      doc.text(currentReportDef.title, 14, 23);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`${periodLabel} • Emissão: ${emitDate}`, 14, 29);

      let head: string[][] = [];
      let body: (string | number)[][] = [];

      if (selectedReport === "top-products") {
        head = [
          [
            "#",
            "Produto",
            "Categoria",
            "Qtd. Vendida",
            "Preço Unit.",
            "Total Faturado",
            "Estoque",
          ],
        ];
        body = (reportData.data || []).map((p: any, idx: number) => [
          String(idx + 1),
          p.productName,
          p.categoryName,
          `${p.quantitySold} un.`,
          currency(p.salePrice),
          currency(p.totalRevenue),
          `${p.currentStock} un.`,
        ]);
      } else if (selectedReport === "least-products") {
        head = [
          [
            "#",
            "Produto",
            "Categoria",
            "Qtd. Vendida",
            "Estoque Parado",
            "Preço Venda",
            "Capital Parado",
          ],
        ];
        body = (reportData.data || []).map((p: any, idx: number) => [
          String(idx + 1),
          p.productName,
          p.categoryName,
          `${p.quantitySold} un.`,
          `${p.currentStock} un.`,
          currency(p.salePrice),
          currency(p.stockValue),
        ]);
      } else if (selectedReport === "top-clients") {
        head = [
          [
            "#",
            "Cliente",
            "Contato",
            "Compras",
            "Ticket Médio",
            "Total Gasto",
            "Última Compra",
          ],
        ];
        body = (reportData.data || []).map((c: any, idx: number) => [
          String(idx + 1),
          c.clientName,
          c.phone ? maskPhone(c.phone) : "-",
          String(c.salesCount),
          currency(c.averageTicket),
          currency(c.totalSpent),
          c.lastPurchaseDate
            ? new Date(c.lastPurchaseDate).toLocaleDateString("pt-BR")
            : "-",
        ]);
      } else if (selectedReport === "debtor-clients") {
        head = [
          [
            "#",
            "Cliente",
            "Contato",
            "Vendas Pendentes",
            "Vencimento Mais Antigo",
            "Situação",
            "Total Devido",
          ],
        ];
        body = (reportData.data || []).map((c: any, idx: number) => [
          String(idx + 1),
          c.clientName,
          c.phone ? maskPhone(c.phone) : "-",
          String(c.pendingSalesCount),
          c.oldestDueDate
            ? new Date(c.oldestDueDate).toLocaleDateString("pt-BR")
            : "Não definido",
          c.isOverdue ? "EM ATRASO" : "No prazo",
          currency(c.totalDebt),
        ]);
      } else if (selectedReport === "financial-summary") {
        head = [
          [
            "Forma de Pagamento",
            "Qtd. Vendas",
            "% do Faturamento",
            "Total Faturado",
          ],
        ];
        body = (reportData.paymentsBreakdown || []).map((item: any) => [
          PAYMENT_METHOD_NAMES[item.method] || item.method,
          String(item.count),
          `${Number(item.percentage || 0).toFixed(1)}%`,
          currency(item.total),
        ]);
      }

      autoTable(doc, {
        startY: 35,
        head,
        body,
        theme: "grid",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
        },
      });

      const todayIso = new Date().toISOString().slice(0, 10);
      const filename = `relatorio_${selectedReport}_${todayIso}.pdf`;
      doc.save(filename);
      toast.success("Relatório em PDF baixado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF do relatório.");
    }
  };

  return (
    <div className="w-full px-3 sm:px-6 space-y-4 max-w-7xl mx-auto">
      {/* Topo Limpo e Otimizado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Relatórios & Análises
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Extraia métricas inteligentes do seu negócio e baixe relatórios
            oficiais em PDF.
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2">
          {/* Botão de Filtros */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="h-9 gap-1.5 text-xs px-3 shadow-xs">
            <BoxIcon name="filter" className="text-base" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="ml-1 size-5 rounded-full bg-primary-foreground text-primary font-bold text-[10px] inline-flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {/* Baixar PDF */}
          <Button
            onClick={handleDownloadPdf}
            disabled={loading || !reportData}
            size="sm"
            className="h-9 gap-1.5 text-xs px-3 bg-red-600 hover:bg-red-700 text-white shadow-xs">
            <BoxIcon name="file-blank" className="text-base" />
            <span>Baixar PDF</span>
          </Button>

          {/* Atualizar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchReport}
            disabled={loading}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            title="Atualizar dados">
            <BoxIcon
              name="refresh"
              className={`text-base ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Seletor Compacto de Relatório (Scroll horizontal suave no celular, limpo e direto) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
        {REPORTS.map((rep) => {
          const isSelected = selectedReport === rep.id;
          return (
            <button
              key={rep.id}
              onClick={() => handleSelectReport(rep.id)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full transition-all shrink-0 border ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-accent"
              }`}>
              <BoxIcon name={rep.icon} className="text-sm shrink-0" />
              <span>{rep.short}</span>
            </button>
          );
        })}
      </div>

      {/* Chips Rápidos de Filtros Ativos */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[11px] text-muted-foreground mr-1">
          Exibindo:
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
          {selectedDateLabel}
        </span>
        {selectedCategory !== "todos" && (
          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
            {categories.find((c) => c.id === selectedCategory)?.name ||
              "Categoria"}
            <button
              onClick={() => setSelectedCategory("todos")}
              className="hover:opacity-75">
              <BoxIcon name="x" className="text-xs" />
            </button>
          </span>
        )}
        {onlyOverdue && (
          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20 font-medium">
            Apenas em atraso
            <button
              onClick={() => setOnlyOverdue(false)}
              className="hover:opacity-75">
              <BoxIcon name="x" className="text-xs" />
            </button>
          </span>
        )}
        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="text-[11px] text-muted-foreground hover:text-red-500 underline ml-1 cursor-pointer">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Indicadores Resumo / KPIs (2 colunas no celular, 4 no desktop) */}
      {!loading &&
        reportData &&
        reportData.reportType === selectedReport &&
        reportData.summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {selectedReport === "top-products" && (
              <>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Itens Vendidos
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-foreground">
                    {reportData.summary.totalItemsSold ?? 0} un.
                  </p>
                </Card>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Faturamento Total
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {currency(reportData.summary.totalRevenue)}
                  </p>
                </Card>
                <Card className="p-3 sm:p-4 border shadow-xs col-span-2">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Produto Campeão
                  </span>
                  <p className="text-base sm:text-lg font-bold mt-1 text-foreground truncate">
                    {reportData.summary.topProduct || "Nenhum"}
                  </p>
                </Card>
              </>
            )}

            {selectedReport === "least-products" && (
              <>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Sem Nenhuma Venda
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                    {reportData.summary.zeroSalesCount ?? 0} itens
                  </p>
                </Card>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Estoque Acumulado
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-foreground">
                    {reportData.summary.totalStockItems ?? 0} un.
                  </p>
                </Card>
                <Card className="p-3 sm:p-4 border shadow-xs col-span-2">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Capital Parado Estimado
                  </span>
                  <p className="text-base sm:text-lg font-bold mt-1 text-red-600 dark:text-red-400">
                    {currency(reportData.summary.totalStockValue)}
                  </p>
                </Card>
              </>
            )}

            {selectedReport === "top-clients" && (
              <>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Total de Pedidos
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-foreground">
                    {reportData.summary.totalOrdersCount ?? 0}
                  </p>
                </Card>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Ticket Médio
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                    {currency(reportData.summary.averageTicket)}
                  </p>
                </Card>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Faturamento Top Clientes
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {currency(reportData.summary.totalRevenueFromTop)}
                  </p>
                </Card>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Melhor Cliente
                  </span>
                  <p className="text-base sm:text-lg font-bold mt-1 text-foreground truncate">
                    {reportData.summary.topClient || "Nenhum"}
                  </p>
                </Card>
              </>
            )}

            {selectedReport === "debtor-clients" && (
              <>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Total a Receber
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                    {currency(reportData.summary.totalPendingDebt)}
                  </p>
                </Card>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Total em Atraso
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-red-600 dark:text-red-400">
                    {currency(reportData.summary.totalOverdueDebt)}
                  </p>
                </Card>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Clientes com Débito
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-foreground">
                    {reportData.summary.debtorsCount ?? 0}
                  </p>
                </Card>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Vendas Pendentes
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-foreground">
                    {reportData.summary.totalPendingSales ?? 0}
                  </p>
                </Card>
              </>
            )}

            {selectedReport === "financial-summary" && (
              <>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Faturamento Líquido (Pago)
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {currency(reportData.summary.netRevenue)}
                  </p>
                </Card>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Valores Pendentes / Fiado
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                    {currency(reportData.summary.pendingRevenue)}
                  </p>
                </Card>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Vendas Concluídas
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-foreground">
                    {reportData.summary.validSalesCount ?? 0}
                  </p>
                </Card>
                <Card className="p-3 sm:p-4 border shadow-xs">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Descontos Aplicados
                  </span>
                  <p className="text-lg sm:text-xl font-bold mt-1 text-muted-foreground">
                    {currency(reportData.summary.totalDiscount)}
                  </p>
                </Card>
              </>
            )}
          </div>
        )}

      {/* Visualização da Tabela no App (100% da visualização livre) */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 border-b border-border/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              {currentReportDef.title}
            </CardTitle>
            <CardDescription className="text-xs">
              Visualização consolidada no período selecionado.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ||
          !reportData ||
          reportData.reportType !== selectedReport ? (
            <div className="flex flex-col items-center justify-center p-14 text-muted-foreground gap-2">
              <BoxIcon
                name="loader-alt"
                className="animate-spin text-3xl text-primary"
              />
              <span className="text-xs">Gerando relatório...</span>
            </div>
          ) : (
              selectedReport === "financial-summary"
                ? (!reportData.paymentsBreakdown ||
                    reportData.paymentsBreakdown.length === 0) &&
                  (!reportData.summary?.totalSalesCount ||
                    reportData.summary.totalSalesCount === 0)
                : !reportData.data || reportData.data.length === 0
            ) ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-2">
              <BoxIcon
                name="folder-open"
                className="text-3xl text-muted-foreground"
              />
              <p className="font-semibold text-sm text-foreground">
                Nenhum dado encontrado
              </p>
              <p className="text-xs max-w-sm">
                Não há dados suficientes para este relatório no período
                selecionado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* TABELA: PRODUTOS MAIS VENDIDOS */}
              {selectedReport === "top-products" && (
                <table className="w-full text-xs text-left border-collapse min-w-145">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">#</th>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3 text-right">Qtd. Vendida</th>
                      <th className="px-4 py-3 text-right">Preço Unit.</th>
                      <th className="px-4 py-3 text-right">Total Faturado</th>
                      <th className="px-4 py-3 text-center">Estoque Atual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(reportData.data || []).map((p: any, idx: number) => (
                      <tr
                        key={p.productId}
                        className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-center font-bold text-muted-foreground">
                          {idx === 0
                            ? "🥇 1"
                            : idx === 1
                              ? "🥈 2"
                              : idx === 2
                                ? "🥉 3"
                                : idx + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {p.productName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.categoryName}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          {p.quantitySold} un.
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {currency(p.salePrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {currency(p.totalRevenue)}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              p.currentStock <= 0
                                ? "bg-red-500/10 text-red-600"
                                : p.currentStock <= 5
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-muted text-muted-foreground"
                            }`}>
                            {p.currentStock} un.
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* TABELA: PRODUTOS MENOS VENDIDOS */}
              {selectedReport === "least-products" && (
                <table className="w-full text-xs text-left border-collapse min-w-145">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">#</th>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3 text-right">Qtd. Vendida</th>
                      <th className="px-4 py-3 text-right">Estoque Parado</th>
                      <th className="px-4 py-3 text-right">Preço Venda</th>
                      <th className="px-4 py-3 text-right">Capital Parado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(reportData?.data || []).map((p: any, idx: number) => (
                      <tr
                        key={p.productId}
                        className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {p.productName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.categoryName}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] ${
                              p.quantitySold === 0
                                ? "bg-amber-500/10 text-amber-600 font-bold"
                                : "text-muted-foreground"
                            }`}>
                            {p.quantitySold} un.
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-foreground font-medium">
                          {p.currentStock} un.
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {currency(p.salePrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                          {currency(p.stockValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* TABELA: CLIENTES QUE MAIS COMPRAM */}
              {selectedReport === "top-clients" && (
                <table className="w-full text-xs text-left border-collapse min-w-145">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">#</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Contato</th>
                      <th className="px-4 py-3 text-right">Compras</th>
                      <th className="px-4 py-3 text-right">Ticket Médio</th>
                      <th className="px-4 py-3 text-right">Total Gasto</th>
                      <th className="px-4 py-3 text-center">Última Compra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(reportData?.data || []).map((c: any, idx: number) => (
                      <tr
                        key={idx}
                        className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-center font-bold text-muted-foreground">
                          {idx === 0
                            ? "🥇 1"
                            : idx === 1
                              ? "🥈 2"
                              : idx === 2
                                ? "🥉 3"
                                : idx + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {c.clientName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.phone ? maskPhone(c.phone) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">
                          {c.salesCount} pedido{c.salesCount > 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-medium">
                          {currency(c.averageTicket)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {currency(c.totalSpent)}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {c.lastPurchaseDate
                            ? new Intl.DateTimeFormat("pt-BR", {
                                dateStyle: "short",
                              }).format(new Date(c.lastPurchaseDate))
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* TABELA: CLIENTES QUE DEVEM */}
              {selectedReport === "debtor-clients" && (
                <table className="w-full text-xs text-left border-collapse min-w-145">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">#</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Contato</th>
                      <th className="px-4 py-3 text-center">
                        Vendas Pendentes
                      </th>
                      <th className="px-4 py-3 text-center">
                        Vencimento Mais Antigo
                      </th>
                      <th className="px-4 py-3 text-center">Situação</th>
                      <th className="px-4 py-3 text-right">Total Devido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(reportData?.data || []).map((c: any, idx: number) => (
                      <tr
                        key={idx}
                        className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {c.clientName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.phone ? maskPhone(c.phone) : "-"}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          {c.pendingSalesCount} venda
                          {c.pendingSalesCount > 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {c.oldestDueDate
                            ? new Intl.DateTimeFormat("pt-BR", {
                                dateStyle: "short",
                              }).format(new Date(c.oldestDueDate))
                            : "Sem data"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              c.isOverdue
                                ? "bg-red-500/10 text-red-600 border border-red-500/20"
                                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            }`}>
                            {c.isOverdue ? "EM ATRASO" : "No prazo"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                          {currency(c.totalDebt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* TABELA: RESUMO FINANCEIRO */}
              {selectedReport === "financial-summary" && (
                <div className="p-4 space-y-4">
                  <table className="w-full text-xs text-left border-collapse min-w-120">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3">Forma de Pagamento</th>
                        <th className="px-4 py-3 text-center">Qtd. Vendas</th>
                        <th className="px-4 py-3 text-right">
                          % do Faturamento
                        </th>
                        <th className="px-4 py-3 text-right">Total Faturado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {(
                        reportData?.paymentsBreakdown ||
                        reportData?.data ||
                        []
                      ).map((item: any) => (
                        <tr
                          key={item.method}
                          className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {PAYMENT_METHOD_NAMES[item.method] || item.method}
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground">
                            {item.count} venda{item.count > 1 ? "s" : ""}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-muted-foreground">
                            {Number(item.percentage || 0).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {currency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FILTROS HÍBRIDOS DO RELATÓRIO: Drawer no celular e Dialog no PC */}
      {(() => {
        const filterFields = (
          <div className="space-y-4 py-2">
            {/* Seletor do Relatório no Modal */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Tipo de Relatório
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REPORTS.map((rep) => {
                  const isSel = selectedReport === rep.id;
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => handleSelectReport(rep.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                        isSel
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border"
                      }`}>
                      <BoxIcon name={rep.icon} className="text-sm shrink-0" />
                      <span className="truncate">{rep.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Período */}
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <label className="text-xs font-semibold text-foreground">
                Período de Análise
              </label>
              <Select
                value={datePreset}
                onValueChange={(val) => {
                  if (val) setDatePreset(val);
                }}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {datePreset === "personalizado" && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-1">
                      Data inicial:
                    </span>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-1">
                      Data final:
                    </span>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Categoria (quando aplicável) */}
            {(selectedReport === "top-products" ||
              selectedReport === "least-products") && (
              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <label className="text-xs font-semibold text-foreground">
                  Categoria do Produto
                </label>
                <Select
                  value={selectedCategory}
                  onValueChange={(val) => {
                    if (val) setSelectedCategory(val);
                  }}>
                  <SelectTrigger className="h-9 text-xs w-full">
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="text-xs">
                      Todas as categorias
                    </SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Apenas devedores vencidos */}
            {selectedReport === "debtor-clients" && (
              <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                <input
                  type="checkbox"
                  id="filterOnlyOverdue"
                  checked={onlyOverdue}
                  onChange={(e) => setOnlyOverdue(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary size-4"
                />
                <label
                  htmlFor="filterOnlyOverdue"
                  className="text-xs font-medium text-foreground cursor-pointer select-none">
                  Mostrar apenas clientes com parcelas vencidas
                </label>
              </div>
            )}
          </div>
        );

        if (isMobile) {
          return (
            <Drawer
              open={isFilterDrawerOpen}
              onOpenChange={setIsFilterDrawerOpen}
              showSwipeHandle>
              <DrawerContent className="max-h-[85vh] p-4 sm:p-6 overflow-y-auto">
                <DrawerHeader className="px-0 pt-0 text-center">
                  <DrawerTitle className="text-base font-bold text-foreground text-center">
                    Filtros do Relatório
                  </DrawerTitle>
                  <DrawerDescription className="text-xs text-muted-foreground text-center">
                    Ajuste o período e filtros específicos para o relatório
                    selecionado.
                  </DrawerDescription>
                </DrawerHeader>

                {filterFields}

                <div className="shrink-0 pt-3 mt-4 border-t border-border w-full flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      setIsFilterDrawerOpen(false);
                      fetchReport();
                    }}
                    className="h-11 w-full rounded-full font-medium">
                    Aplicar Filtros
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClearFilters}
                    className="h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:text-foreground">
                    Limpar Filtros
                  </Button>
                </div>
              </DrawerContent>
            </Drawer>
          );
        }

        return (
          <Dialog
            open={isFilterDrawerOpen}
            onOpenChange={setIsFilterDrawerOpen}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader className="text-left">
                <DialogTitle className="text-base font-bold text-foreground">
                  Filtros do Relatório
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Ajuste o período e filtros específicos para o relatório
                  selecionado.
                </DialogDescription>
              </DialogHeader>

              {filterFields}

              <DialogFooter className="pt-3 flex flex-row items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-xs h-9">
                  Limpar Filtros
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsFilterDrawerOpen(false);
                    fetchReport();
                  }}
                  className="text-xs h-9 px-4">
                  Aplicar Filtros
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
