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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { ProductThumb } from "@/components/product-thumb";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isProductLowStock, type ProductFrontend } from "./columns";

interface ProductsDataTableProps {
  columns: ColumnDef<ProductFrontend>[];
  data: ProductFrontend[];
  categories: string[];
  onCreateClick: () => void;
  onConfigClick?: () => void;
  onImportClick?: () => void;
  onExportClick?: () => void;
  isExporting?: boolean;
  onStock?: (product: ProductFrontend) => void;
  onEdit?: (product: ProductFrontend) => void;
  onDelete?: (product: ProductFrontend) => void;
  onToggleActive?: (product: ProductFrontend) => void;
  trackStock?: boolean;
  globalLowStockThreshold?: number;
  categoryLowStockThresholds?: Record<string, number>;
  canStock?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function ProductsDataTable({
  columns,
  data,
  categories,
  onCreateClick,
  onConfigClick,
  onImportClick,
  onExportClick,
  isExporting,
  onStock,
  onEdit,
  onDelete,
  onToggleActive,
  trackStock = false,
  globalLowStockThreshold = 5,
  categoryLowStockThresholds = {},
  canStock = false,
  canEdit = false,
  canDelete = false,
}: ProductsDataTableProps) {
  const isMobile = useIsMobile();
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _id, value) => {
      const term = String(value).trim().toLowerCase();
      if (!term) return true;
      const p = row.original;

      return Boolean(
        p.name.toLowerCase().includes(term) ||
        p.category?.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term),
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  const categoryFilter =
    (table.getColumn("category")?.getFilterValue() as string) ?? "Todas";

  useEffect(() => {
    table
      .getColumn("active")
      ?.setFilterValue(statusFilter === "Todos" ? undefined : statusFilter);
  }, [statusFilter, table]);

  useEffect(() => {
    table.setPageSize(isMobile ? 5 : 8);
  }, [isMobile, table]);

  useEffect(() => {
    table.setPageIndex(0);
  }, [globalFilter, categoryFilter, statusFilter, table]);

  const rows = table.getRowModel().rows;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  const activeFiltersCount =
    (categoryFilter !== "Todas" ? 1 : 0) + (statusFilter !== "Todos" ? 1 : 0);

  const clearAllFilters = () => {
    setStatusFilter("Todos");
    table.getColumn("category")?.setFilterValue(undefined);
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
              placeholder="Buscar produtos..."
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
                  variant={activeFiltersCount > 0 ? "default" : "outline"}
                  className="rounded-xl shrink-0 h-11 px-3 sm:px-4 gap-1.5 text-xs sm:text-sm font-medium border-border/70 bg-white dark:bg-card shadow-xs cursor-pointer"
                  aria-label="Abrir filtros"
                >
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
                <span className="font-semibold text-sm">Filtros de Produtos</span>
              </div>

              {/* Status de Cadastro */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Status de Cadastro
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant={statusFilter === "Todos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setStatusFilter("Todos")}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant={statusFilter === "Ativos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-emerald-600 dark:text-emerald-400"
                    onClick={() => setStatusFilter("Ativos")}
                  >
                    Ativos
                  </Button>
                  <Button
                    type="button"
                    variant={statusFilter === "Inativos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => setStatusFilter("Inativos")}
                  >
                    Inativos
                  </Button>
                </div>
              </div>

              {/* Categorias */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Categorias
                </Label>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    table.getColumn("category")?.setFilterValue(val === "Todas" ? undefined : val);
                  }}
                  className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="Todas">Todas as categorias</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs font-medium"
                  onClick={clearAllFilters}
                  disabled={activeFiltersCount === 0}
                >
                  Limpar dados
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onConfigClick && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onConfigClick}
              className="rounded-full hidden sm:flex shrink-0 gap-1.5 cursor-pointer"
            >
              <BoxIcon name="cog" className="text-base" />
              <span>Configurações</span>
            </Button>
          )}

          {onImportClick && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onImportClick}
              className="rounded-full hidden sm:flex shrink-0 gap-1.5 cursor-pointer"
            >
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
              className="rounded-full hidden sm:flex shrink-0 gap-1.5 cursor-pointer"
            >
              <BoxIcon name="download" className="text-base" />
              <span>{isExporting ? "Exportando..." : "Exportar"}</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={onCreateClick}
            size="sm"
            className="rounded-full hidden sm:flex shrink-0 gap-1 cursor-pointer"
          >
            <BoxIcon name="plus" className="text-base" />
            <span>Adicionar</span>
          </Button>
        </div>
      </div>

      {/* Paginação Mobile (acima da listagem) */}
      <div className="flex md:hidden items-center justify-between gap-2 mb-3 px-0.5">
        <div className="text-sm font-medium text-muted-foreground">
          {totalFiltered === 0
            ? "0 de 0"
            : `${pageIndex * pageSize + 1}–${Math.min(
                (pageIndex + 1) * pageSize,
                totalFiltered,
              )} de ${totalFiltered}`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-xl border border-border/70 bg-white dark:bg-card text-foreground hover:bg-muted cursor-pointer"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            aria-label="Página anterior"
          >
            <BoxIcon name="chevron-left" className="text-lg" />
          </Button>
          <div className="text-sm tabular-nums text-muted-foreground font-medium px-1">
            {pageIndex + 1} / {table.getPageCount() || 1}
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-xl border border-border/70 bg-white dark:bg-card text-foreground hover:bg-muted cursor-pointer"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            aria-label="Próxima página"
          >
            <BoxIcon name="chevron-right" className="text-lg" />
          </Button>
        </div>
      </div>

      {/* Listagem Mobile com visual de tabela/card */}
      <div className="md:hidden rounded-2xl bg-white dark:bg-card border border-border/70 shadow-xs divide-y divide-border/50 overflow-hidden mb-6">
        {rows.length ? (
          rows.map((row) => {
            const product = row.original;
            const stockNum = Number(product.stock ?? 0);
            const isNegative = stockNum < 0;
            const isLow =
              stockNum === 0 ||
              isProductLowStock(
                product,
                globalLowStockThreshold,
                categoryLowStockThresholds,
              );

            const hasMobileRowActions = canStock || canEdit || canDelete;

            return (
              <div
                key={row.id}
                className="p-3.5 sm:p-4 flex items-center gap-3.5 transition-colors hover:bg-muted/20"
              >
                {/* Imagem do Produto */}
                <ProductThumb
                  name={product.name}
                  image={product.image}
                  forceShow
                  className="h-14 w-14 rounded-2xl shrink-0 text-xl"
                />

                {/* Dados do Produto */}
                <div className="min-w-0 flex-1 flex flex-col justify-center gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground text-sm line-clamp-1 truncate leading-tight">
                      {product.name}
                    </span>
                    {!product.active && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-muted-foreground/40 text-muted-foreground bg-muted/40 text-[10px] px-1.5 h-4"
                      >
                        Inativo
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {trackStock && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums",
                          isNegative
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                            : isLow
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            isNegative
                              ? "bg-rose-500"
                              : isLow
                              ? "bg-amber-500"
                              : "bg-emerald-500",
                          )}
                        />
                        {stockNum} un.
                      </span>
                    )}

                    {trackStock && (
                      <span className="text-muted-foreground/40 font-light select-none">
                        |
                      </span>
                    )}

                    <span className="text-muted-foreground font-medium">
                      {currency(product.salePrice)}
                    </span>
                  </div>
                </div>

                {/* Menu de Ações (3 pontos) */}
                {hasMobileRowActions && (
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 rounded-lg cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Ações do produto"
                        >
                          <BoxIcon
                            name="dots-vertical-rounded"
                            className="text-lg"
                          />
                        </Button>
                      }
                    />
                    <PopoverContent className="w-52 p-1.5" align="end">
                      {canStock && onStock && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStock(product);
                          }}
                        >
                          <BoxIcon name="package" className="mr-2 text-base" />
                          Entrada de estoque
                        </Button>
                      )}

                      {canEdit && onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(product);
                          }}
                        >
                          <BoxIcon name="pencil" className="mr-2 text-base" />
                          Editar produto
                        </Button>
                      )}

                      {canEdit && onToggleActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-9 w-full justify-start px-3 text-xs cursor-pointer",
                            !product.active
                              ? "text-emerald-600 hover:text-emerald-700"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleActive(product);
                          }}
                        >
                          <BoxIcon
                            name="power-off"
                            className="mr-2 text-base"
                          />
                          {product.active ?? true
                            ? "Desativar produto"
                            : "Ativar produto"}
                        </Button>
                      )}

                      {canStock && canEdit && canDelete && (
                        <Separator className="my-1" />
                      )}

                      {canDelete && onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-xs text-destructive hover:text-destructive cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(product);
                          }}
                        >
                          <BoxIcon name="trash" className="mr-2 text-base" />
                          Remover produto
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );
          })
        ) : (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </div>
        )}
      </div>

      {/* Visualização em Tabela para Desktop */}
      <div className="hidden md:block">
        <Card className="border-border/70 p-0">
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => (
                        <TableHead key={header.id}>
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
                          <TableCell key={cell.id}>
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
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        Nenhum produto encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Paginação Desktop (abaixo da tabela) */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {totalFiltered === 0 ? 0 : pageIndex * pageSize + 1}–
            {Math.min((pageIndex + 1) * pageSize, totalFiltered)} de{" "}
            {totalFiltered}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 cursor-pointer"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              aria-label="Página anterior"
            >
              <BoxIcon name="chevron-left" className="text-base" />
            </Button>
            <div className="text-xs tabular-nums text-muted-foreground">
              {pageIndex + 1} / {table.getPageCount() || 1}
            </div>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 cursor-pointer"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              aria-label="Próxima página"
            >
              <BoxIcon name="chevron-right" className="text-base" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
