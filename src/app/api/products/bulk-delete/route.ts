import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { createAuditLog } from "@/lib/audit";

const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, "Selecione ao menos um produto.")
    .max(200, "Máximo de 200 produtos por operação."),
});

export async function POST(request: Request) {
  const auth = await requirePermission("produtos", "Excluir");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos." },
        { status: 400 },
      );
    }

    const uniqueIds = Array.from(new Set(parsed.data.ids));
    const failed: { id: string; reason: string }[] = [];
    const deletedIds: string[] = [];
    const deletedNames: string[] = [];

    await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          id: { in: uniqueIds },
          lojaId: auth.user.lojaId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          code: true,
          barcode: true,
        },
      });

      const foundMap = new Map(products.map((p) => [p.id, p]));
      const now = new Date();
      const baseTs = Date.now();

      for (let i = 0; i < uniqueIds.length; i++) {
        const id = uniqueIds[i];
        const product = foundMap.get(id);
        if (!product) {
          failed.push({ id, reason: "Produto não encontrado." });
          continue;
        }

        const suffix = `_del_${baseTs}_${i}`;
        await tx.product.update({
          where: { id: product.id },
          data: {
            deletedAt: now,
            active: false,
            code: product.code ? `${product.code}${suffix}` : null,
            barcode: product.barcode ? `${product.barcode}${suffix}` : null,
          },
        });

        deletedIds.push(product.id);
        deletedNames.push(product.name);
      }
    });

    if (deletedIds.length > 0) {
      await createAuditLog({
        action: "BULK_DELETE_PRODUCTS",
        entity: "Product",
        entityId: "bulk",
        details: {
          count: deletedIds.length,
          deletedIds,
          deletedNames: deletedNames.slice(0, 10),
          failedCount: failed.length,
        },
        userId: auth.user.id,
        lojaId: auth.user.lojaId,
      });
    }

    return NextResponse.json({ deletedIds, failed });
  } catch (error) {
    console.error("Erro na exclusão em lote de produtos:", error);
    return NextResponse.json(
      { error: "Erro ao excluir produtos em lote." },
      { status: 500 },
    );
  }
}
