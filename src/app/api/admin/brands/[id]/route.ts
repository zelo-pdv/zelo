import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { slugify } from "@/lib/slugify";

const updateBrandSchema = z.object({
  name: z.string().min(2, "O nome da marca deve ter pelo menos 2 caracteres").optional(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().url("URL de logotipo inválida").optional().nullable().or(z.literal("")),
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
    const brand = await prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      return NextResponse.json(
        { error: "Marca não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: brand,
    });
  } catch (error) {
    console.error("Erro ao obter marca:", error);
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
    const parsed = updateBrandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const currentBrand = await prisma.brand.findUnique({ where: { id } });
    if (!currentBrand) {
      return NextResponse.json(
        { error: "Marca não encontrada." },
        { status: 404 }
      );
    }

    const { name, description, logoUrl, active } = parsed.data;
    const dataToUpdate: any = {};

    if (name && name !== currentBrand.name) {
      const newSlug = slugify(name);
      // Confere se o novo nome ou slug já existe em outra marca
      const duplicate = await prisma.brand.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { OR: [{ name: { equals: name, mode: "insensitive" } }, { slug: newSlug }] },
          ],
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: `Já existe outra marca com este nome (${duplicate.name}).` },
          { status: 409 }
        );
      }

      dataToUpdate.name = name;
      dataToUpdate.slug = newSlug;
    }

    if (description !== undefined) {
      dataToUpdate.description = description || null;
    }

    if (logoUrl !== undefined) {
      dataToUpdate.logoUrl = logoUrl || null;
    }

    if (active !== undefined) {
      dataToUpdate.active = active;
    }

    const updated = await prisma.brand.update({
      where: { id },
      data: dataToUpdate,
    });

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "BRAND_UPDATED",
        targetType: "Brand",
        targetId: updated.id,
        details: { previous: currentBrand, updated },
        ipAddress: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    }).catch((err) => console.error("Erro ao registrar auditoria:", err));

    return NextResponse.json({
      success: true,
      message: `Marca "${updated.name}" atualizada com sucesso.`,
      data: updated,
    });
  } catch (error) {
    console.error("Erro ao atualizar marca:", error);
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
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      return NextResponse.json(
        { error: "Marca não encontrada." },
        { status: 404 }
      );
    }

    await prisma.brand.delete({ where: { id } });

    await prisma.platformAuditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "BRAND_DELETED",
        targetType: "Brand",
        targetId: id,
        details: { name: brand.name, slug: brand.slug },
        ipAddress: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    }).catch((err) => console.error("Erro ao registrar auditoria:", err));

    return NextResponse.json({
      success: true,
      message: `Marca "${brand.name}" excluída com sucesso.`,
    });
  } catch (error) {
    console.error("Erro ao excluir marca:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
