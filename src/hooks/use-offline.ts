"use client";

import { useEffect, useState, useCallback } from "react";
import { syncManager } from "@/lib/offline/sync-manager";
import { getPendingSyncCount } from "@/lib/offline/offline-service";

export interface OfflineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  hasPending: boolean;
  syncNow: () => Promise<{ success: boolean; syncedCount: number; error?: string }>;
}

export function useOffline(): OfflineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const updateOnline = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        void syncManager.sync();
      }
    };

    const updateOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOffline);

    // Assina atualizações de estado do SyncManager
    const unsubscribe = syncManager.subscribe((status) => {
      setIsSyncing(status.isSyncing);
      setPendingCount(status.pendingCount);
    });

    // Carga inicial do contador de pendências
    void getPendingSyncCount().then((count) => {
      setPendingCount(count);
    });

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOffline);
      unsubscribe();
    };
  }, []);

  const syncNow = useCallback(async () => {
    return syncManager.sync();
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    hasPending: pendingCount > 0,
    syncNow,
  };
}
