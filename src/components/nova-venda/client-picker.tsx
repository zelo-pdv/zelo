"use client";

import { useMemo, useState } from "react";
import { BoxIcon } from "@/components/ui/box-icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
  onQuickCreate,
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  onPick: (c: Client | null) => void;
  onQuickCreate?: (data: { name: string; phone: string }) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    if (!onQuickCreate) return;

    setIsSaving(true);
    try {
      await onQuickCreate({
        name: newName.trim(),
        phone: newPhone.trim(),
      });
      setNewName("");
      setNewPhone("");
      setIsCreating(false);
    } catch {
      // Toast já tratado no caller
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const t = q.trim();
    const withoutDefault = clients.filter(
      (c) => !textIncludes(c.name, "consumidor final") && !textIncludes(c.name, "ao consumidor")
    );
    return t
      ? withoutDefault.filter((c) => textIncludes(c.name, t))
      : withoutDefault;
  }, [q, clients]);

  const PickerContent = isCreating ? (
    <form onSubmit={handleCreateSubmit} className="flex min-h-0 flex-1 flex-col px-4 pb-4 overflow-hidden gap-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="client-quick-name" className="text-xs font-semibold">
            Nome do cliente <span className="text-destructive">*</span>
          </Label>
          <Input
            id="client-quick-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex.: Maria Silva"
            className="rounded-xl text-base md:text-sm"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client-quick-phone" className="text-xs font-semibold">
            Telefone / WhatsApp
          </Label>
          <Input
            id="client-quick-phone"
            value={newPhone}
            onChange={(e) => setNewPhone(maskPhone(e.target.value))}
            placeholder="(00) 00000-0000"
            className="rounded-xl text-base md:text-sm"
          />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSaving || !newName.trim()}
          className="h-10 w-full rounded-full font-medium"
        >
          {isSaving ? "Salvando..." : "Salvar e Selecionar"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setIsCreating(false);
            setNewName("");
            setNewPhone("");
          }}
          className="h-9 w-full rounded-full text-xs text-muted-foreground"
        >
          Voltar para busca
        </Button>
      </div>
    </form>
  ) : (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 overflow-hidden">
      <div className="flex gap-2 shrink-0 mb-3">
        <div className="relative flex-1">
          <BoxIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar clientes..."
            className="rounded-xl pl-9"
          />
        </div>
        {onQuickCreate && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCreating(true)}
            className="rounded-xl shrink-0 gap-1 px-3"
            title="Cadastrar cliente rápido"
          >
            <BoxIcon name="user-plus" className="text-base" />
            <span className="hidden sm:inline">Novo</span>
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1">
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
            <DrawerTitle className="text-center">
              {isCreating ? "Novo cliente rápido" : "Escolher cliente"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {PickerContent}
            {!isCreating && (
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
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-125 p-0 gap-0 overflow-hidden grid-rows-[auto_1fr] max-h-[85vh]">
        <DialogHeader className="flex-row items-center gap-2 p-4 py-2 pr-10">
          <DialogTitle>
            {isCreating ? "Novo cliente rápido" : "Escolher cliente"}
          </DialogTitle>
        </DialogHeader>
        {PickerContent}
      </DialogContent>
    </Dialog>
  );
}
