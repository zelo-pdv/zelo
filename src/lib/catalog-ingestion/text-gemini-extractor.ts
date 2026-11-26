import { GoogleGenAI, Type } from "@google/genai";
import { calculateGeminiCostUsd } from "./cost-calculator";
import type {
  BrandExtractionProfile,
  SpatialBlock,
  TextExtractedProduct,
} from "./types";

const textProductSchema = {
  type: Type.ARRAY,
  description: "Produtos estruturados extraídos exclusivamente dos blocos textuais fornecidos",
  items: {
    type: Type.OBJECT,
    properties: {
      sku: {
        type: Type.STRING,
        description:
          "Código ou SKU oficial do produto conforme impresso (numérico ou alfanumérico). Retornar null se ausente.",
        nullable: true,
      },
      nome: {
        type: Type.STRING,
        description: "Nome comercial completo do produto sem numeração de lista inicial.",
      },
      descricao: {
        type: Type.STRING,
        description: "Descrição técnica, composição, fragrância ou detalhes do produto, ou null.",
        nullable: true,
      },
      pagina_editorial: {
        type: Type.INTEGER,
        description: "Número da página editorial associada ao bloco, ou null.",
        nullable: true,
      },
      preco_regular: {
        type: Type.NUMBER,
        description: "Preço regular/tabela em reais (ex: 49.90), ou null se não informado.",
        nullable: true,
      },
      preco_promocional: {
        type: Type.NUMBER,
        description:
          "Preço promocional em reais somente se expressamente aplicável a este produto, ou null.",
        nullable: true,
      },
      preco_ciclo: {
        type: Type.NUMBER,
        description: "Preço específico da campanha/ciclo quando diferente do regular, ou null.",
        nullable: true,
      },
      quantidade_minima_promo: {
        type: Type.INTEGER,
        description:
          "Quantidade mínima para ativar o preço promocional (ex: 3 para '3 ou + por X'), ou null.",
        nullable: true,
      },
      regra_promocional: {
        type: Type.STRING,
        description: "Texto literal da regra promocional associada a este produto, ou null.",
        nullable: true,
      },
      tamanhos: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          "Lista de tamanhos/volumes disponíveis (expandir faixas como '42 a 50' em ['42','44','46','48','50']).",
      },
      cores: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            nome: { type: Type.STRING },
            codigo: { type: Type.STRING, nullable: true },
          },
          required: ["nome"],
        },
        description: "Lista de cores/tons/opções com código de catálogo quando presente.",
      },
      variantes: {
        type: Type.ARRAY,
        description:
          "Use somente quando houver variações com códigos/preços/barcodes individuais diferentes; caso contrário retorne array vazio.",
        items: {
          type: Type.OBJECT,
          properties: {
            nome: { type: Type.STRING, nullable: true },
            tamanho: { type: Type.STRING, nullable: true },
            corNome: { type: Type.STRING, nullable: true },
            corCodigo: { type: Type.STRING, nullable: true },
            skuSufixo: { type: Type.STRING, nullable: true },
            barcode: { type: Type.STRING, nullable: true },
            precoOverride: { type: Type.NUMBER, nullable: true },
          },
        },
      },
      is_kit: {
        type: Type.BOOLEAN,
        description: "true se for kit, combo, conjunto vendido como item único ou caixa fechada.",
      },
      barcode: {
        type: Type.STRING,
        description: "Código de barras EAN/GTIN se impresso no texto, ou null.",
        nullable: true,
      },
      ambiguidades: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          "Lista de dúvidas ou ambiguidades encontradas (ex: promoção incerta, SKU ausente, OCR duvidoso).",
      },
      confianca: {
        type: Type.STRING,
        description: "Nível de confiança da extração: ALTA, MEDIA ou BAIXA.",
      },
      origem_bloco_id: {
        type: Type.STRING,
        description: "Identificador exato do bloco de origem (ex: S4-LEFT-B1).",
        nullable: true,
      },
    },
    required: ["nome", "tamanhos", "cores", "is_kit", "confianca"],
  },
};

export interface TextGeminiExtractionInput {
  brandName: string;
  catalogTitle: string;
  sheetNumber: number;
  blocks: SpatialBlock[];
  brandProfile: BrandExtractionProfile;
}

export interface TextGeminiExtractionOutput {
  products: TextExtractedProduct[];
  modelUsed: string;
  callsCount: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

function formatBlocksPayload(blocks: SpatialBlock[]): string {
  return blocks
    .map((block) => {
      const header = [
        `[BLOCO ${block.id}]`,
        `lado=${block.columnSide}`,
        `pag_editorial=${block.editorialPage ?? "?"}`,
        `fonte=${block.source}`,
        `coords=(x:${Math.round(block.region.x)},y:${Math.round(block.region.y)},w:${Math.round(block.region.width)},h:${Math.round(block.region.height)})`,
      ].join(" | ");

      const parts = [header];
      if (block.sharedContext) {
        parts.push(`Contexto compartilhado próximo:\n${block.sharedContext}`);
      }
      parts.push(`Texto do bloco:\n${block.text}`);
      if (block.attachedPromoTexts && block.attachedPromoTexts.length > 0) {
        parts.push(`Selo(s) promocional(is) associado(s) ou próximo(s):\n${block.attachedPromoTexts.join("\n---\n")}`);
      }
      return parts.join("\n");
    })
    .join("\n\n====================\n\n");
}

function buildSystemInstruction(profile: BrandExtractionProfile): string {
  return `Você é um especialista em estruturação de catálogos comerciais brasileiros (múltiplas marcas e segmentos: cosméticos, perfumaria, vestuário, lingerie, casa, etc.).
Você receberá APENAS blocos textuais já pré-organizados espacialmente com suas coordenadas e contextos próximos (SEM imagens).

Regras obrigatórias:
1. Extraia somente produtos comercializáveis presentes nos blocos fornecidos. Ignore textos puramente editoriais, avisos de conservação ou cabeçalhos decorativos.
2. NÃO invente dados ausentes: se SKU, preço, tamanho, cor ou descrição não estiverem no texto, retorne null ou array vazio e registre em "ambiguidades".
3. Diferencie produtos individuais de kits, combos ou conjuntos vendidos juntos ("is_kit": true/false).
4. Promoções: SOMENTE atribua preco_promocional / regra_promocional se o selo de oferta se referir claramente àquele produto específico. Se houver dúvida entre produtos próximos, NÃO misture e registre a dúvida em "ambiguidades" com confianca="MEDIA" ou "BAIXA".
5. Tamanhos: expanda faixas contínuas (ex: "42 a 50" -> ["42","44","46","48","50"]).
6. Cores: capture { nome, codigo } quando houver código de cor.
7. Variantes: só preencha "variantes" quando alguma variação tiver código/sufixo, código de barras ou preço próprio diferente; se todas compartilharem o mesmo preço, deixe "variantes": [] e preencha apenas "tamanhos" e "cores".
8. Preencha "origem_bloco_id" com o ID exato do bloco analisado e evite duplicações.
9. Contexto específico da marca (${profile.name}): ${profile.promptHints}`;
}

async function callGeminiWithTimeout(
  ai: GoogleGenAI,
  model: string,
  contents: string,
  systemInstruction: string,
  timeoutMs: number
) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseJsonSchema: textProductSchema,
          temperature: 0.1,
          abortSignal: controller.signal,
          httpOptions: { timeout: timeoutMs },
        },
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`Timeout após ${Math.round(timeoutMs / 1000)}s no modelo ${model}`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const MAX_BLOCKS_PER_CALL = 5;

async function extractBatchWithFallback(
  ai: GoogleGenAI,
  payloadText: string,
  systemInstruction: string
): Promise<{
  products: TextExtractedProduct[];
  modelUsed: string;
  callsCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}> {
  let callsCount = 0;
  let response: any = null;
  let modelUsed = "gemini-3.8-flash";

  try {
    callsCount++;
    response = await callGeminiWithTimeout(
      ai,
      "gemini-3.8-flash",
      payloadText,
      systemInstruction,
      35000
    );
  } catch (primaryErr: any) {
    modelUsed = "gemini-3.5-flash";
    let lastError: any = primaryErr;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        callsCount++;
        response = await callGeminiWithTimeout(
          ai,
          "gemini-3.5-flash",
          payloadText,
          systemInstruction,
          35000
        );
        lastError = null;
        break;
      } catch (retryErr: any) {
        lastError = retryErr;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 2500));
        }
      }
    }

    if (lastError) {
      throw new Error(
        `Falha na estruturação textual via Gemini (gemini-3.8-flash e gemini-3.5-flash): ${lastError.message}`
      );
    }
  }

  const usage = response?.usageMetadata || {};
  const inputTokens = Number(usage.promptTokenCount || 0);
  const outputTokens = Number(usage.candidatesTokenCount || 0);

  let parsed: unknown = [];
  try {
    parsed = JSON.parse(response?.text || "[]");
  } catch {
    parsed = [];
  }

  const rawProducts: TextExtractedProduct[] = Array.isArray(parsed) ? parsed : [];
  const products = rawProducts.map((p) => ({
    ...p,
    extractionMethod: "AI_STRUCTURED" as const,
  }));

  const estimatedCostUsd = calculateGeminiCostUsd({
    modelUsed,
    inputTokens,
    outputTokens,
  });

  return {
    products,
    modelUsed,
    callsCount,
    inputTokens,
    outputTokens,
    estimatedCostUsd,
  };
}

/**
 * Etapa E: Estrutura blocos candidatos em produtos utilizando exclusivamente texto
 * (sem imagens) e saída JSON Schema estruturada via Gemini, fatiando folhas densas em lotes.
 */
export async function extractProductsFromTextBlocks(
  input: TextGeminiExtractionInput
): Promise<TextGeminiExtractionOutput> {
  if (input.blocks.length === 0) {
    return {
      products: [],
      modelUsed: "none",
      callsCount: 0,
      durationMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY não configurada no ambiente. Adicione a chave ao arquivo .env."
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = buildSystemInstruction(input.brandProfile);
  const startTime = Date.now();

  const batches: SpatialBlock[][] = [];
  for (let i = 0; i < input.blocks.length; i += MAX_BLOCKS_PER_CALL) {
    batches.push(input.blocks.slice(i, i + MAX_BLOCKS_PER_CALL));
  }

  const allProducts: TextExtractedProduct[] = [];
  let totalCalls = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;
  const modelsUsed = new Set<string>();

  for (const batch of batches) {
    const payloadText = [
      `Marca: ${input.brandName}`,
      `Catálogo: ${input.catalogTitle}`,
      `Folha física do PDF: ${input.sheetNumber}`,
      "",
      "Blocos candidatos organizados:",
      "",
      formatBlocksPayload(batch),
    ].join("\n");

    const batchRes = await extractBatchWithFallback(ai, payloadText, systemInstruction);
    allProducts.push(...batchRes.products);
    totalCalls += batchRes.callsCount;
    totalInputTokens += batchRes.inputTokens;
    totalOutputTokens += batchRes.outputTokens;
    totalCostUsd = Number((totalCostUsd + batchRes.estimatedCostUsd).toFixed(6));
    modelsUsed.add(batchRes.modelUsed);
  }

  const durationMs = Date.now() - startTime;
  const modelUsed =
    modelsUsed.size === 1
      ? Array.from(modelsUsed)[0]
      : Array.from(modelsUsed).join("+") || "none";

  return {
    products: allProducts,
    modelUsed,
    callsCount: totalCalls,
    durationMs,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    estimatedCostUsd: totalCostUsd,
  };
}
