# 10. Arquitetura PWA e Experiência Mobile Nativa

Este documento descreve a infraestrutura de **Progressive Web App (PWA)** do Zelo, as estratégias de **Service Worker** com a biblioteca moderna **Serwist**, o controle de cache dinâmico e o polimento de interface mobile para proporcionar uma sensação idêntica à de um aplicativo instalado.

---

## 1. Stack Tecnológica de PWA: Serwist no Next.js 15

Historicamente, o ecossistema Next.js utilizava a biblioteca `next-pwa`. No entanto, com a chegada do Next.js 14/15 e do Webpack 5 moderno, o `next-pwa` foi descontinuado.

O Zelo adota oficialmente o **Serwist (`@serwist/next` e `serwist`)**, que é o fork mantido ativamente e padronizado para o Next.js App Router.

### Configuração no `next.config.ts`:
```typescript
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",     // Código-fonte TypeScript do Service Worker
  swDest: "public/sw.js",     // Output compilado servido publicamente
  disable: process.env.NODE_ENV === "development", // Desativa em dev para não interferir no hot-reload
});

const nextConfig: NextConfig = {
  // configurações...
};

export default withSerwist(nextConfig);
```

---

## 2. Estratégias de Cache no Service Worker (`src/app/sw.ts`)

O Service Worker implementa regras estritas de particionamento de tráfego, garantindo que dados confidenciais ou transações nunca sejam servidos desatualizados:

```typescript
// src/app/sw.ts
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { Serwist, NetworkOnly, StaleWhileRevalidate, CacheFirst, ExpirationPlugin } from "serwist";

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,      // Assume o controle imediatamente ao instalar nova versão
  clientsClaim: true,     // Ativa controle sobre abas abertas sem aguardar reload
  navigationPreload: true,
  runtimeCaching: [
    // 1. APIs e Mutacões: NUNCA armazena em cache (Segurança Máxima)
    {
      matcher: /^\/api\//,
      handler: new NetworkOnly(),
    },

    // 2. Páginas HTML e Dados de Rotas: StaleWhileRevalidate
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        request.destination === "document" ||
        (sameOrigin && pathname.startsWith("/_next/data/")),
      handler: new StaleWhileRevalidate({
        cacheName: "pages-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 24 Horas
          }),
        ],
      }),
    },

    // 3. Arquivos Estáticos Imutáveis (JS, CSS, Fontes Woff2): CacheFirst
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        sameOrigin &&
        (pathname.startsWith("/_next/static/") ||
          pathname.match(/\.(woff|woff2|eot|ttf|otf)$/i) ||
          request.destination === "font"),
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Dias
          }),
        ],
      }),
    },

    // 4. Imagens de Produtos e Mídia: StaleWhileRevalidate
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "image-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Dias
          }),
        ],
      }),
    },

    ...defaultCache,
  ],
});

serwist.addEventListeners();
```

---

## 3. O Ciclo de Atualização Transparente (`PWAUpdater`)

Quando um novo deploy vai ao ar, o Service Worker baixa os novos assets em segundo plano. O componente `src/components/pwa-updater.tsx` escuta o evento de troca de versão e notifica o usuário:

```tsx
// src/components/pwa-updater.tsx
"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function PWAUpdater() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);

      // Detecta quando o novo Service Worker assumiu o controle
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        toast.info("Atualização disponível", {
          description: "Aplicando a nova versão do sistema...",
          duration: 3000,
        });

        // Recarrega suavemente a aplicação após o toast
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      });
    }
  }, []);

  return null;
}
```

---

## 4. Polimento Nativo: Status Bar e Safe Areas (`ThemeColorUpdater`)

Aplicações web comuns costumam ter barras de status do navegador que contrastam bruscamente com a cor do cabeçalho ou com os modais.

O Zelo soluciona isso com duas técnicas avançadas:

### 1. Viewport Fit Cover (`src/app/layout.tsx`)
```typescript
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // Permite que a aplicação expanda até a área do entalhe/Dynamic Island
};
```

### 2. Sincronizador Dinâmico de Cor da Barra de Status (`ThemeColorUpdater.tsx`)
O componente `src/components/theme-color-updater.tsx` utiliza um `MutationObserver` no DOM para detectar se um `Drawer` ou `Dialog` com desfoque de fundo (*backdrop blur*) foi aberto.
- **Se um modal foi aberto:** Escurece dinamicamente a `meta[name="theme-color"]` para `#070507` no dark mode ou `#999999` no light mode, fazendo com que a barra superior do celular e a barra inferior de gestos se fundam perfeitamente com a penumbra do modal!
- **Ao fechar o modal:** Restaura a cor de fundo original do aplicativo (`#0C090C` no dark ou `#ffffff` no light).

---

## 5. Web App Manifest (`public/site.webmanifest`)

O manifesto define a identidade de instalação PWA:

```json
{
  "name": "Nome da Aplicação",
  "short_name": "App",
  "description": "Descrição funcional do sistema.",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}
```

- **`display: "standalone"`:** Remove a barra de navegação e botões do navegador ao abrir o app a partir do ícone na tela inicial do celular.

---

## 6. Como Configurar um Novo Projeto PWA Seguindo Esta Referência

1. Instale o Serwist:
   ```bash
   pnpm add serwist @serwist/next
   ```
2. Adicione os tipos do worker no `tsconfig.json`:
   ```json
   "lib": ["dom", "dom.iterable", "esnext", "webworker"]
   ```
3. Crie `src/app/sw.ts` com as 4 regras de cache documentadas na Seção 2.
4. Envolva o `nextConfig` com `withSerwistInit` em `next.config.ts`.
5. Crie `public/site.webmanifest` e gere os ícones de 192px e 512px.
6. Adicione `<PWAUpdater />` e `<ThemeColorUpdater />` dentro de `src/app/layout.tsx`.

---

## 7. Auditoria de Fidelidade

- **Padrão Existente `[PADRÃO EXISTENTE]`:** Uso oficial de Serwist com geração em `public/sw.js`, `ThemeColorUpdater` via MutationObserver para blending de status bar em modais e manifesto standalone.
- **Inconsistência Identificada `[PARCIALMENTE ADOTADO]`:** Não há persistência de formulários offline para sincronização posterior (*Background Sync* / *IndexedDB Outbox*). Se a internet cair durante o envio de uma venda, a requisição falha e exige reenvio manual quando a conexão voltar.
- **Recomendação Futura `[RECOMENDAÇÃO FUTURA]`:** Implementar fila de requisições offline via IndexedDB (ex.: `idb-keyval` ou plugin Workbox Background Sync) caso o novo projeto exija operação plena em ambientes sem sinal de internet (trabalho em campo).
