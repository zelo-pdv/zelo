import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { Prisma } from "@/prisma";

const createGlobalProductSchema = z.object({
  name: z.string().min(2, "O nome do produto deve ter pelo menos 2 caracteres"),
  brandId: z.string().min(1, "A marca é obrigatória"),
  globalCategoryId: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  referenceSku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url("URL de imagem inválida").optional().nullable().or(z.literal("")),
  suggestedPrice: z.number().nonnegative().optional().nullable(),
  costPrice: z.number().nonnegative().optional().nullable(),
  active: z.boolean().default(true),
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
    const categoryId = searchParams.get("categoryId")?.trim() || "";
    const status = searchParams.get("status") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.GlobalProductWhereInput = {};

    if (brandId && brandId !== "all") {
      where.brandId = brandId;
    }

    if (categoryId && categoryId !== "all") {
      where.globalCategoryId = categoryId;
    }

    if (status === "active") {
      where.active = true;
    } else if (status === "inactive") {
      where.active = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
        { referenceSku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.globalProduct.findMany({
        where,
        include: {
          brand: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
          globalCategory: {
            select: { id: true, name: true, icon: true },
          },
        },
        orderBy: [{ name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.globalProduct.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar produtos globais:", error);
    return NextResponse.json(
      { error: "Erro interno ao listar produtos globais." },
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
    const parsed = createGlobalProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      name,
      brandId,
      globalCategoryId,
      barcode,
      referenceSku,
      description,
      imageUrl,
      suggestedPrice,
      costPrice,
      active,
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

    if (globalCategoryId) {
      const cat = await prisma.globalCategory.findUnique({
        where: { id: globalCategoryId },
      });
      if (!cat) {
        return NextResponse.json(
          { error: "A categoria global informada não existe." },
          { status: 404 }
        );
      }
    }

    const product = await prisma.globalProduct.create({
      data: {
        name,
        brandId,
        globalCategoryId: globalCategoryId || null,
        barcode: barcode?.trim() || null,
        referenceSku: referenceSku?.trim() || null,
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        suggestedPrice: suggestedPrice !== undefined && suggestedPrice !== null ? suggestedPrice : null,
        costPrice: costPrice !== undefined && costPrice !== null ? costPrice : null,
        active,
      },
      include: {
        brand: { select: { id: true, name: true, logoUrl: true } },
        globalCategory: { select: { id: true, name: true, icon: true } },
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "GLOBAL_PRODUCT_CREATED",
        targetType: "GlobalProduct",
        targetId: product.id,
        details: {
          name: product.name,
          brandName: brand.name,
          barcode: product.barcode,
          referenceSku: product.referenceSku,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: product,
        message: "Produto global cadastrado com sucesso.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao cadastrar produto global:", error);
    return NextResponse.json(
      { error: "Erro interno ao cadastrar produto global." },
      { status: 500 }
    );
  }
}
