import prisma from "@/lib/prisma";
import { downloadCatalogPdf } from "@/lib/supabase";
import { getPdfSheetCount } from "./pdf-splitter";
import { processCatalogSheet } from "./ingestion-pipeline";
import { closeRenderer, retainRenderer } from "./page-renderer";
import { loadPdfTextDocument } from "./pdf-text-extractor";
import { closeOcrWorker } from "./selective-ocr";
import { processCatalogSheetTextOnly } from "./text-ingestion-pipeline";
import { calculateGeminiCostUsd } from "./cost-calculator";
import type { TextJobMetrics } from "./types";
import fs from "fs";

const globalForJobs = globalThis as unknown as {
  __zeloActiveIngestionJobs?: Map<string, Promise<void>>;
};

function getActiveIngestionJobsMap(): Map<string, Promise<void>> {
  if (!globalForJobs.__zeloActiveIngestionJobs) {
    globalForJobs.__zeloActiveIngestionJobs = new Map<string, Promise<void>>();
  }
  return globalForJobs.__zeloActiveIngestionJobs;
}

export function isIngestionJobRunningLocally(jobId: string): boolean {
  return getActiveIngestionJobsMap().has(jobId);
}

export function getStaleJobTimeoutMs(): number {
  const configured = Number(process.env.CATALOG_JOB_STALE_MINUTES || "10");
  const minutes = Number.isFinite(configured) && configured >= 1 ? configured : 10;
  return minutes * 60 * 1000;
}

/**
 * Enfileira a execução de um job no processo atual garantindo unicidade por jobId
 * (substitui disparos cegos via `setImmediate`).
 */
export function enqueueIngestionJob(jobId: string): void {
  const activeJobs = getActiveIngestionJobsMap();
  if (activeJobs.has(jobId)) return;

  const runnerPromise = Promise.resolve()
    .then(() => runIngestionJob(jobId))
    .catch((err) => {
      console.error(`[Background Ingestion] Erro fatal no job ${jobId}:`, err);
    })
    .finally(() => {
      activeJobs.delete(jobId);
    });

  activeJobs.set(jobId, runnerPromise);
}

/**
 * Recupera jobs presos em QUEUED/PROCESSING após reinício do container/servidor ou
 * inatividade prolongada sem execução local ativa, liberando o catálogo para retomada.
 */
export async function recoverStaleIngestionJobs(catalogId?: string): Promise<number> {
  const staleThresholdMs = getStaleJobTimeoutMs();
  const candidates = await prisma.catalogIngestionJob.findMany({
    where: {
      ...(catalogId ? { catalogId } : {}),
      status: { in: ["QUEUED", "PROCESSING"] },
    },
    include: {
      sheets: {
        select: { updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  const now = Date.now();
  let recoveredCount = 0;

  for (const job of candidates) {
    if (isIngestionJobRunningLocally(job.id)) continue;

    const latestSheetAt = job.sheets[0]?.updatedAt?.getTime() ?? 0;
    const lastActivityAt = Math.max(job.updatedAt.getTime(), latestSheetAt);

    if (now - lastActivityAt > staleThresholdMs) {
      await prisma.catalogIngestionSheet.updateMany({
        where: { jobId: job.id, status: "PROCESSING" },
        data: { status: "PENDING" },
      });
      await prisma.catalogIngestionJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          currentSheet: null,
          errorMessage:
            "Processamento interrompido por inatividade ou reinício do servidor. Utilize 'Retomar' para continuar de onde parou.",
          completedAt: new Date(),
        },
      });
      recoveredCount++;
    }
  }

  return recoveredCount;
}

/**
 * Obtém o buffer do PDF a partir do Supabase Storage ou do sistema de arquivos local.
 */
async function loadPdfBuffer(pdfPath: string): Promise<Buffer> {
  if (fs.existsSync(pdfPath)) {
    return fs.readFileSync(pdfPath);
  }
  return await downloadCatalogPdf(pdfPath);
}

/**
 * Executa o processamento assíncrono do job de ingestão de catálogo em segundo plano,
 * respeitando a modalidade selecionada (MULTIMODAL ou TEXT_ONLY).
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

  const isTextOnly = job.mode === "TEXT_ONLY";
  const releaseRendererLease = isTextOnly ? null : retainRenderer();
  let loadedTextDoc: Awaited<ReturnType<typeof loadPdfTextDocument>> | null = null;
  const jobStartTime = Date.now();

  try {
    await prisma.catalogIngestionJob.update({
      where: { id: jobId },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

    const pdfBuffer = await loadPdfBuffer(job.catalog.pdfPath);

    // Em TEXT_ONLY, abre o PDF uma única vez com PDF.js (sem re-parse por página)
    let totalSheets = 0;
    if (isTextOnly) {
      loadedTextDoc = await loadPdfTextDocument(pdfBuffer);
      totalSheets = loadedTextDoc.numPages;
    } else {
      totalSheets = await getPdfSheetCount(pdfBuffer);
    }

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

    // Busca todas as folhas pendentes ou que falharam para retomar com segurança
    const pendingSheets = await prisma.catalogIngestionSheet.findMany({
      where: {
        jobId,
        status: { in: ["PENDING", "FAILED"] },
      },
      orderBy: { sheetNumber: "asc" },
    });

    console.log(
      `[JobRunner] Iniciando job ${jobId} [mode=${job.mode}] (${pendingSheets.length} folhas pendentes de ${totalSheets}).`
    );

    const CONCURRENCY = isTextOnly ? 2 : 2;
    let index = 0;

    let totalTokens = job.totalTokensUsed;
    let totalCostUsd = Number(job.estimatedCostUsd || 0);
    let productsCount = job.totalProductsFound;
    let processedCount = job.processedPages;
    let failedCount = job.failedPages;

    let metricsQueue: Promise<void> = Promise.resolve();
    const withMetricsLock = async (task: () => Promise<void>) => {
      const next = metricsQueue.then(task, task);
      metricsQueue = next.catch(() => {});
      await next;
    };

    const existingMetrics = (job.metrics as Partial<TextJobMetrics> | null) || {};
    const textMetrics: TextJobMetrics = {
      mode: "TEXT_ONLY",
      inputTokens: existingMetrics.inputTokens || 0,
      outputTokens: existingMetrics.outputTokens || 0,
      totalTokens: existingMetrics.totalTokens || 0,
      aiCalls: existingMetrics.aiCalls || 0,
      ocrPages: existingMetrics.ocrPages || 0,
      nativeTextPages: existingMetrics.nativeTextPages || 0,
      skippedPages: existingMetrics.skippedPages || 0,
      deterministicProducts: existingMetrics.deterministicProducts || 0,
      aiAssistedProducts: existingMetrics.aiAssistedProducts || 0,
      flaggedProducts: existingMetrics.flaggedProducts || 0,
      totalDurationMs: existingMetrics.totalDurationMs || 0,
      estimatedCostUsd: existingMetrics.estimatedCostUsd || 0,
      modelBreakdown: existingMetrics.modelBreakdown || {},
    };

    const worker = async () => {
      while (index < pendingSheets.length) {
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
          if (isTextOnly && loadedTextDoc) {
            const result = await processCatalogSheetTextOnly({
              catalogId: job.catalogId,
              catalogTitle: job.catalog.title,
              brandId: job.catalog.brandId,
              brandName: job.catalog.brand.name,
              brandSlug: job.catalog.brand.slug,
              pdfDoc: loadedTextDoc.pdfDoc,
              sheetNumber: sheetNum,
              jobId,
            });

            await withMetricsLock(async () => {
              processedCount++;
              productsCount += result.extractedCount;
              totalTokens += result.inputTokens + result.outputTokens;
              totalCostUsd = Number((totalCostUsd + result.estimatedCostUsd).toFixed(6));

              textMetrics.inputTokens += result.inputTokens;
              textMetrics.outputTokens += result.outputTokens;
              textMetrics.totalTokens = textMetrics.inputTokens + textMetrics.outputTokens;
              textMetrics.aiCalls += result.aiCalls;
              if (result.usedOcr) textMetrics.ocrPages++;
              else if (result.extractionSource === "SKIPPED") textMetrics.skippedPages++;
              else textMetrics.nativeTextPages++;
              textMetrics.deterministicProducts += result.deterministicCount;
              textMetrics.aiAssistedProducts += result.aiAssistedCount;
              textMetrics.flaggedProducts += result.flaggedCount;
              textMetrics.totalDurationMs = Date.now() - jobStartTime;
              textMetrics.estimatedCostUsd = totalCostUsd;

              if (result.aiCalls > 0 && result.modelUsed !== "none") {
                const prev = textMetrics.modelBreakdown[result.modelUsed] || {
                  calls: 0,
                  inputTokens: 0,
                  outputTokens: 0,
                  estimatedCostUsd: 0,
                };
                textMetrics.modelBreakdown[result.modelUsed] = {
                  calls: prev.calls + result.aiCalls,
                  inputTokens: prev.inputTokens + result.inputTokens,
                  outputTokens: prev.outputTokens + result.outputTokens,
                  estimatedCostUsd: Number((prev.estimatedCostUsd + result.estimatedCostUsd).toFixed(6)),
                };
              }

              await prisma.catalogIngestionJob.update({
                where: { id: jobId },
                data: {
                  processedPages: processedCount,
                  totalProductsFound: productsCount,
                  totalTokensUsed: totalTokens,
                  estimatedCostUsd: totalCostUsd,
                  metrics: textMetrics as any,
                },
              });
            });

            console.log(
              `[JobRunner][TEXT_ONLY] Folha ${sheetNum}/${totalSheets} (${result.extractionSource}${result.usedOcr ? "+OCR" : ""}): ${result.extractedCount} produtos, ${result.aiCalls} chamada(s) IA.`
            );
          } else {
            const result = await processCatalogSheet({
              catalogId: job.catalogId,
              brandId: job.catalog.brandId,
              brandName: job.catalog.brand.name,
              catalogTitle: job.catalog.title,
              pdfBuffer,
              sheetNumber: sheetNum,
              jobId,
            });

            await withMetricsLock(async () => {
              processedCount++;
              productsCount += result.extractedCount;
              totalTokens += result.inputTokens + result.outputTokens;
              totalCostUsd = Number(
                (
                  totalCostUsd +
                  calculateGeminiCostUsd({
                    modelUsed: result.modelUsed,
                    inputTokens: result.inputTokens,
                    outputTokens: result.outputTokens,
                  })
                ).toFixed(6)
              );

              await prisma.catalogIngestionJob.update({
                where: { id: jobId },
                data: {
                  processedPages: processedCount,
                  totalProductsFound: productsCount,
                  totalTokensUsed: totalTokens,
                  estimatedCostUsd: totalCostUsd,
                },
              });
            });

            console.log(
              `[JobRunner][MULTIMODAL] Folha ${sheetNum}/${totalSheets} concluída (${result.extractedCount} produtos, ${result.modelUsed}).`
            );
          }
        } catch (sheetErr: any) {
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

          await withMetricsLock(async () => {
            failedCount++;
            await prisma.catalogIngestionJob.update({
              where: { id: jobId },
              data: { failedPages: failedCount },
            });
          });
        }
      }
    };

    const workers = [];
    for (let w = 0; w < CONCURRENCY; w++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    const finalJob = await prisma.catalogIngestionJob.findUnique({
      where: { id: jobId },
      select: { status: true, processedPages: true, failedPages: true },
    });

    if (finalJob?.status !== "CANCELLED") {
      const finalStatus =
        finalJob && finalJob.processedPages > 0 ? "COMPLETED" : "FAILED";

      if (isTextOnly) {
        textMetrics.totalDurationMs = Date.now() - jobStartTime;
      }

      const partialWarning =
        finalJob && finalJob.failedPages > 0 && finalJob.processedPages > 0
          ? `${finalJob.failedPages} folha(s) falharam durante o processamento. Use 'Retomar' para reprocessar pendências.`
          : null;

      await prisma.catalogIngestionJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          currentSheet: null,
          ...(partialWarning ? { errorMessage: partialWarning } : {}),
          ...(isTextOnly ? { metrics: textMetrics as any } : {}),
        },
      });

      if (finalStatus === "COMPLETED" && job.catalog.status !== "PUBLISHED") {
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
    if (loadedTextDoc) {
      await loadedTextDoc.destroy();
    }
    if (isTextOnly) {
      await closeOcrWorker();
    } else {
      releaseRendererLease?.();
      await closeRenderer();
    }
  }
}
