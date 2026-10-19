"use client";

import { useEffect, useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { textIncludes } from "@/lib/search";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TablePagination } from "@/components/ui/table-pagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { currency } from "@/lib/format";
import { maskPhone } from "@/lib/masks";
import type { ClientTableData } from "./columns";

export function ClientsDataTable({
  columns,
  data,
  onCreateClick,
  canAdd,
  onImportClick,
  onExportClick,
  isExporting,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
  canEdit,
  canDelete,
}: {
  columns: ColumnDef<ClientTableData>[];
  data: ClientTableData[];
  onCreateClick: () => void;
  canAdd?: boolean;
  onImportClick?: () => void;
  onExportClick?: () => void;
  isExporting?: boolean;
  onView?: (client: ClientTableData) => void;
  onEdit?: (client: ClientTableData) => void;
  onDelete?: (client: ClientTableData) => void;
  onToggleActive?: (client: ClientTableData) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const isMobile = useIsMobile();
  const [globalFilter, setGlobalFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [pendingFilter, setPendingFilter] = useState("Todos");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: (row, _id, value) => {
      if (!value) return true;
      const c = row.original;
      return (
        textIncludes(c.name, value) ||
        textIncludes(c.phone, value)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  useEffect(() => {
    table
      .getColumn("active")
      ?.setFilterValue(activeFilter === "Todos" ? undefined : activeFilter);
  }, [activeFilter, table]);

  useEffect(() => {
    table
      .getColumn("pendingAmount")
      ?.setFilterValue(pendingFilter === "Todos" ? undefined : pendingFilter);
  }, [pendingFilter, table]);

  useEffect(() => {
    table.setPageSize(isMobile ? 5 : 8);
  }, [isMobile, table]);

  useEffect(() => {
    table.setPageIndex(0);
  }, [globalFilter, activeFilter, pendingFilter, table]);

  const rows = table.getRowModel().rows;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  const activeFiltersCount =
    (activeFilter !== "Todos" ? 1 : 0) + (pendingFilter !== "Todos" ? 1 : 0);

  const clearAllFilters = () => {
    setActiveFilter("Todos");
    setPendingFilter("Todos");
    setGlobalFilter("");
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
        <div className="flex items-center gap-2 w-full sm:flex-1">
          <div className="relative w-full sm:w-[40%] sm:max-w-[40%] min-w-0">
            <BoxIcon
              name="search"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder="Buscar clientes..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              autoComplete="new-password"
              name="search-table"
              id="search-table"
              className="rounded-xl pl-10 h-11 bg-white dark:bg-card border-border/70 w-full text-sm shadow-xs"
            />
          </div>
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
                <span className="font-semibold text-sm">
                  Filtros de Clientes
                </span>
              </div>

              {/* Status de Cadastro */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Status de Cadastro
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant={activeFilter === "Todos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setActiveFilter("Todos")}>
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant={activeFilter === "Ativos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-emerald-400"
                    onClick={() => setActiveFilter("Ativos")}>
                    Ativos
                  </Button>
                  <Button
                    type="button"
                    variant={
                      activeFilter === "Inativos" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => setActiveFilter("Inativos")}>
                    Inativos
                  </Button>
                </div>
              </div>

              {/* Pendências Financeiras */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Pendências Financeiras
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant={pendingFilter === "Todos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setPendingFilter("Todos")}>
                    Todas
                  </Button>
                  <Button
                    type="button"
                    variant={
                      pendingFilter === "Pendentes" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-8 text-xs text-amber-600 dark:text-amber-400"
                    onClick={() => setPendingFilter("Pendentes")}>
                    Pendentes
                  </Button>
                  <Button
                    type="button"
                    variant={pendingFilter === "Pagos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => setPendingFilter("Pagos")}>
                    Em dia
                  </Button>
                </div>
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

        <div className="flex items-center gap-2 shrink-0">
          {onImportClick && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onImportClick}
              className="rounded-full hidden sm:flex shrink-0 gap-1.5 cursor-pointer">
              <BoxIcon name="upload" className="text-base" />
              <span>Importar</span>
            </Button>
          )}

          {onExportClick && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExportClick}
              disabled={isExporting}
              className="rounded-full hidden sm:flex shrink-0 gap-1.5 cursor-pointer">
              <BoxIcon name="download" className="text-base" />
              <span>{isExporting ? "Exportando..." : "Exportar"}</span>
            </Button>
          )}

          {canAdd !== false && (
            <Button
              type="button"
              onClick={onCreateClick}
              size="sm"
              className="rounded-full hidden sm:flex shrink-0 gap-1 cursor-pointer">
              <BoxIcon name="plus" className="text-base" />
              <span>Adicionar</span>
            </Button>
          )}
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

      {/* Listagem Mobile com visual de tabela/card */}
      <div className="md:hidden rounded-2xl bg-white dark:bg-card border border-border/70 shadow-xs divide-y divide-border/50 overflow-hidden mb-6">
        {rows.length ? (
          rows.map((row) => {
            const client = row.original;
            const isProtected = client.name === "Consumidor Final";
            const hasMobileActions =
              onView || onEdit || onDelete || onToggleActive;

            return (
              <div
                key={row.id}
                className="p-3.5 sm:p-4 flex items-center gap-3.5 transition-colors hover:bg-muted/20">
                {/* Dados do Cliente */}
                <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground text-sm line-clamp-1 truncate leading-tight">
                      {client.name}
                    </span>
                    {!client.active && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-muted-foreground/40 text-muted-foreground bg-muted/40 text-[10px] px-1.5 h-4">
                        Inativo
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {client.phone ? (
                      <span>{maskPhone(client.phone)}</span>
                    ) : (
                      <span>Sem telefone</span>
                    )}
                    <span className="text-muted-foreground/40 font-light select-none">
                      |
                    </span>
                    <span className="font-medium">
                      {currency(client.totalSpent)}
                    </span>
                  </div>

                  {client.pendingAmount > 0 && (
                    <div className="mt-0.5">
                      <Badge
                        variant="destructive"
                        className="text-[10px] px-1.5 py-0 h-4 font-semibold">
                        Pendente: {currency(client.pendingAmount)}
                      </Badge>
                    </div>
                  )}
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
                          aria-label="Ações do cliente">
                          <BoxIcon
                            name="dots-vertical-rounded"
                            className="text-lg"
                          />
                        </Button>
                      }
                    />
                    <PopoverContent className="w-48 p-1.5" align="end">
                      {onView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onView(client);
                          }}>
                          <BoxIcon name="show" className="mr-2 text-base" />
                          Visualizar
                        </Button>
                      )}

                      {canEdit && onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(client);
                          }}>
                          <BoxIcon name="pencil" className="mr-2 text-base" />
                          Editar
                        </Button>
                      )}

                      {canEdit && onToggleActive && !isProtected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleActive(client);
                          }}>
                          <BoxIcon
                            name="power-off"
                            className="mr-2 text-base"
                          />
                          {client.active ? "Desativar" : "Ativar"}
                        </Button>
                      )}

                      {canDelete && onDelete && !isProtected && (
                        <>
                          <Separator className="my-1" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-full justify-start px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(client);
                            }}>
                            <BoxIcon name="trash" className="mr-2 text-base" />
                            Excluir
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
            Nenhum cliente encontrado.
          </div>
        )}
      </div>

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
                            header.column.id === "name" ||
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
                              cell.column.id === "name" ||
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
                        Nenhum cliente encontrado.
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
    </div>
  );
}
