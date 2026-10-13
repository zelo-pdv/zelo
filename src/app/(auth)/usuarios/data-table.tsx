"use client";

import { useEffect, useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { UserTableData } from "./columns";
import type { AppUser } from "./page";

export function UsersDataTable({
  columns,
  data,
  groups,
  onCreateClick,
  onExportClick,
  isExporting,
  onEdit,
  onChangePassword,
  onToggleActive,
  onDelete,
  currentUserId,
}: {
  columns: ColumnDef<UserTableData>[];
  data: UserTableData[];
  groups: { id: string; name: string }[];
  onCreateClick: () => void;
  onExportClick?: () => void;
  isExporting?: boolean;
  onEdit?: (u: AppUser) => void;
  onChangePassword?: (u: AppUser) => void;
  onToggleActive?: (id: string) => void;
  onDelete?: (u: AppUser) => void;
  currentUserId?: string;
}) {
  const isMobile = useIsMobile();
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [groupFilter, setGroupFilter] = useState("Todos");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: (row, _id, value) => {
      const term = String(value).trim().toLowerCase();
      if (!term) return true;
      const u = row.original;
      return (
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  // Sincroniza os filtros com as colunas da tabela
  useEffect(() => {
    table
      .getColumn("groupLabel")
      ?.setFilterValue(groupFilter === "Todos" ? undefined : groupFilter);
    table
      .getColumn("active")
      ?.setFilterValue(
        statusFilter === "Todos" ? undefined : statusFilter === "Ativo",
      );
  }, [statusFilter, groupFilter, table]);

  useEffect(() => {
    table.setPageSize(isMobile ? 5 : 10);
  }, [isMobile, table]);

  useEffect(() => {
    table.setPageIndex(0);
  }, [globalFilter, statusFilter, groupFilter, table]);

  const rows = table.getRowModel().rows;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const activeFiltersCount =
    (statusFilter !== "Todos" ? 1 : 0) + (groupFilter !== "Todos" ? 1 : 0);

  const clearAllFilters = () => {
    setStatusFilter("Todos");
    setGroupFilter("Todos");
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
              placeholder="Buscar usuários..."
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
                <span className="font-semibold text-sm">Filtros de Usuários</span>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Status
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
                    variant={statusFilter === "Ativo" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-emerald-600 dark:text-emerald-400"
                    onClick={() => setStatusFilter("Ativo")}
                  >
                    Ativo
                  </Button>
                  <Button
                    type="button"
                    variant={statusFilter === "Inativo" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => setStatusFilter("Inativo")}
                  >
                    Inativo
                  </Button>
                </div>
              </div>

              {/* Grupo de Acesso */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Grupo de Acesso
                </Label>
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="Todos">Todos os grupos</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
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

      {/* Paginação unificada acima da listagem */}
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

      {/* Listagem Mobile com visual de tabela/card */}
      <div className="md:hidden rounded-2xl bg-white dark:bg-card border border-border/70 shadow-xs divide-y divide-border/50 overflow-hidden mb-6">
        {rows.length ? (
          rows.map((row) => {
            const u = row.original;
            const isSelfOrFirst = u.id === currentUserId || u.isFirstUser;
            const hasMobileActions = onEdit || onChangePassword || onToggleActive || onDelete;
            const initial = u.name.charAt(0).toUpperCase() || "U";

            return (
              <div
                key={row.id}
                className="p-3.5 sm:p-4 flex items-center gap-3.5 transition-colors hover:bg-muted/20"
              >
                {/* Avatar / Inicial do Usuário */}
                <div className="h-12 w-12 rounded-2xl shrink-0 bg-primary/10 text-primary font-bold flex items-center justify-center text-lg">
                  {initial}
                </div>

                {/* Dados do Usuário */}
                <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground text-sm line-clamp-1 truncate leading-tight">
                      {u.name}
                    </span>
                    {!u.active && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-muted-foreground/40 text-muted-foreground bg-muted/40 text-[10px] px-1.5 h-4"
                      >
                        Inativo
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{u.groupLabel}</span>
                    <span className="text-muted-foreground/40 font-light select-none">
                      ·
                    </span>
                    <span className="truncate">{u.email}</span>
                  </div>

                  {u.discountLimitMode && u.discountLimitMode !== "INHERIT" && (
                    <div className="mt-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        Desconto:{" "}
                        {u.discountLimitMode === "UNLIMITED"
                          ? "Ilimitado"
                          : `${u.maxDiscountPercentage != null ? `${u.maxDiscountPercentage}%` : ""}${u.maxDiscountPercentage != null && u.maxDiscountValue != null ? " / " : ""}${u.maxDiscountValue != null ? `R$ ${Number(u.maxDiscountValue).toFixed(2).replace(".", ",")}` : ""}`}
                      </span>
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
                          aria-label="Ações do usuário"
                        >
                          <BoxIcon
                            name="dots-vertical-rounded"
                            className="text-lg"
                          />
                        </Button>
                      }
                    />
                    <PopoverContent className="w-52 p-1.5" align="end">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(u);
                          }}
                        >
                          <BoxIcon name="pencil" className="mr-2 text-base" />
                          Editar usuário
                        </Button>
                      )}

                      {onChangePassword && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangePassword(u);
                          }}
                        >
                          <BoxIcon name="key" className="mr-2 text-base" />
                          Trocar senha
                        </Button>
                      )}

                      {onToggleActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleActive(u.id);
                          }}
                        >
                          <BoxIcon name="power-off" className="mr-2 text-base" />
                          {u.active ? "Bloquear acesso" : "Ativar acesso"}
                        </Button>
                      )}

                      {!isSelfOrFirst && onDelete && (
                        <>
                          <Separator className="my-1" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-full justify-start px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(u);
                            }}
                          >
                            <BoxIcon name="trash" className="mr-2 text-base" />
                            Remover usuário
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
            Nenhum usuário encontrado.
          </div>
        )}
      </div>

      {/* Tabela Desktop */}
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
                            header.column.id === "name"
                              ? undefined
                              : "hidden sm:table-cell"
                          }
                        >
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
                              cell.column.id === "name"
                                ? undefined
                                : "hidden sm:table-cell"
                            }
                          >
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
                        Nenhum usuário encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
