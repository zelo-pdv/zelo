import type {
  BlockSignals,
  BrandExtractionProfile,
  ColumnSide,
  RawPageTextExtraction,
  SpatialBlock,
  SpatialOrganizationResult,
  TextLine,
  TextSpan,
} from "./types";

const PROMO_REGEX =
  /\b(oferta|promo[cç][aã]o|desconto|ou\s*\+\s*por|cada|leve\s+\d+|pague\s+\d+|economize|selo\s+de\s+oferta|de\s+r?\$?\s*\d+[\d,.]*\s+por|por\s+apenas)\b/i;

const KIT_REGEX =
  /\b(kit|combo|conjunto|leva\s+os?\s+\d+|caixa\s+com|pack|dupla|trio)\b/i;

const SIZE_REGEX =
  /\b(tam(?:anhos?)?\.?|grade|pp|pe|me|gr|eg|xg|p|m|g|gg|xgg|ml|l|kg|un|cm|\d{2}\s+a\s+\d{2})\b/i;

const COLOR_REGEX =
  /\b(cores?|tom|tons|fragr[aâ]ncia|cor)\s*[:.]|([A-Za-zÀ-ÿ-]+\([A-Za-z0-9]{1,5}\))/i;

const PRICE_REGEX = /\b\d{1,4},\d{2}\b/g;

function extractSkusFromText(text: string, profile: BrandExtractionProfile): string[] {
  const found = new Set<string>();
  for (const regex of profile.skuRegexes) {
    const clone = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;
    while ((match = clone.exec(text)) !== null) {
      const candidate = (match[1] || match[0]).replace(/[()]/g, "").trim();
      if (!candidate) continue;
      if (/^0+$/.test(candidate)) continue;
      if (candidate.length >= profile.skuMinDigits && candidate.length <= profile.skuMaxDigits) {
        found.add(candidate);
      }
    }
  }
  return Array.from(found);
}

function extractPricesFromText(text: string): number[] {
  const prices: number[] = [];
  const matches = text.match(PRICE_REGEX) || [];
  for (const m of matches) {
    const parsed = parseFloat(m.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) {
      prices.push(parsed);
    }
  }
  return prices;
}

/**
 * Funde fragmentos de centavos sobrescritos (ex: "65," + "99" -> "65,99") antes do
 * agrupamento em linhas, evitando que o sobrescrito seja capturado pela linha superior.
 */
function mergeSuperscriptPriceSpans(spans: TextSpan[]): TextSpan[] {
  const used = new Set<number>();
  const result: TextSpan[] = [];

  for (let i = 0; i < spans.length; i++) {
    if (used.has(i)) continue;
    const base = spans[i];

    if (/^\d{1,4},$/.test(base.text)) {
      let bestIdx = -1;
      let bestDist = Infinity;

      for (let j = 0; j < spans.length; j++) {
        if (i === j || used.has(j)) continue;
        const cand = spans[j];
        if (!/^\d{2}$/.test(cand.text)) continue;

        const gapX = cand.x - (base.x + base.width);
        const deltaY = Math.abs(cand.y - base.y);
        const maxH = Math.max(base.height, cand.height, base.fontSize, 8);

        if (
          gapX >= -3 &&
          gapX <= 10 &&
          deltaY <= maxH * 0.9 &&
          cand.fontSize <= base.fontSize * 1.1
        ) {
          const dist = Math.abs(gapX) + deltaY;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = j;
          }
        }
      }

      if (bestIdx !== -1) {
        const cents = spans[bestIdx];
        used.add(bestIdx);
        result.push({
          ...base,
          text: `${base.text}${cents.text}`,
          width: Math.max(base.width, cents.x + cents.width - base.x),
        });
        continue;
      }
    }

    result.push(base);
  }

  return result;
}

/**
 * Une spans que formam uma mesma linha visual e separa segmentos de colunas diferentes
 * quando há um vão horizontal grande ou início de coluna ancorada.
 */
function buildTextLinesForSide(
  rawSideSpans: TextSpan[],
  columnSide: ColumnSide,
  profile: BrandExtractionProfile
): TextLine[] {
  if (rawSideSpans.length === 0) return [];
  const sideSpans = mergeSuperscriptPriceSpans(rawSideSpans);

  // Ordena inicialmente por Y (centro vertical) e depois X
  const sorted = [...sideSpans].sort((a, b) => {
    const ya = a.y + a.height / 2;
    const yb = b.y + b.height / 2;
    if (Math.abs(ya - yb) > 2) return ya - yb;
    return a.x - b.x;
  });

  // Agrupa em bandas horizontais (linhas visuais, tolerando centavos sobrescritos)
  const bands: TextSpan[][] = [];
  for (const span of sorted) {
    const spanCenterY = span.y + span.height / 2;
    let matchedBand: TextSpan[] | null = null;

    for (let i = bands.length - 1; i >= Math.max(0, bands.length - 6); i--) {
      const band = bands[i];
      const ref = band[0];
      const refCenterY = ref.y + ref.height / 2;
      const maxH = Math.max(ref.height, span.height, ref.fontSize, span.fontSize, 8);
      if (Math.abs(spanCenterY - refCenterY) <= maxH * 0.65) {
        matchedBand = band;
        break;
      }
    }

    if (matchedBand) {
      matchedBand.push(span);
    } else {
      bands.push([span]);
    }
  }

  // Descobre âncoras de colunas verticais (X onde começam títulos numerados)
  const anchorXs: number[] = [];
  for (const s of sorted) {
    if (profile.numberedProductPrefixRegex.test(s.text)) {
      if (!anchorXs.some((ax) => Math.abs(ax - s.x) < 12)) {
        anchorXs.push(s.x);
      }
    }
  }

  const lines: TextLine[] = [];
  let lineSeq = 1;

  for (const band of bands) {
    band.sort((a, b) => a.x - b.x);

    const segments: TextSpan[][] = [];
    let currentSeg: TextSpan[] = [];

    for (const span of band) {
      if (currentSeg.length === 0) {
        currentSeg.push(span);
        continue;
      }

      const prev = currentSeg[currentSeg.length - 1];
      const prevRight = prev.x + prev.width;
      const gapX = span.x - prevRight;
      const avgFont = Math.max(6, (prev.fontSize + span.fontSize) / 2);

      const isPriceCentsContinuation =
        /^\d{1,4},$/.test(prev.text) && /^\d{2}$/.test(span.text) && gapX <= 10;

      const startsNumberedProduct = profile.numberedProductPrefixRegex.test(span.text);
      const alignsWithOtherAnchor =
        anchorXs.length >= 2 &&
        anchorXs.some((ax) => Math.abs(span.x - ax) <= 6) &&
        Math.abs(currentSeg[0].x - span.x) > 45;

      const largeHorizontalGap = gapX > Math.max(10, avgFont * 1.35);

      if (
        !isPriceCentsContinuation &&
        (largeHorizontalGap || startsNumberedProduct || alignsWithOtherAnchor)
      ) {
        segments.push(currentSeg);
        currentSeg = [span];
      } else {
        currentSeg.push(span);
      }
    }
    if (currentSeg.length > 0) {
      segments.push(currentSeg);
    }

    for (const seg of segments) {
      let lineText = "";
      for (let i = 0; i < seg.length; i++) {
        const cur = seg[i];
        if (i === 0) {
          lineText = cur.text;
          continue;
        }
        const prev = seg[i - 1];
        const gap = cur.x - (prev.x + prev.width);
        const isSuperscriptCents =
          /^\d{1,4},$/.test(prev.text) && /^\d{2}$/.test(cur.text) && gap <= 10;

        lineText += isSuperscriptCents ? cur.text : ` ${cur.text}`;
      }

      const minX = Math.min(...seg.map((s) => s.x));
      const minY = Math.min(...seg.map((s) => s.y));
      const maxX = Math.max(...seg.map((s) => s.x + s.width));
      const maxY = Math.max(...seg.map((s) => s.y + s.height));
      const maxFont = Math.max(...seg.map((s) => s.fontSize));

      lines.push({
        id: `${columnSide}-L${lineSeq++}`,
        text: lineText.replace(/\s+/g, " ").trim(),
        x: Math.round(minX * 10) / 10,
        y: Math.round(minY * 10) / 10,
        width: Math.max(1, Math.round((maxX - minX) * 10) / 10),
        height: Math.max(1, Math.round((maxY - minY) * 10) / 10),
        fontSize: maxFont,
        columnSide,
        spans: seg,
      });
    }
  }

  return lines.sort((a, b) => (Math.abs(a.y - b.y) > 3 ? a.y - b.y : a.x - b.x));
}

function detectEditorialPageNumber(
  spans: TextSpan[],
  pageHeight: number,
  columnSide: ColumnSide,
  pageWidth: number
): number | null {
  const cornerSpans = spans.filter((s) => {
    const inCornerY = s.y > pageHeight * 0.88 || s.y < pageHeight * 0.08;
    if (!inCornerY) return false;
    if (!/^\d{1,3}$/.test(s.text.trim())) return false;
    if (s.fontSize > 11) return false;
    if (columnSide === "LEFT") return s.x < pageWidth * 0.15;
    if (columnSide === "RIGHT") return s.x > pageWidth * 0.85;
    return s.x < pageWidth * 0.25 || s.x > pageWidth * 0.75;
  });

  if (cornerSpans.length > 0) {
    // Prioriza o canto mais extremo (mais próximo da borda externa e mais abaixo)
    cornerSpans.sort((a, b) => {
      if (columnSide === "RIGHT") return b.x - a.x;
      return a.x - b.x;
    });
    const n = parseInt(cornerSpans[0].text.trim(), 10);
    if (Number.isFinite(n) && n > 0 && n < 1000) return n;
  }
  return null;
}

function horizontalOverlapRatio(a: { x: number; width: number }, b: { x: number; width: number }): number {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const overlap = Math.max(0, right - left);
  const minW = Math.max(1, Math.min(a.width, b.width));
  return overlap / minW;
}

/**
 * Agrupa linhas reconstruídas em blocos espaciais coerentes sem misturar colunas adjacentes
 * nem unir produtos consecutivos.
 */
function clusterLinesIntoBlocks(
  lines: TextLine[],
  sheetNumber: number,
  editorialPage: number | null,
  columnSide: ColumnSide,
  profile: BrandExtractionProfile
): SpatialBlock[] {
  if (lines.length === 0) return [];

  const lineClusters: TextLine[][] = [];

  for (const line of lines) {
    // Ignora números soltos de página de rodapé ou marcações numéricas isoladas de 1 dígito em fotos
    const isStandaloneTinyNumber = /^\d{1,3}$/.test(line.text) && line.width < 22;
    if (isStandaloneTinyNumber) continue;

    const lineStartsProduct = profile.numberedProductPrefixRegex.test(line.text);
    const lineHasSku = extractSkusFromText(line.text, profile).length > 0;

    let targetCluster: TextLine[] | null = null;
    let bestScore = Infinity;

    for (let i = lineClusters.length - 1; i >= 0; i--) {
      const cluster = lineClusters[i];
      const lastLine = cluster[cluster.length - 1];
      const firstLine = cluster[0];

      const clusterMinX = Math.min(...cluster.map((l) => l.x));
      const clusterMaxX = Math.max(...cluster.map((l) => l.x + l.width));
      const clusterWidth = Math.max(1, clusterMaxX - clusterMinX);

      const gapY = line.y - (lastLine.y + lastLine.height);
      const maxAllowedGapY = Math.max(12, Math.max(lastLine.fontSize, line.fontSize) * 1.9);

      if (gapY < -6 || gapY > maxAllowedGapY) continue;

      const leftAligned = Math.abs(line.x - firstLine.x) <= 22 || Math.abs(line.x - lastLine.x) <= 22;
      const overlapsHorizontally =
        horizontalOverlapRatio(
          { x: clusterMinX, width: clusterWidth },
          { x: line.x, width: line.width }
        ) > 0.25;

      if (!leftAligned && !overlapsHorizontally) continue;

      // Barreira de novo produto ou novo cabeçalho de grupo (ex: "Conjunto ...")
      if (lineStartsProduct) continue;

      const clusterText = cluster.map((l) => l.text).join(" ");
      const clusterHasSku = extractSkusFromText(clusterText, profile).length > 0;
      const clusterHasPrice = extractPricesFromText(clusterText).length > 0;
      const startsGroupHeader =
        /^(conjunto|linha|cole[cç][aã]o)\b/i.test(line.text) ||
        (line.fontSize > lastLine.fontSize * 1.05 && clusterHasSku);

      if (clusterHasSku && clusterHasPrice && startsGroupHeader) continue;
      if (lineHasSku && clusterHasSku && clusterHasPrice && !leftAligned) continue;
      if (lineHasSku && clusterHasSku && clusterHasPrice && gapY > lastLine.fontSize * 0.9) continue;

      const distScore = Math.abs(line.x - firstLine.x) + Math.max(0, gapY) * 2;
      if (distScore < bestScore) {
        bestScore = distScore;
        targetCluster = cluster;
      }
    }

    if (targetCluster) {
      targetCluster.push(line);
    } else {
      lineClusters.push([line]);
    }
  }

  return lineClusters.map((cluster, idx) => {
    cluster.sort((a, b) => (Math.abs(a.y - b.y) > 2 ? a.y - b.y : a.x - b.x));
    const minX = Math.min(...cluster.map((l) => l.x));
    const minY = Math.min(...cluster.map((l) => l.y));
    const maxX = Math.max(...cluster.map((l) => l.x + l.width));
    const maxY = Math.max(...cluster.map((l) => l.y + l.height));
    const text = cluster.map((l) => l.text).join("\n");

    const allSpans = cluster.flatMap((l) => l.spans);
    const hasNative = allSpans.some((s) => s.source === "NATIVE");
    const hasOcr = allSpans.some((s) => s.source === "OCR");
    const source = hasNative && hasOcr ? "HYBRID" : hasOcr ? "OCR" : "NATIVE";

    const signals = analyzeBlockSignals(text, cluster, profile);

    return {
      id: `S${sheetNumber}-${columnSide}-B${idx + 1}`,
      sheetNumber,
      editorialPage,
      columnSide,
      region: {
        x: Math.round(minX * 10) / 10,
        y: Math.round(minY * 10) / 10,
        width: Math.max(1, Math.round((maxX - minX) * 10) / 10),
        height: Math.max(1, Math.round((maxY - minY) * 10) / 10),
      },
      lines: cluster,
      text,
      source,
      signals,
    };
  });
}

function analyzeBlockSignals(
  text: string,
  lines: TextLine[],
  profile: BrandExtractionProfile
): BlockSignals {
  const skus = extractSkusFromText(text, profile);
  const prices = extractPricesFromText(text);
  const hasPromoKeywords = PROMO_REGEX.test(text);
  const hasSizeKeywords = SIZE_REGEX.test(text);
  const hasColorKeywords = COLOR_REGEX.test(text);
  const hasKitKeywords = KIT_REGEX.test(text);

  const isSingleColorLabel =
    lines.length <= 2 &&
    skus.length === 0 &&
    prices.length === 0 &&
    /^([A-Za-zÀ-ÿ0-9\s/-]{2,28}\([A-Za-z0-9]{1,5}\)[\s,]*)+$/.test(text.replace(/\n/g, " ").trim());

  const isShortEditorialTag =
    lines.length <= 2 &&
    skus.length === 0 &&
    prices.length === 0 &&
    !hasColorKeywords &&
    !hasSizeKeywords &&
    !hasPromoKeywords &&
    text.replace(/\s+/g, " ").trim().length < 40;

  const isPromoBadge =
    skus.length === 0 &&
    hasPromoKeywords &&
    (prices.length > 0 || /\bcada\b/i.test(text));

  const isSharedHeader =
    skus.length === 0 &&
    prices.length === 0 &&
    !isSingleColorLabel &&
    (/(conjunto|linha|cole[cç][aã]o|fam[ií]lia)/i.test(text) || hasColorKeywords) &&
    lines.length >= 2;

  const isFloatingPriceTag =
    lines.length === 1 &&
    skus.length === 0 &&
    prices.length === 1 &&
    !hasPromoKeywords &&
    !hasSizeKeywords &&
    !hasColorKeywords &&
    text.replace(/\s+/g, " ").trim().length <= 16;

  const isNoise = isSingleColorLabel || isShortEditorialTag || isFloatingPriceTag;

  return {
    skus,
    prices,
    hasPromoKeywords,
    hasSizeKeywords,
    hasColorKeywords,
    hasKitKeywords,
    isSharedHeader,
    isPromoBadge,
    isNoise,
  };
}

function boxDistance(a: SpatialBlock["region"], b: SpatialBlock["region"]): number {
  const dx = Math.max(0, a.x - (b.x + b.width), b.x - (a.x + a.width));
  const dy = Math.max(0, a.y - (b.y + b.height), b.y - (a.y + a.height));
  return Math.hypot(dx, dy);
}

/**
 * Etapa D: Organiza espacialmente os spans extraídos (nativos ou via OCR) em blocos
 * candidatos a produtos, preservando contexto compartilhado e isolando selos promocionais.
 */
export function organizeSpatialBlocks(
  extraction: RawPageTextExtraction,
  profile: BrandExtractionProfile
): SpatialOrganizationResult {
  const { sheetNumber, pageWidth, pageHeight, spans } = extraction;
  const isDoubleSpread = pageHeight > 0 && pageWidth / pageHeight > 1.2;

  let leftEditorialPage: number | null = null;
  let rightEditorialPage: number | null = null;
  const allBlocks: SpatialBlock[] = [];

  if (isDoubleSpread) {
    const midX = pageWidth / 2;
    const leftSpans = spans.filter((s) => s.x + s.width / 2 < midX);
    const rightSpans = spans.filter((s) => s.x + s.width / 2 >= midX);

    const leftLines = buildTextLinesForSide(leftSpans, "LEFT", profile);
    const rightLines = buildTextLinesForSide(rightSpans, "RIGHT", profile);

    leftEditorialPage = detectEditorialPageNumber(leftSpans, pageHeight, "LEFT", pageWidth);
    rightEditorialPage = detectEditorialPageNumber(rightSpans, pageHeight, "RIGHT", pageWidth);

    allBlocks.push(
      ...clusterLinesIntoBlocks(leftLines, sheetNumber, leftEditorialPage, "LEFT", profile),
      ...clusterLinesIntoBlocks(rightLines, sheetNumber, rightEditorialPage, "RIGHT", profile)
    );
  } else {
    const lines = buildTextLinesForSide(spans, "SINGLE", profile);
    leftEditorialPage = detectEditorialPageNumber(spans, pageHeight, "SINGLE", pageWidth);
    allBlocks.push(
      ...clusterLinesIntoBlocks(lines, sheetNumber, leftEditorialPage, "SINGLE", profile)
    );
  }

  // Associa cabeçalhos compartilhados (ex: "Conjunto Lover ... Cores: ...") aos blocos de produto logo abaixo
  const sharedHeaders = allBlocks.filter((b) => b.signals.isSharedHeader);
  const promoBadges = allBlocks.filter((b) => b.signals.isPromoBadge);
  const productCandidates = allBlocks.filter(
    (b) =>
      !b.signals.isNoise &&
      !b.signals.isSharedHeader &&
      !b.signals.isPromoBadge &&
      (b.signals.skus.length > 0 || b.signals.prices.length > 0 || b.lines.length >= 2)
  );

  for (const header of sharedHeaders) {
    for (const candidate of productCandidates) {
      if (candidate.columnSide !== header.columnSide) continue;
      const verticalDelta = candidate.region.y - (header.region.y + header.region.height);
      const horizontalDist = Math.max(
        0,
        candidate.region.x - (header.region.x + header.region.width),
        header.region.x - (candidate.region.x + candidate.region.width)
      );
      if (verticalDelta >= -10 && verticalDelta <= 120 && horizontalDist <= 140) {
        candidate.sharedContext = candidate.sharedContext
          ? `${candidate.sharedContext}\n${header.text}`
          : header.text;
      }
    }
  }

  // Associa selos promocionais com cautela (somente ao produto que referencia explicitamente ou vizinho mais próximo do mesmo lado)
  for (const badge of promoBadges) {
    const sameSideCandidates = productCandidates.filter(
      (c) => c.columnSide === badge.columnSide
    );
    if (sameSideCandidates.length === 0) continue;

    const badgeLower = badge.text.toLowerCase();

    // 1. Tenta match por palavras do nome do produto (priorizando maior quantidade de tokens coincidentes)
    const scoredMatches = sameSideCandidates
      .map((c) => {
        const firstLine = c.lines[0]?.text || "";
        const cleanTitle = firstLine.replace(/^\d{1,2}\s*[-–.)]\s*/, "").trim();
        const keywords = cleanTitle
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !/^(para|com|sem|por|das|dos)$/i.test(w));
        const matchCount = keywords.filter((kw) => badgeLower.includes(kw)).length;
        const ratio = keywords.length > 0 ? matchCount / keywords.length : 0;
        return { candidate: c, matchCount, ratio };
      })
      .filter((m) => m.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount || b.ratio - a.ratio);

    const bestScore = scoredMatches[0]?.matchCount || 0;
    const nameMatched =
      bestScore > 0
        ? scoredMatches
            .filter((m) => m.matchCount === bestScore && m.ratio >= (scoredMatches[0]?.ratio || 0) - 0.1)
            .map((m) => m.candidate)
        : [];

    const targets =
      nameMatched.length > 0
        ? nameMatched
        : [
            [...sameSideCandidates].sort(
              (a, b) => boxDistance(a.region, badge.region) - boxDistance(b.region, badge.region)
            )[0],
          ];

    for (const target of targets) {
      if (!target) continue;
      // Só anexa por proximidade pura se estiver realmente próximo (< 180px)
      if (nameMatched.length > 0 || boxDistance(target.region, badge.region) <= 180) {
        target.attachedPromoTexts = target.attachedPromoTexts || [];
        target.attachedPromoTexts.push(badge.text);
      }
    }
  }

  const noiseBlocksCount = allBlocks.filter((b) => b.signals.isNoise).length;

  return {
    sheetNumber,
    isDoubleSpread,
    leftEditorialPage,
    rightEditorialPage,
    blocks: allBlocks,
    candidateBlocks: productCandidates,
    noiseBlocksCount,
  };
}
