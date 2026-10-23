import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { runIngestionJob } from "@/lib/catalog-ingestion";

export const dynamic = "force-dynamic";

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

    // Cria o novo job
    const job = await prisma.catalogIngestionJob.create({
      data: {
        catalogId: id,
        status: "QUEUED",
        totalPages: 0,
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "CATALOG_INGESTION_STARTED",
        targetType: "Catalog",
        targetId: id,
        details: {
          jobId: job.id,
          catalogTitle: catalog.title,
          brand: catalog.brand.name,
        },
      },
    });

    // Inicia a execução assíncrona desacoplada da requisição HTTP
    setImmediate(() => {
      runIngestionJob(job.id).catch((err) => {
        console.error(`[Background Ingestion] Erro fatal no job ${job.id}:`, err);
      });
    });

    return NextResponse.json({
      success: true,
      message: "Processamento de catálogo iniciado em segundo plano com sucesso.",
      jobId: job.id,
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

    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    console.error("Erro ao consultar histórico de jobs:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar jobs." },
      { status: 500 }
    );
  }
}
