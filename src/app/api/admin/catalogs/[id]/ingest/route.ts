import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { runIngestionJob } from "@/lib/catalog-ingestion";
import { IngestionMode } from "@/prisma";

export const dynamic = "force-dynamic";

const startIngestionSchema = z
  .object({
    mode: z.nativeEnum(IngestionMode).optional(),
    resumeJobId: z.string().min(1).optional(),
  })
  .optional();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin("OPERATOR");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;

    let rawBody: unknown = undefined;
    try {
      const text = await req.text();
      if (text.trim()) {
        rawBody = JSON.parse(text);
      }
    } catch {
      return NextResponse.json(
        { error: "Corpo da requisição JSON inválido." },
        { status: 400 }
      );
    }

    const parsed = startIngestionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros de ingestão inválidos.", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const requestedMode = parsed.data?.mode ?? IngestionMode.MULTIMODAL;
    const resumeJobId = parsed.data?.resumeJobId;

    const catalog = await prisma.catalog.findUnique({
      where: { id },
      include: { brand: true },
    });

    if (!catalog) {
      return NextResponse.json(
        { error: "Catálogo não encontrado." },
        { status: 404 }
      );
    }

    if (!catalog.pdfPath) {
      return NextResponse.json(
        {
          error:
            "O catálogo não possui um arquivo PDF anexado. Faça o upload do PDF antes de iniciar a extração.",
        },
        { status: 400 }
      );
    }

    // Verifica se já existe um job em andamento
    const activeJob = await prisma.catalogIngestionJob.findFirst({
      where: {
        catalogId: id,
        status: { in: ["QUEUED", "PROCESSING"] },
      },
    });

    if (activeJob) {
      return NextResponse.json(
        {
          error: "Já existe um processo de extração em andamento para este catálogo.",
          jobId: activeJob.id,
        },
        { status: 409 }
      );
    }

    let job;

    if (resumeJobId) {
      const existingJob = await prisma.catalogIngestionJob.findUnique({
        where: { id: resumeJobId },
      });
      if (!existingJob || existingJob.catalogId !== id) {
        return NextResponse.json(
          { error: "Job para retomada não encontrado neste catálogo." },
          { status: 404 }
        );
      }
      if (existingJob.status !== "FAILED" && existingJob.status !== "CANCELLED") {
        return NextResponse.json(
          { error: `Apenas jobs com status FAILED ou CANCELLED podem ser retomados (atual: ${existingJob.status}).` },
          { status: 400 }
        );
      }

      // Garante que folhas presas em PROCESSING voltem para PENDING
      await prisma.catalogIngestionSheet.updateMany({
        where: { jobId: resumeJobId, status: "PROCESSING" },
        data: { status: "PENDING" },
      });

      job = await prisma.catalogIngestionJob.update({
        where: { id: resumeJobId },
        data: {
          status: "QUEUED",
          errorMessage: null,
          completedAt: null,
        },
      });
    } else {
      job = await prisma.catalogIngestionJob.create({
        data: {
          catalogId: id,
          mode: requestedMode,
          status: "QUEUED",
          totalPages: 0,
        },
      });
    }

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: resumeJobId ? "CATALOG_INGESTION_RESUMED" : "CATALOG_INGESTION_STARTED",
        targetType: "Catalog",
        targetId: id,
        details: {
          jobId: job.id,
          mode: job.mode,
          resumed: Boolean(resumeJobId),
          catalogTitle: catalog.title,
          brand: catalog.brand.name,
        },
      },
    });

    setImmediate(() => {
      runIngestionJob(job.id).catch((err) => {
        console.error(`[Background Ingestion] Erro fatal no job ${job.id}:`, err);
      });
    });

    return NextResponse.json({
      success: true,
      message: resumeJobId
        ? "Retomada do processamento iniciada em segundo plano."
        : "Processamento de catálogo iniciado em segundo plano com sucesso.",
      jobId: job.id,
      mode: job.mode,
    });
  } catch (error: any) {
    console.error("Erro ao iniciar ingestão de catálogo:", error);
    return NextResponse.json(
      { error: "Erro interno ao iniciar a extração do catálogo." },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin("OPERATOR");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;

    const jobs = await prisma.catalogIngestionJob.findMany({
      where: { catalogId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        _count: {
          select: { sheets: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      jobs: jobs.map((j) => ({
        ...j,
        estimatedCostUsd: j.estimatedCostUsd !== null ? Number(j.estimatedCostUsd) : 0,
      })),
    });
  } catch (error: any) {
    console.error("Erro ao consultar histórico de jobs:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar jobs." },
      { status: 500 }
    );
  }
}
