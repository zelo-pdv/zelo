import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  const auth = await requirePlatformAdmin("OPERATOR");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id, jobId } = await params;

    const job = await prisma.catalogIngestionJob.findUnique({
      where: { id: jobId },
      include: {
        sheets: {
          orderBy: { sheetNumber: "asc" },
          select: {
            id: true,
            sheetNumber: true,
            editorialPages: true,
            status: true,
            attempts: true,
            modelUsed: true,
            durationMs: true,
            inputTokens: true,
            outputTokens: true,
            extractedCount: true,
            rawExtraction: true,
            errorMessage: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!job || job.catalogId !== id) {
      return NextResponse.json(
        { error: "Job de extração não encontrado para este catálogo." },
        { status: 404 }
      );
    }

    const progressPercentage =
      job.totalPages > 0
        ? Math.min(
            100,
            Math.round(
              ((job.processedPages + job.failedPages) / job.totalPages) * 100
            )
          )
        : 0;

    // Resumo compacto por folha sem trafegar todo o array bruto em cada poll de 3s
    const serializedSheets = job.sheets.map((s) => {
      const raw = (s.rawExtraction as Record<string, any> | null) || null;
      return {
        id: s.id,
        sheetNumber: s.sheetNumber,
        editorialPages: s.editorialPages,
        status: s.status,
        attempts: s.attempts,
        modelUsed: s.modelUsed,
        durationMs: s.durationMs,
        inputTokens: s.inputTokens,
        outputTokens: s.outputTokens,
        extractedCount: s.extractedCount,
        errorMessage: s.errorMessage,
        updatedAt: s.updatedAt,
        extractionSource: raw?.extractionSource || null,
        usedOcr: Boolean(raw?.usedOcr),
        aiCalls: typeof raw?.aiCalls === "number" ? raw.aiCalls : null,
      };
    });

    return NextResponse.json({
      success: true,
      job: {
        ...job,
        estimatedCostUsd: job.estimatedCostUsd !== null ? Number(job.estimatedCostUsd) : 0,
        sheets: serializedSheets,
        progressPercentage,
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar status do job:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar status do job." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  const auth = await requirePlatformAdmin("OPERATOR");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id, jobId } = await params;

    const job = await prisma.catalogIngestionJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.catalogId !== id) {
      return NextResponse.json(
        { error: "Job não encontrado." },
        { status: 404 }
      );
    }

    if (job.status === "COMPLETED" || job.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Job já se encontra como ${job.status}.` },
        { status: 400 }
      );
    }

    await prisma.catalogIngestionJob.update({
      where: { id: jobId },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "CATALOG_INGESTION_CANCELLED",
        targetType: "Catalog",
        targetId: id,
        details: { jobId },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Job de processamento cancelado com sucesso.",
    });
  } catch (error: any) {
    console.error("Erro ao cancelar job:", error);
    return NextResponse.json(
      { error: "Erro interno ao cancelar o job." },
      { status: 500 }
    );
  }
}
