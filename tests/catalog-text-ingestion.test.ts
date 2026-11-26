import "dotenv/config";
import fs from "fs";
import path from "path";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createCanvas } from "@napi-rs/canvas";
import prisma from "@/lib/prisma";
import {
  loadPdfTextDocument,
  extractNativePageText,
  assessPageTextQuality,
} from "@/lib/catalog-ingestion/pdf-text-extractor";
import { runSelectiveOcr, closeOcrWorker } from "@/lib/catalog-ingestion/selective-ocr";
import { organizeSpatialBlocks } from "@/lib/catalog-ingestion/spatial-organizer";
import { splitDeterministicAndAiBlocks } from "@/lib/catalog-ingestion/deterministic-parser";
import { validateExtractedProducts } from "@/lib/catalog-ingestion/product-validator";
import { getBrandExtractionProfile } from "@/lib/catalog-ingestion/brand-profiles";
import { calculateGeminiCostUsd } from "@/lib/catalog-ingestion/cost-calculator";
import { processCatalogSheetTextOnly } from "@/lib/catalog-ingestion/text-ingestion-pipeline";
import { runIngestionJob } from "@/lib/catalog-ingestion/job-runner";
import * as textGeminiExtractor from "@/lib/catalog-ingestion/text-gemini-extractor";

async function buildDigitalMultiBrandPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Página 1: Catálogo genérico / Natura com 2 produtos em colunas diferentes + 1 kit promocional
  const p1 = doc.addPage([800, 600]);
  p1.drawText("1 - Perfume Kaiak Masculino 100ml", { x: 40, y: 540, size: 11, font });
  p1.drawText("(22560)", { x: 40, y: 525, size: 10, font });
  p1.drawText("Aromático aquático fresco.", { x: 40, y: 510, size: 9, font });
  p1.drawText("Tam.: 100ml - 179,90", { x: 40, y: 495, size: 9, font });

  p1.drawText("2 - Hidratante Ekos Castanha 200ml", { x: 420, y: 540, size: 11, font });
  p1.drawText("Cód. 70984", { x: 420, y: 525, size: 10, font });
  p1.drawText("De 89,90 por 69,90 na compra de 2 ou +", { x: 420, y: 510, size: 9, font });
  p1.drawText("12", { x: 35, y: 25, size: 8, font });
  p1.drawText("13", { x: 755, y: 25, size: 8, font });

  // Página 2: Página escaneada (somente imagem rasterizada, sem texto selecionável)
  const canvas = createCanvas(900, 500);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 900, 500);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText("1 - Creme Hidratante Corporal", 60, 120);
  ctx.fillText("Cod. 88123", 60, 165);
  ctx.fillText("Por 59,90", 60, 210);
  const pngBytes = canvas.toBuffer("image/png");
  const embeddedImg = await doc.embedPng(pngBytes);
  const p2 = doc.addPage([900, 500]);
  p2.drawImage(embeddedImg, { x: 0, y: 0, width: 900, height: 500 });

  const saved = await doc.save();
  return Buffer.from(saved);
}

describe("Pipeline de Ingestão de Catálogo Baseado Exclusivamente em Texto", () => {
  const createdCatalogIds: string[] = [];
  const createdGlobalProductIds: string[] = [];
  let testBrandId: string;
  let testBrandSlug: string;
  let testBrandName: string;

  beforeAll(async () => {
    let brand = await prisma.brand.findFirst({ where: { slug: "natura" } });
    if (!brand) {
      brand = await prisma.brand.create({
        data: { name: "Natura Texto Teste", slug: "natura-texto-teste", active: true },
      });
    }
    testBrandId = brand.id;
    testBrandSlug = brand.slug;
    testBrandName = brand.name;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeOcrWorker();
    if (createdCatalogIds.length > 0) {
      await prisma.catalog.deleteMany({ where: { id: { in: createdCatalogIds } } });
    }
    if (createdGlobalProductIds.length > 0) {
      await prisma.globalProduct.deleteMany({ where: { id: { in: createdGlobalProductIds } } });
    }
  });

  it("Etapa A + B: extrai texto nativo com coordenadas e detecta página digital vs página sem texto", async () => {
    const pdfBuffer = await buildDigitalMultiBrandPdf();
    const loaded = await loadPdfTextDocument(pdfBuffer);

    try {
      expect(loaded.numPages).toBe(2);
      const profile = getBrandExtractionProfile("natura", "Natura");

      const page1 = await extractNativePageText(loaded.pdfDoc, 1);
      expect(page1.spans.length).toBeGreaterThanOrEqual(8);
      expect(page1.spans[0].source).toBe("NATIVE");
      expect(page1.spans[0].x).toBeGreaterThan(0);
      expect(page1.spans[0].y).toBeGreaterThan(0);

      const q1 = assessPageTextQuality(page1, profile);
      expect(q1.status).toBe("SUFFICIENT_NATIVE");
      expect(q1.needsOcr).toBe(false);
      expect(q1.isCommercialCandidate).toBe(true);

      const page2 = await extractNativePageText(loaded.pdfDoc, 2);
      expect(page2.spans.length).toBe(0);
      expect(page2.imageOpsCount).toBeGreaterThan(0);

      const q2 = assessPageTextQuality(page2, profile);
      expect(q2.status).toBe("NO_TEXT");
      expect(q2.needsOcr).toBe(true);
    } finally {
      await loaded.destroy();
    }
  });

  it("Etapa C: executa OCR seletivo local apenas na página sem texto preservando coordenadas", async () => {
    const pdfBuffer = await buildDigitalMultiBrandPdf();
    const loaded = await loadPdfTextDocument(pdfBuffer);

    try {
      const ocrRes = await runSelectiveOcr(loaded.pdfDoc, 2);
      expect(ocrRes.spans.length).toBeGreaterThan(0);
      expect(ocrRes.spans.every((s) => s.source === "OCR")).toBe(true);
      expect(ocrRes.rawText).toMatch(/Creme|Hidratante|88123|59,90/i);
      const firstSpan = ocrRes.spans[0];
      expect(firstSpan.x).toBeGreaterThanOrEqual(0);
      expect(firstSpan.y).toBeGreaterThanOrEqual(0);
      expect(firstSpan.width).toBeGreaterThan(0);
      expect(firstSpan.height).toBeGreaterThan(0);
    } finally {
      await loaded.destroy();
    }
  });

  it("Etapa D + Determinístico: une centavos sobrescritos, separa colunas e extrai produto simples sem chamar IA", async () => {
    const profile = getBrandExtractionProfile("demillus", "DeMillus");
    const fakeExtraction = {
      sheetNumber: 4,
      pageWidth: 935,
      pageHeight: 652,
      imageOpsCount: 4,
      fullText: "",
      spans: [
        // Lado esquerdo: Produto determinístico com centavos sobrescritos "65," + "99"
        { text: "1 - Sutiã Nova Gemma", x: 20, y: 370, width: 80, height: 8, fontSize: 8, source: "NATIVE" as const },
        { text: "(067249)", x: 20, y: 380, width: 35, height: 8, fontSize: 8, source: "NATIVE" as const },
        { text: "Em elastano com aro.", x: 20, y: 390, width: 80, height: 8, fontSize: 8, source: "NATIVE" as const },
        { text: "Cores: Carmim(06) e Preto(27).", x: 20, y: 400, width: 110, height: 8, fontSize: 8, source: "NATIVE" as const },
        { text: "Tam.: 42 a 50 -", x: 20, y: 410, width: 52, height: 8, fontSize: 8, source: "NATIVE" as const },
        { text: "65,", x: 75, y: 410, width: 12, height: 8, fontSize: 8, source: "NATIVE" as const },
        { text: "99", x: 87, y: 407.5, width: 6, height: 5, fontSize: 5, source: "NATIVE" as const },
        { text: "6", x: 17, y: 634, width: 5, height: 7, fontSize: 7, source: "NATIVE" as const },
      ],
    };

    const organized = organizeSpatialBlocks(fakeExtraction, profile);
    expect(organized.isDoubleSpread).toBe(true);
    expect(organized.leftEditorialPage).toBe(6);
    expect(organized.candidateBlocks.length).toBe(1);
    expect(organized.candidateBlocks[0].text).toContain("65,99");

    const split = splitDeterministicAndAiBlocks(organized.candidateBlocks, profile);
    expect(split.deterministicProducts.length).toBe(1);
    expect(split.aiCandidateBlocks.length).toBe(0);

    const prod = split.deterministicProducts[0];
    expect(prod.sku).toBe("067249");
    expect(prod.nome).toBe("Sutiã Nova Gemma");
    expect(prod.preco_regular).toBe(65.99);
    expect(prod.tamanhos).toEqual(["42", "44", "46", "48", "50"]);
    expect(prod.cores).toEqual([
      { nome: "Carmim", codigo: "06" },
      { nome: "Preto", codigo: "27" },
    ]);
  });

  it("Etapa F: preserva produtos incompletos, detecta promoção inconsistente, infere qtd mínima e remove duplicidades", () => {
    const validated = validateExtractedProducts(
      [
        {
          sku: null,
          nome: "1 - Produto Sem SKU",
          preco_regular: 49.9,
          preco_promocional: 59.9, // Inconsistente: promo >= regular
          regra_promocional: "3 ou + por 59,90",
          tamanhos: ["P", "M", "p"],
          cores: [
            { nome: "Azul", codigo: "01" },
            { nome: "azul", codigo: "01" },
          ],
          confianca: "MEDIA",
        },
        {
          sku: "ABC-123",
          nome: "Kit Presente Especial",
          preco_regular: 120.0,
          preco_promocional: 89.9,
          regra_promocional: "3 ou + por 89,90 CADA",
          tamanhos: [],
          cores: [],
          is_kit: true,
          confianca: "ALTA",
        },
        {
          sku: "ABC-123",
          nome: "Kit Presente Especial",
          preco_regular: 120.0,
          tamanhos: ["Único"],
          cores: [],
          is_kit: true,
          confianca: "ALTA",
        },
      ]
    );

    expect(validated.length).toBe(2);

    const incomplete = validated.find((v) => v.cleanName === "Produto Sem SKU")!;
    expect(incomplete.cleanSku).toBeNull();
    expect(incomplete.preco_promocional).toBeNull(); // Descartada por ser >= regular
    expect(incomplete.curationStatus).toBe("FLAGGED");
    expect(incomplete.tamanhos).toEqual(["P", "M"]);
    expect(incomplete.cores).toEqual([{ nome: "Azul", codigo: "01" }]);

    const kit = validated.find((v) => v.cleanSku === "ABC-123")!;
    expect(kit.promoMinQuantity).toBe(3);
    expect(kit.tamanhos).toEqual(["Único"]);
    expect(kit.curationNotes).toContain("kit/combo");
  });

  it("Cálculo de custo: diferencia modelo e tokens de entrada vs saída", () => {
    const costFlash38 = calculateGeminiCostUsd({
      modelUsed: "gemini-3.8-flash",
      inputTokens: 10000,
      outputTokens: 2000,
    });
    const costFlash35 = calculateGeminiCostUsd({
      modelUsed: "gemini-3.5-flash",
      inputTokens: 10000,
      outputTokens: 2000,
    });
    expect(costFlash38).toBeGreaterThan(costFlash35);
    expect(costFlash38).toBeCloseTo(0.0027, 5);
  });

  it("Persistência idempotente e preservação de imagens pré-existentes no GlobalProduct", async () => {
    const suffix = Math.floor(Math.random() * 1000000);
    const existingSku = `TX-${suffix}`;

    // Produto global pré-existente COM imagem de uma importação multimodal anterior
    const preExisting = await prisma.globalProduct.create({
      data: {
        brandId: testBrandId,
        referenceSku: existingSku,
        name: "Produto Com Imagem Prévia",
        description: "Descrição detalhada prévia",
        imageUrl: "https://example.supabase.co/storage/v1/object/public/products/existing.webp",
        suggestedPrice: 50,
        active: true,
      },
    });
    createdGlobalProductIds.push(preExisting.id);

    const catalog = await prisma.catalog.create({
      data: {
        title: `Catálogo Texto Teste ${suffix}`,
        brandId: testBrandId,
        status: "DRAFT",
      },
    });
    createdCatalogIds.push(catalog.id);

    // PDF sintético com 1 produto determinístico correspondendo ao existingSku
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage([500, 700]);
    page.drawText(`1 - Produto Atualizado Texto`, { x: 30, y: 620, size: 10, font });
    page.drawText(`Cód. ${existingSku}`, { x: 30, y: 605, size: 9, font });
    page.drawText("Tam.: PE ME - 55,90", { x: 30, y: 590, size: 9, font });
    const pdfBuffer = Buffer.from(await pdfDoc.save());

    // Mock Gemini apenas para garantir que não será chamado quando determinístico, ou caso seja chamado
    const geminiSpy = vi
      .spyOn(textGeminiExtractor, "extractProductsFromTextBlocks")
      .mockResolvedValue({
        products: [
          {
            sku: existingSku,
            nome: "Produto Atualizado Texto",
            descricao: null,
            preco_regular: 55.9,
            tamanhos: ["PE", "ME"],
            cores: [],
            is_kit: false,
            confianca: "ALTA",
          },
        ],
        modelUsed: "gemini-3.8-flash",
        callsCount: 1,
        durationMs: 100,
        inputTokens: 120,
        outputTokens: 60,
        estimatedCostUsd: 0.000054,
      });

    const loaded = await loadPdfTextDocument(pdfBuffer);
    try {
      // Executa 2 vezes para validar idempotência
      await processCatalogSheetTextOnly({
        catalogId: catalog.id,
        catalogTitle: catalog.title,
        brandId: testBrandId,
        brandName: testBrandName,
        brandSlug: testBrandSlug,
        pdfDoc: loaded.pdfDoc,
        sheetNumber: 1,
      });

      await processCatalogSheetTextOnly({
        catalogId: catalog.id,
        catalogTitle: catalog.title,
        brandId: testBrandId,
        brandName: testBrandName,
        brandSlug: testBrandSlug,
        pdfDoc: loaded.pdfDoc,
        sheetNumber: 1,
      });
    } finally {
      await loaded.destroy();
    }

    const updatedGlobal = await prisma.globalProduct.findUnique({
      where: { id: preExisting.id },
      include: { variants: true },
    });

    // Imagem prévia NÃO pode ter sido apagada nem alterada!
    expect(updatedGlobal?.imageUrl).toBe(
      "https://example.supabase.co/storage/v1/object/public/products/existing.webp"
    );
    // Descrição prévia NÃO pode ter sido apagada por null!
    expect(updatedGlobal?.description).toBe("Descrição detalhada prévia");
    // Variantes não podem ter duplicado ao reprocessar (mesmo com colorCode: null)!
    expect(updatedGlobal?.variants.length).toBe(2);

    const catalogProducts = await prisma.catalogProduct.findMany({
      where: { catalogId: catalog.id },
    });
    expect(catalogProducts.length).toBe(1);
    expect(catalogProducts[0].cropUrl).toBeNull();
    expect(Number(catalogProducts[0].regularPrice)).toBe(55.9);

    // Publicação sem imagens deve funcionar normalmente
    await prisma.catalogProduct.updateMany({
      where: { catalogId: catalog.id },
      data: { curationStatus: "APPROVED" },
    });
    const published = await prisma.catalog.update({
      where: { id: catalog.id },
      data: { status: "PUBLISHED" },
    });
    expect(published.status).toBe("PUBLISHED");

    geminiSpy.mockRestore();
  });

  it("Retomada de job após falha processa apenas folhas PENDING/FAILED sem refazer folhas COMPLETED", async () => {
    const pdfBuffer = await buildDigitalMultiBrandPdf();
    const tmpPdfPath = path.join(process.cwd(), "scratch", `resume-test-${Date.now()}.pdf`);
    fs.writeFileSync(tmpPdfPath, pdfBuffer);

    const catalog = await prisma.catalog.create({
      data: {
        title: `Catálogo Retomada ${Date.now()}`,
        brandId: testBrandId,
        pdfPath: tmpPdfPath,
        status: "DRAFT",
      },
    });
    createdCatalogIds.push(catalog.id);

    const job = await prisma.catalogIngestionJob.create({
      data: {
        catalogId: catalog.id,
        mode: "TEXT_ONLY",
        status: "FAILED",
        totalPages: 2,
        processedPages: 1,
        failedPages: 1,
      },
    });

    // Folha 1 já concluída; Folha 2 falhou anteriormente
    await prisma.catalogIngestionSheet.createMany({
      data: [
        { jobId: job.id, sheetNumber: 1, status: "COMPLETED", extractedCount: 2 },
        { jobId: job.id, sheetNumber: 2, status: "FAILED", errorMessage: "Timeout simulado" },
      ],
    });

    const spy = vi
      .spyOn(textGeminiExtractor, "extractProductsFromTextBlocks")
      .mockResolvedValue({
        products: [
          {
            sku: `88123`,
            nome: "Creme Hidratante Corporal",
            preco_regular: 59.9,
            tamanhos: [],
            cores: [],
            is_kit: false,
            confianca: "ALTA",
          },
        ],
        modelUsed: "gemini-3.8-flash",
        callsCount: 1,
        durationMs: 150,
        inputTokens: 90,
        outputTokens: 50,
        estimatedCostUsd: 0.000043,
      });

    try {
      await runIngestionJob(job.id);

      const finalJob = await prisma.catalogIngestionJob.findUnique({
        where: { id: job.id },
        include: { sheets: { orderBy: { sheetNumber: "asc" } } },
      });

      expect(finalJob?.status).toBe("COMPLETED");
      expect(finalJob?.processedPages).toBe(2);
      // Apenas a folha 2 deveria ter sido reprocessada (attempts = 1); folha 1 continuou intacta (attempts = 0)
      expect(finalJob?.sheets[0].attempts).toBe(0);
      expect(finalJob?.sheets[1].attempts).toBe(1);
      expect(finalJob?.sheets[1].status).toBe("COMPLETED");

      // Limpa produto global eventual criado pelo SKU 88123
      await prisma.globalProduct.deleteMany({
        where: { brandId: testBrandId, referenceSku: "88123" },
      });
    } finally {
      spy.mockRestore();
      if (fs.existsSync(tmpPdfPath)) fs.unlinkSync(tmpPdfPath);
    }
  });

  it("Validação com PDF real da DeMillus (folha 4, folha 7 e folha 82 sem texto nativo)", async () => {
    const realPdfPath = path.join(
      process.cwd(),
      "scratch",
      "1792798864017-2026-15-demillus.pdf"
    );
    if (!fs.existsSync(realPdfPath)) {
      return;
    }

    const pdfBuffer = fs.readFileSync(realPdfPath);
    const loaded = await loadPdfTextDocument(pdfBuffer);
    const profile = getBrandExtractionProfile("demillus", "DeMillus");

    try {
      // Folha 4: deve extrair deterministicamente itens simples e separar colunas/blocos de selo promocional
      const raw4 = await extractNativePageText(loaded.pdfDoc, 4);
      const q4 = assessPageTextQuality(raw4, profile);
      expect(q4.status).toBe("SUFFICIENT_NATIVE");
      expect(q4.needsOcr).toBe(false);

      const org4 = organizeSpatialBlocks(raw4, profile);
      expect(org4.isDoubleSpread).toBe(true);
      expect(org4.leftEditorialPage).toBe(6);
      expect(org4.rightEditorialPage).toBe(7);

      const split4 = splitDeterministicAndAiBlocks(org4.candidateBlocks, profile);
      // Sutiã Top Lover (067839) na folha 4 não tem selo de oferta, então pode ser extraído com 0 tokens!
      const sutiaLover = split4.deterministicProducts.find((p) => p.sku === "067839");
      expect(sutiaLover).toBeDefined();
      expect(sutiaLover?.preco_regular).toBe(82.99);
      expect(sutiaLover?.tamanhos).toEqual(["42", "44", "46", "48", "50"]);
      expect(sutiaLover?.cores.length).toBeGreaterThanOrEqual(4);

      // Folha 7: Nova Gemma, Sutiã Gerbe e Fio-dental Gerbe sem promoções
      const raw7 = await extractNativePageText(loaded.pdfDoc, 7);
      const org7 = organizeSpatialBlocks(raw7, profile);
      const split7 = splitDeterministicAndAiBlocks(org7.candidateBlocks, profile);
      const skus7 = split7.deterministicProducts.map((p) => p.sku);
      expect(skus7).toContain("067249");
      expect(skus7).toContain("061807");
      expect(skus7).toContain("051807");

      // Folha 82: página puramente imagem ("COMPOSIÇÃO DOS TECIDOS"), detecta NO_TEXT -> OCR seletivo -> não comercial
      const raw82 = await extractNativePageText(loaded.pdfDoc, 82);
      const q82 = assessPageTextQuality(raw82, profile);
      expect(q82.status).toBe("NO_TEXT");
      expect(q82.needsOcr).toBe(true);

      const ocr82 = await runSelectiveOcr(loaded.pdfDoc, 82);
      expect(ocr82.rawText).toMatch(/COMPOSI[CÇ][AÃ]O/i);
    } finally {
      await loaded.destroy();
    }
  }, 60000);
});
