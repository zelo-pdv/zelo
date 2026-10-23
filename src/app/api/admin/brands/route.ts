import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { slugify } from "@/lib/slugify";
import { Prisma } from "@/prisma";

const createBrandSchema = z.object({
  name: z.string().min(2, "O nome da marca deve ter pelo menos 2 caracteres"),
  description: z.string().optional().nullable(),
  logoUrl: z.string().url("URL de logotipo inválida").optional().nullable().or(z.literal("")),
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
    const status = searchParams.get("status") || "all";

    const where: Prisma.BrandWhereInput = {};

    if (status === "active") {
      where.active = true;
    } else if (status === "inactive") {
      where.active = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const brands = await prisma.brand.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: brands,
    });
  } catch (error) {
    console.error("Erro ao listar marcas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
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
    const parsed = createBrandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, description, logoUrl, active } = parsed.data;
    const slug = slugify(name);

    if (!slug) {
      return NextResponse.json(
        { error: "Nome de marca inválido para geração de identificador (slug)." },
        { status: 400 }
      );
    }

    const existingBrand = await prisma.brand.findFirst({
      where: {
        OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }],
      },
    });

    if (existingBrand) {
      return NextResponse.json(
        { error: `Já existe uma marca cadastrada com este nome ou identificador (${existingBrand.name}).` },
        { status: 409 }
      );
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        slug,
        description: description || null,
        logoUrl: logoUrl || null,
        active: active !== undefined ? active : true,
      },
    });

    // Auditoria
    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "BRAND_CREATED",
        targetType: "Brand",
        targetId: brand.id,
        details: { name: brand.name, slug: brand.slug },
        ipAddress: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    }).catch((err) => console.error("Erro ao registrar auditoria:", err));

    return NextResponse.json({
      success: true,
      message: `Marca "${brand.name}" cadastrada com sucesso.`,
      data: brand,
    });
  } catch (error) {
    console.error("Erro ao criar marca:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
