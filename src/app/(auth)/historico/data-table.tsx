"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SaleStatusBadge } from "@/components/sale-status-badge";
import { Separator } from "@/components/ui/separator";
import { TablePagination } from "@/components/ui/table-pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableBulkActions } from "@/components/ui/data-table-bulk-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Combobox } from "@/components/ui/combobox";
import { useIsMobile } from "@/hooks/use-mobile";
import { currency, dateTime } from "@/lib/format";
import { textIncludes } from "@/lib/search";
import { cn } from "@/lib/utils";
import { getPaymentLabel, PaymentMethod, type Sale, SaleStatus } from "@/types";
import { useSettingsStore } from "@/store/useSettingsStore";

export function SalesDataTable({
  columns,
  data,
  onView,
  onVoucher,
  onEdit,
  onCancel,
  onBulkCancel,
  onBulkExport,
}: {
  columns: ColumnDef<Sale>[];
  data: Sale[];
  onView?: (s: Sale) => void;
  onVoucher?: (s: Sale) => void;
  onEdit?: (s: Sale) => void;
  onCancel?: (s: Sale) => void;
  onBulkCancel?: (sales: Sale[]) => Promise<void>;
  onBulkExport?: (sales: Sale[]) => void;
}) {
  const isMobile = useIsMobile();
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<
    "all" | "today" | "7days" | "30days" | "thisMonth" | "custom"
  >("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [showBulkCancelConfirm, setShowBulkCancelConfirm] = useState(false);
  const [isBulkCancelling, setIsBulkCancelling] = useState(false);

  const salesSettings = useSettingsStore((s) => s.sales);
  const paymentMethodsList = salesSettings?.paymentMethods?.length
    ? salesSettings.paymentMethods
    : Object.values(PaymentMethod);

  // Filtra os dados com base nos filtros selecionados (Itens #18, #19, #20)
  const filteredData = useMemo(() => {
    return data.filter((sale) => {
      // 1. Status da Venda (Item #20)
      if (statusFilter !== "all" && sale.status !== statusFilter) {
        return false;
      }

      // 2. Método de Pagamento (Item #18)
      if (paymentFilter !== "all" && sale.paymentMethod !== paymentFilter) {
        return false;
      }

      // 3. Período / Datas (Item #19)
      const saleTime = new Date(sale.date).getTime();
      const saleDate = new Date(sale.date);

      if (datePreset === "today") {
        const today = new Date();
        if (
          saleDate.getDate() !== today.getDate() ||
          saleDate.getMonth() !== today.getMonth() ||
          saleDate.getFullYear() !== today.getFullYear()
        ) {
          return false;
        }
      } else if (datePreset === "7days") {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (saleTime < cutoff) return false;
      } else if (datePreset === "30days") {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (saleTime < cutoff) return false;
      } else if (datePreset === "thisMonth") {
        const today = new Date();
        if (
          saleDate.getMonth() !== today.getMonth() ||
          saleDate.getFullYear() !== today.getFullYear()
        ) {
          return false;
        }
      } else if (datePreset === "custom") {
        if (startDate) {
          const start = new Date(`${startDate}T00:00:00`).getTime();
          if (saleTime < start) return false;
        }
        if (endDate) {
          const end = new Date(`${endDate}T23:59:59`).getTime();
          if (saleTime > end) return false;
        }
      }

      return true;
    });
  }, [data, statusFilter, paymentFilter, datePreset, startDate, endDate]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (paymentFilter !== "all") count++;
    if (datePreset !== "all") count++;
    return count;
  }, [statusFilter, paymentFilter, datePreset]);

  const clearAllFilters = () => {
    setStatusFilter("all");
    setPaymentFilter("all");
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
    setGlobalFilter("");
  };

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: (row, _id, value) => {
      if (!value) return true;
      const clientName = row.original.clientName || "Consumidor Final";
      return textIncludes(clientName, value);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  useEffect(() => {
    table.setPageSize(isMobile ? 5 : 8);
  }, [isMobile, table]);

  useEffect(() => {
    table.setPageIndex(0);
  }, [
    globalFilter,
    statusFilter,
    paymentFilter,
    datePreset,
    startDate,
    endDate,
    table,
  ]);

  const rows = table.getRowModel().rows;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  return (
    <div>
      {/* Barra de Busca e Filtros */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
        <div className="flex items-center gap-2 w-full sm:flex-1">
          <div className="relative w-full sm:w-[40%] sm:max-w-[40%] min-w-0">
            <BoxIcon
              name="search"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder="Buscar por cliente..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              autoComplete="new-password"
              name="search-table"
              id="search-table"
              className="rounded-xl pl-10 h-11 bg-white dark:bg-card border-border/70 w-full text-sm shadow-xs"
            />
          </div>

          {/* Botão de Filtros (Popover) */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
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
              }
            />
            <PopoverContent align="end" className="w-80 p-4 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold text-sm">Filtros de Vendas</span>
              </div>

              {/* Item #20: Filtro por Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant={statusFilter === "all" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setStatusFilter("all")}>
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant={
                      statusFilter === SaleStatus.PAGO ? "default" : "outline"
                    }
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setStatusFilter(SaleStatus.PAGO)}>
                    Pagas
                  </Button>
                  <Button
                    type="button"
                    variant={
                      statusFilter === SaleStatus.PENDENTE
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setStatusFilter(SaleStatus.PENDENTE)}>
                    Pendentes
                  </Button>
                  <Button
                    type="button"
                    variant={
                      statusFilter === SaleStatus.CANCELADO
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setStatusFilter(SaleStatus.CANCELADO)}>
                    Canceladas
                  </Button>
                </div>
              </div>

              {/* Item #18: Filtro por Forma de Pagamento */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Forma de Pagamento
                </Label>
                <Combobox
                  value={paymentFilter}
                  onValueChange={(val) => setPaymentFilter(val || "all")}
                  options={[
                    { value: "all", label: "Todas as formas" },
                    ...paymentMethodsList.map((pm) => ({
                      value: pm,
                      label: getPaymentLabel(pm),
                    })),
                  ]}
                  placeholder="Todas as formas"
                  searchPlaceholder="Buscar forma..."
                  size="sm"
                  triggerClassName="w-full h-8 rounded-md text-xs justify-between"
                />
              </div>

              {/* Item #19: Filtro por Período */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Período
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant={datePreset === "all" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset("all")}>
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === "today" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset("today")}>
                    Hoje
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === "7days" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset("7days")}>
                    7 dias
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === "30days" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset("30days")}>
                    30 dias
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === "thisMonth" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset("thisMonth")}>
                    Este mês
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === "custom" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset("custom")}>
                    Personalizado
                  </Button>
                </div>

                {datePreset === "custom" && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-1">
                        Início
                      </span>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-1">
                        Fim
                      </span>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs font-medium"
                  onClick={clearAllFilters}
                  disabled={activeFiltersCount === 0}>
                  Limpar dados
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Paginação Mobile (acima da listagem) */}
      <div className="md:hidden">
        <TablePagination
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalFiltered={totalFiltered}
          pageCount={table.getPageCount()}
          canPreviousPage={table.getCanPreviousPage()}
          canNextPage={table.getCanNextPage()}
          onPreviousPage={() => table.previousPage()}
          onNextPage={() => table.nextPage()}
        />
      </div>

      {/* Selecionar todos no mobile */}
      <div className="md:hidden flex items-center justify-between px-2 mb-2 text-xs text-muted-foreground">
        <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
          />
          <span>Selecionar todas as vendas da página</span>
        </label>
        {table.getSelectedRowModel().rows.length > 0 && (
          <span className="font-semibold text-primary">
            {table.getSelectedRowModel().rows.length} selecionada{table.getSelectedRowModel().rows.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Listagem Mobile com visual de tabela/card */}
      <div className="md:hidden rounded-2xl bg-white dark:bg-card border border-border/70 shadow-xs divide-y divide-border/50 overflow-hidden mb-6">
        {rows.length ? (
          rows.map((row) => {
            const sale = row.original;
            const isCancelled = sale.status === "CANCELADO";
            const hasMobileActions = onView || onVoucher || onEdit || onCancel;

            return (
              <div
                key={row.id}
                className="p-3.5 sm:p-4 flex items-center gap-3.5 transition-colors hover:bg-muted/20">
                {/* Dados da Venda */}
                <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground text-sm line-clamp-1 truncate leading-tight">
                      {sale.clientName || "Consumidor Final"}
                    </span>
                    <SaleStatusBadge
                      status={sale.status}
                      className="shrink-0 text-[10px] px-1.5 h-4"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{getPaymentLabel(sale.paymentMethod)}</span>
                    <span className="text-muted-foreground/40 font-light select-none">
                      ·
                    </span>
                    <span>{dateTime(sale.date)}</span>
                  </div>

                  <div className="mt-0.5">
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        isCancelled
                          ? "line-through text-muted-foreground opacity-70"
                          : "text-foreground",
                      )}>
                      {currency(sale.total)}
                    </span>
                  </div>
                </div>

                {/* Menu de Ações (3 pontos) */}
                {hasMobileActions && (
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 rounded-lg cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Ações da venda">
                          <BoxIcon
                            name="dots-vertical-rounded"
                            className="text-lg"
                          />
                        </Button>
                      }
                    />
                    <PopoverContent className="w-52 p-1.5" align="end">
                      {onView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onView(sale);
                          }}>
                          <BoxIcon name="show" className="mr-2 text-base" />
                          Visualizar venda
                        </Button>
                      )}

                      {onVoucher && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onVoucher(sale);
                          }}>
                          <BoxIcon name="receipt" className="mr-2 text-base" />
                          Ver comprovante
                        </Button>
                      )}

                      {!isCancelled && onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(sale);
                          }}>
                          <BoxIcon name="pencil" className="mr-2 text-base" />
                          Editar venda
                        </Button>
                      )}

                      {!isCancelled && onCancel && (
                        <>
                          <Separator className="my-1" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-full justify-start px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCancel(sale);
                            }}>
                            <BoxIcon
                              name="x-circle"
                              className="mr-2 text-base"
                            />
                            Cancelar venda
                          </Button>
                        </>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma venda encontrada.
          </div>
        )}
      </div>

      {/* Tabela de Vendas Desktop */}
      <div className="hidden md:block">
        <Card className="border-border/70 p-0">
          <CardContent className="p-0">
            <div className="w-full overflow-x-hidden sm:overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={
                            header.column.id === "clientName" ||
                            header.column.id === "actions"
                              ? undefined
                              : "hidden sm:table-cell"
                          }>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {rows.length ? (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={
                              cell.column.id === "clientName" ||
                              cell.column.id === "actions"
                                ? undefined
                                : "hidden sm:table-cell"
                            }>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-sm text-muted-foreground">
                        Nenhuma venda encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Paginação Desktop (abaixo da tabela) */}
        <div className="hidden md:block mt-4">
          <TablePagination
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalFiltered={totalFiltered}
            pageCount={table.getPageCount()}
            canPreviousPage={table.getCanPreviousPage()}
            canNextPage={table.getCanNextPage()}
            onPreviousPage={() => table.previousPage()}
            onNextPage={() => table.nextPage()}
          />
        </div>
      </div>
      {/* Barra de Ações em Massa */}
      <DataTableBulkActions
        selectedCount={table.getSelectedRowModel().rows.length}
        onClearSelection={() => table.resetRowSelection()}
        actions={[
          ...(onBulkExport
            ? [
                {
                  label: "Exportar",
                  icon: "download",
                  onClick: () => {
                    const selected = table.getSelectedRowModel().rows.map((r) => r.original);
                    onBulkExport(selected);
                  },
                },
              ]
            : []),
          ...(onBulkCancel
            ? [
                {
                  label: "Cancelar Vendas",
                  icon: "x-circle",
                  variant: "destructive" as const,
                  onClick: () => setShowBulkCancelConfirm(true),
                },
              ]
            : []),
        ]}
      />

      {/* Confirmação de Cancelamento em Massa */}
      <AlertDialog open={showBulkCancelConfirm} onOpenChange={setShowBulkCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancelar {table.getSelectedRowModel().rows.length} venda(s) selecionada(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação cancelará as vendas selecionadas elegíveis e restabelecerá as quantidades dos produtos no estoque automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkCancelling}>Fechar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
              disabled={isBulkCancelling}
              onClick={async (e) => {
                e.preventDefault();
                setIsBulkCancelling(true);
                try {
                  const selected = table.getSelectedRowModel().rows.map((r) => r.original);
                  await onBulkCancel?.(selected);
                  table.resetRowSelection();
                  setShowBulkCancelConfirm(false);
                } finally {
                  setIsBulkCancelling(false);
                }
              }}
            >
              {isBulkCancelling ? "Cancelando..." : "Confirmar Cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
