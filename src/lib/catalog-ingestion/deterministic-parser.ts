import type {
  BrandExtractionProfile,
  ExtractedColor,
  SpatialBlock,
  TextExtractedProduct,
} from "./types";

const PRICE_TOKEN_REGEX = /\b(\d{1,4},\d{2})\b/;
const RANGE_NUMBER_REGEX = /\b(\d{2})\s+a\s+(\d{2})\b/i;

/**
 * Expande faixas de tamanhos numéricas (ex: "42 a 50" -> ["42","44","46","48","50"])
 * ou listas separadas por espaço/vírgula ("PE ME GR EG" -> ["PE","ME","GR","EG"]).
 */
export function parseSizesFromLine(rawLine: string): string[] {
  const withoutPrice = rawLine.replace(/\s*[-–]\s*\d{1,4},\d{2}.*$/, "").trim();
  const afterLabel = withoutPrice.replace(/^(?:tam(?:anhos?)?\.?|grade)\s*[:.]?\s*/i, "").trim();
  if (!afterLabel) return [];

  const numRange = afterLabel.match(RANGE_NUMBER_REGEX);
  if (numRange) {
    const start = parseInt(numRange[1], 10);
    const end = parseInt(numRange[2], 10);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start <= 24) {
      const step = start >= 34 && end <= 60 && (end - start) % 2 === 0 ? 2 : 1;
      const expanded: string[] = [];
      for (let v = start; v <= end; v += step) {
        expanded.push(String(v));
      }
      return expanded;
    }
  }

  const tokens = afterLabel
    .split(/[\s,;/]+/)
    .map((t) => t.trim())
    .filter((t) => /^[A-Za-z0-9]{1,6}$/.test(t) && !/^(a|e|ou|de)$/i.test(t));

  return Array.from(new Set(tokens));
}

/**
 * Extrai pares de cores e códigos a partir de texto (ex: "Cores: Carmim(06), Preto(27)").
 */
export function parseColorsFromText(
  text: string,
  profile: BrandExtractionProfile
): ExtractedColor[] {
  const colors: ExtractedColor[] = [];
  const seen = new Set<string>();
  const regex = new RegExp(profile.colorPairRegex.source, profile.colorPairRegex.flags);

  // Limpa prefixos comuns antes de rodar o regex
  const normalized = text
    .replace(/\bCores?\s*:\s*/gi, "")
    .replace(/\be\s+(?=[A-ZÀ-Ÿ][a-zà-ÿ-]+\()/g, ", ");

  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    const rawName = match[1].replace(/^[,.\s-]+|[,.\s-]+$/g, "").trim();
    const rawCode = (match[2] || "").trim();
    if (!rawName || rawName.length < 2) continue;
    // Ignora caso seja o próprio SKU numérico de 5+ dígitos entre parênteses
    if (/^\d{5,}$/.test(rawCode)) continue;

    const key = `${rawName.toLowerCase()}|${rawCode.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    colors.push({
      nome: rawName,
      codigo: rawCode || undefined,
    });
  }

  return colors;
}

export interface DeterministicSplitResult {
  deterministicProducts: TextExtractedProduct[];
  aiCandidateBlocks: SpatialBlock[];
}

/**
 * Tenta extrair deterministicamente blocos 100% estruturados e inequívocos (sem custo de API),
 * encaminhando apenas blocos ambíguos, promocionais, kits, OCR ou complexos para o Gemini.
 */
export function splitDeterministicAndAiBlocks(
  candidateBlocks: SpatialBlock[],
  profile: BrandExtractionProfile
): DeterministicSplitResult {
  const deterministicProducts: TextExtractedProduct[] = [];
  const aiCandidateBlocks: SpatialBlock[] = [];

  for (const block of candidateBlocks) {
    const parsed = tryParseBlockDeterministically(block, profile);
    if (parsed) {
      deterministicProducts.push(parsed);
    } else {
      aiCandidateBlocks.push(block);
    }
  }

  return {
    deterministicProducts,
    aiCandidateBlocks,
  };
}

function tryParseBlockDeterministically(
  block: SpatialBlock,
  profile: BrandExtractionProfile
): TextExtractedProduct | null {
  // Blocos vindos de OCR, com múltiplos SKUs, promoções, kits ou sem SKU/preço vão para a IA
  if (block.source !== "NATIVE") return null;
  if (block.signals.skus.length !== 1) return null;
  if (block.signals.prices.length !== 1) return null;
  if (block.signals.hasPromoKeywords || block.signals.hasKitKeywords) return null;
  if (block.attachedPromoTexts && block.attachedPromoTexts.length > 0) return null;
  if (block.lines.length < 2) return null;

  const firstLine = block.lines[0].text;
  const numberedMatch = firstLine.match(profile.numberedProductPrefixRegex);
  if (!numberedMatch) return null;

  const cleanName = numberedMatch[2].trim();
  if (cleanName.length < 3) return null;

  const sku = block.signals.skus[0];
  // Confirma que o SKU aparece logo no início (2ª ou 1ª linha)
  const earlyText = block.lines.slice(0, 2).map((l) => l.text).join(" ");
  if (!earlyText.includes(sku)) return null;

  const regularPrice = block.signals.prices[0];
  if (!Number.isFinite(regularPrice) || regularPrice <= 0) return null;

  const descLines: string[] = [];
  let sizes: string[] = [];
  const colorChunks: string[] = [];

  for (let i = 1; i < block.lines.length; i++) {
    const lineText = block.lines[i].text.trim();
    if (!lineText) continue;

    // Ignora linha que é apenas "(067249)"
    if (lineText === `(${sku})` || lineText === sku) continue;

    if (/^cores?\s*:/i.test(lineText) || colorChunks.length > 0 && !/^(tam|grade)/i.test(lineText) && /\([A-Za-z0-9]{1,4}\)/.test(lineText)) {
      colorChunks.push(lineText);
      continue;
    }

    if (/^(?:tam(?:anhos?)?\.?|grade)\s*[:.]?/i.test(lineText)) {
      sizes = parseSizesFromLine(lineText);
      continue;
    }

    // Se a linha contém o preço final isolado (sem descrição útil), não polui descrição
    if (PRICE_TOKEN_REGEX.test(lineText) && lineText.length < 18) continue;

    descLines.push(lineText);
  }

  if (block.sharedContext) {
    colorChunks.push(block.sharedContext);
    // Extrai linhas descritivas do contexto compartilhado (ex: "Detalhes em delicada renda.")
    const sharedLines = block.sharedContext
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s && !/^cores?\s*:/i.test(s) && !/^conjunto\s+/i.test(s));
    if (sharedLines.length > 0) {
      descLines.unshift(...sharedLines);
    }
  }

  const cores = parseColorsFromText(colorChunks.join(" "), profile);

  return {
    sku,
    nome: cleanName,
    descricao: descLines.length > 0 ? descLines.join(" ") : null,
    pagina_editorial: block.editorialPage ?? null,
    preco_regular: regularPrice,
    preco_promocional: null,
    preco_ciclo: null,
    quantidade_minima_promo: null,
    regra_promocional: null,
    tamanhos: sizes,
    cores,
    is_kit: false,
    ambiguidades: [],
    confianca: "ALTA",
    origem_bloco_id: block.id,
    extractionMethod: "DETERMINISTIC",
  };
}
