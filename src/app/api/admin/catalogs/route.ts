import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { Prisma, CatalogStatus } from "@/prisma";

const createCatalogSchema = z.object({
  title: z.string().min(2, "O título do catálogo deve ter pelo menos 2 caracteres"),
  brandId: z.string().min(1, "A marca é obrigatória"),
  cycle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  coverUrl: z.string().url("URL de capa inválida").optional().nullable().or(z.literal("")),
  pdfPath: z.string().optional().nullable(),
  status: z.nativeEnum(CatalogStatus).default(CatalogStatus.DRAFT),
  startDate: z.string().datetime().optional().nullable().or(z.literal("")),
  endDate: z.string().datetime().optional().nullable().or(z.literal("")),
});

export async function GET(req: Request) {
  const auth = await requirePlatformAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const brandId = searchParams.get("brandId")?.trim() || "";
    const status = searchParams.get("status") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.CatalogWhereInput = {};

    if (brandId && brandId !== "all") {
      where.brandId = brandId;
    }

    if (status !== "all" && Object.values(CatalogStatus).includes(status as CatalogStatus)) {
      where.status = status as CatalogStatus;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { cycle: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [catalogs, total] = await Promise.all([
      prisma.catalog.findMany({
        where,
        include: {
          brand: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
          _count: {
            select: { products: true },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.catalog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: catalogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar catálogos:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao listar catálogos." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await requirePlatformAdmin("OPERATOR");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const parsed = createCatalogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      title,
      brandId,
      cycle,
      description,
      coverUrl,
      pdfPath,
      status,
      startDate,
      endDate,
    } = parsed.data;

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    });
    if (!brand) {
      return NextResponse.json(
        { error: "A marca informada não existe." },
        { status: 404 }
      );
    }

    const catalog = await prisma.catalog.create({
      data: {
        title,
        brandId,
        cycle: cycle?.trim() || null,
        description: description?.trim() || null,
        coverUrl: coverUrl?.trim() || null,
        pdfPath: pdfPath?.trim() || null,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        brand: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "CATALOG_CREATED",
        targetType: "Catalog",
        targetId: catalog.id,
        details: {
          title: catalog.title,
          brandName: brand.name,
          cycle: catalog.cycle,
          status: catalog.status,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: catalog,
        message: "Catálogo criado com sucesso.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar catálogo:", error);
    return NextResponse.json(
      { error: "Erro interno ao cadastrar o catálogo." },
      { status: 500 }
    );
  }
}
