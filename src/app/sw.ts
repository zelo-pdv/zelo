/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  NetworkOnly,
  NetworkFirst,
  StaleWhileRevalidate,
  CacheFirst,
  ExpirationPlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const isSameOriginApi = ({
  sameOrigin,
  url: { pathname },
}: {
  sameOrigin: boolean;
  url: URL;
}) => sameOrigin && pathname.startsWith("/api/");

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // Nenhuma chamada /api/* deve ser servida de cache pelo Service Worker
    {
      matcher: isSameOriginApi,
      method: "GET",
      handler: new NetworkOnly(),
    },
    {
      matcher: isSameOriginApi,
      method: "POST",
      handler: new NetworkOnly(),
    },
    // Separa caches de RSC Prefetch, RSC Payload e Documento HTML para evitar sobrescrita na mesma URL
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        sameOrigin &&
        !pathname.startsWith("/api/") &&
        request.headers.get("RSC") === "1" &&
        request.headers.get("Next-Router-Prefetch") === "1",
      handler: new NetworkFirst({
        cacheName: "pages-rsc-prefetch",
        networkTimeoutSeconds: 5,
        matchOptions: { ignoreVary: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        sameOrigin &&
        !pathname.startsWith("/api/") &&
        request.headers.get("RSC") === "1",
      handler: new NetworkFirst({
        cacheName: "pages-rsc",
        networkTimeoutSeconds: 5,
        matchOptions: { ignoreVary: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        sameOrigin &&
        !pathname.startsWith("/api/") &&
        (request.destination === "document" ||
          request.headers.get("accept")?.includes("text/html") ||
          pathname.startsWith("/_next/data/")),
      handler: new NetworkFirst({
        cacheName: "pages-html",
        networkTimeoutSeconds: 4,
        matchOptions: { ignoreVary: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
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
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "image-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
