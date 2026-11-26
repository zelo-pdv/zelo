import { GoogleGenAI, Type } from "@google/genai";
import { getBrandExtractionProfile } from "./brand-profiles";
import type { ExtractedProduct } from "./types";

function buildMultimodalSystemInstruction(brandName?: string | null, catalogTitle?: string | null): string {
  const profile = getBrandExtractionProfile(brandName);
  const brandLabel = brandName?.trim() || profile.name;

  return `Você é um especialista em catalogação e extração estruturada de produtos de catálogos e revistas de varejo brasileiras.
Contexto do catálogo atual: Marca "${brandLabel}"${catalogTitle ? ` — Edição "${catalogTitle}"` : ""}.
Orientação específica da marca: ${profile.promptHints}

Sua missão é extrair rigorosamente TODOS os produtos à venda na imagem da folha apresentada.

Diretrizes obrigatórias:
1. Identifique cada produto individual (ex: "1 - Hidratante Corporal", "2 - Sutiã Top Lover", ou item avulso com nome + código/referência).
2. SKU: código de referência ou catálogo exibido para o item (numérico ou alfanumérico, conforme padrão da marca). Nunca invente ou omita caracteres.
3. Preço regular: valor numérico decimal em reais do preço de tabela da peça (ex: "26,99" -> 26.99).
4. Ofertas e Descontos Progressivos:
   - ATENÇÃO ESTRITA: Apenas preencha preco_promocional e regra_promocional se o selo ou preço promocional mencionar EXPRESSAMENTE este produto específico.
   - Se o produto não possuir promoção própria, preco_promocional DEVE ser null e regra_promocional DEVE ser null. NÃO compartilhe promoções entre peças diferentes!
5. Tamanhos / Volumetria: capture como array de strings, expandindo faixas contínuas quando aplicável (ex: "42 a 50" -> ["42", "44", "46", "48", "50"]).
6. Cores / Variantes: capture o array com nome da cor/variação e código se houver (ex: "Carmim(06)" -> { nome: "Carmim", codigo: "06" }).
7. Região da Foto (box_2d): informe a caixa delimitadora [ymin, xmin, ymax, xmax] normalizada de 0 a 1000 que enquadra a foto principal correspondente a este produto específico.
8. Página editorial: localize o número impresso da página no rodapé ou cabeçalho mais próximo do produto.`;
}

const productSchema = {
  type: Type.ARRAY,
  description: "Lista de todos os produtos encontrados na folha do catálogo",
  items: {
    type: Type.OBJECT,
    properties: {
      sku: {
        type: Type.STRING,
        description: "Código/referência ou SKU oficial do produto impresso no catálogo (sem parênteses)",
      },
      nome: {
        type: Type.STRING,
        description: "Nome comercial completo do produto",
      },
      descricao: {
        type: Type.STRING,
        description: "Descrição dos ingredientes, tecidos, volumetria ou detalhes funcionais",
      },
      pagina_editorial: {
        type: Type.INTEGER,
        description: "Número impresso da página editorial da revista",
      },
      preco_regular: {
        type: Type.NUMBER,
        description: "Preço de tabela regular em reais (ex: 26.99)",
      },
      preco_promocional: {
        type: Type.NUMBER,
        description: "Preço promocional se houver oferta própria explícita, ou null",
      },
      regra_promocional: {
        type: Type.STRING,
        description: "Descrição textual exata da regra da promoção (ex: '3 ou + por 17,99 CADA'), ou null",
      },
      tamanhos: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Lista de tamanhos ou volumetrias disponíveis",
      },
      cores: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            nome: { type: Type.STRING, description: "Nome da cor ou variação" },
            codigo: { type: Type.STRING, description: "Código de catálogo da variação, se existir" },
          },
          required: ["nome"],
        },
        description: "Lista de cores ou variações com código de catálogo",
      },
      box_2d: {
        type: Type.ARRAY,
        items: { type: Type.INTEGER },
        description: "Caixa delimitadora da foto principal do produto: [ymin, xmin, ymax, xmax] normalizado entre 0 e 1000",
      },
    },
    required: ["sku", "nome", "preco_regular", "tamanhos", "cores", "box_2d"],
  },
};

export interface GeminiExtractionResult {
  products: ExtractedProduct[];
  modelUsed: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
}

export interface GeminiExtractionContext {
  brandName?: string | null;
  catalogTitle?: string | null;
}

function getSheetTimeoutMs(): number {
  const envVal = Number(process.env.GEMINI_SHEET_TIMEOUT_MS || "45000");
  return Number.isFinite(envVal) && envVal >= 10000 ? envVal : 45000;
}

export async function extractProductsFromSheet(
  imageBuffer: Buffer,
  extractionContext?: GeminiExtractionContext
): Promise<GeminiExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY não configurada no ambiente. Adicione a chave ao arquivo .env."
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = imageBuffer.toString("base64");
  const brandLabel = extractionContext?.brandName?.trim();
  const timeoutMs = getSheetTimeoutMs();

  const promptContent = [
    {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    },
    {
      text: `Analise cuidadosamente esta folha do catálogo${brandLabel ? ` da marca ${brandLabel}` : ""} e extraia todos os produtos à venda conforme o schema estruturado. Identifique cada código/SKU, preços, tamanhos, cores/variações e a região da imagem (box_2d) que melhor representa o produto.`,
    },
  ];

  const config = {
    systemInstruction: buildMultimodalSystemInstruction(
      extractionContext?.brandName,
      extractionContext?.catalogTitle
    ),
    responseMimeType: "application/json",
    responseJsonSchema: productSchema,
    temperature: 0.1,
  };

  const startTime = Date.now();
  let response: any = null;
  let modelUsed = "gemini-3.8-flash";

  // Tentativa primária: gemini-3.8-flash com timeout configurável (padrão 45s)
  try {
    response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: promptContent,
        config,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout após ${Math.round(timeoutMs / 1000)}s em gemini-3.8-flash`)),
          timeoutMs
        )
      ),
    ]);
  } catch (err: any) {
    // Fallback resiliente para gemini-3.5-flash com retentativas
    modelUsed = "gemini-3.5-flash";
    let lastError: any = err;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptContent,
          config,
        });
        lastError = null;
        break;
      } catch (retryErr: any) {
        lastError = retryErr;
        if (attempt < 3) {
          const waitTime = attempt * 3000;
          await new Promise((r) => setTimeout(r, waitTime));
        }
      }
    }

    if (lastError) {
      throw new Error(
        `Falha na extração de produtos (gemini-3.8 e gemini-3.5 falharam): ${lastError.message}`
      );
    }
  }

  const durationMs = Date.now() - startTime;
  const usage = response.usageMetadata || {};
  const inputTokens = usage.promptTokenCount || 0;
  const outputTokens = usage.candidatesTokenCount || 0;

  const rawJson = response.text || "[]";
  const parsed = JSON.parse(rawJson);
  const products: ExtractedProduct[] = Array.isArray(parsed) ? parsed : [];

  return {
    products,
    modelUsed,
    durationMs,
    inputTokens,
    outputTokens,
  };
}
