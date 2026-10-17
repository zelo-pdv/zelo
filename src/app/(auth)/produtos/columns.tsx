import type { ColumnDef } from "@tanstack/react-table";

import { BoxIcon } from "@/components/ui/box-icon";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ActionTooltip } from "@/components/ui/tooltip";

import { currency } from "@/lib/format";
import { ProductThumb } from "@/components/product-thumb";
import { cn } from "@/lib/utils";

import type { Category, Product } from "@/prisma/client";

import type { PermissionChecker } from "@/types/permissions";

export type ProductFrontend = Omit<Product, "costPrice" | "salePrice"> & {
  costPrice: number;
  salePrice: number;
  category?: Category | null;
  variants?: any[];
};

import { isProductLowStock as checkLowStock, getProductTotalStock, getProductLowStockVariants } from "@/lib/stock";
export { getProductTotalStock, getProductLowStockVariants };

export function isProductLowStock(
  product: ProductFrontend,
  trackStock: boolean = true
): boolean {
  return checkLowStock(product, trackStock);
}

export type ProductActions = {
  onEdit: (product: ProductFrontend) => void;
  onDelete: (product: ProductFrontend) => void;
  onToggleActive?: (product: ProductFrontend) => void;
  can: PermissionChecker;
  categoryLowStockThresholds?: Record<string, number>;
  trackStock?: boolean;
};

export function getProductColumns({
  onEdit,
  onDelete,
  onToggleActive,
  can,
  trackStock = false,
}: ProductActions): ColumnDef<ProductFrontend>[] {
  const canEdit = can("produtos", "Editar");
  const canDelete = can("produtos", "Excluir");

  const hasAnyAction = canEdit || canDelete;

  const columns: ColumnDef<ProductFrontend>[] = [
    {
      accessorKey: "name",

      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 hover:bg-none focus:bg-none"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Produto
          <BoxIcon name="sort-alt-2" className="ml-1 text-sm" />
        </Button>
      ),

      cell: ({ row }) => {
        const product = row.original;
        const low = trackStock && isProductLowStock(product, trackStock);
        const active = product.active ?? true;

        const hasMobileActions = hasAnyAction;

        return (
          <div className="min-w-0 max-w-full">
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2.5 min-w-0 max-w-[calc(100vw-130px)] sm:max-w-none">
                <ProductThumb
                  name={product.name}
                  image={product.image}
                  className="h-9 w-9 rounded-lg text-xs shrink-0"
                />
                <div className="min-w-0 flex items-center gap-1.5 flex-1">
                  <span className="truncate text-sm font-medium">
                    {product.name}
                  </span>

                  {!active && (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-muted-foreground/40 text-muted-foreground bg-muted/40 text-[10px] px-1 h-4"
                    >
                      Inativo
                    </Badge>
                  )}
                </div>
              </div>

              {hasMobileActions && (
                <div className="sm:hidden shrink-0">
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(event) => event.stopPropagation()}
                          aria-label="Ações do produto"
                        >
                          <BoxIcon name="dots-vertical-rounded" className="text-base" />
                        </Button>
                      }
                    />

                    <PopoverContent className="w-52" align="end">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3"
                          onClick={(event) => {
                            event.stopPropagation();
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
                            "h-9 w-full justify-start px-3",
                            !active
                              ? "text-emerald-600 hover:text-emerald-700"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleActive(product);
                          }}
                        >
                          <BoxIcon name="power-off" className="mr-2 text-base" />
                          {active ? "Desativar produto" : "Ativar produto"}
                        </Button>
                      )}

                      {canEdit && canDelete && (
                        <Separator className="my-1" />
                      )}

                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-destructive hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(product);
                          }}
                        >
                          <BoxIcon name="trash" className="mr-2 text-base" />
                          Remover produto
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div className="mt-0.5 text-xs text-muted-foreground sm:hidden">
              {trackStock ? (
                <>
                  <span
                    className={cn(
                      "tabular-nums",
                      Number(product.stock) < 0
                        ? "text-rose-600 dark:text-rose-400 font-semibold"
                        : low
                        ? "text-amber-600 dark:text-amber-400 font-semibold"
                        : "text-foreground font-medium"
                    )}
                  >
                    {Number(product.stock)} un
                  </span>
                  <span> · </span>
                </>
              ) : null}
              {currency(product.salePrice)}
            </div>
          </div>
        );
      },
    },

    {
      accessorKey: "category",

      header: "Categoria",

      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.category?.name || "Sem categoria"}
        </span>
      ),

      filterFn: (row, _id, value) => row.original.category?.name === value,
    },

    ...(trackStock
      ? [
          {
            accessorKey: "stock",

            header: () => <div className="text-right">Estoque</div>,

            cell: ({ row }: any) => {
              const product = row.original;
              const stockNum = getProductTotalStock(product);
              const low = trackStock && isProductLowStock(product, trackStock);
              const lowVariants = trackStock ? getProductLowStockVariants(product, trackStock) : [];

              let lowStockTooltip: string | undefined;
              if (lowVariants.length > 0) {
                const variantSummary = lowVariants
                  .map(
                    (v: any) =>
                      `${v.name} (${Number(v.stock ?? 0)} un, mín. ${Number(v.minStock)})`
                  )
                  .join(", ");
                lowStockTooltip = `Estoque baixo nas variações: ${variantSummary}`;
              } else if (low && product.minStock !== null && product.minStock !== undefined) {
                lowStockTooltip = `Estoque baixo: ${stockNum} un (mín. ${Number(product.minStock)})`;
              }

              const stockContent = (
                <span
                  className={cn(
                    "tabular-nums",
                    stockNum < 0
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : low
                      ? "font-semibold text-amber-600 dark:text-amber-400"
                      : "text-foreground font-medium"
                  )}
                >
                  {stockNum} un
                </span>
              );

              return (
                <div className="flex items-center justify-end text-right text-sm tabular-nums">
                  {low && lowStockTooltip ? (
                    <ActionTooltip label={lowStockTooltip} side="top">
                      {stockContent}
                    </ActionTooltip>
                  ) : (
                    stockContent
                  )}
                </div>
              );
            },
          } as ColumnDef<ProductFrontend>,
        ]
      : []),

    {
      accessorKey: "active",
      header: "Status",
      filterFn: (row, _id, value) => {
        if (value === "Todos" || !value) return true;
        const active = row.original.active ?? true;
        if (value === "Ativos") return active === true;
        if (value === "Inativos") return active === false;
        return true;
      },
      cell: ({ row }) => {
        const active = row.original.active ?? true;
        return (
          <div className="hidden sm:block">
            <Badge
              variant="outline"
              className={
                active
                  ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10 text-xs"
                  : "border-muted-foreground/40 text-muted-foreground bg-muted/40 text-xs"
              }
            >
              {active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        );
      },
    },

    {
      accessorKey: "salePrice",

      header: () => <div className="text-right">Valor</div>,

      cell: ({ row }) => (
        <div className="text-right text-sm font-semibold tabular-nums">
          {currency(row.original.salePrice)}
        </div>
      ),
    },
  ];

  if (hasAnyAction) {
    columns.push({
      id: "actions",

      header: () => <div className="text-right">Ações</div>,

      enableHiding: false,

      cell: ({ row }) => {
        const product = row.original;
        const active = product.active ?? true;

        return (
          <div className="hidden justify-end gap-1 sm:flex">
            {canEdit && onToggleActive && (
              <ActionTooltip label={!active ? "Ativar produto" : "Desativar produto"}>
                <Button
                  size="icon"
                  variant="ghost"
                  className={
                    !active
                      ? "h-8 w-8 text-emerald-600 hover:text-emerald-700"
                      : "h-8 w-8 text-muted-foreground hover:text-foreground"
                  }
                  onClick={() => onToggleActive(product)}
                  aria-label={!active ? "Ativar produto" : "Desativar produto"}
                >
                  <BoxIcon name="power-off" className="text-base" />
                </Button>
              </ActionTooltip>
            )}

            {canEdit && (
              <ActionTooltip label="Editar produto">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => onEdit(product)}
                  aria-label="Editar produto"
                >
                  <BoxIcon name="pencil" className="text-base" />
                </Button>
              </ActionTooltip>
            )}

            {canDelete && (
              <ActionTooltip label="Excluir produto">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => onDelete(product)}
                  aria-label="Excluir produto"
                >
                  <BoxIcon name="trash" className="text-base" />
                </Button>
              </ActionTooltip>
            )}
          </div>
        );
      },
    });
  }

  return columns;
}
