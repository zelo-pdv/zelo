import { getOfflineDb } from "./db";
import { apiRequest } from "@/lib/api-request";
import { notifyLocalSync } from "@/hooks/use-data-sync";

type SyncListener = (status: { isSyncing: boolean; pendingCount: number }) => void;

class SyncManager {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private intervalTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        void this.sync();
      });

      // Tenta sincronizar periodicamente quando online (a cada 30 segundos)
      this.intervalTimer = setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          void this.sync();
        }
      }, 30000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    void this.notify();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notify() {
    const db = getOfflineDb();
    const pendingCount = db ? await db.syncQueue.count() : 0;
    for (const listener of this.listeners) {
      listener({ isSyncing: this.isSyncing, pendingCount });
    }
  }

  /**
   * Executa a rotina de sincronização enviando as pendências para o servidor.
   */
  public async sync(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (typeof window === "undefined" || !navigator.onLine) {
      return { success: false, syncedCount: 0, error: "Sem conexão com a internet." };
    }

    if (this.isSyncing) {
      return { success: false, syncedCount: 0, error: "Sincronização já em andamento." };
    }

    const db = getOfflineDb();
    if (!db) {
      return { success: false, syncedCount: 0 };
    }

    const queueItems = await db.syncQueue.toArray();
    if (queueItems.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    this.isSyncing = true;
    await this.notify();

    try {
      const clientsPayload = queueItems
        .filter((q) => q.type === "CREATE_CLIENT")
        .map((q) => q.payload);

      const productsPayload = queueItems
        .filter((q) => q.type === "CREATE_PRODUCT")
        .map((q) => q.payload);

      const salesPayload = queueItems
        .filter((q) => q.type === "CREATE_SALE")
        .map((q) => q.payload);

      const response = await apiRequest<{
        success: boolean;
        idMap: Record<string, string>;
        syncedSales: Array<{ tempId: string; serverId: string; saleNumber: number }>;
      }>("/sync", {
        method: "POST",
        body: JSON.stringify({
          clients: clientsPayload,
          products: productsPayload,
          sales: salesPayload,
        }),
      });

      if (response && response.success) {
        const { idMap, syncedSales } = response;

        await db.transaction("rw", [db.syncQueue, db.sales, db.clients, db.products], async () => {
          // 1. Atualiza vendas sincronizadas com os números e IDs reais emitidos pelo banco
          for (const s of syncedSales) {
            const existingSale = await db.sales.get(s.tempId);
            if (existingSale) {
              await db.sales.update(s.tempId, {
                synced: true,
                syncedAt: new Date().toISOString(),
                serverSaleId: s.serverId,
                saleNumber: s.saleNumber,
              });
            }
          }

          // 2. Remove flags locais de clientes que foram sincronizados
          for (const c of clientsPayload) {
            if (c.tempId) {
              const realId = idMap[c.tempId];
              await db.clients.update(c.tempId, { isLocalOnly: false });
              if (realId && realId !== c.tempId) {
                const item = await db.clients.get(c.tempId);
                if (item) {
                  await db.clients.delete(c.tempId);
                  await db.clients.put({ ...item, id: realId, isLocalOnly: false });
                }
              }
            }
          }

          // 3. Remove flags locais de produtos sincronizados
          for (const p of productsPayload) {
            if (p.tempId) {
              const realId = idMap[p.tempId];
              await db.products.update(p.tempId, { isLocalOnly: false });
              if (realId && realId !== p.tempId) {
                const item = await db.products.get(p.tempId);
                if (item) {
                  await db.products.delete(p.tempId);
                  await db.products.put({ ...item, id: realId, isLocalOnly: false });
                }
              }
            }
          }

          // 4. Limpa itens processados da fila
          const processedIds = queueItems.map((q) => q.id!).filter(Boolean);
          await db.syncQueue.bulkDelete(processedIds);
        });

        // Notifica o restante da aplicação sobre novas vendas/produtos/clientes
        notifyLocalSync("sales");
        notifyLocalSync("products");
        notifyLocalSync("clients");

        return { success: true, syncedCount: queueItems.length };
      }

      return { success: false, syncedCount: 0, error: "Resposta inesperada do servidor." };
    } catch (err: any) {
      console.error("Falha ao sincronizar pendências:", err);
      // Incrementa contagem de tentativas nos itens
      const ids = queueItems.map((q) => q.id!).filter(Boolean);
      for (const id of ids) {
        const item = await db.syncQueue.get(id);
        if (item) {
          await db.syncQueue.update(id, {
            attempts: (item.attempts || 0) + 1,
            lastError: err?.message || "Erro desconhecido de conexão",
          });
        }
      }
      return { success: false, syncedCount: 0, error: err?.message };
    } finally {
      this.isSyncing = false;
      await this.notify();
    }
  }
}

export const syncManager = new SyncManager();
