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
import { AppUser } from "./page";

export type UserTableData = AppUser & {
  groupLabel: string;
  isFirstUser: boolean;
};

export type UserActions = {
  onToggle: (id: string) => void;
  onEdit: (u: AppUser) => void;
  onDelete: (u: AppUser) => void;
  onChangePassword: (u: AppUser) => void;
  currentUserId?: string;
};

export function getUserColumns({
  onToggle,
  onEdit,
  onDelete,
  onChangePassword,
  currentUserId,
}: UserActions): ColumnDef<UserTableData>[] {
  return [
    {
      accessorKey: "name",
      header: "Usuário",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-medium">{u.name}</span>
            <span className="truncate text-xs text-muted-foreground">{u.email}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "groupLabel",
      header: "Escopo",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.groupLabel}
        </span>
      ),
      filterFn: (row, id, value) =>
        value === "Todos" || row.getValue(id) === value,
    },
    {
      id: "discountLimit",
      header: "Limite Desconto",
      cell: ({ row }) => {
        const u = row.original;
        if (u.discountLimitMode === "UNLIMITED") {
          return (
            <Badge variant="outline" className="text-[10px] border-sky-500/30 text-sky-700 dark:text-sky-400">
              Ilimitado
            </Badge>
          );
        }
        if (u.discountLimitMode === "CUSTOM") {
          const parts: string[] = [];
          if (u.maxDiscountPercentage != null) parts.push(`${u.maxDiscountPercentage}%`);
          if (u.maxDiscountValue != null) parts.push(`R$ ${Number(u.maxDiscountValue).toFixed(2).replace(".", ",")}`);
          return (
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400">
              {parts.length > 0 ? parts.join(" ou ") : "Personalizado"}
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Padrão do Grupo
          </Badge>
        );
      },
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.active ? "secondary" : "outline"}
          className={
            row.original.active
              ? ""
              : "border-muted-foreground/40 text-muted-foreground bg-muted/40"
          }
        >
          {row.original.active ? "Ativo" : "Inativo"}
        </Badge>
      ),
      filterFn: "equals",
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      enableHiding: false,
      cell: ({ row }) => {
        const u = row.original;
        const isSelfOrFirst = u.id === currentUserId || u.isFirstUser;

        return (
          <div className="flex justify-end">
            <Popover>
              <ActionTooltip label="Ações do usuário">
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                      aria-label="Ações do usuário"
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
                  onClick={() => onEdit(u)}
                >
                  <BoxIcon name="pencil" className="mr-2 text-base" />
                  Editar usuário
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                  onClick={() => onChangePassword(u)}
                >
                  <BoxIcon name="key" className="mr-2 text-base" />
                  Trocar senha
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-full justify-start px-3 text-xs cursor-pointer"
                  onClick={() => onToggle(u.id)}
                >
                  <BoxIcon name="power-off" className="mr-2 text-base" />
                  {u.active ? "Bloquear acesso" : "Ativar acesso"}
                </Button>

                {!isSelfOrFirst && (
                  <>
                    <Separator className="my-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-full justify-start px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      onClick={() => onDelete(u)}
                    >
                      <BoxIcon name="trash" className="mr-2 text-base" />
                      Remover usuário
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
