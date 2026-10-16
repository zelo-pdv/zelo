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
import { formatAuditLog, PAYMENT_METHOD_NAMES } from "@/lib/audit-formatter";
import { TablePagination } from "@/components/ui/table-pagination";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: any;
  user: { id: string; name: string; email: string };
  createdAt: string;
}

interface StoreUser {
  id: string;
  name: string;
}

const CATEGORIES = [
  { id: "todos", label: "Todos", icon: "list-ul" },
  { id: "vendas", label: "Vendas", icon: "cart" },
  { id: "produtos", label: "Produtos & Estoque", icon: "package" },
  { id: "clientes", label: "Clientes", icon: "group" },
  { id: "usuarios", label: "Equipe", icon: "user" },
  { id: "grupos", label: "Permissões", icon: "shield" },
  { id: "configuracoes", label: "Configurações", icon: "cog" },
];

const DATE_PRESETS = [
  { id: "todos", label: "Todo o período" },
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "ultimos7dias", label: "Últimos 7 dias" },
  { id: "ultimos30dias", label: "Últimos 30 dias" },
  { id: "esteMes", label: "Este mês" },
  { id: "personalizado", label: "Personalizado" },
];

export default function RegistrosPage() {
  const isMobile = useIsMobile();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [storeUsers, setStoreUsers] = useState<StoreUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos filtros
  const [activeCategory, setActiveCategory] = useState("todos");
  const [datePreset, setDatePreset] = useState("todos");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedUser, setSelectedUser] = useState("todos");
  const [saleStatus, setSaleStatus] = useState("todos");
  const [paymentMethod, setPaymentMethod] = useState("todos");

  // Busca e controles de UI
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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
    if (datePreset === "personalizado") {
      return { start: customStartDate, end: customEndDate };
    }
    return { start: "", end: "" };
  }, [datePreset, customStartDate, customEndDate]);

  const fetchLogs = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(targetPage));
        params.set("limit", "40");

        if (activeCategory !== "todos") {
          params.set("category", activeCategory);
        }

        const { start, end } = getDateRange();
        if (start) params.set("startDate", start);
        if (end) params.set("endDate", end);

        if (selectedUser !== "todos") {
          params.set("userId", selectedUser);
        }

        if (saleStatus !== "todos") {
          params.set("status", saleStatus);
        }

        if (paymentMethod !== "todos") {
          params.set("paymentMethod", paymentMethod);
        }

        if (searchTerm.trim()) {
          params.set("search", searchTerm.trim());
        }

        const res = await fetch(`/api/audit?${params.toString()}`);
        if (!res.ok) throw new Error("Erro ao carregar registros.");

        const data = await res.json();
        setLogs(data.data || []);
        if (data.users) setStoreUsers(data.users);
        setPage(data.meta?.page || 1);
        setTotalPages(data.meta?.totalPages || 1);
        setTotalCount(data.meta?.total || 0);
      } catch (error) {
        console.error(error);
        toast.error("Não foi possível carregar os registros de atividade.");
      } finally {
        setLoading(false);
      }
    },
    [
      activeCategory,
      getDateRange,
      selectedUser,
      saleStatus,
      paymentMethod,
      searchTerm,
    ],
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  // Contagem de filtros ativos
  const activeFiltersCount =
    (activeCategory !== "todos" ? 1 : 0) +
    (datePreset !== "todos" ? 1 : 0) +
    (selectedUser !== "todos" ? 1 : 0) +
    (saleStatus !== "todos" ? 1 : 0) +
    (paymentMethod !== "todos" ? 1 : 0);

  const handleClearFilters = () => {
    setActiveCategory("todos");
    setDatePreset("todos");
    setCustomStartDate("");
    setCustomEndDate("");
    setSelectedUser("todos");
    setSaleStatus("todos");
    setPaymentMethod("todos");
    setSearchTerm("");
    setPage(1);
    setIsFilterDrawerOpen(false);
  };

  // Exportar registros filtrados em PDF
  const handleExportPdf = async () => {
    if (logs.length === 0) {
      toast.warning("Nenhum registro para exportar no momento.");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Relatório de Registros de Atividade", 14, 18);

      doc.setFontSize(10);
      doc.setTextColor(100);
      const todayStr = new Date().toLocaleString("pt-BR");
      doc.text(
        `Gerado em: ${todayStr} • Total de registros: ${logs.length}`,
        14,
        25,
      );

      const tableData = logs.map((log) => {
        const formatted = formatAuditLog(log);
        const dataStr = new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(log.createdAt));

        return [
          dataStr,
          formatted.categoryLabel,
          formatted.title,
          [formatted.primaryDetail, formatted.secondaryDetail]
            .filter(Boolean)
            .join(" - "),
          log.user?.name || "Sistema",
        ];
      });

      autoTable(doc, {
        startY: 30,
        head: [["Data/Hora", "Categoria", "Ação", "Detalhes", "Responsável"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8, cellPadding: 3 },
      });

      const filename = `registros_zelo_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      toast.success("PDF gerado e baixado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF dos registros.");
    }
  };

  const selectedCategoryLabel =
    CATEGORIES.find((c) => c.id === activeCategory)?.label || "Todos";
  const selectedDateLabel =
    DATE_PRESETS.find((d) => d.id === datePreset)?.label || "Todo o período";

  return (
    <div className="w-full px-3 sm:px-6 space-y-4 max-w-7xl mx-auto">
      {/* Barra de Busca e Filtros Padronizada */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
        <div className="flex items-center gap-2 w-full sm:flex-1">
          <div className="relative w-full sm:w-[40%] sm:max-w-[40%] min-w-0">
            <BoxIcon
              name="search"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder="Buscar por cliente, produto, #venda ou operador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="new-password"
              name="search-table"
              id="search-table"
              className="rounded-xl pl-10 h-11 bg-white dark:bg-card border-border/70 w-full text-sm shadow-xs"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="rounded-xl shrink-0 h-11 px-3 sm:px-4 gap-1.5 text-xs sm:text-sm font-medium border-border/70 bg-white dark:bg-card shadow-xs cursor-pointer"
            aria-label="Abrir filtros">
            <BoxIcon name="slider-alt" className="text-lg" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary text-[11px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={loading || logs.length === 0}
            className="rounded-xl shrink-0 h-11 px-3 sm:px-4 gap-1.5 text-xs sm:text-sm font-medium border-border/70 bg-white dark:bg-card shadow-xs cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900"
            title="Baixar em PDF">
            <BoxIcon name="file-blank" className="text-base" />
            <span className="hidden sm:inline">Baixar PDF</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="h-11 w-11 rounded-xl border border-border/70 bg-white dark:bg-card text-muted-foreground hover:text-foreground shadow-xs cursor-pointer shrink-0"
            title="Atualizar lista">
            <BoxIcon
              name="refresh"
              className={`text-base ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Chips Rápidos de Filtros Ativos (Sem gastar espaço vertical) */}
      {(activeFiltersCount > 0 || searchTerm) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pb-1">
          <span className="text-[11px] text-muted-foreground mr-1">
            Filtros ativos:
          </span>
          {activeCategory !== "todos" && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              {selectedCategoryLabel}
              <button
                onClick={() => setActiveCategory("todos")}
                className="hover:opacity-75">
                <BoxIcon name="x" className="text-xs" />
              </button>
            </span>
          )}
          {datePreset !== "todos" && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              {selectedDateLabel}
              <button
                onClick={() => setDatePreset("todos")}
                className="hover:opacity-75">
                <BoxIcon name="x" className="text-xs" />
              </button>
            </span>
          )}
          {selectedUser !== "todos" && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              Operador
              <button
                onClick={() => setSelectedUser("todos")}
                className="hover:opacity-75">
                <BoxIcon name="x" className="text-xs" />
              </button>
            </span>
          )}
          {saleStatus !== "todos" && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              {saleStatus === "PAGO"
                ? "Pagas"
                : saleStatus === "PENDENTE"
                  ? "Pendentes"
                  : "Canceladas"}
              <button
                onClick={() => setSaleStatus("todos")}
                className="hover:opacity-75">
                <BoxIcon name="x" className="text-xs" />
              </button>
            </span>
          )}
          {paymentMethod !== "todos" && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              {PAYMENT_METHOD_NAMES[paymentMethod] || paymentMethod}
              <button
                onClick={() => setPaymentMethod("todos")}
                className="hover:opacity-75">
                <BoxIcon name="x" className="text-xs" />
              </button>
            </span>
          )}
          {searchTerm && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-medium">
              &quot;{searchTerm}&quot;
              <button
                onClick={() => setSearchTerm("")}
                className="hover:opacity-75">
                <BoxIcon name="x" className="text-xs" />
              </button>
            </span>
          )}
          <button
            onClick={handleClearFilters}
            className="text-[11px] text-muted-foreground hover:text-red-500 underline ml-1 cursor-pointer">
            Limpar tudo
          </button>
        </div>
      )}

      {/* Paginação unificada acima da listagem */}
      <TablePagination
        pageIndex={page - 1}
        pageSize={40}
        totalFiltered={totalCount}
        pageCount={totalPages}
        canPreviousPage={page > 1 && !loading}
        canNextPage={page < totalPages && !loading}
        onPreviousPage={() => fetchLogs(page - 1)}
        onNextPage={() => fetchLogs(page + 1)}
      />

      {/* Lista Principal de Registros (Ocupa 100% da visualização livre) */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 border-b border-border/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Histórico de Atividades
            </CardTitle>
            <CardDescription className="text-xs">
              {totalCount === 0
                ? "Nenhum registro"
                : `${totalCount} registro${totalCount > 1 ? "s" : ""} no total`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-14 text-muted-foreground gap-2">
              <BoxIcon
                name="loader-alt"
                className="animate-spin text-3xl text-primary"
              />
              <span className="text-xs">Carregando atividades...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-2">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-xl text-muted-foreground">
                <BoxIcon name="info-circle" />
              </div>
              <p className="font-semibold text-sm text-foreground">
                Nenhuma atividade encontrada
              </p>
              <p className="text-xs max-w-sm">
                Tente ajustar os filtros ou pesquisar por outro termo para
                localizar registros.
              </p>
              {(activeFiltersCount > 0 || searchTerm) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="mt-2 text-xs">
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {logs.map((log) => {
                const formatted = formatAuditLog(log);
                const dateObj = new Date(log.createdAt);
                const formattedDate = new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(dateObj);

                return (
                  <div
                    key={log.id}
                    className="p-3.5 sm:p-4 hover:bg-muted/30 transition-colors space-y-1">
                    {/* Conteúdo Humanizado */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs sm:text-sm text-foreground">
                            {formatted.title}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded-full border font-medium ${formatted.badgeClass}`}>
                            {formatted.categoryLabel}
                          </span>
                        </div>

                        <span className="text-[10px] sm:text-[11px] text-muted-foreground whitespace-nowrap ml-auto">
                          {formattedDate}
                        </span>
                      </div>

                      {/* Detalhe Principal e Secundário */}
                      <div className="text-xs text-foreground/90 font-medium">
                        {formatted.primaryDetail}
                      </div>

                      {formatted.secondaryDetail && (
                        <div className="text-[11px] sm:text-xs text-muted-foreground">
                          {formatted.secondaryDetail}
                        </div>
                      )}

                      {/* Tags & Responsável */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {formatted.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] px-2 py-0.2 rounded-md border font-medium ${
                              t.variant === "success"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : t.variant === "danger"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                  : t.variant === "warning"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                    : "bg-muted text-muted-foreground border-border"
                            }`}>
                            {t.text}
                          </span>
                        ))}

                        <span className="text-[10px] sm:text-[11px] text-muted-foreground ml-auto flex items-center gap-1">
                          <BoxIcon name="user" className="text-xs" />
                          <span>por {log.user?.name || "Sistema"}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FILTROS HÍBRIDOS: Drawer no celular e Dialog no PC */}
      {(() => {
        const filterFields = (
          <div className="space-y-4 py-2">
            {/* Categoria */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Categoria
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => {
                  const isSel = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors text-left ${
                        isSel
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border"
                      }`}>
                      <BoxIcon name={cat.icon} className="text-sm shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Período */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Período
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

            {/* Operador / Responsável */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Quem realizou a ação
              </label>
              <Select
                value={selectedUser}
                onValueChange={(val) => {
                  if (val) setSelectedUser(val);
                }}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="Todos os operadores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">
                    Todos os operadores
                  </SelectItem>
                  {storeUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtros de Vendas (Status e Pagamento) */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <label className="text-xs font-semibold text-foreground block">
                Filtros específicos de Vendas
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Status da Venda
                  </span>
                  <Select
                    value={saleStatus}
                    onValueChange={(val) => {
                      if (val) setSaleStatus(val);
                    }}>
                    <SelectTrigger className="h-9 text-xs w-full">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos" className="text-xs">
                        Todos os status
                      </SelectItem>
                      <SelectItem value="PAGO" className="text-xs">
                        Vendas Pagas
                      </SelectItem>
                      <SelectItem value="PENDENTE" className="text-xs">
                        Vendas Pendentes / Fiado
                      </SelectItem>
                      <SelectItem value="CANCELADO" className="text-xs">
                        Vendas Canceladas
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Forma de Pagamento
                  </span>
                  <Select
                    value={paymentMethod}
                    onValueChange={(val) => {
                      if (val) setPaymentMethod(val);
                    }}>
                    <SelectTrigger className="h-9 text-xs w-full">
                      <SelectValue placeholder="Todas as formas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos" className="text-xs">
                        Todas as formas
                      </SelectItem>
                      {Object.entries(PAYMENT_METHOD_NAMES).map(
                        ([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
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
                    Filtrar Registros de Atividade
                  </DrawerTitle>
                  <DrawerDescription className="text-xs text-muted-foreground text-center">
                    Personalize a visualização por categoria, período ou
                    operador.
                  </DrawerDescription>
                </DrawerHeader>

                {filterFields}

                <div className="shrink-0 pt-3 mt-4 border-t border-border w-full flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      setIsFilterDrawerOpen(false);
                      setPage(1);
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
                  Filtrar Registros de Atividade
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Personalize a visualização por categoria, período ou operador.
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
                    setPage(1);
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
