import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { slugify } from "@/lib/slugify";
import { Prisma } from "@/prisma";

const createCategorySchema = z.object({
  name: z.string().min(2, "O nome da categoria deve ter pelo menos 2 caracteres"),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable().default("category"),
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

    const where: Prisma.GlobalCategoryWhereInput = {};

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

    const categories = await prisma.globalCategory.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Erro ao listar categorias globais:", error);
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
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, description, icon, active } = parsed.data;
    const slug = slugify(name);

    if (!slug) {
      return NextResponse.json(
        { error: "Nome de categoria inválido para geração de identificador (slug)." },
        { status: 400 }
      );
    }

    const existingCategory = await prisma.globalCategory.findFirst({
      where: {
        OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }],
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: `Já existe uma categoria cadastrada com este nome ou identificador (${existingCategory.name}).` },
        { status: 409 }
      );
    }

    const category = await prisma.globalCategory.create({
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || "category",
        active: active !== undefined ? active : true,
      },
    });

    // Auditoria
    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "GLOBAL_CATEGORY_CREATED",
        targetType: "GlobalCategory",
        targetId: category.id,
        details: { name: category.name, slug: category.slug },
        ipAddress: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    }).catch((err) => console.error("Erro ao registrar auditoria:", err));

    return NextResponse.json({
      success: true,
      message: `Categoria "${category.name}" criada com sucesso.`,
      data: category,
    });
  } catch (error) {
    console.error("Erro ao criar categoria global:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
