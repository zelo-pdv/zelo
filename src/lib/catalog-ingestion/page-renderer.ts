import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { chromium, type Browser } from "playwright";

const require = createRequire(import.meta.url);

let sharedBrowser: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;
let activeRenderPages = 0;
let activeRendererLeases = 0;
let pendingBrowserClose = false;

interface PdfJsAssets {
  pdfJsBytes: Buffer;
  workerBytes: Buffer;
  standardFontsDir: string | null;
}

let cachedAssets: PdfJsAssets | null = null;

function resolvePdfJsAssets(): PdfJsAssets {
  if (cachedAssets) return cachedAssets;

  const pkgDir = path.dirname(require.resolve("pdfjs-dist/package.json"));
  const candidatePairs: Array<[string, string]> = [
    [
      path.join(pkgDir, "build", "pdf.min.mjs"),
      path.join(pkgDir, "build", "pdf.worker.min.mjs"),
    ],
    [
      path.join(pkgDir, "legacy", "build", "pdf.min.mjs"),
      path.join(pkgDir, "legacy", "build", "pdf.worker.min.mjs"),
    ],
  ];

  for (const [pdfPath, workerPath] of candidatePairs) {
    if (fs.existsSync(pdfPath) && fs.existsSync(workerPath)) {
      const fontsDir = path.join(pkgDir, "standard_fonts");
      cachedAssets = {
        pdfJsBytes: fs.readFileSync(pdfPath),
        workerBytes: fs.readFileSync(workerPath),
        standardFontsDir: fs.existsSync(fontsDir) ? fontsDir : null,
      };
      return cachedAssets;
    }
  }

  throw new Error(
    "Arquivos locais do pdfjs-dist (pdf.min.mjs / pdf.worker.min.mjs) não encontrados em node_modules."
  );
}

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    return sharedBrowser;
  }

  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() || undefined;

  browserLaunchPromise = chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    sharedBrowser = await browserLaunchPromise;
    return sharedBrowser;
  } finally {
    browserLaunchPromise = null;
  }
}

async function tryCloseIdleBrowser(): Promise<void> {
  if (
    pendingBrowserClose &&
    activeRendererLeases === 0 &&
    activeRenderPages === 0 &&
    sharedBrowser
  ) {
    const browserToClose = sharedBrowser;
    sharedBrowser = null;
    pendingBrowserClose = false;
    await browserToClose.close().catch(() => {});
  }
}

/**
 * Reserva uma concessão de uso do Chromium compartilhado para um job inteiro,
 * impedindo que outro job paralelo encerre o browser antes da conclusão.
 */
export function retainRenderer(): () => void {
  activeRendererLeases++;
  pendingBrowserClose = false;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    activeRendererLeases = Math.max(0, activeRendererLeases - 1);
    if (pendingBrowserClose && activeRendererLeases === 0 && activeRenderPages === 0) {
      void tryCloseIdleBrowser();
    }
  };
}

export function getRendererState() {
  return {
    hasBrowser: Boolean(sharedBrowser?.isConnected()),
    activeLeases: activeRendererLeases,
    activePages: activeRenderPages,
    pendingClose: pendingBrowserClose,
  };
}

export interface RenderedPageResult {
  imageBuffer: Buffer;
  width: number;
  height: number;
}

const RENDER_ORIGIN = "https://pdfjs.local";

const RENDER_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>body { margin: 0; padding: 0; background: #fff; overflow: hidden; }</style>
    <script type="module">
      import * as pdfjsLib from "${RENDER_ORIGIN}/pdf.min.mjs";
      pdfjsLib.GlobalWorkerOptions.workerSrc = "${RENDER_ORIGIN}/pdf.worker.min.mjs";
      window.__zeloRenderPdf = async ({ base64, desiredWidth }) => {
        const raw = atob(base64);
        const uint8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          uint8Array[i] = raw.charCodeAt(i);
        }
        const loadingTask = pdfjsLib.getDocument({
          data: uint8Array,
          standardFontDataUrl: "${RENDER_ORIGIN}/standard_fonts/",
          verbosity: 0,
        });
        const pdf = await loadingTask.promise;
        const pageObj = await pdf.getPage(1);
        const unscaledViewport = pageObj.getViewport({ scale: 1.0 });
        const scale = desiredWidth / unscaledViewport.width;
        const viewport = pageObj.getViewport({ scale });

        const canvas = document.getElementById("pdf-canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Não foi possível obter o contexto 2D do Canvas.");

        await pageObj.render({ canvasContext: ctx, viewport }).promise;
        return {
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        };
      };
    </script>
  </head>
  <body>
    <canvas id="pdf-canvas"></canvas>
  </body>
</html>`;

/**
 * Renderiza uma folha PDF (Uint8Array ou Buffer) em imagem JPEG (~150 DPI)
 * usando bundle local de `pdfjs-dist` (sem dependência de CDN externa).
 */
export async function renderPdfSheetToImage(
  pdfBytes: Uint8Array | Buffer,
  targetWidth = 2009
): Promise<RenderedPageResult> {
  const assets = resolvePdfJsAssets();
  const browser = await getBrowser();
  const page = await browser.newPage();
  activeRenderPages++;

  try {
    await page.route("**/*", async (route) => {
      const url = route.request().url();
      if (!url.startsWith(RENDER_ORIGIN)) {
        await route.abort();
        return;
      }

      if (url === `${RENDER_ORIGIN}/render.html`) {
        await route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: RENDER_HTML,
        });
        return;
      }

      if (url === `${RENDER_ORIGIN}/pdf.min.mjs`) {
        await route.fulfill({
          status: 200,
          contentType: "application/javascript; charset=utf-8",
          body: assets.pdfJsBytes,
        });
        return;
      }

      if (url === `${RENDER_ORIGIN}/pdf.worker.min.mjs`) {
        await route.fulfill({
          status: 200,
          contentType: "application/javascript; charset=utf-8",
          body: assets.workerBytes,
        });
        return;
      }

      if (url.startsWith(`${RENDER_ORIGIN}/standard_fonts/`) && assets.standardFontsDir) {
        const fontFileName = path.basename(
          decodeURIComponent(url.slice(`${RENDER_ORIGIN}/standard_fonts/`.length))
        );
        const fontFilePath = path.join(assets.standardFontsDir, fontFileName);
        if (fs.existsSync(fontFilePath)) {
          await route.fulfill({
            status: 200,
            contentType: "application/octet-stream",
            body: fs.readFileSync(fontFilePath),
          });
          return;
        }
      }

      await route.fulfill({ status: 404, body: "Not found" });
    });

    await page.goto(`${RENDER_ORIGIN}/render.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => typeof (window as unknown as { __zeloRenderPdf?: unknown }).__zeloRenderPdf === "function",
      undefined,
      { timeout: 10000 }
    );

    const base64Data = Buffer.from(pdfBytes).toString("base64");
    const dimensions = await page.evaluate(
      async ({ base64, desiredWidth }) => {
        const fn = (
          window as unknown as {
            __zeloRenderPdf: (args: {
              base64: string;
              desiredWidth: number;
            }) => Promise<{ width: number; height: number }>;
          }
        ).__zeloRenderPdf;
        return fn({ base64, desiredWidth });
      },
      { base64: base64Data, desiredWidth: targetWidth }
    );

    const canvasElement = await page.$("#pdf-canvas");
    if (!canvasElement) {
      throw new Error("Elemento canvas não encontrado após a renderização do PDF.");
    }

    const imageBuffer = (await canvasElement.screenshot({
      type: "jpeg",
      quality: 92,
    })) as Buffer;

    return {
      imageBuffer,
      width: dimensions.width,
      height: dimensions.height,
    };
  } finally {
    await page.close().catch(() => {});
    activeRenderPages = Math.max(0, activeRenderPages - 1);
    await tryCloseIdleBrowser();
  }
}

/**
 * Solicita o fechamento da instância compartilhada do Chromium quando não houver
 * jobs ou renderizações ativas em paralelo.
 */
export async function closeRenderer(): Promise<void> {
  pendingBrowserClose = true;
  await tryCloseIdleBrowser();
}
