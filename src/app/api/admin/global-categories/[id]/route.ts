import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { slugify } from "@/lib/slugify";

const updateCategorySchema = z.object({
  name: z.string().min(2, "O nome da categoria deve ter pelo menos 2 caracteres").optional(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const category = await prisma.globalCategory.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoria global não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Erro ao obter categoria global:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin("OPERATOR");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const currentCategory = await prisma.globalCategory.findUnique({ where: { id } });
    if (!currentCategory) {
      return NextResponse.json(
        { error: "Categoria global não encontrada." },
        { status: 404 }
      );
    }

    const { name, description, icon, active } = parsed.data;
    const dataToUpdate: any = {};

    if (name && name !== currentCategory.name) {
      const newSlug = slugify(name);
      const duplicate = await prisma.globalCategory.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { OR: [{ name: { equals: name, mode: "insensitive" } }, { slug: newSlug }] },
          ],
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: `Já existe outra categoria com este nome (${duplicate.name}).` },
          { status: 409 }
        );
      }

      dataToUpdate.name = name;
      dataToUpdate.slug = newSlug;
    }

    if (description !== undefined) {
      dataToUpdate.description = description || null;
    }

    if (icon !== undefined) {
      dataToUpdate.icon = icon || "category";
    }

    if (active !== undefined) {
      dataToUpdate.active = active;
    }

    const updated = await prisma.globalCategory.update({
      where: { id },
      data: dataToUpdate,
    });

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "GLOBAL_CATEGORY_UPDATED",
        targetType: "GlobalCategory",
        targetId: updated.id,
        details: { previous: currentCategory, updated },
        ipAddress: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    }).catch((err) => console.error("Erro ao registrar auditoria:", err));

    return NextResponse.json({
      success: true,
      message: `Categoria "${updated.name}" atualizada com sucesso.`,
      data: updated,
    });
  } catch (error) {
    console.error("Erro ao atualizar categoria global:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin("SUPERADMIN");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const category = await prisma.globalCategory.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json(
        { error: "Categoria global não encontrada." },
        { status: 404 }
      );
    }

    await prisma.globalCategory.delete({ where: { id } });

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "GLOBAL_CATEGORY_DELETED",
        targetType: "GlobalCategory",
        targetId: id,
        details: { name: category.name, slug: category.slug },
        ipAddress: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    }).catch((err) => console.error("Erro ao registrar auditoria:", err));

    return NextResponse.json({
      success: true,
      message: `Categoria "${category.name}" excluída com sucesso.`,
    });
  } catch (error) {
    console.error("Erro ao excluir categoria global:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
