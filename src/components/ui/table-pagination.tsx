"use client";

import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  pageIndex: number;
  pageSize: number;
  totalFiltered: number;
  pageCount: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  className?: string;
}

export function TablePagination({
  pageIndex,
  pageSize,
  totalFiltered,
  pageCount,
  canPreviousPage,
  canNextPage,
  onPreviousPage,
  onNextPage,
  className,
}: TablePaginationProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 mb-3 px-0.5",
        className
      )}
    >
      <div className="text-sm font-medium text-muted-foreground">
        {totalFiltered === 0
          ? "0 de 0"
          : `${pageIndex * pageSize + 1}–${Math.min(
              (pageIndex + 1) * pageSize,
              totalFiltered,
            )} de ${totalFiltered}`}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 rounded-xl border border-border/70 bg-white dark:bg-card text-foreground hover:bg-muted cursor-pointer disabled:opacity-50"
          disabled={!canPreviousPage}
          onClick={onPreviousPage}
          aria-label="Página anterior"
        >
          <BoxIcon name="chevron-left" className="text-lg" />
        </Button>
        <div className="text-sm tabular-nums text-muted-foreground font-medium px-1">
          {pageIndex + 1} / {pageCount || 1}
        </div>
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 rounded-xl border border-border/70 bg-white dark:bg-card text-foreground hover:bg-muted cursor-pointer disabled:opacity-50"
          disabled={!canNextPage}
          onClick={onNextPage}
          aria-label="Próxima página"
        >
          <BoxIcon name="chevron-right" className="text-lg" />
        </Button>
      </div>
    </div>
  );
}
