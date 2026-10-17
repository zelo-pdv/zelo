import { SaleStatus } from "@/types";

export interface SaleStatusConfig {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
}

/**
 * Retorna as propriedades visuais padronizadas para cada status de venda no Zelo.
 * 
 * - PAGO: variant "secondary", tom neutro com alto contraste.
 * - PENDENTE: variant "outline", tom âmbar com borda sutil, fundo translúcido e texto adaptado para claro/escuro.
 * - CANCELADO: variant "outline", tom destrutivo com borda sutil, fundo translúcido e texto de alerta.
 */
export function getSaleStatusConfig(status: SaleStatus | string): SaleStatusConfig {
  switch (status) {
    case "PAGO":
    case SaleStatus.PAGO:
      return {
        label: "Pago",
        variant: "secondary",
        className: "bg-secondary text-secondary-foreground font-medium",
      };

    case "PENDENTE":
    case SaleStatus.PENDENTE:
      return {
        label: "Pendente",
        variant: "outline",
        className:
          "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 font-medium",
      };

    case "CANCELADO":
    case SaleStatus.CANCELADO:
      return {
        label: "Cancelado",
        variant: "outline",
        className:
          "border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20 font-medium",
      };

    default:
      return {
        label: String(status || ""),
        variant: "outline",
        className: "font-medium",
      };
  }
}
