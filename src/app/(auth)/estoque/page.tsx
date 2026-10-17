"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlobalLoader } from "@/components/ui/global-loader";
import { usePermissions } from "@/components/auth/permissions-provider";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useDataSync } from "@/hooks/use-data-sync";
import { dateTime } from "@/lib/format";
import {
  stockMovementsService,
  type StockMovementFrontend,
} from "@/services/stock-movements.service";
import { StockMovementDialog } from "@/components/estoque/stock-movement-dialog";
import Link from "next/link";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canAdd = can("estoque", "Adicionar");
  const canView = can("estoque", "Visualizar");

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
          toast.error("Erro ao carregar movimentações de estoque.");
        }
        console.error("Erro ao buscar movimentações:", error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [canView, page, search, typeFilter]
  );

  useEffect(() => {
    fetchMovements(false);
  }, [fetchMovements]);

  // Sincronização em tempo real entre abas
  useDataSync({
    types: ["products", "sales"],
    onSync: () => {
      fetchMovements(true);
    },
  });

  const getTypeBadge = (type: StockMovementFrontend["type"]) => {
    switch (type) {
      case "ENTRY":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 text-emerald-700 bg-emerald-500/10 text-xs font-medium"
          >
            Entrada
          </Badge>
        );
      case "OUT":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-700 bg-amber-500/10 text-xs font-medium"
          >
            Saída
          </Badge>
        );
      case "ADJUSTMENT":
        return (
          <Badge
            variant="outline"
            className="border-sky-500/40 text-sky-700 bg-sky-500/10 text-xs font-medium"
          >
            Ajuste
          </Badge>
        );
      case "SALE":
        return (
          <Badge
            variant="outline"
            className="border-violet-500/40 text-violet-700 bg-violet-500/10 text-xs font-medium"
          >
            Venda
          </Badge>
        );
      case "SALE_CANCEL":
        return (
          <Badge
            variant="outline"
            className="border-zinc-500/40 text-zinc-700 bg-zinc-500/10 text-xs font-medium dark:text-zinc-300"
          >
            Estorno
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatQuantity = (item: StockMovementFrontend) => {
    const isPositive =
      item.type === "ENTRY" || item.type === "SALE_CANCEL";
    const isNegative = item.type === "OUT" || item.type === "SALE";

    return (
      <span
        className={`font-semibold tabular-nums ${
          isPositive
            ? "text-emerald-600 dark:text-emerald-400"
            : isNegative
            ? "text-rose-600 dark:text-rose-400"
            : "text-foreground"
        }`}
      >
        {isPositive ? `+${item.quantity}` : isNegative ? `-${item.quantity}` : `${item.quantity}`} un
      </span>
    );
  };

  if (!canView) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <BoxIcon name="lock" className="text-3xl text-muted-foreground" />
        <p className="text-muted-foreground">
          Você não tem permissão para visualizar as movimentações de estoque.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 space-y-4 pb-20 md:pb-6">
      {/* Banner de aviso se o controle de estoque estiver desativado */}
      {!trackStock && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <BoxIcon name="info-circle" className="text-xl shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Controle de estoque desativado:</span>{" "}
            O registro e a consulta de movimentações permanecem disponíveis, mas o bloqueio de vendas e os alertas de estoque mínimo no dashboard estão inativos. Você pode ativar o controle a qualquer momento nas configurações.
          </div>
        </div>
      )}

      {/* Barra de Filtros e Ações */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between w-full">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 sm:max-w-xs">
            <BoxIcon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base pointer-events-none"
            />
            <Input
              placeholder="Buscar por produto, código, nota..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="w-44 shrink-0">
            <Select
              value={typeFilter}
              onValueChange={(val) => {
                if (val) {
                  setTypeFilter(val as string);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="w-full h-9 rounded-md text-xs justify-between">
                <SelectValue placeholder="Tipo de movimentação">
                  {typeFilter === "ALL"
                    ? "Todos os tipos"
                    : typeFilter === "ENTRY"
                    ? "Entradas (+)"
                    : typeFilter === "OUT"
                    ? "Saídas (-)"
                    : typeFilter === "ADJUSTMENT"
                    ? "Ajustes (=)"
                    : typeFilter === "SALE"
                    ? "Vendas"
                    : "Estornos"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  Todos os tipos
                </SelectItem>
                <SelectItem value="ENTRY" className="text-xs">
                  Entradas (+)
                </SelectItem>
                <SelectItem value="OUT" className="text-xs">
                  Saídas (-)
                </SelectItem>
                <SelectItem value="ADJUSTMENT" className="text-xs">
                  Ajustes (=)
                </SelectItem>
                <SelectItem value="SALE" className="text-xs">
                  Vendas
                </SelectItem>
                <SelectItem value="SALE_CANCEL" className="text-xs">
                  Estornos de venda
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/produtos">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-full gap-1.5 cursor-pointer text-xs"
            >
              <BoxIcon name="package" className="text-base" />
              <span className="hidden sm:inline">Ver Catálogo</span>
            </Button>
          </Link>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchMovements(false)}
            className="h-9 rounded-full gap-1 cursor-pointer text-xs"
            title="Atualizar lista"
          >
            <BoxIcon name="refresh" className="text-base" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          {canAdd && (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="h-9 rounded-full gap-1 cursor-pointer text-xs font-medium"
            >
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
            <p className="text-sm font-medium">Nenhuma movimentação de estoque encontrada.</p>
            {canAdd && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="rounded-full mt-2"
              >
                Registrar primeira movimentação
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          {/* Visualização em Cards para Mobile */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {movements.map((item) => (
              <Card key={item.id} className="border-border/70 p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-semibold text-sm block truncate text-foreground">
                      {item.product?.name || "Produto indisponível"}
                    </span>
                    {item.variant && (
                      <span className="text-xs text-muted-foreground block truncate">
                        Variação: {item.variant.name}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0">{getTypeBadge(item.type)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-y border-border/50 py-2">
                  <div>
                    <span className="text-muted-foreground block">Quantidade:</span>
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
              </Card>
            ))}
          </div>

          {/* Visualização em Tabela para Desktop */}
          <div className="hidden md:block">
            <Card className="border-border/70 p-0 overflow-hidden">
              <CardContent className="p-0">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Data/Hora</TableHead>
                      <TableHead className="w-[120px]">Operação</TableHead>
                      <TableHead>Produto / Variação</TableHead>
                      <TableHead className="text-right w-[110px]">Qtd</TableHead>
                      <TableHead className="text-right w-[140px]">Saldo</TableHead>
                      <TableHead className="w-[140px]">Responsável</TableHead>
                      <TableHead className="max-w-[200px]">Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {dateTime(item.createdAt)}
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
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {item.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <div>
              Total: <span className="font-semibold text-foreground">{total}</span>{" "}
              movimentações
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 px-2.5 rounded-md text-xs cursor-pointer"
                >
                  Anterior
                </Button>
                <span className="px-2 font-medium">
                  {page} de {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 px-2.5 rounded-md text-xs cursor-pointer"
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal/Drawer de Nova Movimentação */}
      <StockMovementDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => fetchMovements(false)}
      />
    </div>
  );
}
