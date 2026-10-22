import type { ColumnDef } from "@tanstack/react-table";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SaleStatusBadge } from "@/components/sale-status-badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ActionTooltip } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { currency, dateTime } from "@/lib/format";
import { getPaymentLabel, type Sale } from "@/types";

export type SaleActions = {
  onView: (s: Sale) => void;
  onVoucher: (s: Sale) => void;
  onEdit?: (s: Sale) => void;
  onCancel?: (s: Sale) => void;
};

export function getSaleColumns({
  onView,
  onVoucher,
  onEdit,
  onCancel,
}: SaleActions): ColumnDef<Sale>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center pl-2 w-8">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Selecionar todas as vendas da página"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center pl-2 w-8" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Selecionar venda #${row.original.saleNumber || row.original.id.slice(-6)}`}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 36,
    },
    {
      accessorKey: "clientName",
      header: "Cliente",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="min-w-0 max-w-[calc(100vw-130px)] sm:max-w-none">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">
                {s.clientName || "Consumidor Final"}
              </span>
              {s.status === "CANCELADO" && (
                <Badge
                  variant="outline"
                  className="sm:hidden text-[10px] px-1.5 py-0 border-destructive/40 text-destructive bg-destructive/10"
                >
                  Cancelado
                </Badge>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {dateTime(s.date)}
            </div>
            {/* Info resumida para Mobile */}
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
              <span>{getPaymentLabel(s.paymentMethod)}</span>
              <span>·</span>
              <span className={s.status === "CANCELADO" ? "line-through opacity-70" : "font-medium text-foreground"}>
                {currency(s.total)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "paymentMethod",
      header: "Pagamento",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground hidden sm:block">
          {getPaymentLabel(row.original.paymentMethod)}
        </div>
      ),
    },
    {
      accessorKey: "total",
      header: () => <div className="text-right">Valor</div>,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div
            className={`text-right text-sm font-semibold tabular-nums hidden sm:block ${
              s.status === "CANCELADO" ? "line-through text-muted-foreground opacity-70" : ""
            }`}
          >
            {currency(s.total)}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => <div className="text-right">Status</div>,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="text-right hidden sm:block">
            <SaleStatusBadge status={s.status} />
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value === "all" || row.getValue(id) === value;
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      enableHiding: false,
      cell: ({ row }) => {
        const s = row.original;
        const isCancelled = s.status === "CANCELADO";
        const isEditable = !isCancelled && (() => {
          const emission = new Date(s.date || (s as any).createdAt).getTime();
          if (isNaN(emission)) return false;
          return (Date.now() - emission) / (1000 * 60 * 60) <= 24;
        })();

        return (
          <div className="flex justify-end">
            <Popover>
              <ActionTooltip label="Ações da venda">
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                      aria-label="Ações da venda"
                    >
                      <BoxIcon name="dots-vertical-rounded" className="text-base" />
                    </Button>
                  }
                />
              </ActionTooltip>
              <PopoverContent className="w-52 p-1.5" align="end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                  onClick={() => onView(s)}
                >
                  <BoxIcon name="show" className="mr-2 text-base" />
                  Visualizar venda
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                  onClick={() => onVoucher(s)}
                >
                  <BoxIcon name="receipt" className="mr-2 text-base" />
                  Ver comprovante
                </Button>

                {isEditable && onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                    onClick={() => onEdit(s)}
                  >
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
                      onClick={() => onCancel(s)}
                    >
                      <BoxIcon name="x-circle" className="mr-2 text-base" />
                      Cancelar venda
                    </Button>
                  </>
                )}
              </PopoverContent>
            </Popover>
          </div>
        );
      },
    },
  ];
}
