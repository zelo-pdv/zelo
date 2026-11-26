import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

vi.mock("@/lib/jwt-secret", () => {
  const secret = "test-secret-at-least-32-characters-long";
  return {
    JWT_SECRET_RAW: secret,
    JWT_SECRET: new TextEncoder().encode(secret),
  };
});

const { prismaMock, uploadImageToSupabaseMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRaw: vi.fn(),
    catalogIngestionJob: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    catalogIngestionSheet: {
      updateMany: vi.fn(),
    },
  },
  uploadImageToSupabaseMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/lib/supabase", () => ({
  BUCKET_PRODUCTS: "products",
  uploadImageToSupabase: (...args: any[]) => uploadImageToSupabaseMock(...args),
  downloadCatalogPdf: vi.fn(),
}));

import { GET as getHealth } from "@/app/api/health/route";
import { middleware } from "../middleware";
import {
  renderPdfSheetToImage,
  retainRenderer,
  closeRenderer,
  getRendererState,
} from "@/lib/catalog-ingestion/page-renderer";
import { recoverStaleIngestionJobs } from "@/lib/catalog-ingestion/job-runner";
import { saveCroppedImage } from "@/lib/catalog-ingestion/ingestion-pipeline";

describe("Plano 04 — Produção/Docker, /api/health e Orquestração do Scanner PDF", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await closeRenderer();
  });

  it("GET /api/health retorna 200 quando banco responde e 503 quando banco falha, com bypass no middleware", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    const okRes = await getHealth();
    expect(okRes.status).toBe(200);
    const okJson = await okRes.json();
    expect(okJson.status).toBe("ok");
    expect(okJson.database).toBe("connected");

    prismaMock.$queryRaw.mockRejectedValueOnce(new Error("Connection refused"));
    const failRes = await getHealth();
    expect(failRes.status).toBe(503);
    const failJson = await failRes.json();
    expect(failJson.status).toBe("error");

    const mwReq = new NextRequest("http://localhost:3000/api/health");
    const mwRes = await middleware(mwReq);
    expect(mwRes.status).toBe(200);
  });

  it("renderPdfSheetToImage renderiza PDF sintético localmente via pdfjs-dist sem CDN externa e respeita lease de concorrência", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText("Zelo Catalog Test", { x: 50, y: 780, size: 18, font });
    const pdfBytes = await pdfDoc.save();

    const releaseLease = retainRenderer();
    try {
      const rendered = await renderPdfSheetToImage(pdfBytes, 800);
      expect(rendered.width).toBe(800);
      expect(rendered.height).toBeGreaterThan(900);
      expect(rendered.imageBuffer.length).toBeGreaterThan(2000);

      // Enquanto houver lease ativo, closeRenderer não fecha o Chromium de outro job paralelo
      await closeRenderer();
      expect(getRendererState().hasBrowser).toBe(true);
      expect(getRendererState().pendingClose).toBe(true);
    } finally {
      releaseLease();
      // Aguarda fechamento pendente desencadeado ao liberar o último lease
      await new Promise((r) => setTimeout(r, 150));
      await closeRenderer();
    }

    expect(getRendererState().hasBrowser).toBe(false);
  }, 25000);

  it("recoverStaleIngestionJobs desbloqueia jobs órfãos presos em PROCESSING após reinício", async () => {
    process.env.CATALOG_JOB_STALE_MINUTES = "5";
    const staleDate = new Date(Date.now() - 12 * 60 * 1000);

    prismaMock.catalogIngestionJob.findMany.mockResolvedValueOnce([
      {
        id: "job_stale_1",
        catalogId: "cat_1",
        status: "PROCESSING",
        updatedAt: staleDate,
        sheets: [{ updatedAt: staleDate }],
      },
      {
        id: "job_recent_2",
        catalogId: "cat_1",
        status: "PROCESSING",
        updatedAt: new Date(),
        sheets: [{ updatedAt: new Date() }],
      },
    ]);
    prismaMock.catalogIngestionSheet.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.catalogIngestionJob.update.mockResolvedValue({});

    const recovered = await recoverStaleIngestionJobs("cat_1");
    expect(recovered).toBe(1);
    expect(prismaMock.catalogIngestionSheet.updateMany).toHaveBeenCalledWith({
      where: { jobId: "job_stale_1", status: "PROCESSING" },
      data: { status: "PENDING" },
    });
    expect(prismaMock.catalogIngestionJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job_stale_1" },
        data: expect.objectContaining({
          status: "FAILED",
        }),
      })
    );
  });

  it("saveCroppedImage falha explicitamente em produção sem Supabase Storage, a menos que ALLOW_LOCAL_CROP_FALLBACK=true", async () => {
    uploadImageToSupabaseMock.mockRejectedValue(new Error("Missing SUPABASE_KEY"));
    (process.env as any).NODE_ENV = "production";
    delete process.env.ALLOW_LOCAL_CROP_FALLBACK;

    await expect(
      saveCroppedImage("cat_test_plan04", "051813", Buffer.from("fake-webp"))
    ).rejects.toThrow(/\[Storage Produção\].*Supabase Storage/);

    process.env.ALLOW_LOCAL_CROP_FALLBACK = "true";
    const fallbackResult = await saveCroppedImage(
      "cat_test_plan04",
      "051813",
      Buffer.from("fake-webp")
    );
    expect(fallbackResult.url).toBe("/uploads/catalog-crops/cat_test_plan04/051813.webp");
    // Limpa arquivo de teste criado localmente
    fs.rmSync(
      path.join(process.cwd(), "public", "uploads", "catalog-crops", "cat_test_plan04"),
      { recursive: true, force: true }
    );
  });
});
