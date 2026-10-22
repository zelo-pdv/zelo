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
import { cn } from "@/lib/utils";
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
  canEdit = true,
  canDelete = false,
  onBulkToggleActive,
  onBulkDelete,
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
  canEdit?: boolean;
  canDelete?: boolean;
  onBulkToggleActive?: (users: UserTableData[], active: boolean) => Promise<void>;
  onBulkDelete?: (users: UserTableData[]) => Promise<void>;
}) {
  const isMobile = useIsMobile();
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [groupFilter, setGroupFilter] = useState("Todos");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, columnFilters, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: (row) => !row.original.isFirstUser,
    globalFilterFn: (row, _id, value) => {
      if (!value) return true;
      const u = row.original;
      return (
        textIncludes(u.name, value) ||
        textIncludes(u.email, value)
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
                  Filtros de Usuários
                </span>
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
                    onClick={() => setStatusFilter("Todos")}>
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant={statusFilter === "Ativo" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-emerald-400"
                    onClick={() => setStatusFilter("Ativo")}>
                    Ativo
                  </Button>
                  <Button
                    type="button"
                    variant={statusFilter === "Inativo" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => setStatusFilter("Inativo")}>
                    Inativo
                  </Button>
                </div>
              </div>

              {/* Grupo de Acesso */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Grupo de Acesso
                </Label>
                <Combobox
                  value={groupFilter}
                  onValueChange={(val) => {
                    const finalVal = val || "Todos";
                    setGroupFilter(finalVal);
                    table
                      .getColumn("accessGroup")
                      ?.setFilterValue(
                        finalVal === "Todos" ? undefined : finalVal,
                      );
                  }}
                  options={[
                    { value: "Todos", label: "Todos os grupos" },
                    ...groups.map((g) => ({ value: g.name, label: g.name })),
                  ]}
                  placeholder="Todos os grupos"
                  searchPlaceholder="Buscar grupo..."
                  size="sm"
                  triggerClassName="w-full h-8 rounded-md text-xs justify-between"
                />
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

        <div className="hidden md:flex items-center gap-2 shrink-0">
          {onExportClick && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExportClick}
              disabled={isExporting}
              className="rounded-full shrink-0 gap-1.5 cursor-pointer">
              <BoxIcon name="download" className="text-base" />
              <span>{isExporting ? "Exportando..." : "Exportar"}</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={onCreateClick}
            size="sm"
            className="rounded-full shrink-0 gap-1 cursor-pointer">
            <BoxIcon name="plus" className="text-base" />
            <span>Adicionar</span>
          </Button>
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
          <span>Selecionar todos da página</span>
        </label>
        {table.getSelectedRowModel().rows.length > 0 && (
          <span className="font-semibold text-primary">
            {table.getSelectedRowModel().rows.length} selecionado{table.getSelectedRowModel().rows.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Listagem Mobile com visual de tabela/card */}
      <div className="md:hidden rounded-2xl bg-white dark:bg-card border border-border/70 shadow-xs divide-y divide-border/50 overflow-hidden mb-6">
        {rows.length ? (
          rows.map((row) => {
            const u = row.original;
            const isSelfOrFirst = u.id === currentUserId || u.isFirstUser;
            const hasMobileActions =
              onEdit || onChangePassword || onToggleActive || onDelete;

            return (
              <div
                key={row.id}
                onClick={() => {
                  if (!isSelfOrFirst) row.toggleSelected();
                }}
                className={cn(
                  "p-3.5 sm:p-4 flex items-center gap-3.5 transition-colors hover:bg-muted/20 cursor-pointer",
                  row.getIsSelected() && "bg-primary/5 dark:bg-primary/10"
                )}>
                {!isSelfOrFirst ? (
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={row.getIsSelected()}
                      onCheckedChange={(val) => row.toggleSelected(!!val)}
                      aria-label={`Selecionar ${u.name}`}
                    />
                  </div>
                ) : (
                  <div className="w-4 shrink-0" />
                )}
                {/* Dados do Usuário */}
                <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground text-sm line-clamp-1 truncate leading-tight">
                      {u.name}
                    </span>
                    {!u.active && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-muted-foreground/40 text-muted-foreground bg-muted/40 text-[10px] px-1.5 h-4">
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
                          aria-label="Ações do usuário">
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
                          }}>
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
                          }}>
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
                          }}>
                          <BoxIcon
                            name="power-off"
                            className="mr-2 text-base"
                          />
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
                            }}>
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
                              cell.column.id === "name"
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
                        Nenhum usuário encontrado.
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
          ...(canEdit && onBulkToggleActive
            ? [
                {
                  label: "Ativar",
                  icon: "check-circle",
                  onClick: async () => {
                    const selected = table.getSelectedRowModel().rows.map((r) => r.original);
                    await onBulkToggleActive(selected, true);
                    table.resetRowSelection();
                  },
                },
                {
                  label: "Desativar",
                  icon: "x-circle",
                  onClick: async () => {
                    const selected = table.getSelectedRowModel().rows.map((r) => r.original);
                    await onBulkToggleActive(selected, false);
                    table.resetRowSelection();
                  },
                },
              ]
            : []),
          ...(canDelete && onBulkDelete
            ? [
                {
                  label: "Excluir",
                  icon: "trash",
                  variant: "destructive" as const,
                  onClick: () => setShowBulkDeleteConfirm(true),
                },
              ]
            : []),
        ]}
      />

      {/* Confirmação de Exclusão em Massa */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {table.getSelectedRowModel().rows.length} usuário(s) selecionado(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o acesso dos usuários selecionados à loja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
              disabled={isBulkDeleting}
              onClick={async (e) => {
                e.preventDefault();
                setIsBulkDeleting(true);
                try {
                  const selected = table.getSelectedRowModel().rows.map((r) => r.original);
                  await onBulkDelete?.(selected);
                  table.resetRowSelection();
                  setShowBulkDeleteConfirm(false);
                } finally {
                  setIsBulkDeleting(false);
                }
              }}
            >
              {isBulkDeleting ? "Excluindo..." : "Confirmar Exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
