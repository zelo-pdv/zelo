import { GoogleGenAI, Type } from "@google/genai";
import type { ExtractedProduct } from "./types";

const systemInstruction = `Você é um especialista em catalogação e extração estruturada de produtos de catálogos e revistas brasileiras (especialmente DeMillus).
Sua missão é extrair rigorosamente TODOS os produtos à venda na imagem da folha dupla apresentada.

Diretrizes obrigatórias:
1. Identifique cada produto individual numerado (ex: "1 - Fio-dental Desejo", "2 - Fio-dental Vanille", "3 - Sutiã Top Lover").
2. SKU: é o código numérico de 6 dígitos que vem entre parênteses logo abaixo do nome do produto (ex: "(051813)" -> "051813"). Nunca invente ou omita dígitos.
3. Preço regular: valor numérico decimal em reais do preço de tabela da peça (ex: "26,99" -> 26.99).
4. Ofertas e Descontos Progressivos:
   - ATENÇÃO ESTRITA: Apenas preencha preco_promocional e regra_promocional se o selo de oferta mencionar EXPRESSAMENTE o nome ou número deste produto específico (ex: "1 Fio-dental Desejo por 26,99 ou 3 + por 17,99 CADA").
   - Se o produto não possuir promoção própria (como sutiãs caros exibidos na mesma página), preco_promocional DEVE ser null e regra_promocional DEVE ser null. NÃO compartilhe promoções entre peças diferentes!
5. Tamanhos: capture como array de strings, expandindo faixas contínuas (ex: "42 a 50" -> ["42", "44", "46", "48", "50"]; "PE ME GR EG XG" -> ["PE", "ME", "GR", "EG", "XG"]).
6. Cores: capture o array com nome da cor e o código de catálogo entre parênteses (ex: "Carmim(06)" -> { nome: "Carmim", codigo: "06" }).
7. Região da Foto (box_2d): informe a caixa delimitadora [ymin, xmin, ymax, xmax] normalizada de 0 a 1000 que enquadra a foto da modelo ou da peça em destaque correspondente a este produto específico.
8. Página editorial: localize o número impresso da página no rodapé ou cabeçalho mais próximo do produto.`;

const productSchema = {
  type: Type.ARRAY,
  description: "Lista de todos os produtos encontrados na folha dupla do catálogo",
  items: {
    type: Type.OBJECT,
    properties: {
      sku: {
        type: Type.STRING,
        description: "Código numérico de referência de 6 dígitos do produto, sem parênteses (ex: 051813)",
      },
      nome: {
        type: Type.STRING,
        description: "Nome comercial do produto (ex: Fio-dental Desejo)",
      },
      descricao: {
        type: Type.STRING,
        description: "Descrição dos tecidos, composição e detalhes funcionais da peça",
      },
      pagina_editorial: {
        type: Type.INTEGER,
        description: "Número impresso da página editorial da revista (ex: 6, 7, 22, 23)",
      },
      preco_regular: {
        type: Type.NUMBER,
        description: "Preço de tabela regular em reais (ex: 26.99)",
      },
      preco_promocional: {
        type: Type.NUMBER,
        description: "Preço promocional se houver selo de oferta (ex: 17.99), ou null",
      },
      regra_promocional: {
        type: Type.STRING,
        description: "Descrição textual da regra da promoção (ex: '3 ou + por 17,99 CADA'), ou null",
      },
      tamanhos: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Lista de tamanhos disponíveis (ex: ['PE', 'ME', 'GR', 'EG'] ou ['42', '44', '46', '48', '50'])",
      },
      cores: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            nome: { type: Type.STRING, description: "Nome da cor (ex: Carmim, Branco, Preto)" },
            codigo: { type: Type.STRING, description: "Código de catálogo de 2 dígitos ou 2 letras (ex: '06', '20', 'FL')" },
          },
          required: ["nome"],
        },
        description: "Lista de cores disponíveis com código de catálogo",
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

export async function extractProductsFromSheet(
  imageBuffer: Buffer
): Promise<GeminiExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY não configurada no ambiente. Adicione a chave ao arquivo .env."
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = imageBuffer.toString("base64");

  const promptContent = [
    {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    },
    {
      text: "Analise cuidadosamente esta folha do catálogo DeMillus e extraia todos os produtos à venda conforme o schema estruturado. Identifique cada SKU (código de 6 dígitos), preços, tamanhos, cores e a região da imagem (box_2d) que melhor representa o produto.",
    },
  ];

  const config = {
    systemInstruction,
    responseMimeType: "application/json",
    responseJsonSchema: productSchema,
    temperature: 0.1,
  };

  const startTime = Date.now();
  let response: any = null;
  let modelUsed = "gemini-3.8-flash";

  // Tentativa primária: gemini-3.8-flash com timeout de 25s
  try {
    response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: promptContent,
        config,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout após 25s em gemini-3.8-flash")),
          25000
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
