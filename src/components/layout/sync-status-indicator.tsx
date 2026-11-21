"use client";

import { useOffline } from "@/hooks/use-offline";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SyncStatusIndicator() {
  const { isOnline, isSyncing, pendingCount, syncNow } = useOffline();

  const handleManualSync = async () => {
    toast.info("Iniciando sincronização...");
    const res = await syncNow();
    if (res.success) {
      toast.success(
        res.syncedCount > 0
          ? `${res.syncedCount} item(ns) sincronizado(s) com sucesso!`
          : "Tudo sincronizado!"
      );
    } else {
      toast.error(res.error || "Erro ao sincronizar.");
    }
  };

  // Se estiver sincronizando
  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse">
        <BoxIcon name="loader-alt" className="animate-spin text-sm" />
        <span className="hidden sm:inline">Sincronizando...</span>
      </div>
    );
  }

  // Se estiver sem conexão
  if (!isOnline) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20"
        title="Você está trabalhando offline. Os dados serão salvos localmente e sincronizados quando a conexão voltar."
      >
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
        <BoxIcon name="wifi-off" className="text-sm" />
        <span>Offline</span>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  // Se estiver online mas houver pendências na fila
  if (pendingCount > 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleManualSync}
        className="h-7 rounded-full text-xs gap-1 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 px-2.5"
        title="Existem operações salvas offline aguardando sincronização."
      >
        <BoxIcon name="cloud-upload" className="text-sm" />
        <span>Sincronizar ({pendingCount})</span>
      </Button>
    );
  }

  // Quando online e 100% sincronizado, mantém discreto
  return null;
}
