"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { BoxIcon } from "@/components/ui/box-icon";
import { cn } from "@/lib/utils";

export interface BulkActionItem {
  label: string;
  icon?: string;
  onClick: () => void | Promise<void>;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  className?: string;
  disabled?: boolean;
}

export interface DataTableBulkActionsProps {
  selectedCount: number;
  totalCount?: number;
  onClearSelection: () => void;
  actions: BulkActionItem[];
  className?: string;
}

export function DataTableBulkActions({
  selectedCount,
  onClearSelection,
  actions,
  className,
}: DataTableBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      data-slot="bulk-actions-bar"
      className={cn(
        "fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] sm:max-w-none w-auto",
        "bg-card/95 dark:bg-card/90 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-2 px-3 sm:px-4",
        "flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-start gap-2 sm:gap-3",
        "animate-in fade-in slide-in-from-bottom-5 duration-200 ring-1 ring-black/5 dark:ring-white/10",
        className
      )}
    >
      {/* Contador */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] sm:text-xs font-bold">
          {selectedCount}
        </span>
        <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
          {selectedCount === 1 ? "1 selecionado" : `${selectedCount} selecionados`}
        </span>
      </div>

      <div className="h-4 w-px bg-border shrink-0 hidden sm:block" />

      {/* Ações */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {actions.map((act, index) => (
          <Button
            key={index}
            variant={act.variant || "outline"}
            size="sm"
            onClick={act.onClick}
            disabled={act.disabled}
            className={cn(
              "h-8 px-2.5 text-xs font-medium rounded-lg gap-1.5 cursor-pointer shadow-none",
              act.className
            )}
          >
            {act.icon && <BoxIcon name={act.icon} className="text-base shrink-0" />}
            <span>{act.label}</span>
          </Button>
        ))}

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
          title="Desmarcar todos"
        >
          <BoxIcon name="x" className="text-base sm:mr-1" />
          <span className="hidden sm:inline">Desmarcar</span>
        </Button>
      </div>
    </div>
  );
}
