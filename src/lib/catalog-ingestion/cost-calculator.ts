/**
 * Tabela de preços estimados por 1 milhão de tokens (USD) por família de modelo Gemini.
 * Diferencia tokens de entrada e tokens de saída em vez de utilizar uma taxa fixa única.
 */
interface ModelPricing {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

const MODEL_PRICING_TABLE: Record<string, ModelPricing> = {
  "gemini-3.8-flash": {
    inputPerMillionUsd: 0.15,
    outputPerMillionUsd: 0.60,
  },
  "gemini-3.5-flash": {
    inputPerMillionUsd: 0.10,
    outputPerMillionUsd: 0.40,
  },
  "gemini-2.5-flash": {
    inputPerMillionUsd: 0.15,
    outputPerMillionUsd: 0.60,
  },
  "gemini-2.5-flash-lite": {
    inputPerMillionUsd: 0.075,
    outputPerMillionUsd: 0.30,
  },
  "gemini-2.5-pro": {
    inputPerMillionUsd: 1.25,
    outputPerMillionUsd: 10.0,
  },
};

const DEFAULT_MODEL_PRICING: ModelPricing = {
  inputPerMillionUsd: 0.15,
  outputPerMillionUsd: 0.60,
};

export function getModelPricing(modelName?: string | null): ModelPricing {
  if (!modelName) return DEFAULT_MODEL_PRICING;
  const normalized = modelName.toLowerCase().trim();

  if (MODEL_PRICING_TABLE[normalized]) {
    return MODEL_PRICING_TABLE[normalized];
  }

  for (const [key, pricing] of Object.entries(MODEL_PRICING_TABLE)) {
    if (normalized.includes(key)) {
      return pricing;
    }
  }

  return DEFAULT_MODEL_PRICING;
}

/**
 * Calcula o custo estimado em USD separando tokens de entrada, tokens de saída e modelo.
 */
export function calculateGeminiCostUsd(params: {
  modelUsed?: string | null;
  inputTokens: number;
  outputTokens: number;
}): number {
  const pricing = getModelPricing(params.modelUsed);
  const inputCost = (Math.max(0, params.inputTokens) / 1_000_000) * pricing.inputPerMillionUsd;
  const outputCost = (Math.max(0, params.outputTokens) / 1_000_000) * pricing.outputPerMillionUsd;
  return Number((inputCost + outputCost).toFixed(6));
}
