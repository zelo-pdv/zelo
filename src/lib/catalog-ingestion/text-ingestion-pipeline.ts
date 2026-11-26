import prisma from "@/lib/prisma";
import { getBrandExtractionProfile } from "./brand-profiles";
import { extractNativePageText, assessPageTextQuality } from "./pdf-text-extractor";
import { runSelectiveOcr } from "./selective-ocr";
import { organizeSpatialBlocks } from "./spatial-organizer";
import { splitDeterministicAndAiBlocks } from "./deterministic-parser";
import { extractProductsFromTextBlocks } from "./text-gemini-extractor";
import { validateExtractedProducts } from "./product-validator";
import type {
  PageQualityReport,
  RawPageTextExtraction,
  SpanSource,
  TextExtractedProduct,
  ValidatedCatalogProduct,
} from "./types";

export interface ProcessSheetTextOnlyOptions {
  catalogId: string;
  catalogTitle: string;
  brandId: string;
  brandName: string;
  brandSlug?: string | null;
  pdfDoc: any;
  sheetNumber: number;
  jobId?: string;
}

export interface ProcessSheetTextOnlyOutput {
  sheetNumber: number;
  extractionSource: SpanSource | "HYBRID" | "SKIPPED";
  qualityReport: PageQualityReport;
  usedOcr: boolean;
  aiCalls: number;
  modelUsed: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  extractedCount: number;
  deterministicCount: number;
  aiAssistedCount: number;
  flaggedCount: number;
  products: ValidatedCatalogProduct[];
}

/**
 * Persiste produtos validados de forma idempotente SEM extrair, alterar ou sobrescrever imagens.
 */
async function persistTextOnlyProducts(
  catalogId: string,
  brandId: string,
  products: ValidatedCatalogProduct[]
): Promise<void> {
  for (const prod of products) {
    // 1. Localiza ou cria GlobalProduct sem jamais sobrescrever imageUrl existente
    let globalProduct = prod.cleanSku
      ? await prisma.globalProduct.findUnique({
          where: {
            brandId_referenceSku: {
              brandId,
              referenceSku: prod.cleanSku,
            },
          },
        })
      : await prisma.globalProduct.findFirst({
          where: {
            brandId,
            name: { equals: prod.cleanName, mode: "insensitive" },
          },
        });

    const suggestedPrice =
      prod.preco_regular ?? prod.preco_ciclo ?? prod.preco_promocional ?? undefined;

    if (globalProduct) {
      const updateData: Record<string, unknown> = {
        active: true,
      };
      // Atualiza nome apenas se o novo nome for consistente e o produto não for de baixa confiança
      if (prod.cleanName && prod.confianca !== "BAIXA") {
        updateData.name = prod.cleanName;
      }
      // Nunca apaga uma descrição existente com null
      if (prod.descricao && prod.descricao.trim().length > 0) {
        updateData.description = prod.descricao;
      }
      if (suggestedPrice !== undefined) {
        updateData.suggestedPrice = suggestedPrice;
      }
      if (prod.barcode && !globalProduct.barcode) {
        updateData.barcode = prod.barcode;
      }
      // Importante: NÃO toca em imageUrl na modalidade sem imagens

      globalProduct = await prisma.globalProduct.update({
        where: { id: globalProduct.id },
        data: updateData,
      });
    } else {
      globalProduct = await prisma.globalProduct.create({
        data: {
          brandId,
          referenceSku: prod.cleanSku,
          name: prod.cleanName,
          description: prod.descricao || null,
          barcode: prod.barcode || null,
          suggestedPrice: suggestedPrice ?? null,
          imageUrl: null,
          active: true,
        },
      });
    }

    // 2. Persistência idempotente de GlobalProductVariant (tratando NULLs corretamente)
    if (prod.normalizedVariants.length > 0) {
      const existingVariants = await prisma.globalProductVariant.findMany({
        where: { globalProductId: globalProduct.id },
      });

      const byKey = new Map<string, (typeof existingVariants)[number]>();
      for (const ev of existingVariants) {
        const key = `${(ev.size || "").toLowerCase()}|${(ev.colorCode || "").toLowerCase()}|${(ev.colorName || "").toLowerCase()}`;
        byKey.set(key, ev);
      }

      for (const variant of prod.normalizedVariants) {
        const key = `${(variant.size || "").toLowerCase()}|${(variant.colorCode || "").toLowerCase()}|${(variant.colorName || "").toLowerCase()}`;
        const existingVar = byKey.get(key);

        if (existingVar) {
          await prisma.globalProductVariant.update({
            where: { id: existingVar.id },
            data: {
              name: variant.name,
              colorName: variant.colorName ?? existingVar.colorName,
              barcode: variant.barcode ?? existingVar.barcode,
              skuSuffix: variant.skuSuffix ?? existingVar.skuSuffix,
              priceOverride: variant.priceOverride ?? existingVar.priceOverride,
              active: true,
            },
          });
        } else {
          try {
            const createdVar = await prisma.globalProductVariant.create({
              data: {
                globalProductId: globalProduct.id,
                name: variant.name,
                size: variant.size,
                colorName: variant.colorName,
                colorCode: variant.colorCode,
                barcode: variant.barcode,
                skuSuffix: variant.skuSuffix,
                priceOverride: variant.priceOverride,
                active: true,
              },
            });
            byKey.set(key, createdVar);
          } catch {
            // Ignora conflito concorrente eventual da chave única
          }
        }
      }
    }

    // 3. Upsert em CatalogProduct preservando eventuais cropUrl/cropBox prévios
    await prisma.catalogProduct.upsert({
      where: {
        catalogId_globalProductId: {
          catalogId,
          globalProductId: globalProduct.id,
        },
      },
      update: {
        pageNumber: prod.pagina_editorial ?? undefined,
        regularPrice: prod.preco_regular,
        promoPrice: prod.preco_promocional,
        cyclePrice: prod.preco_ciclo,
        promoRule: prod.regra_promocional,
        promoMinQuantity: prod.promoMinQuantity,
        curationStatus: prod.curationStatus,
        curationNotes: prod.curationNotes,
      },
      create: {
        catalogId,
        globalProductId: globalProduct.id,
        pageNumber: prod.pagina_editorial,
        regularPrice: prod.preco_regular,
        promoPrice: prod.preco_promocional,
        cyclePrice: prod.preco_ciclo,
        promoRule: prod.regra_promocional,
        promoMinQuantity: prod.promoMinQuantity,
        cropBox: undefined,
        cropUrl: null,
        curationStatus: prod.curationStatus,
        curationNotes: prod.curationNotes,
      },
    });
  }
}

/**
 * Executa o pipeline completo baseado exclusivamente em texto para uma única folha do PDF:
 * Etapa A (Extração nativa) -> Etapa B (Qualidade) -> Etapa C (OCR seletivo) ->
 * Etapa D (Organização espacial) -> Etapa E (Estruturação seletiva com Gemini) ->
 * Etapa F (Validação + Persistência idempotente sem imagens).
 */
export async function processCatalogSheetTextOnly({
  catalogId,
  catalogTitle,
  brandId,
  brandName,
  brandSlug,
  pdfDoc,
  sheetNumber,
  jobId,
}: ProcessSheetTextOnlyOptions): Promise<ProcessSheetTextOnlyOutput> {
  const startTime = Date.now();
  const brandProfile = getBrandExtractionProfile(brandSlug, brandName);

  // Etapa A: Extração nativa com coordenadas via PDF.js
  const nativeExtraction = await extractNativePageText(pdfDoc, sheetNumber);

  // Etapa B: Análise da qualidade textual da página
  const qualityReport = assessPageTextQuality(nativeExtraction, brandProfile);

  let effectiveExtraction: RawPageTextExtraction = nativeExtraction;
  let extractionSource: SpanSource | "HYBRID" | "SKIPPED" = "NATIVE";
  let usedOcr = false;

  // Etapa C: OCR seletivo local apenas quando a página precisar
  if (qualityReport.needsOcr) {
    const ocrResult = await runSelectiveOcr(pdfDoc, sheetNumber);
    usedOcr = true;

    if (ocrResult.spans.length > 0) {
      if (nativeExtraction.spans.length >= 3) {
        // Mescla spans nativos preservados com spans recuperados por OCR
        effectiveExtraction = {
          ...nativeExtraction,
          spans: [...nativeExtraction.spans, ...ocrResult.spans],
          fullText: `${nativeExtraction.fullText} ${ocrResult.rawText}`.trim(),
        };
        extractionSource = "HYBRID";
      } else {
        effectiveExtraction = {
          ...nativeExtraction,
          spans: ocrResult.spans,
          fullText: ocrResult.rawText,
        };
        extractionSource = "OCR";
      }
    }
  }

  let validatedProducts: ValidatedCatalogProduct[] = [];
  let aiCalls = 0;
  let modelUsed = "deterministic";
  let inputTokens = 0;
  let outputTokens = 0;
  let estimatedCostUsd = 0;
  let deterministicCount = 0;
  let aiAssistedCount = 0;
  let candidateBlockCount = 0;
  let totalBlockCount = 0;

  if (!qualityReport.isCommercialCandidate && !usedOcr) {
    extractionSource = "SKIPPED";
    modelUsed = "skipped";
  } else {
    // Etapa D: Organização espacial em blocos candidatos
    const organized = organizeSpatialBlocks(effectiveExtraction, brandProfile);
    totalBlockCount = organized.blocks.length;
    candidateBlockCount = organized.candidateBlocks.length;

    if (organized.candidateBlocks.length === 0) {
      extractionSource = usedOcr ? extractionSource : "SKIPPED";
      modelUsed = "skipped";
    } else {
      // Separa blocos determinísticos (0 tokens) de blocos que precisam do Gemini
      const { deterministicProducts, aiCandidateBlocks } =
        splitDeterministicAndAiBlocks(organized.candidateBlocks, brandProfile);

      const allRawProducts: TextExtractedProduct[] = [...deterministicProducts];
      deterministicCount = deterministicProducts.length;

      // Etapa E: Gemini apenas para blocos candidatos complexos/ambíguos/OCR
      if (aiCandidateBlocks.length > 0) {
        const geminiResult = await extractProductsFromTextBlocks({
          brandName,
          catalogTitle,
          sheetNumber,
          blocks: aiCandidateBlocks,
          brandProfile,
        });

        aiCalls = geminiResult.callsCount;
        modelUsed = geminiResult.modelUsed;
        inputTokens = geminiResult.inputTokens;
        outputTokens = geminiResult.outputTokens;
        estimatedCostUsd = geminiResult.estimatedCostUsd;
        aiAssistedCount = geminiResult.products.length;
        allRawProducts.push(...geminiResult.products);
      }

      // Etapa F: Validação e normalização antes da persistência
      validatedProducts = validateExtractedProducts(allRawProducts);

      if (validatedProducts.length > 0) {
        await persistTextOnlyProducts(catalogId, brandId, validatedProducts);
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const flaggedCount = validatedProducts.filter((p) => p.curationStatus === "FLAGGED").length;

  const editorialPageNumbers = Array.from(
    new Set(
      validatedProducts
        .map((p) => p.pagina_editorial)
        .filter((n): n is number => typeof n === "number" && n > 0)
    )
  ).sort((a, b) => a - b);

  const editorialLabel =
    editorialPageNumbers.length > 0
      ? `Pág. ${editorialPageNumbers.join("-")}`
      : undefined;

  if (jobId) {
    try {
      await prisma.catalogIngestionSheet.upsert({
        where: {
          jobId_sheetNumber: {
            jobId,
            sheetNumber,
          },
        },
        update: {
          status: extractionSource === "SKIPPED" ? "SKIPPED" : "COMPLETED",
          editorialPages: editorialLabel,
          modelUsed,
          durationMs,
          inputTokens,
          outputTokens,
          extractedCount: validatedProducts.length,
          rawExtraction: {
            mode: "TEXT_ONLY",
            extractionSource,
            usedOcr,
            qualityReport,
            totalBlockCount,
            candidateBlockCount,
            aiCalls,
            deterministicCount,
            aiAssistedCount,
            flaggedCount,
            estimatedCostUsd,
            products: validatedProducts,
          } as any,
        },
        create: {
          jobId,
          sheetNumber,
          editorialPages: editorialLabel ?? null,
          status: extractionSource === "SKIPPED" ? "SKIPPED" : "COMPLETED",
          modelUsed,
          durationMs,
          inputTokens,
          outputTokens,
          extractedCount: validatedProducts.length,
          rawExtraction: {
            mode: "TEXT_ONLY",
            extractionSource,
            usedOcr,
            qualityReport,
            totalBlockCount,
            candidateBlockCount,
            aiCalls,
            deterministicCount,
            aiAssistedCount,
            flaggedCount,
            estimatedCostUsd,
            products: validatedProducts,
          } as any,
        },
      });
    } catch (sheetLogErr: any) {
      console.warn(`Aviso ao atualizar CatalogIngestionSheet (TEXT_ONLY): ${sheetLogErr.message}`);
    }
  }

  return {
    sheetNumber,
    extractionSource,
    qualityReport,
    usedOcr,
    aiCalls,
    modelUsed,
    durationMs,
    inputTokens,
    outputTokens,
    estimatedCostUsd,
    extractedCount: validatedProducts.length,
    deterministicCount,
    aiAssistedCount,
    flaggedCount,
    products: validatedProducts,
  };
}
