"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export function ThemeColorUpdater() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const checkIsDark = () => {
      if (resolvedTheme === "dark") return true;
      if (resolvedTheme === "light") return false;
      if (typeof document !== "undefined") {
        return document.documentElement.classList.contains("dark");
      }
      return false;
    };

    const updateStatusBar = () => {
      const isDark = checkIsDark();

      const activeFormOverlay = document.querySelector(
        [
          '[data-slot="drawer-overlay"][data-blur]:not([data-closed]):not([data-ending-style])',
          '[data-slot="dialog-overlay"][data-blur]:not([data-closed]):not([data-ending-style])',
          '[data-slot="drawer-popup"][data-blur]:not([data-closed]):not([data-ending-style])',
          '[data-slot="dialog-content"][data-blur]:not([data-closed]):not([data-ending-style])',
        ].join(", ")
      );

      const isFormOpen = Boolean(activeFormOverlay);

      const LIGHT_COLOR = "#DCEBFE";
      const DARK_COLOR = "#0C090C";

      // Quando aberto formulário com desfoque (drawer/dialog com blur):
      // - Modo dark: #000000 (preto profundo igual ao fundo escurecido com desfoque)
      // - Modo light: #999999 (cinza suave equivalente ao desfoque bg-black/40 sobre azul claro)
      // Quando fechado ou componente sem desfoque (ex: filtros, detalhes, comprovantes):
      // - Modo dark: #0C090C (cor real de fundo do app em dark mode, oklch(0.145 0.008 326))
      // - Modo light: #DCEBFE (cor de fundo azul claro do app em light mode)
      const color = isFormOpen
        ? isDark
          ? "#000000"
          : "#999999"
        : isDark
        ? DARK_COLOR
        : LIGHT_COLOR;

      // Atualiza meta[name="theme-color"]
      // Para garantir que o Android (Chrome/PWA) atualize a System Navigation Bar
      // imediatamente na troca de tema, removemos todas as tags anteriores
      // e inserimos um novo elemento limpo no <head>.
      const existingMetas = document.querySelectorAll('meta[name="theme-color"]');
      let needsUpdate = true;
      if (existingMetas.length === 1) {
        const current = existingMetas[0];
        if (
          current.getAttribute("content") === color &&
          !current.hasAttribute("media")
        ) {
          needsUpdate = false;
        }
      }

      if (needsUpdate) {
        existingMetas.forEach((el) => el.remove());
        const meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        meta.setAttribute("content", color);
        document.head.appendChild(meta);
      }

      // Atualiza meta[name="apple-mobile-web-app-status-bar-style"]
      // No modo light mantém "default" (ícones escuros legíveis no branco e no cinza desfoque)
      // No modo dark utiliza "black-translucent" (ícones claros no fundo escuro)
      let appleMeta = document.querySelector(
        'meta[name="apple-mobile-web-app-status-bar-style"]'
      );
      if (!appleMeta) {
        appleMeta = document.createElement("meta");
        appleMeta.setAttribute(
          "name",
          "apple-mobile-web-app-status-bar-style"
        );
        document.head.appendChild(appleMeta);
      }
      const appleContent = isDark ? "black-translucent" : "default";
      if (appleMeta.getAttribute("content") !== appleContent) {
        appleMeta.setAttribute("content", appleContent);
      }
    };

    // Executa inicialmente
    updateStatusBar();

    // Observa mutações no DOM para detectar abertura/fechamento de formulários/drawers
    const observer = new MutationObserver(() => {
      updateStatusBar();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-closed",
        "data-ending-style",
        "data-open",
        "data-blur",
        "open",
        "style",
      ],
    });

    // Observa alteração de classe de tema no <html>
    const htmlObserver = new MutationObserver(() => {
      updateStatusBar();
    });
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      htmlObserver.disconnect();
    };
  }, [theme, resolvedTheme]);

  return null;
}

