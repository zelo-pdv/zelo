"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { TablePagination } from "@/components/ui/table-pagination";
import { GlobalLoader } from "@/components/ui/global-loader";
import { MobileActionFab } from "@/components/ui/mobile-action-fab";
import { usePermissions } from "@/components/auth/permissions-provider";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useDataSync, notifyLocalSync } from "@/hooks/use-data-sync";
import { dateTime } from "@/lib/format";
import { handleExportStockMovements } from "@/lib/export";
import { cn } from "@/lib/utils";
import {
  stockMovementsService,
  type StockMovementFrontend,
} from "@/services/stock-movements.service";
import { StockMovementDialog } from "@/components/estoque/stock-movement-dialog";
import { StockMovementDetailDialog } from "@/components/estoque/stock-movement-detail-dialog";

export default function EstoquePage() {
  const { can } = usePermissions();
  const productsSettings = useSettingsStore((s) => s.products) ?? {
    trackStock: false,
  };
  const trackStock = productsSettings.trackStock ?? false;

  const [movements, setMovements] = useState<StockMovementFrontend[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Detalhes e Reversão
  const [selectedMovementForDetail, setSelectedMovementForDetail] =
    useState<StockMovementFrontend | null>(null);
  const [movementToRevert, setMovementToRevert] =
    useState<StockMovementFrontend | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  const canAdd = can("estoque", "Adicionar");
  const canView = can("estoque", "Visualizar");
  const canEdit = can("estoque", "Editar");

  const activeFiltersCount = typeFilter !== "ALL" ? 1 : 0;

  const fetchMovements = useCallback(
    async (silent = false) => {
      if (!canView) {
        setLoading(false);
        return;
      }

      try {
        if (!silent) setLoading(true);
        const res = await stockMovementsService.list({
          page,
          limit: 25,
          q: search.trim() || undefined,
          type: typeFilter,
        });
        setMovements(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages || 1);
      } catch (error) {
        if (!silent) {
          toast.error("Erro ao carregar movimentações.");
        }
        console.error("Erro ao buscar movimentações:", error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [canView, page, search, typeFilter],
  );

  useEffect(() => {
    fetchMovements(false);
  }, [fetchMovements]);

  // Sincronização automática em tempo real entre abas e dispositivos
  useDataSync({
    types: ["products", "sales"],
    onSync: () => {
      fetchMovements(true);
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await handleExportStockMovements(typeFilter, search);
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmRevert = async () => {
    if (!movementToRevert) return;
    setIsReverting(true);
    try {
      await stockMovementsService.revert(movementToRevert.id);
      toast.success(
        "Movimentação revertida com sucesso! Uma nova movimentação contrária foi gerada.",
      );
      notifyLocalSync("products");
      setMovementToRevert(null);
      fetchMovements(false);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Erro ao tentar reverter movimentação.";
      toast.error(msg);
    } finally {
      setIsReverting(false);
    }
  };

  const getTypeBadge = (type: StockMovementFrontend["type"]) => {
    switch (type) {
      case "ENTRY":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 text-emerald-700 bg-emerald-500/10 text-xs font-medium">
            Entrada
          </Badge>
        );
      case "OUT":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-700 bg-amber-500/10 text-xs font-medium">
            Saída
          </Badge>
        );
      case "ADJUSTMENT":
        return (
          <Badge
            variant="outline"
            className="border-sky-500/40 text-sky-700 bg-sky-500/10 text-xs font-medium">
            Ajuste
          </Badge>
        );
      case "SALE":
        return (
          <Badge
            variant="outline"
            className="border-violet-500/40 text-violet-700 bg-violet-500/10 text-xs font-medium">
            Venda
          </Badge>
        );
      case "SALE_CANCEL":
        return (
          <Badge
            variant="outline"
            className="border-zinc-500/40 text-zinc-700 bg-zinc-500/10 text-xs font-medium dark:text-zinc-300">
            Estorno
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatQuantity = (item: StockMovementFrontend) => {
    const isPositive = item.type === "ENTRY" || item.type === "SALE_CANCEL";
    const isNegative = item.type === "OUT" || item.type === "SALE";

    return (
      <span
        className={`font-semibold tabular-nums ${
          isPositive
            ? "text-emerald-600 dark:text-emerald-400"
            : isNegative
              ? "text-rose-600 dark:text-rose-400"
              : "text-foreground"
        }`}>
        {isPositive
          ? `+${item.quantity}`
          : isNegative
            ? `-${item.quantity}`
            : `${item.quantity}`}{" "}
        un
      </span>
    );
  };

  if (!canView) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <BoxIcon name="lock" className="text-3xl text-muted-foreground" />
        <p className="text-muted-foreground">
          Você não tem permissão para visualizar as movimentações.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 space-y-4 pb-24 md:pb-6">
      {/* Alerta caso o controle de estoque esteja desativado */}
      {!trackStock && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-800 dark:text-amber-300">
          <BoxIcon name="info-circle" className="text-xl shrink-0" />
          <p className="flex-1">
            O <strong>controle de estoque está desativado</strong> nas
            configurações da sua loja. O registro de novas movimentações está
            temporariamente desabilitado, mas você pode consultar todo o
            histórico abaixo.
          </p>
        </div>
      )}

      {/* Barra de Filtros e Ações */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between w-full">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Campo de Busca */}
          <div className="relative w-full sm:w-[40%] sm:max-w-[40%] min-w-0">
            <BoxIcon
              name="search"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder="Buscar por produto, código, nota..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="rounded-xl pl-10 h-11 bg-white dark:bg-card border-border/70 w-full text-base md:text-sm shadow-xs"
            />
          </div>

          {/* Filtro em Popover Padronizado */}
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
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              }
            />
            <PopoverContent align="start" className="w-80 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-semibold text-sm">
                  Filtros de Estoque
                </span>
              </div>

              {/* Tipo de Operação */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Tipo de Operação
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "ALL", label: "Todos" },
                    { id: "ENTRY", label: "Entradas (+)" },
                    { id: "OUT", label: "Saídas (-)" },
                    { id: "ADJUSTMENT", label: "Ajustes (=)" },
                    { id: "SALE", label: "Vendas" },
                    { id: "SALE_CANCEL", label: "Estornos" },
                  ].map((t) => (
                    <Button
                      key={t.id}
                      type="button"
                      variant={typeFilter === t.id ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs justify-start"
                      onClick={() => {
                        setTypeFilter(t.id);
                        setPage(1);
                      }}>
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs font-medium"
                  onClick={() => {
                    setTypeFilter("ALL");
                    setPage(1);
                  }}
                  disabled={activeFiltersCount === 0}>
                  Limpar filtros
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Ações no Desktop */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="h-9 rounded-full gap-1.5 cursor-pointer text-xs font-medium">
            <BoxIcon
              name={isExporting ? "loader-alt" : "download"}
              className={cn("text-base", isExporting && "bx-spin")}
            />
            <span>Exportar</span>
          </Button>

          {trackStock && canAdd && (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="h-9 rounded-full gap-1.5 cursor-pointer text-xs font-semibold">
              <BoxIcon name="plus" className="text-base" />
              <span>Nova movimentação</span>
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo Principal: Tabela Desktop / Cards Mobile */}
      {loading ? (
        <GlobalLoader />
      ) : movements.length === 0 ? (
        <Card className="border-border/70 p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <BoxIcon name="transfer" className="text-4xl opacity-40" />
            <p className="text-sm font-medium">
              Nenhuma movimentação de estoque encontrada.
            </p>
            {trackStock && canAdd && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="rounded-full mt-2">
                Registrar primeira movimentação
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          {/* Paginação Mobile (acima da listagem) */}
          <div className="md:hidden">
            <TablePagination
              pageIndex={page - 1}
              pageSize={25}
              totalFiltered={total}
              pageCount={totalPages}
              canPreviousPage={page > 1 && !loading}
              canNextPage={page < totalPages && !loading}
              onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>

          {/* Visualização em Card Único com divide-y para Mobile */}
          <div className="md:hidden rounded-2xl bg-white dark:bg-card border border-border/70 shadow-xs divide-y divide-border/50 overflow-hidden mb-6">
            {movements.map((item) => (
              <div
                key={item.id}
                className="p-3.5 space-y-2.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">
                        {item.title || "Movimentação de Estoque"}
                      </span>
                      {item.isReverted && (
                        <Badge
                          variant="outline"
                          className="border-rose-500/40 text-rose-600 bg-rose-500/10 text-[10px] font-bold px-1.5 py-0">
                          Revertida
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground block truncate">
                      {item.product?.name || "Produto indisponível"}
                      {item.variant ? ` • ${item.variant.name}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {getTypeBadge(item.type)}

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full text-muted-foreground"
                            aria-label="Opções da movimentação">
                            <BoxIcon
                              name="dots-vertical-rounded"
                              className="text-lg"
                            />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setSelectedMovementForDetail(item)}>
                          <BoxIcon name="show" className="text-base mr-2" />
                          <span>Ver detalhes</span>
                        </DropdownMenuItem>

                        {(canAdd || canEdit) && !item.isReverted && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setMovementToRevert(item)}>
                              <BoxIcon name="undo" className="text-base mr-2" />
                              <span>Reverter movimentação</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-y border-border/50 py-2">
                  <div>
                    <span className="text-muted-foreground block">
                      Quantidade:
                    </span>
                    {formatQuantity(item)}
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block">Saldo:</span>
                    <span className="tabular-nums font-medium text-foreground">
                      {item.previousStock} → {item.resultStock} un
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{dateTime(item.createdAt)}</span>
                  <span>{item.user?.name || "Sistema"}</span>
                </div>

                {item.notes && (
                  <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/40">
                    {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Visualização em Tabela para Desktop */}
          <div className="hidden md:block">
            <Card className="border-border/70 p-0 overflow-hidden">
              <CardContent className="p-0">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Data/Hora</TableHead>
                      <TableHead className="w-44">Título</TableHead>
                      <TableHead className="w-28">Operação</TableHead>
                      <TableHead>Produto / Variação</TableHead>
                      <TableHead className="text-right w-24">Qtd</TableHead>
                      <TableHead className="text-right w-32">Saldo</TableHead>
                      <TableHead className="w-32">Responsável</TableHead>
                      <TableHead className="max-w-44">Observações</TableHead>
                      <TableHead className="w-12 text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {dateTime(item.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span
                              className="font-semibold text-xs text-foreground truncate max-w-40"
                              title={item.title}>
                              {item.title || "Movimentação de Estoque"}
                            </span>
                            {item.isReverted && (
                              <Badge
                                variant="outline"
                                className="border-rose-500/40 text-rose-600 bg-rose-500/10 text-[10px] font-bold px-1.5 py-0 w-fit">
                                Revertida
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(item.type)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm text-foreground">
                              {item.product?.name || "Produto indisponível"}
                            </span>
                            {item.variant && (
                              <span className="text-xs text-muted-foreground">
                                Variação: {item.variant.name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatQuantity(item)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {item.previousStock}
                          </span>{" "}
                          →{" "}
                          <span className="font-semibold text-foreground">
                            {item.resultStock} un
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate">
                          {item.user?.name || "Sistema"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-44">
                          {item.notes || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
                                  aria-label="Ações da linha">
                                  <BoxIcon
                                    name="dots-vertical-rounded"
                                    className="text-base"
                                  />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() =>
                                  setSelectedMovementForDetail(item)
                                }>
                                <BoxIcon
                                  name="show"
                                  className="text-base mr-2"
                                />
                                <span>Ver detalhes</span>
                              </DropdownMenuItem>

                              {(canAdd || canEdit) && !item.isReverted && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setMovementToRevert(item)}>
                                    <BoxIcon
                                      name="undo"
                                      className="text-base mr-2"
                                    />
                                    <span>Reverter movimentação</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Paginação Desktop (abaixo da tabela) */}
            <div className="hidden md:block mt-4">
              <TablePagination
                pageIndex={page - 1}
                pageSize={25}
                totalFiltered={total}
                pageCount={totalPages}
                canPreviousPage={page > 1 && !loading}
                canNextPage={page < totalPages && !loading}
                onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
                onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </div>
          </div>
        </>
      )}

      {/* FAB Mobile Flutuante */}
      <MobileActionFab
        page="estoque"
        onAdd={trackStock && canAdd ? () => setIsDialogOpen(true) : undefined}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Modal/Drawer de Detalhes da Movimentação */}
      <StockMovementDetailDialog
        movement={selectedMovementForDetail}
        open={Boolean(selectedMovementForDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedMovementForDetail(null);
        }}
        onRevert={(m) => setMovementToRevert(m)}
        canRevert={canAdd || canEdit}
      />

      {/* Modal/Drawer de Nova Movimentação (Suporta Múltiplos Produtos) */}
      <StockMovementDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => fetchMovements(false)}
      />

      {/* Diálogo de Confirmação para Reverter Movimentação */}
      <AlertDialog
        open={Boolean(movementToRevert)}
        onOpenChange={(open) => {
          if (!open && !isReverting) setMovementToRevert(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reverter Movimentação de Estoque?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs sm:text-sm">
              <p>
                Esta ação gerará automaticamente uma{" "}
                <strong>nova movimentação contrária</strong> para restaurar o
                saldo anterior da movimentação{" "}
                <strong>
                  &ldquo;{movementToRevert?.title || "Movimentação de Estoque"}
                  &rdquo;
                </strong>{" "}
                referente ao produto{" "}
                <strong>
                  &ldquo;{movementToRevert?.product?.name}
                  {movementToRevert?.variant
                    ? ` (${movementToRevert.variant.name})`
                    : ""}
                  &rdquo;
                </strong>
                .
              </p>
              <p className="text-muted-foreground">
                <strong>Atenção:</strong> após reverter, esta movimentação será
                marcada como revertida e não será possível revertê-la novamente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReverting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRevert();
              }}
              disabled={isReverting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isReverting ? "Revertendo..." : "Confirmar Reversão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
