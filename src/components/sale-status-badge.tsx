import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SaleStatus } from "@/types";
import {
  getSaleStatusConfig,
  type SaleStatusConfig,
} from "@/lib/sale-status";

export { getSaleStatusConfig, type SaleStatusConfig };

export interface SaleStatusBadgeProps {
  status: SaleStatus | string;
  className?: string;
}

export function SaleStatusBadge({ status, className }: SaleStatusBadgeProps) {
  const config = getSaleStatusConfig(status);

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
