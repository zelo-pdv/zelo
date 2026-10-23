"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BoxIcon } from "@/components/ui/box-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface StoreStatusToggleProps {
  storeId: string;
  storeName: string;
  isActive: boolean;
}

export function StoreStatusToggle({
  storeId,
  storeName,
  isActive,
}: StoreStatusToggleProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: `Alteração de status realizada na página de detalhes da loja.`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Falha ao alterar status da loja.");
        return;
      }

      toast.success(data.message || "Status da loja alterado com sucesso.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Erro de comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={isActive ? "destructive" : "default"}
        size="sm"
        onClick={() => setOpen(true)}
        className={`h-9 px-3.5 text-xs font-medium shadow-xs ${
          !isActive ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
        }`}
      >
        <BoxIcon name={isActive ? "block" : "check"} className="size-4 mr-1.5" />
        {isActive ? "Desativar Loja" : "Ativar Loja"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BoxIcon
                name={isActive ? "error" : "check-shield"}
                className={`size-5 ${
                  isActive ? "text-destructive" : "text-emerald-500"
                }`}
              />
              {isActive
                ? `Desativar loja "${storeName}"?`
                : `Ativar loja "${storeName}"?`}
            </DialogTitle>
            <DialogDescription className="text-xs pt-2">
              {isActive ? (
                <span className="space-y-2 block">
                  <span>
                    Atenção: Ao desativar esta loja, todos os operadores e o proprietário perderão
                    acesso imediato ao sistema.
                  </span>
                  <span className="block text-destructive font-semibold">
                    Tentativas de login ou requisições à API serão bloqueadas em tempo real.
                  </span>
                </span>
              ) : (
                <span>
                  A loja será marcada como ativa e os usuários cadastrados poderão voltar a
                  acessar o sistema e registrar vendas.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant={isActive ? "destructive" : "default"}
              size="sm"
              onClick={handleToggle}
              disabled={loading}
              className={`text-xs ${
                !isActive ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <BoxIcon name="loader-alt" className="size-3.5 animate-spin" />
                  Processando...
                </span>
              ) : isActive ? (
                "Confirmar Desativação"
              ) : (
                "Confirmar Ativação"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
