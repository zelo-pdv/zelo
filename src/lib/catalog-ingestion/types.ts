export type IngestionMode = "MULTIMODAL" | "TEXT_ONLY";

export interface ExtractedColor {
  nome: string;
  codigo?: string;
}

export interface ExtractedProduct {
  sku: string;
  nome: string;
  descricao?: string;
  pagina_editorial?: number;
  preco_regular: number;
  preco_promocional?: number | null;
  regra_promocional?: string | null;
  tamanhos: string[];
  cores: ExtractedColor[];
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalizado 0..1000
}

export interface CropResult {
  sku: string;
  cropBuffer: Buffer;
  width: number;
  height: number;
  coords: [number, number, number, number];
}

export interface SheetExtractionResult {
  sheetNumber: number;
  editorialPages?: string;
  modelUsed: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  products: ExtractedProduct[];
  crops: CropResult[];
}

export interface IngestionJobProgress {
  jobId: string;
  catalogId: string;
  mode?: IngestionMode;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  totalPages: number;
  processedPages: number;
  failedPages: number;
  totalProductsFound: number;
  totalTokensUsed: number;
  estimatedCostUsd: number;
  currentSheet?: number;
  errorMessage?: string;
}

// ============================================================================
// Tipos do Pipeline Baseado Exclusivamente em Texto (TEXT_ONLY)
// ============================================================================

export type SpanSource = "NATIVE" | "OCR";

export interface TextSpan {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName?: string;
  confidence?: number;
  source: SpanSource;
}

export interface RawPageTextExtraction {
  sheetNumber: number;
  pageWidth: number;
  pageHeight: number;
  spans: TextSpan[];
  imageOpsCount: number;
  fullText: string;
}

export type PageQualityStatus =
  | "SUFFICIENT_NATIVE"
  | "SPARSE_NATIVE"
  | "NO_TEXT"
  | "FRAGMENTED_OR_COLUMNAR"
  | "NON_COMMERCIAL";

export interface PageQualityReport {
  sheetNumber: number;
  status: PageQualityStatus;
  needsOcr: boolean;
  isCommercialCandidate: boolean;
  reason: string;
  charCount: number;
  spanCount: number;
  imageOpsCount: number;
  detectedColumns: number;
  isDoubleSpread: boolean;
  avgTokenLength: number;
  garbageRatio: number;
  avgFontSize: number;
  commercialSignals: number;
}

export type ColumnSide = "LEFT" | "RIGHT" | "SINGLE";

export interface TextLine {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  columnSide: ColumnSide;
  spans: TextSpan[];
}

export interface BlockSignals {
  skus: string[];
  prices: number[];
  hasPromoKeywords: boolean;
  hasSizeKeywords: boolean;
  hasColorKeywords: boolean;
  hasKitKeywords: boolean;
  isSharedHeader: boolean;
  isPromoBadge: boolean;
  isNoise: boolean;
}

export interface SpatialBlock {
  id: string;
  sheetNumber: number;
  editorialPage?: number | null;
  columnSide: ColumnSide;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  lines: TextLine[];
  text: string;
  source: SpanSource | "HYBRID";
  signals: BlockSignals;
  sharedContext?: string;
  attachedPromoTexts?: string[];
}

export interface SpatialOrganizationResult {
  sheetNumber: number;
  isDoubleSpread: boolean;
  leftEditorialPage?: number | null;
  rightEditorialPage?: number | null;
  blocks: SpatialBlock[];
  candidateBlocks: SpatialBlock[];
  noiseBlocksCount: number;
}

export interface TextExtractedVariant {
  nome?: string | null;
  tamanho?: string | null;
  corNome?: string | null;
  corCodigo?: string | null;
  skuSufixo?: string | null;
  barcode?: string | null;
  precoOverride?: number | null;
}

export type ExtractionConfidence = "ALTA" | "MEDIA" | "BAIXA";

export interface TextExtractedProduct {
  sku?: string | null;
  nome: string;
  descricao?: string | null;
  pagina_editorial?: number | null;
  preco_regular?: number | null;
  preco_promocional?: number | null;
  preco_ciclo?: number | null;
  quantidade_minima_promo?: number | null;
  regra_promocional?: string | null;
  tamanhos: string[];
  cores: ExtractedColor[];
  variantes?: TextExtractedVariant[];
  is_kit?: boolean;
  barcode?: string | null;
  ambiguidades?: string[];
  confianca?: ExtractionConfidence;
  origem_bloco_id?: string | null;
  extractionMethod?: "DETERMINISTIC" | "AI_STRUCTURED";
}

export interface ValidatedCatalogProduct extends TextExtractedProduct {
  cleanSku: string | null;
  cleanName: string;
  curationStatus: "PENDING_REVIEW" | "FLAGGED";
  curationNotes: string | null;
  validationWarnings: string[];
  promoMinQuantity: number;
  normalizedVariants: Array<{
    name: string;
    size: string | null;
    colorName: string | null;
    colorCode: string | null;
    skuSuffix: string | null;
    barcode: string | null;
    priceOverride: number | null;
  }>;
}

export interface BrandExtractionProfile {
  slug: string;
  name: string;
  skuRegexes: RegExp[];
  skuMinDigits: number;
  skuMaxDigits: number;
  allowAlphanumericSku: boolean;
  numberedProductPrefixRegex: RegExp;
  colorPairRegex: RegExp;
  sizeHeaderRegex: RegExp;
  promptHints: string;
}

export interface ModelUsageEntry {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface TextJobMetrics {
  mode: "TEXT_ONLY";
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  aiCalls: number;
  ocrPages: number;
  nativeTextPages: number;
  skippedPages: number;
  deterministicProducts: number;
  aiAssistedProducts: number;
  flaggedProducts: number;
  totalDurationMs: number;
  estimatedCostUsd: number;
  modelBreakdown: Record<string, ModelUsageEntry>;
}
