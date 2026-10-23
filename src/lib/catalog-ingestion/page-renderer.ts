import { chromium, type Browser } from "playwright";

let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    sharedBrowser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });
  }
  return sharedBrowser;
}

export interface RenderedPageResult {
  imageBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Renderiza uma folha PDF (Uint8Array ou Buffer) em uma imagem JPEG composta de alta resolução (~150 DPI).
 */
export async function renderPdfSheetToImage(
  pdfBytes: Uint8Array | Buffer,
  targetWidth = 2009
): Promise<RenderedPageResult> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const base64Data = Buffer.from(pdfBytes).toString("base64");

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
          <script>
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          </script>
          <style>body { margin: 0; padding: 0; background: #fff; overflow: hidden; }</style>
        </head>
        <body>
          <canvas id="pdf-canvas"></canvas>
        </body>
      </html>
    `);

    const dimensions = await page.evaluate(
      async ({ base64, desiredWidth }) => {
        const raw = atob(base64);
        const uint8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          uint8Array[i] = raw.charCodeAt(i);
        }

        const loadingTask = (window as unknown as { pdfjsLib: { getDocument: (opts: { data: Uint8Array }) => { promise: Promise<any> } } })
          .pdfjsLib.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;
        const pageObj = await pdf.getPage(1);

        const unscaledViewport = pageObj.getViewport({ scale: 1.0 });
        const scale = desiredWidth / unscaledViewport.width;
        const viewport = pageObj.getViewport({ scale });

        const canvas = document.getElementById("pdf-canvas") as HTMLCanvasElement;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Não foi possível obter o contexto 2D do Canvas.");

        await pageObj.render({ canvasContext: ctx, viewport }).promise;

        return { width: Math.round(viewport.width), height: Math.round(viewport.height) };
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
    await page.close();
  }
}

/**
 * Fecha a instância compartilhada do Chromium ao finalizar o job.
 */
export async function closeRenderer(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}
