import { createRequire } from "module";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { createWorker, type Worker as TesseractWorker } from "tesseract.js";
import type { TextSpan } from "./types";

const require = createRequire(import.meta.url);

// Polyfills necessários para o PDF.js renderizar páginas no Node.js com @napi-rs/canvas
function ensureCanvasGlobals() {
  const g = globalThis as Record<string, unknown>;
  if (!g.DOMMatrix) g.DOMMatrix = DOMMatrix;
  if (!g.ImageData) g.ImageData = ImageData;
  if (!g.Path2D) g.Path2D = Path2D;
}

class NodeCanvasFactory {
  create(width: number, height: number) {
    const safeW = Math.max(1, Math.round(width));
    const safeH = Math.max(1, Math.round(height));
    const canvas = createCanvas(safeW, safeH);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }

  reset(canvasAndContext: { canvas: any; context: any }, width: number, height: number) {
    canvasAndContext.canvas.width = Math.max(1, Math.round(width));
    canvasAndContext.canvas.height = Math.max(1, Math.round(height));
  }

  destroy(canvasAndContext: { canvas: any; context: any }) {
    if (canvasAndContext.canvas) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
    }
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

let sharedOcrWorker: TesseractWorker | null = null;
let ocrInitPromise: Promise<TesseractWorker> | null = null;
let ocrMutex: Promise<void> = Promise.resolve();

function getPortugueseLangPath(): string | undefined {
  try {
    const porData = require("@tesseract.js-data/por") as { langPath?: string };
    return porData?.langPath;
  } catch {
    return undefined;
  }
}

async function getOcrWorker(): Promise<TesseractWorker> {
  if (sharedOcrWorker) return sharedOcrWorker;
  if (ocrInitPromise) return ocrInitPromise;

  ocrInitPromise = (async () => {
    const langPath = getPortugueseLangPath();
    const worker = await createWorker("por", 1, {
      ...(langPath ? { langPath, gzip: true } : {}),
      cacheMethod: "none",
    });
    sharedOcrWorker = worker;
    return worker;
  })();

  try {
    return await ocrInitPromise;
  } catch (err) {
    ocrInitPromise = null;
    throw err;
  }
}

/**
 * Executa uma tarefa em exclusão mútua sobre o worker único do Tesseract
 * para manter o consumo de RAM controlado mesmo com concorrência no job.
 */
async function withOcrLock<T>(task: () => Promise<T>): Promise<T> {
  const prev = ocrMutex;
  let release!: () => void;
  ocrMutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    return await task();
  } finally {
    release();
  }
}

export interface SelectiveOcrResult {
  spans: TextSpan[];
  rawText: string;
  confidence: number;
  renderedWidth: number;
  renderedHeight: number;
}

/**
 * Etapa C: Renderiza apenas a página que necessita de OCR em memória (sem Chromium/CDN)
 * e executa reconhecimento local com Tesseract.js preservando coordenadas no espaço da página PDF.
 */
export async function runSelectiveOcr(
  pdfDoc: any,
  sheetNumber: number
): Promise<SelectiveOcrResult> {
  ensureCanvasGlobals();

  const page = await pdfDoc.getPage(sheetNumber);
  const canvasFactory = new NodeCanvasFactory();

  try {
    const baseViewport = page.getViewport({ scale: 1.0 });
    // Alvo ~1800px de largura (bom equilíbrio entre acurácia do OCR e memória)
    const desiredScale = Math.min(2.5, Math.max(1.4, 1800 / Math.max(1, baseViewport.width)));
    const viewport = page.getViewport({ scale: desiredScale });

    const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);
    await page.render({
      canvasContext: context,
      viewport,
      canvasFactory,
    }).promise;

    const pngBuffer: Buffer = canvas.toBuffer("image/png");
    canvasFactory.destroy({ canvas, context });

    const ocrResult = await withOcrLock(async () => {
      const worker = await getOcrWorker();
      return await worker.recognize(pngBuffer, {}, { blocks: true });
    });

    const spans: TextSpan[] = [];
    const blocks = ocrResult.data?.blocks || [];

    for (const block of blocks) {
      for (const paragraph of block.paragraphs || []) {
        for (const line of paragraph.lines || []) {
          for (const word of line.words || []) {
            const cleaned = (word.text || "").trim();
            if (!cleaned) continue;
            // Descarta ruído gráfico de baixíssima confiança
            if (word.confidence < 25 && cleaned.length <= 2) continue;

            const bbox = word.bbox;
            const x = Math.round((bbox.x0 / desiredScale) * 10) / 10;
            const y = Math.round((bbox.y0 / desiredScale) * 10) / 10;
            const width = Math.max(1, Math.round(((bbox.x1 - bbox.x0) / desiredScale) * 10) / 10);
            const height = Math.max(1, Math.round(((bbox.y1 - bbox.y0) / desiredScale) * 10) / 10);

            spans.push({
              text: cleaned,
              x,
              y,
              width,
              height,
              fontSize: Math.max(6, Math.round(height * 0.85 * 10) / 10),
              confidence: Math.round(word.confidence),
              source: "OCR",
            });
          }
        }
      }
    }

    return {
      spans,
      rawText: (ocrResult.data?.text || "").trim(),
      confidence: Math.round(ocrResult.data?.confidence || 0),
      renderedWidth: Math.round(viewport.width),
      renderedHeight: Math.round(viewport.height),
    };
  } finally {
    try {
      page.cleanup();
    } catch {
      // Ignora falha de cleanup
    }
  }
}

/**
 * Encerra o worker reutilizável do Tesseract ao finalizar o job de ingestão.
 */
export async function closeOcrWorker(): Promise<void> {
  if (sharedOcrWorker) {
    try {
      await sharedOcrWorker.terminate();
    } catch {
      // Ignora erro ao encerrar worker
    } finally {
      sharedOcrWorker = null;
      ocrInitPromise = null;
    }
  }
}
