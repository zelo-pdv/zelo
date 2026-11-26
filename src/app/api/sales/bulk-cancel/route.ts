import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { SaleStatus } from "@/prisma/client";
import { requirePermission } from "@/lib/require-permission";
import { createAuditLog } from "@/lib/audit";

const bulkCancelSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, "Selecione ao menos uma venda.")
    .max(200, "Máximo de 200 vendas por operação."),
});

export async function POST(request: Request) {
  const auth = await requirePermission("historico", "Editar");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = bulkCancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos." },
        { status: 400 },
      );
    }

    const uniqueIds = Array.from(new Set(parsed.data.ids));
    const failed: { id: string; reason: string }[] = [];
    const cancelledIds: string[] = [];
    const cancelledNumbers: string[] = [];

    await prisma.$transaction(async (tx) => {
      const storeSettings = await tx.settings.findUnique({
        where: { lojaId: auth.user.lojaId },
      });
      const config = (storeSettings?.config as any) ?? {};
      const trackStock = config?.products?.trackStock ?? true;

      const sales = await tx.sale.findMany({
        where: {
          id: { in: uniqueIds },
          lojaId: auth.user.lojaId,
          deletedAt: null,
        },
        include: { items: true },
      });

      const foundMap = new Map(sales.map((s) => [s.id, s]));

      for (const id of uniqueIds) {
        const sale = foundMap.get(id);
        if (!sale) {
          failed.push({ id, reason: "Venda não encontrada." });
          continue;
        }
        if (sale.status === SaleStatus.CANCELADO) {
          failed.push({ id, reason: "Esta venda já está cancelada." });
          continue;
        }

        await tx.sale.update({
          where: { id: sale.id },
          data: { status: SaleStatus.CANCELADO },
        });

        if (trackStock) {
          for (const item of sale.items) {
            if (item.variantId) {
              const currentVariant = await tx.productVariant.findUnique({
                where: { id: item.variantId },
              });
              const prevStock =
                currentVariant?.stock !== null && currentVariant?.stock !== undefined
                  ? Number(currentVariant.stock)
                  : 0;
              const updatedVariant = await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
                select: { stock: true },
              });
              await tx.stockMovement.create({
                data: {
                  lojaId: auth.user.lojaId,
                  type: "SALE_CANCEL",
                  productId: item.productId,
                  variantId: item.variantId,
                  quantity: item.quantity,
                  previousStock: prevStock,
                  resultStock: Number(updatedVariant.stock ?? 0),
                  userId: auth.user.id,
                  notes: `Cancelamento em lote da venda #${sale.saleNumber ?? ""}`.trim(),
                },
              });
            } else {
              const currentProduct = await tx.product.findUnique({
                where: { id: item.productId },
              });
              const prevStock =
                currentProduct?.stock !== null && currentProduct?.stock !== undefined
                  ? Number(currentProduct.stock)
                  : 0;
              const updatedProduct = await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
                select: { stock: true },
              });
              await tx.stockMovement.create({
                data: {
                  lojaId: auth.user.lojaId,
                  type: "SALE_CANCEL",
                  productId: item.productId,
                  quantity: item.quantity,
                  previousStock: prevStock,
                  resultStock: Number(updatedProduct.stock ?? 0),
                  userId: auth.user.id,
                  notes: `Cancelamento em lote da venda #${sale.saleNumber ?? ""}`.trim(),
                },
              });
            }
          }
        }

        cancelledIds.push(sale.id);
        cancelledNumbers.push(
          sale.saleNumber ? `#${sale.saleNumber}` : sale.id.slice(-6),
        );
      }
    });

    if (cancelledIds.length > 0) {
      await createAuditLog({
        action: "BULK_CANCEL_SALES",
        entity: "Sale",
        entityId: "bulk",
        details: {
          count: cancelledIds.length,
          cancelledIds,
          saleNumbers: cancelledNumbers.slice(0, 10),
          failedCount: failed.length,
        },
        userId: auth.user.id,
        lojaId: auth.user.lojaId,
      });
    }

    return NextResponse.json({ cancelledIds, failed });
  } catch (error) {
    console.error("Erro no cancelamento em lote de vendas:", error);
    return NextResponse.json(
      { error: "Erro ao cancelar vendas em lote." },
      { status: 500 },
    );
  }
}
