"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function PWAUpdater() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Registrar o Service Worker de forma segura
      navigator.serviceWorker.register("/sw.js").catch(function (err) {
        console.error("Falha ao registrar Service Worker:", err);
      });

      // Ouvir atualizações
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        toast.info("Atualização disponível", {
          description: "A aplicar a nova versão do sistema...",
          duration: 3000,
        });

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      });
    }
  }, []);

  return null;
}
