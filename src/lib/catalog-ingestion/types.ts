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
