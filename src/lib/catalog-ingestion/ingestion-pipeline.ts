import prisma from "@/lib/prisma";
import { slicePdfSheet } from "./pdf-splitter";
import { renderPdfSheetToImage } from "./page-renderer";
import { extractProductsFromSheet } from "./gemini-extractor";
import { cropProductImage } from "./image-cropper";
import { uploadImageToSupabase, BUCKET_PRODUCTS } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export interface ProcessSheetOptions {
  catalogId: string;
  brandId: string;
  pdfBuffer: Buffer;
  sheetNumber: number;
  jobId?: string;
}

export interface ProcessSheetOutput {
  sheetNumber: number;
  extractedCount: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  modelUsed: string;
  products: {
    sku: string;
    nome: string;
    preco_regular: number;
    preco_promocional?: number | null;
    variantsCount: number;
  }[];
}

/**
 * Salva a imagem recortada no Supabase Storage ou faz fallback local para public/uploads.
 */
async function saveCroppedImage(
  catalogId: string,
  sku: string,
  buffer: Buffer
): Promise<{ url: string; storagePath: string }> {
  const fileName = `catalog-crops/${catalogId}/${sku}.webp`;

  try {
    const uploaded = await uploadImageToSupabase(buffer, fileName, "image/webp", BUCKET_PRODUCTS);
    return { url: uploaded.url, storagePath: uploaded.path };
  } catch (err: any) {
    console.warn(`[Supabase Storage Fallback] Não foi possível enviar imagem para o Storage: ${err.message}. Salvando localmente...`);
    const localDir = path.join(process.cwd(), "public", "uploads", "catalog-crops", catalogId);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const localFilePath = path.join(localDir, `${sku}.webp`);
    fs.writeFileSync(localFilePath, buffer);
    const publicUrl = `/uploads/catalog-crops/${catalogId}/${sku}.webp`;
    return { url: publicUrl, storagePath: localFilePath };
  }
}

/**
 * Processa uma folha física única do PDF ponta a ponta com persistência idempotente.
 */
export async function processCatalogSheet({
  catalogId,
  brandId,
  pdfBuffer,
  sheetNumber,
  jobId,
}: ProcessSheetOptions): Promise<ProcessSheetOutput> {
  const startTime = Date.now();

  // 1. Fatiamento da folha no PDF
  const sliced = await slicePdfSheet(pdfBuffer, sheetNumber);

  // 2. Renderização em alta definição (150 DPI) com Playwright & PDF.js
  const rendered = await renderPdfSheetToImage(sliced.pdfBytes);

  // 3. Extração Multimodal via IA (gemini-3.8-flash com fallback gemini-3.5-flash)
  const extraction = await extractProductsFromSheet(rendered.imageBuffer);

  const summaryProducts: ProcessSheetOutput["products"] = [];

  // 4. Itera sobre cada produto extraído, executa recortes e persiste de forma atômica/idempotente
  for (const prod of extraction.products) {
    if (!prod.sku || prod.sku.trim().length === 0) continue;
    const cleanSku = prod.sku.trim();
    const cleanName = (prod.nome || "Produto sem nome")
      .replace(/^\d+\s*[-–]\s*/, "")
      .trim();

    // 4.1 Recorte de Imagem
    let cropUrl: string | null = null;
    let cropBox: [number, number, number, number] | null = null;

    if (prod.box_2d && prod.box_2d.length === 4) {
      cropBox = prod.box_2d;
      try {
        const crop = await cropProductImage({
          coords_1000: prod.box_2d,
          sku: cleanSku,
          imageWidth: rendered.width,
          imageHeight: rendered.height,
          imageBuffer: rendered.imageBuffer,
        });

        const saved = await saveCroppedImage(catalogId, cleanSku, crop.cropBuffer);
        cropUrl = saved.url;
      } catch (cropErr: any) {
        console.warn(`Aviso: falha ao gerar recorte para SKU ${cleanSku}: ${cropErr.message}`);
      }
    }

    // 4.2 Upsert de GlobalProduct (Identidade permanente por Marca + SKU)
    const globalProduct = await prisma.globalProduct.upsert({
      where: {
        brandId_referenceSku: {
          brandId,
          referenceSku: cleanSku,
        },
      },
      update: {
        name: cleanName,
        description: prod.descricao || null,
        suggestedPrice: prod.preco_regular,
        imageUrl: cropUrl || undefined,
        active: true,
      },
      create: {
        brandId,
        referenceSku: cleanSku,
        name: cleanName,
        description: prod.descricao || null,
        suggestedPrice: prod.preco_regular,
        imageUrl: cropUrl || null,
        active: true,
      },
    });

    // 4.3 Criação das Variantes (Tamanhos x Cores)
    let variantsCount = 0;
    const sizes = Array.isArray(prod.tamanhos) && prod.tamanhos.length > 0 ? prod.tamanhos : [null];
    const colors = Array.isArray(prod.cores) && prod.cores.length > 0 ? prod.cores : [{ nome: null, codigo: null }];

    for (const size of sizes) {
      for (const color of colors) {
        const colorName = color?.nome || null;
        const colorCode = color?.codigo || null;

        let variantName = "";
        if (colorName && size) {
          variantName = `${colorName} (${colorCode || ""}) - Tam. ${size}`.trim();
        } else if (colorName) {
          variantName = `${colorName} (${colorCode || ""})`.trim();
        } else if (size) {
          variantName = `Tam. ${size}`;
        } else {
          variantName = "Padrão";
        }

        try {
          await prisma.globalProductVariant.upsert({
            where: {
              globalProductId_size_colorCode: {
                globalProductId: globalProduct.id,
                size: size || "",
                colorCode: colorCode || "",
              },
            },
            update: {
              name: variantName,
              colorName,
              active: true,
            },
            create: {
              globalProductId: globalProduct.id,
              name: variantName,
              size: size || null,
              colorName,
              colorCode,
              active: true,
            },
          });
          variantsCount++;
        } catch {
          // Ignora se já existir
        }
      }
    }

    // 4.4 Upsert de CatalogProduct (Preço, Promoção, Recorte e Curadoria nesta Edição)
    await prisma.catalogProduct.upsert({
      where: {
        catalogId_globalProductId: {
          catalogId,
          globalProductId: globalProduct.id,
        },
      },
      update: {
        pageNumber: prod.pagina_editorial || null,
        regularPrice: prod.preco_regular,
        promoPrice: prod.preco_promocional || null,
        promoRule: prod.regra_promocional || null,
        promoMinQuantity: prod.preco_promocional ? 2 : 1,
        cropBox: cropBox ? (cropBox as any) : undefined,
        cropUrl: cropUrl || undefined,
        curationStatus: "PENDING_REVIEW",
      },
      create: {
        catalogId,
        globalProductId: globalProduct.id,
        pageNumber: prod.pagina_editorial || null,
        regularPrice: prod.preco_regular,
        promoPrice: prod.preco_promocional || null,
        promoRule: prod.regra_promocional || null,
        promoMinQuantity: prod.preco_promocional ? 2 : 1,
        cropBox: cropBox ? (cropBox as any) : undefined,
        cropUrl,
        curationStatus: "PENDING_REVIEW",
      },
    });

    summaryProducts.push({
      sku: cleanSku,
      nome: prod.nome,
      preco_regular: prod.preco_regular,
      preco_promocional: prod.preco_promocional,
      variantsCount,
    });
  }

  const durationMs = Date.now() - startTime;

  // 5. Se houver jobId informado, atualiza o status da folha (CatalogIngestionSheet)
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
          status: "COMPLETED",
          editorialPages: extraction.products[0]?.pagina_editorial
            ? `Pág. ${extraction.products[0].pagina_editorial}`
            : undefined,
          modelUsed: extraction.modelUsed,
          durationMs,
          inputTokens: extraction.inputTokens,
          outputTokens: extraction.outputTokens,
          extractedCount: extraction.products.length,
          rawExtraction: extraction.products as any,
        },
        create: {
          jobId,
          sheetNumber,
          editorialPages: extraction.products[0]?.pagina_editorial
            ? `Pág. ${extraction.products[0].pagina_editorial}`
            : null,
          status: "COMPLETED",
          modelUsed: extraction.modelUsed,
          durationMs,
          inputTokens: extraction.inputTokens,
          outputTokens: extraction.outputTokens,
          extractedCount: extraction.products.length,
          rawExtraction: extraction.products as any,
        },
      });
    } catch (sheetLogErr: any) {
      console.warn(`Aviso ao atualizar CatalogIngestionSheet: ${sheetLogErr.message}`);
    }
  }

  return {
    sheetNumber,
    extractedCount: extraction.products.length,
    durationMs,
    inputTokens: extraction.inputTokens,
    outputTokens: extraction.outputTokens,
    modelUsed: extraction.modelUsed,
    products: summaryProducts,
  };
}
