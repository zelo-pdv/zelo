import { getOfflineDb, type LocalSyncQueueItem } from "./db";
import { apiRequest, ApiRequestError } from "@/lib/api-request";
import { notifyLocalSync } from "@/hooks/use-data-sync";

type SyncListener = (status: { isSyncing: boolean; pendingCount: number }) => void;

const MAX_AUTO_SYNC_ATTEMPTS = 5;

class SyncManager {
  private isSyncing = false;
  private activeSyncPromise: Promise<{
    success: boolean;
    syncedCount: number;
    error?: string;
  }> | null = null;
  private listeners: Set<SyncListener> = new Set();
  private intervalTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        void this.sync(false);
      });
      window.addEventListener("zelo-sync-queue-updated", () => {
        void this.notify();
      });

      // Tenta sincronizar periodicamente quando online (a cada 30 segundos)
      this.intervalTimer = setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          void this.sync(false);
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
   * No modo automático (`force = false`), ignora itens que já atingiram o limite
   * de tentativas ou falharam com erro 4xx permanente.
   */
  public async sync(
    force = true
  ): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (typeof window === "undefined" || !navigator.onLine) {
      return {
        success: false,
        syncedCount: 0,
        error: "Sem conexão com a internet.",
      };
    }

    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }

    const db = getOfflineDb();
    if (!db) {
      return { success: false, syncedCount: 0 };
    }

    // Reserva o mutex sincronamente antes de qualquer `await` no IndexedDB
    this.isSyncing = true;
    const runPromise = (async (): Promise<{
      success: boolean;
      syncedCount: number;
      error?: string;
    }> => {
      let queueItems: LocalSyncQueueItem[] = [];
      try {
        await this.notify();
        const allQueueItems = await db.syncQueue.toArray();
        queueItems = force
          ? allQueueItems
          : allQueueItems.filter((q) => (q.attempts || 0) < MAX_AUTO_SYNC_ATTEMPTS);

        if (queueItems.length === 0) {
          return { success: true, syncedCount: 0 };
        }
      const clientsPayload = queueItems
        .filter((q) => q.type === "CREATE_CLIENT")
        .map((q) => ({
          ...q.payload,
          tempId: q.payload?.tempId || q.tempId,
        }));

      const productsPayload = queueItems
        .filter((q) => q.type === "CREATE_PRODUCT")
        .map((q) => ({
          ...q.payload,
          tempId: q.payload?.tempId || q.tempId,
        }));

      const salesPayload = queueItems
        .filter((q) => q.type === "CREATE_SALE")
        .map((q) => ({
          ...q.payload,
          tempId: q.payload?.tempId || q.tempId,
        }));

      const response = await apiRequest<{
        success: boolean;
        idMap: Record<string, string>;
        syncedSales: Array<{
          tempId: string;
          serverId: string;
          saleNumber: number;
        }>;
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

        await db.transaction(
          "rw",
          [db.syncQueue, db.sales, db.clients, db.products],
          async () => {
            // 1. Atualiza vendas sincronizadas com os números e IDs reais emitidos pelo banco
            for (const s of syncedSales) {
              const existingSale = await db.sales.get(s.tempId);
              if (existingSale) {
                const remappedClientId =
                  existingSale.clientId && idMap[existingSale.clientId]
                    ? idMap[existingSale.clientId]
                    : existingSale.clientId;
                const remappedItems = existingSale.items.map((item) => ({
                  ...item,
                  productId: idMap[item.productId] || item.productId,
                }));

                await db.sales.update(s.tempId, {
                  clientId: remappedClientId,
                  items: remappedItems,
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
                    await db.clients.put({
                      ...item,
                      id: realId,
                      isLocalOnly: false,
                    });
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
                    await db.products.put({
                      ...item,
                      id: realId,
                      isLocalOnly: false,
                    });
                  }
                }
              }
            }

            // 4. Propaga IDs reais para quaisquer vendas pendentes restantes
            if (Object.keys(idMap).length > 0) {
              const remainingSales = await db.sales
                .filter((sale) => !sale.synced)
                .toArray();
              for (const sale of remainingSales) {
                const nextClientId =
                  sale.clientId && idMap[sale.clientId]
                    ? idMap[sale.clientId]
                    : sale.clientId;
                const nextItems = sale.items.map((item) => ({
                  ...item,
                  productId: idMap[item.productId] || item.productId,
                }));
                await db.sales.update(sale.id, {
                  clientId: nextClientId,
                  items: nextItems,
                });
              }

              const remainingQueue = await db.syncQueue.toArray();
              for (const qItem of remainingQueue) {
                if (qItem.type === "CREATE_SALE" && qItem.id && qItem.payload) {
                  const p = qItem.payload;
                  const nextClientId =
                    p.clientId && idMap[p.clientId]
                      ? idMap[p.clientId]
                      : p.clientId;
                  const nextItems = Array.isArray(p.items)
                    ? p.items.map((item: any) => ({
                        ...item,
                        productId: idMap[item.productId] || item.productId,
                      }))
                    : p.items;
                  await db.syncQueue.update(qItem.id, {
                    payload: {
                      ...p,
                      clientId: nextClientId,
                      items: nextItems,
                    },
                  });
                }
              }
            }

            // 5. Limpa itens processados da fila
            const processedIds = queueItems.map((q) => q.id!).filter(Boolean);
            await db.syncQueue.bulkDelete(processedIds);
          }
        );

        // Notifica o restante da aplicação sobre novas vendas/produtos/clientes
        notifyLocalSync("sales");
        notifyLocalSync("products");
        notifyLocalSync("clients");

        return { success: true, syncedCount: queueItems.length };
      }

      return {
        success: false,
        syncedCount: 0,
        error: "Resposta inesperada do servidor.",
      };
    } catch (err: any) {
      console.error("Falha ao sincronizar pendências:", err);
      const isPermanentClientError =
        err instanceof ApiRequestError && err.status >= 400 && err.status < 500;

      // Incrementa contagem de tentativas (ou trava auto-retry em erro 4xx permanente)
      const ids = queueItems.map((q) => q.id!).filter(Boolean);
      for (const id of ids) {
        const item = await db.syncQueue.get(id);
        if (item) {
          const nextAttempts = isPermanentClientError
            ? MAX_AUTO_SYNC_ATTEMPTS
            : (item.attempts || 0) + 1;
          await db.syncQueue.update(id, {
            attempts: nextAttempts,
            lastError: err?.message || "Erro desconhecido de conexão",
          });
        }
      }
      return { success: false, syncedCount: 0, error: err?.message };
      } finally {
        this.isSyncing = false;
        this.activeSyncPromise = null;
        await this.notify();
      }
    })();

    this.activeSyncPromise = runPromise;
    return runPromise;
  }
}

export const syncManager = new SyncManager();
