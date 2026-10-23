import prisma from "@/lib/prisma";
import { downloadCatalogPdf } from "@/lib/supabase";
import { getPdfSheetCount } from "./pdf-splitter";
import { processCatalogSheet } from "./ingestion-pipeline";
import { closeRenderer } from "./page-renderer";
import fs from "fs";

/**
 * Obtém o buffer do PDF a partir do Supabase Storage ou do sistema de arquivos local.
 */
async function loadPdfBuffer(pdfPath: string): Promise<Buffer> {
  // Se for um arquivo existente no disco local (ex: durante desenvolvimento/testes)
  if (fs.existsSync(pdfPath)) {
    return fs.readFileSync(pdfPath);
  }

  // Caso contrário, baixa do Supabase Storage
  return await downloadCatalogPdf(pdfPath);
}

/**
 * Executa o processamento assíncrono do job de ingestão de catálogo em segundo plano.
 */
export async function runIngestionJob(jobId: string): Promise<void> {
  const job = await prisma.catalogIngestionJob.findUnique({
    where: { id: jobId },
    include: {
      catalog: {
        include: {
          brand: true,
        },
      },
      sheets: true,
    },
  });

  if (!job) {
    console.error(`[JobRunner] Job ${jobId} não encontrado.`);
    return;
  }

  if (!job.catalog.pdfPath) {
    await prisma.catalogIngestionJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage: "Catálogo não possui arquivo PDF anexado.",
      },
    });
    return;
  }

  try {
    await prisma.catalogIngestionJob.update({
      where: { id: jobId },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

    const pdfBuffer = await loadPdfBuffer(job.catalog.pdfPath);
    const totalSheets = await getPdfSheetCount(pdfBuffer);

    // Atualiza contagem real de folhas no job
    await prisma.catalogIngestionJob.update({
      where: { id: jobId },
      data: { totalPages: totalSheets },
    });

    // Garante que todas as folhas tenham registro inicial em CatalogIngestionSheet
    const existingSheetNumbers = new Set(job.sheets.map((s) => s.sheetNumber));
    const sheetsToCreate = [];

    for (let s = 1; s <= totalSheets; s++) {
      if (!existingSheetNumbers.has(s)) {
        sheetsToCreate.push({
          jobId,
          sheetNumber: s,
          status: "PENDING" as const,
        });
      }
    }

    if (sheetsToCreate.length > 0) {
      await prisma.catalogIngestionSheet.createMany({
        data: sheetsToCreate,
        skipDuplicates: true,
      });
    }

    // Busca todas as folhas pendentes ou que falharam para processar
    const pendingSheets = await prisma.catalogIngestionSheet.findMany({
      where: {
        jobId,
        status: { in: ["PENDING", "FAILED"] },
      },
      orderBy: { sheetNumber: "asc" },
    });

    console.log(
      `[JobRunner] Iniciando processamento do job ${jobId} (${pendingSheets.length} folhas pendentes de ${totalSheets}).`
    );

    // Processamento com concorrência = 2
    const CONCURRENCY = 2;
    let index = 0;

    let totalTokens = job.totalTokensUsed;
    let productsCount = job.totalProductsFound;
    let processedCount = job.processedPages;
    let failedCount = job.failedPages;

    const worker = async () => {
      while (index < pendingSheets.length) {
        // Verifica se o job foi cancelado externamente
        const currentJobStatus = await prisma.catalogIngestionJob.findUnique({
          where: { id: jobId },
          select: { status: true },
        });

        if (currentJobStatus?.status === "CANCELLED") {
          console.log(`[JobRunner] Job ${jobId} foi cancelado pelo operador.`);
          return;
        }

        const sheetItem = pendingSheets[index++];
        if (!sheetItem) break;

        const sheetNum = sheetItem.sheetNumber;

        // Atualiza status da folha para PROCESSING
        await prisma.catalogIngestionSheet.update({
          where: { id: sheetItem.id },
          data: {
            status: "PROCESSING",
            attempts: { increment: 1 },
          },
        });

        await prisma.catalogIngestionJob.update({
          where: { id: jobId },
          data: { currentSheet: sheetNum },
        });

        try {
          const result = await processCatalogSheet({
            catalogId: job.catalogId,
            brandId: job.catalog.brandId,
            pdfBuffer,
            sheetNumber: sheetNum,
            jobId,
          });

          processedCount++;
          productsCount += result.extractedCount;
          totalTokens += result.inputTokens + result.outputTokens;

          const estimatedCost =
            (totalTokens / 1_000_000) * 0.35; // Média ponderada de custo

          await prisma.catalogIngestionJob.update({
            where: { id: jobId },
            data: {
              processedPages: processedCount,
              totalProductsFound: productsCount,
              totalTokensUsed: totalTokens,
              estimatedCostUsd: estimatedCost,
            },
          });

          console.log(
            `[JobRunner] Folha ${sheetNum}/${totalSheets} concluída (${result.extractedCount} produtos, ${result.modelUsed}).`
          );
        } catch (sheetErr: any) {
          failedCount++;
          console.error(
            `[JobRunner] Erro ao processar folha ${sheetNum}: ${sheetErr.message}`
          );

          await prisma.catalogIngestionSheet.update({
            where: { id: sheetItem.id },
            data: {
              status: "FAILED",
              errorMessage: sheetErr.message,
            },
          });

          await prisma.catalogIngestionJob.update({
            where: { id: jobId },
            data: { failedPages: failedCount },
          });
        }
      }
    };

    // Dispara 2 workers simultâneos
    const workers = [];
    for (let w = 0; w < CONCURRENCY; w++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    // Verifica status final
    const finalJob = await prisma.catalogIngestionJob.findUnique({
      where: { id: jobId },
      select: { status: true, processedPages: true, failedPages: true },
    });

    if (finalJob?.status !== "CANCELLED") {
      const finalStatus =
        finalJob && finalJob.processedPages > 0 ? "COMPLETED" : "FAILED";

      await prisma.catalogIngestionJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          currentSheet: null,
        },
      });

      // Se o catálogo estava em DRAFT, move para CURATION para revisão do curador
      if (finalStatus === "COMPLETED") {
        await prisma.catalog.update({
          where: { id: job.catalogId },
          data: { status: "CURATION" },
        });
      }
    }

    console.log(`[JobRunner] Job ${jobId} finalizado com status: ${finalJob?.status}`);
  } catch (error: any) {
    console.error(`[JobRunner] Falha fatal no job ${jobId}:`, error);
    await prisma.catalogIngestionJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage: error.message,
        completedAt: new Date(),
      },
    });
  } finally {
    await closeRenderer();
  }
}
