import path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import type {
  BrandExtractionProfile,
  PageQualityReport,
  PageQualityStatus,
  RawPageTextExtraction,
  TextSpan,
} from "./types";

const require = createRequire(import.meta.url);

export interface LoadedPdfDocument {
  pdfDoc: any;
  numPages: number;
  destroy: () => Promise<void>;
}

let cachedPdfJsModule: any = null;

async function getPdfJs() {
  if (cachedPdfJsModule) return cachedPdfJsModule;
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  try {
    const pkgDir = path.dirname(require.resolve("pdfjs-dist/package.json"));
    const workerPath = path.join(pkgDir, "legacy", "build", "pdf.worker.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  } catch {
    // Fallback automático do pdf.js se o worker não for resolvido explicitamente
  }
  cachedPdfJsModule = pdfjs;
  return pdfjs;
}

function getStandardFontDataUrl(): string | undefined {
  try {
    const pkgDir = path.dirname(require.resolve("pdfjs-dist/package.json"));
    return `${pathToFileURL(path.join(pkgDir, "standard_fonts")).href}/`;
  } catch {
    return undefined;
  }
}

/**
 * Abre o documento PDF uma única vez por job em memória, evitando re-parse por página.
 */
export async function loadPdfTextDocument(pdfBuffer: Buffer): Promise<LoadedPdfDocument> {
  const pdfjs = await getPdfJs();
  const data = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    isOffscreenCanvasSupported: false,
    standardFontDataUrl: getStandardFontDataUrl(),
    verbosity: 0,
  });

  const pdfDoc = await loadingTask.promise;

  return {
    pdfDoc,
    numPages: pdfDoc.numPages,
    destroy: async () => {
      try {
        await pdfDoc.destroy();
      } catch {
        // Ignora erro ao liberar recursos do documento
      }
    },
  };
}

/**
 * Etapa A: Extrai textos nativos de uma página diretamente via PDF.js,
 * preservando coordenadas (X, Y com origem no topo-esquerdo), dimensões, fonte e ordem.
 */
export async function extractNativePageText(
  pdfDoc: any,
  sheetNumber: number
): Promise<RawPageTextExtraction> {
  const pdfjs = await getPdfJs();
  const page = await pdfDoc.getPage(sheetNumber);

  try {
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent({
      includeMarkedContent: false,
    });
    const operatorList = await page.getOperatorList();

    const imageOpsSet = new Set<number>([
      pdfjs.OPS.paintImageXObject,
      pdfjs.OPS.paintInlineImageXObject,
      pdfjs.OPS.paintImageMaskXObject,
    ]);
    let imageOpsCount = 0;
    for (const fn of operatorList.fnArray) {
      if (imageOpsSet.has(fn)) imageOpsCount++;
    }

    const styles = textContent.styles || {};
    const spans: TextSpan[] = [];

    for (const rawItem of textContent.items) {
      if (!rawItem || typeof rawItem.str !== "string") continue;
      const trimmed = rawItem.str.replace(/\s+/g, " ").trim();
      if (!trimmed) continue;

      const transform = rawItem.transform || [1, 0, 0, 1, 0, 0];
      const fontSize = Math.max(
        1,
        Math.round(Math.hypot(transform[2] || 0, transform[3] || 0) * 10) / 10 ||
          rawItem.height ||
          8
      );
      const tx = Number(transform[4] || 0);
      const ty = Number(transform[5] || 0);
      const height = Math.max(1, Number(rawItem.height || fontSize));
      const width = Math.max(1, Number(rawItem.width || trimmed.length * fontSize * 0.45));

      // Converte origem inferior-esquerda do PDF para origem superior-esquerda
      const yTop = Math.max(0, Math.round((viewport.height - ty) * 10) / 10);
      const styleMeta = rawItem.fontName ? styles[rawItem.fontName] : undefined;

      spans.push({
        text: trimmed,
        x: Math.round(tx * 10) / 10,
        y: yTop,
        width: Math.round(width * 10) / 10,
        height: Math.round(height * 10) / 10,
        fontSize,
        fontName: styleMeta?.fontFamily || rawItem.fontName || undefined,
        source: "NATIVE",
      });
    }

    const fullText = spans.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();

    return {
      sheetNumber,
      pageWidth: Math.round(viewport.width * 10) / 10,
      pageHeight: Math.round(viewport.height * 10) / 10,
      spans,
      imageOpsCount,
      fullText,
    };
  } finally {
    try {
      page.cleanup();
    } catch {
      // Ignora erro de cleanup de página do PDF.js
    }
  }
}

const NON_COMMERCIAL_HINTS =
  /\b(índice|sumário|expediente|composição\s+dos\s+tecidos|tabela\s+de\s+medidas|como\s+tirar\s+suas\s+medidas|central\s+de\s+atendimento|revendedora|fale\s+conosco)\b/i;

/**
 * Etapa B: Avalia individualmente a qualidade do texto nativo extraído da página,
 * detectando páginas sem texto, pouco texto, texto fragmentado, colunas e páginas não-comerciais.
 */
export function assessPageTextQuality(
  extraction: RawPageTextExtraction,
  brandProfile: BrandExtractionProfile
): PageQualityReport {
  const { sheetNumber, pageWidth, pageHeight, spans, imageOpsCount, fullText } = extraction;
  const charCount = fullText.replace(/\s+/g, "").length;
  const spanCount = spans.length;
  const isDoubleSpread = pageHeight > 0 && pageWidth / pageHeight > 1.2;

  const avgTokenLength =
    spanCount > 0
      ? Number(
          (
            spans.reduce((acc, s) => acc + s.text.replace(/\s+/g, "").length, 0) /
            spanCount
          ).toFixed(2)
        )
      : 0;

  const avgFontSize =
    spanCount > 0
      ? Number((spans.reduce((acc, s) => acc + s.fontSize, 0) / spanCount).toFixed(1))
      : 0;

  // Detecta caracteres corrompidos / encoding quebrado (ex: U+FFFD ou excesso de símbolos isolados)
  const garbageChars = (fullText.match(/[\uFFFD\u0000-\u0008\u000E-\u001F□■◆]/g) || []).length;
  const alphaNumChars = (fullText.match(/[A-Za-zÀ-ÿ0-9]/g) || []).length;
  const garbageRatio =
    charCount > 0
      ? Number((Math.max(garbageChars, charCount - alphaNumChars - (fullText.match(/[.,:;!?()/%$R+\-–]/g) || []).length) / charCount).toFixed(2))
      : 0;

  // Detecta distribuição em colunas (metade esquerda vs direita e sub-colunas)
  let detectedColumns = 1;
  if (spanCount >= 6 && pageWidth > 0) {
    const midX = pageWidth / 2;
    const leftCount = spans.filter((s) => s.x + s.width / 2 < midX - 15).length;
    const rightCount = spans.filter((s) => s.x + s.width / 2 > midX + 15).length;
    if (isDoubleSpread && leftCount >= 3 && rightCount >= 3) {
      detectedColumns = 2;
    } else {
      // Verifica se há múltiplos clusters X na mesma página
      const xBuckets = new Set(spans.map((s) => Math.floor((s.x / pageWidth) * 4)));
      detectedColumns = Math.max(1, Math.min(4, xBuckets.size));
    }
  }

  // Conta sinais comerciais (preços completos ou fragmentados "65," + "99", SKUs, palavras-chave)
  let commercialSignals = 0;
  const priceMatches = fullText.match(/\b\d{1,4}[,.]\d{2}\b/g) || [];
  commercialSignals += priceMatches.length;

  // Detecta preços com centavos sobrescritos separados ("26," seguido próximo de "99")
  const splitPriceStarts = spans.filter((s) => /^\d{1,4},$/.test(s.text)).length;
  commercialSignals += splitPriceStarts;

  for (const regex of brandProfile.skuRegexes) {
    const clone = new RegExp(regex.source, regex.flags);
    const matches = fullText.match(clone);
    if (matches) commercialSignals += matches.length;
  }

  if (/\b(r\$|por|oferta|desconto|tam\.?|cores?|c[oó]d\.?|ref\.?|kit|combo|conjunto)\b/i.test(fullText)) {
    commercialSignals += 1;
  }

  let status: PageQualityStatus = "SUFFICIENT_NATIVE";
  let needsOcr = false;
  let isCommercialCandidate = true;
  let reason = "Texto nativo suficiente e bem estruturado.";

  if (charCount < 25 || spanCount < 3) {
    status = "NO_TEXT";
    needsOcr = imageOpsCount > 0;
    reason =
      imageOpsCount > 0
        ? "Página sem texto nativo selecionável e com imagem rasterizada detectada; OCR seletivo necessário."
        : "Página praticamente vazia, sem texto e sem imagens relevantes.";
    if (imageOpsCount === 0) {
      isCommercialCandidate = false;
    }
  } else if (garbageRatio > 0.35 || (avgTokenLength < 1.9 && spanCount > 45)) {
    status = "FRAGMENTED_OR_COLUMNAR";
    needsOcr = imageOpsCount > 0 && garbageRatio > 0.25;
    reason = needsOcr
      ? "Texto nativo corrompido ou excessivamente fragmentado; OCR seletivo acionado."
      : "Texto fragmentado em tokens curtos ou layout colunar denso; será reorganizado espacialmente.";
  } else if (charCount < 160 && commercialSignals <= 1) {
    status = "SPARSE_NATIVE";
    needsOcr = imageOpsCount > 0;
    reason =
      imageOpsCount > 0
        ? "Pouco texto nativo extraível frente às imagens na página; OCR seletivo acionado."
        : "Pouco texto nativo e sem imagens relevantes.";
  } else if (
    commercialSignals === 0 &&
    (NON_COMMERCIAL_HINTS.test(fullText) || (charCount >= 160 && priceMatches.length === 0 && splitPriceStarts === 0))
  ) {
    status = "NON_COMMERCIAL";
    isCommercialCandidate = false;
    reason = "Página com texto nativo suficiente, porém sem sinais comerciais de produtos (preço/SKU).";
  } else if (detectedColumns >= 2) {
    status = "SUFFICIENT_NATIVE";
    reason = `Texto nativo suficiente organizado em ${detectedColumns} colunas/regiões.`;
  }

  return {
    sheetNumber,
    status,
    needsOcr,
    isCommercialCandidate,
    reason,
    charCount,
    spanCount,
    imageOpsCount,
    detectedColumns,
    isDoubleSpread,
    avgTokenLength,
    garbageRatio,
    avgFontSize,
    commercialSignals,
  };
}
