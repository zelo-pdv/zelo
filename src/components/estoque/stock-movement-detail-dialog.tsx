"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BoxIcon } from "@/components/ui/box-icon";
import { dateTime } from "@/lib/format";
import type { StockMovementFrontend } from "@/services/stock-movements.service";

type StockMovementDetailDialogProps = {
  movement: StockMovementFrontend | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRevert?: (movement: StockMovementFrontend) => void;
  canRevert?: boolean;
};

export function StockMovementDetailDialog({
  movement,
  open,
  onOpenChange,
  onRevert,
  canRevert = false,
}: StockMovementDetailDialogProps) {
  const isMobile = useIsMobile();

  if (!movement) return null;

  const isAlreadyReverted = movement.isReverted;

  const getTypeBadge = (type: StockMovementFrontend["type"]) => {
    switch (type) {
      case "ENTRY":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 text-emerald-700 bg-emerald-500/10 text-xs font-medium">
            Entrada (+)
          </Badge>
        );
      case "OUT":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-700 bg-amber-500/10 text-xs font-medium">
            Saída (-)
          </Badge>
        );
      case "ADJUSTMENT":
        return (
          <Badge
            variant="outline"
            className="border-sky-500/40 text-sky-700 bg-sky-500/10 text-xs font-medium">
            Ajuste (=)
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
            Estorno de venda
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const ContentBody = (
    <div className="space-y-4 py-2 text-sm">
      {/* Alerta caso a movimentação já tenha sido revertida */}
      {isAlreadyReverted && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
          <BoxIcon name="info-circle" className="text-lg shrink-0" />
          <p>
            Esta movimentação já foi <strong>revertida</strong>
            {movement.revertedAt ? ` em ${dateTime(movement.revertedAt)}` : ""}.
            Não é possível revertê-la novamente.
          </p>
        </div>
      )}

      {/* Top Header Card com Título e Produto */}
      <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Título da Movimentação
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-bold text-base text-foreground break-words">
                {movement.title || "Movimentação de Estoque"}
              </h4>
              {isAlreadyReverted && (
                <Badge
                  variant="outline"
                  className="border-rose-500/40 text-rose-600 bg-rose-500/10 text-[10px] font-bold px-1.5 py-0">
                  Revertida
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Produto:{" "}
              <strong className="text-foreground">
                {movement.product?.name || "Produto indisponível"}
              </strong>
              {movement.variant && (
                <span>
                  {" "}
                  • Variação:{" "}
                  <strong className="text-foreground">
                    {movement.variant.name}
                  </strong>
                </span>
              )}
            </p>
          </div>
          <div className="shrink-0">{getTypeBadge(movement.type)}</div>
        </div>

        {(movement.product?.code || movement.product?.barcode) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
            {movement.product.code && (
              <span className="bg-muted px-2 py-0.5 rounded">
                Cód: {movement.product.code}
              </span>
            )}
            {movement.product.barcode && (
              <span className="bg-muted px-2 py-0.5 rounded">
                EAN: {movement.product.barcode}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Movement Quantities Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1 text-center">
          <span className="text-[11px] text-muted-foreground uppercase font-medium">
            Saldo Anterior
          </span>
          <p className="text-base font-semibold tabular-nums text-foreground">
            {movement.previousStock} un
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1 text-center">
          <span className="text-[11px] text-muted-foreground uppercase font-medium">
            Movimentado
          </span>
          <p className="text-base font-bold tabular-nums text-primary">
            {movement.type === "ENTRY" || movement.type === "SALE_CANCEL"
              ? `+${movement.quantity}`
              : movement.type === "OUT" || movement.type === "SALE"
                ? `-${movement.quantity}`
                : `${movement.quantity}`}{" "}
            un
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1 text-center">
          <span className="text-[11px] text-muted-foreground uppercase font-medium">
            Saldo Resultante
          </span>
          <p className="text-base font-semibold tabular-nums text-foreground">
            {movement.resultStock} un
          </p>
        </div>
      </div>

      {/* Details List */}
      <div className="rounded-xl border border-border/60 divide-y divide-border/50 bg-card">
        <div className="flex items-center justify-between p-3 text-xs">
          <span className="text-muted-foreground">Data e Horário</span>
          <span className="font-medium text-foreground tabular-nums">
            {dateTime(movement.createdAt)}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 text-xs">
          <span className="text-muted-foreground">Responsável</span>
          <span className="font-medium text-foreground">
            {movement.user?.name || "Sistema"}
            {movement.user?.email && (
              <span className="text-muted-foreground text-[11px] ml-1">
                ({movement.user.email})
              </span>
            )}
          </span>
        </div>

        {movement.notes && (
          <div className="p-3 text-xs space-y-1">
            <span className="text-muted-foreground block">Observações</span>
            <p className="text-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40 whitespace-pre-wrap">
              {movement.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} blur>
        <DrawerContent className="p-4">
          <DrawerHeader className="px-0 text-center">
            <DrawerTitle className="text-center">
              Detalhes da Movimentação
            </DrawerTitle>
          </DrawerHeader>

          {ContentBody}

          <div className="flex flex-col gap-2 pt-4 w-full">
            {canRevert && onRevert && !isAlreadyReverted && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onOpenChange(false);
                  onRevert(movement);
                }}
                className="h-11 w-full rounded-full gap-1.5 font-medium">
                <BoxIcon name="undo" className="text-lg" />
                <span>Reverter movimentação</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 w-full rounded-full text-sm font-medium">
              Fechar
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} blur>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes da Movimentação</DialogTitle>
        </DialogHeader>

        {ContentBody}

        <DialogFooter className="flex w-full items-center justify-between sm:justify-between pt-2">
          {canRevert && onRevert && !isAlreadyReverted ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onRevert(movement);
              }}
              className="rounded-full gap-1.5">
              <BoxIcon name="undo" className="text-base" />
              <span>Reverter movimentação</span>
            </Button>
          ) : (
            <div />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-5">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
