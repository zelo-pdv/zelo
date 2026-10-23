"use client";

import { useState } from "react";
import { BoxIcon } from "@/components/ui/box-icon";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileActionFabProps {
  onAdd?: () => void;
  onExport?: () => void;
  onConfig?: () => void;
  onImport?: () => void;
  onCatalogImport?: () => void;
  isExporting?: boolean;
  page: "produtos" | "usuarios" | "estoque";
}

export function MobileActionFab({
  onAdd,
  onExport,
  onConfig,
  onImport,
  onCatalogImport,
  isExporting,
  page,
}: MobileActionFabProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const hasActions = Boolean(onAdd || onExport || onConfig || onImport || onCatalogImport);
  if (!isMobile || !hasActions) return null;

  return (
    <>
      {/* Optional overlay to close when clicking outside */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
      <div
        className={cn(
          "fixed right-4 z-50 flex flex-col-reverse items-end gap-3 pointer-events-none transition-all duration-300 ease-in-out md:hidden",
          "bottom-[calc(84px+env(safe-area-inset-bottom))]",
        )}>
        {/* Main FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Ações rápidas"
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 pointer-events-auto cursor-pointer active:scale-95",
            isOpen
              ? "bg-rose-500 text-white rotate-45"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}>
          <BoxIcon name="plus" className="text-2xl" />
        </button>

        {/* Action Buttons */}
        <div className="flex flex-col items-end gap-3">
          {/* Catalog Import Button */}
          {onCatalogImport && (
            <button
              onClick={() => {
                onCatalogImport();
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 rounded-full bg-background border border-border pr-6 pl-1.5 py-1.5 shadow-lg transition-all duration-300 pointer-events-auto cursor-pointer",
                isOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4 pointer-events-none",
              )}
              style={{ transitionDelay: isOpen ? "50ms" : "50ms" }}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BoxIcon name="book-content" className="text-xl" />
              </div>
              <span className="text-sm font-semibold">Catálogos</span>
            </button>
          )}

          {/* Import Button */}
          {onImport && (
            <button
              onClick={() => {
                onImport();
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 rounded-full bg-background border border-border pr-6 pl-1.5 py-1.5 shadow-lg transition-all duration-300 pointer-events-auto",
                isOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6 pointer-events-none",
              )}
              style={{ transitionDelay: isOpen ? "75ms" : "25ms" }}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <BoxIcon name="upload" className="text-xl" />
              </div>
              <span className="text-sm font-semibold">Importar</span>
            </button>
          )}

          {/* Export Button */}
          {onExport && (
            <button
              onClick={() => {
                onExport();
                setIsOpen(false);
              }}
              disabled={isExporting}
              className={cn(
                "flex items-center gap-3 rounded-full bg-background border border-border pr-6 pl-1.5 py-1.5 shadow-lg transition-all duration-300 pointer-events-auto",
                isOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8 pointer-events-none",
              )}
              style={{ transitionDelay: isOpen ? "100ms" : "0ms" }}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                {isExporting ? (
                  <BoxIcon name="loader-alt" className="text-xl bx-spin" />
                ) : (
                  <BoxIcon name="download" className="text-xl" />
                )}
              </div>
              <span className="text-sm font-semibold">Exportar</span>
            </button>
          )}

          {/* Config Button */}
          {onConfig && (
            <button
              onClick={() => {
                onConfig();
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 rounded-full bg-background border border-border pr-6 pl-1.5 py-1.5 shadow-lg transition-all duration-300 pointer-events-auto",
                isOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6 pointer-events-none",
              )}
              style={{ transitionDelay: isOpen ? "75ms" : "25ms" }}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <BoxIcon name="cog" className="text-xl" />
              </div>
              <span className="text-sm font-semibold">Configurações</span>
            </button>
          )}

          {/* Add Button */}
          {onAdd && (
            <button
              onClick={() => {
                onAdd();
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 rounded-full bg-background border border-border pr-6 pl-1.5 py-1.5 shadow-lg transition-all duration-300 pointer-events-auto",
                isOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4 pointer-events-none",
              )}
              style={{ transitionDelay: isOpen ? "50ms" : "50ms" }}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <BoxIcon
                  name={
                    page === "produtos"
                      ? "package"
                      : page === "estoque"
                        ? "transfer"
                        : "user-plus"
                  }
                  className="text-xl"
                />
              </div>
              <span className="text-sm font-semibold">
                {page === "estoque" ? "Nova movimentação" : "Novo"}
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
