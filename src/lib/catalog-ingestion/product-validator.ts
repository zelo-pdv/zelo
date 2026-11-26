import type {
  ExtractedColor,
  TextExtractedProduct,
  ValidatedCatalogProduct,
} from "./types";

function normalizeNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") {
    return Number.isFinite(val) && val > 0 ? Number(val.toFixed(2)) : null;
  }
  if (typeof val === "string") {
    const cleaned = val.replace(/[R$\s]/g, "").replace(",", ".");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : null;
  }
  return null;
}

function normalizeSku(rawSku: string | null | undefined): string | null {
  if (!rawSku) return null;
  const cleaned = rawSku
    .replace(/[()]/g, "")
    .replace(/^(?:c[oó]d\.?|ref\.?|sku)\s*[:#-]?\s*/i, "")
    .trim();
  if (!cleaned) return null;
  if (/^(n\/a|na|null|none|sem\s*c[oó]digo|0+)$/i.test(cleaned)) return null;
  if (cleaned.length < 3 || cleaned.length > 24) return null;
  return cleaned;
}

function normalizeBarcode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8 || digits.length === 12 || digits.length === 13 || digits.length === 14) {
    return digits;
  }
  return null;
}

function inferPromoMinQuantity(
  explicitQty: number | null | undefined,
  promoRule: string | null | undefined,
  hasPromoPrice: boolean
): number {
  if (typeof explicitQty === "number" && Number.isInteger(explicitQty) && explicitQty >= 1) {
    return explicitQty;
  }
  if (promoRule) {
    const match = promoRule.match(/(\d+)\s*(?:ou\s*\+|unidades|pe[çc]as|un\.?|x)/i);
    if (match) {
      const qty = parseInt(match[1], 10);
      if (Number.isFinite(qty) && qty >= 1 && qty <= 50) return qty;
    }
    const leveMatch = promoRule.match(/leve\s+(\d+)/i);
    if (leveMatch) {
      const qty = parseInt(leveMatch[1], 10);
      if (Number.isFinite(qty) && qty >= 1 && qty <= 50) return qty;
    }
  }
  return hasPromoPrice ? 1 : 1;
}

function deduplicateSizes(rawSizes: unknown): string[] {
  if (!Array.isArray(rawSizes)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of rawSizes) {
    if (typeof s !== "string") continue;
    const clean = s.trim();
    if (!clean) continue;
    const key = clean.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

function deduplicateColors(rawColors: unknown): ExtractedColor[] {
  if (!Array.isArray(rawColors)) return [];
  const seen = new Set<string>();
  const result: ExtractedColor[] = [];
  for (const c of rawColors) {
    if (!c || typeof c !== "object") continue;
    const nome = typeof (c as ExtractedColor).nome === "string" ? (c as ExtractedColor).nome.trim() : "";
    const codigo =
      typeof (c as ExtractedColor).codigo === "string"
        ? (c as ExtractedColor).codigo!.trim() || undefined
        : undefined;
    if (!nome) continue;
    const key = `${nome.toLowerCase()}|${(codigo || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ nome, codigo });
  }
  return result;
}

function buildNormalizedVariants(
  prod: TextExtractedProduct,
  sizes: string[],
  colors: ExtractedColor[]
): ValidatedCatalogProduct["normalizedVariants"] {
  const seen = new Set<string>();
  const result: ValidatedCatalogProduct["normalizedVariants"] = [];

  if (Array.isArray(prod.variantes) && prod.variantes.length > 0) {
    for (const v of prod.variantes) {
      const size = v.tamanho?.trim() || null;
      const colorName = v.corNome?.trim() || null;
      const colorCode = v.corCodigo?.trim() || null;
      const skuSuffix = v.skuSufixo?.trim() || null;
      const barcode = normalizeBarcode(v.barcode);
      const priceOverride = normalizeNumber(v.precoOverride);

      let name = v.nome?.trim() || "";
      if (!name) {
        if (colorName && size) {
          name = colorCode ? `${colorName} (${colorCode}) - Tam. ${size}` : `${colorName} - Tam. ${size}`;
        } else if (colorName) {
          name = colorCode ? `${colorName} (${colorCode})` : colorName;
        } else if (size) {
          name = `Tam. ${size}`;
        } else {
          name = "Padrão";
        }
      }

      const key = `${(size || "").toLowerCase()}|${(colorCode || "").toLowerCase()}|${(colorName || "").toLowerCase()}|${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      result.push({
        name,
        size,
        colorName,
        colorCode,
        skuSuffix,
        barcode,
        priceOverride,
      });
    }
    if (result.length > 0) return result;
  }

  const sizeList = sizes.length > 0 ? sizes : [null];
  const colorList = colors.length > 0 ? colors : [{ nome: null as string | null, codigo: undefined }];

  for (const size of sizeList) {
    for (const color of colorList) {
      const colorName = color?.nome || null;
      const colorCode = color?.codigo || null;
      if (!size && !colorName && !colorCode) continue;

      let name = "";
      if (colorName && size) {
        name = colorCode ? `${colorName} (${colorCode}) - Tam. ${size}` : `${colorName} - Tam. ${size}`;
      } else if (colorName) {
        name = colorCode ? `${colorName} (${colorCode})` : colorName;
      } else if (size) {
        name = `Tam. ${size}`;
      }

      const key = `${(size || "").toLowerCase()}|${(colorCode || "").toLowerCase()}|${(colorName || "").toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      result.push({
        name,
        size,
        colorName,
        colorCode,
        skuSuffix: null,
        barcode: null,
        priceOverride: null,
      });
    }
  }

  return result;
}

/**
 * Etapa F: Valida, normaliza, deduplica e sinaliza ambiguidades antes da persistência,
 * preservando produtos incompletos para curadoria sem inventar dados ausentes.
 */
export function validateExtractedProducts(
  rawProducts: TextExtractedProduct[]
): ValidatedCatalogProduct[] {
  const validatedMap = new Map<string, ValidatedCatalogProduct>();

  for (const raw of rawProducts) {
    const cleanName = (raw.nome || "")
      .replace(/^\s*\d{1,2}\s*[-–.)]\s*/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanName.length < 2) continue;

    const cleanSku = normalizeSku(raw.sku);
    const regularPrice = normalizeNumber(raw.preco_regular);
    let promoPrice = normalizeNumber(raw.preco_promocional);
    const cyclePrice = normalizeNumber(raw.preco_ciclo);
    const promoRule = raw.regra_promocional?.trim() || null;
    const barcode = normalizeBarcode(raw.barcode);

    // Exige ao menos um identificador comercial mínimo (SKU ou algum preço) para não cadastrar ruído editorial
    if (!cleanSku && regularPrice === null && promoPrice === null && cyclePrice === null) {
      continue;
    }

    const warnings: string[] = Array.isArray(raw.ambiguidades)
      ? raw.ambiguidades.map((a) => String(a).trim()).filter(Boolean)
      : [];

    if (!cleanSku) {
      warnings.push("SKU/código não identificado; revisão manual recomendada.");
    }
    if (regularPrice === null && cyclePrice === null && promoPrice === null) {
      warnings.push("Nenhum preço válido identificado.");
    }
    if (promoPrice !== null && regularPrice !== null && promoPrice >= regularPrice) {
      warnings.push(
        `Preço promocional (${promoPrice.toFixed(2)}) maior ou igual ao regular (${regularPrice.toFixed(2)}); promoção descartada para revisão.`
      );
      promoPrice = null;
    }
    if (raw.confianca === "BAIXA") {
      warnings.push("Extração marcada com baixa confiança pela IA.");
    }
    if (raw.is_kit) {
      warnings.push("Item identificado como kit/combo/conjunto.");
    }

    const sizes = deduplicateSizes(raw.tamanhos);
    const colors = deduplicateColors(raw.cores);
    const normalizedVariants = buildNormalizedVariants(raw, sizes, colors);
    const promoMinQuantity = inferPromoMinQuantity(
      raw.quantidade_minima_promo,
      promoRule,
      promoPrice !== null
    );

    const hasSevereIssue =
      !cleanSku ||
      (regularPrice === null && cyclePrice === null) ||
      raw.confianca === "BAIXA" ||
      warnings.some((w) => /promo|preço|sku|incert|duvidos/i.test(w));

    const curationStatus: "PENDING_REVIEW" | "FLAGGED" = hasSevereIssue
      ? "FLAGGED"
      : "PENDING_REVIEW";

    const item: ValidatedCatalogProduct = {
      ...raw,
      cleanSku,
      cleanName,
      sku: cleanSku,
      nome: cleanName,
      descricao: raw.descricao?.trim() || null,
      pagina_editorial:
        typeof raw.pagina_editorial === "number" && raw.pagina_editorial > 0
          ? raw.pagina_editorial
          : null,
      preco_regular: regularPrice,
      preco_promocional: promoPrice,
      preco_ciclo: cyclePrice,
      quantidade_minima_promo: promoMinQuantity,
      regra_promocional: promoPrice !== null ? promoRule : raw.regra_promocional?.trim() || null,
      tamanhos: sizes,
      cores: colors,
      barcode,
      curationStatus,
      curationNotes: warnings.length > 0 ? warnings.join(" | ") : null,
      validationWarnings: warnings,
      promoMinQuantity,
      normalizedVariants,
    };

    const dedupKey = cleanSku
      ? `SKU:${cleanSku.toLowerCase()}`
      : `NAME:${cleanName.toLowerCase()}`;

    const existing = validatedMap.get(dedupKey);
    if (!existing) {
      validatedMap.set(dedupKey, item);
    } else {
      // Mescla complementarmente se o mesmo produto apareceu duplicado na mesma folha
      if (!existing.descricao && item.descricao) existing.descricao = item.descricao;
      if (existing.preco_regular === null && item.preco_regular !== null) {
        existing.preco_regular = item.preco_regular;
      } else if (
        existing.preco_regular !== null &&
        item.preco_regular !== null &&
        existing.preco_regular !== item.preco_regular
      ) {
        existing.curationStatus = "FLAGGED";
        existing.validationWarnings.push(
          `Conflito de preço na mesma folha (${existing.preco_regular} vs ${item.preco_regular}).`
        );
        existing.curationNotes = existing.validationWarnings.join(" | ");
      }
      if (existing.preco_promocional === null && item.preco_promocional !== null) {
        existing.preco_promocional = item.preco_promocional;
        existing.regra_promocional = item.regra_promocional;
        existing.promoMinQuantity = item.promoMinQuantity;
      }
      if (item.normalizedVariants.length > existing.normalizedVariants.length) {
        existing.normalizedVariants = item.normalizedVariants;
        existing.tamanhos = item.tamanhos;
        existing.cores = item.cores;
      }
    }
  }

  return Array.from(validatedMap.values());
}
