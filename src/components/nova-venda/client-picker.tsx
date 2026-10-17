"use client";

import { useMemo, useState } from "react";
import { BoxIcon } from "@/components/ui/box-icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { textIncludes } from "@/lib/search";
import { useIsMobile } from "@/hooks/use-mobile";

import { Client } from "@/prisma/client";
import { maskPhone } from "@/lib/masks";

export function ClientPicker({
  open,
  onClose,
  clients,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  onPick: (c: Client | null) => void;
}) {
  const [q, setQ] = useState("");
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    const t = q.trim();
    const withoutDefault = clients.filter(
      (c) => !textIncludes(c.name, "consumidor final") && !textIncludes(c.name, "ao consumidor")
    );
    return t
      ? withoutDefault.filter((c) => textIncludes(c.name, t))
      : withoutDefault;
  }, [q, clients]);

  const PickerContent = (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 overflow-hidden">
      <div className="relative shrink-0 mb-3">
        <BoxIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar clientes..."
          className="rounded-xl pl-9"
        />
      </div>
      <div className="min-h-0 flex-1">
        {/* SOLUÇÃO: Esconde a barra alvejando o elemento interno do Radix */}
        <ScrollArea className="h-full">
          <div className="space-y-1 pb-4">
            {(!q.trim() || textIncludes("consumidor final", q)) && (
              <button
                onClick={() => onPick(null)}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border/80 p-2.5 text-left transition hover:border-primary/40 hover:bg-accent"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <BoxIcon name="user" className="text-base text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">Consumidor Final</div>
                  <div className="truncate text-xs text-muted-foreground">
                    Venda avulsa sem cadastro de cliente
                  </div>
                </div>
              </button>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => onPick(c)}
                className="flex w-full items-center gap-3 rounded-xl border border-border/60 p-2.5 text-left transition hover:border-primary/40 hover:bg-accent"
              >

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {maskPhone(c.phone)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="shrink-0 px-4 text-center">
            <DrawerTitle className="text-center">Escolher cliente</DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {PickerContent}
            <div className="shrink-0 pt-3 pb-6 px-4 border-t border-border w-full flex flex-col gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-125 p-0 gap-0 overflow-hidden grid-rows-[auto_1fr] max-h-[85vh] [&>button]:hidden">
        <DialogHeader className="flex-row items-center gap-2 p-4 py-2">
          <DialogTitle>Escolher cliente</DialogTitle>
        </DialogHeader>
        {PickerContent}
      </DialogContent>
    </Dialog>
  );
}
