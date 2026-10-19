import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { createAuditLog } from "@/lib/audit";
import { dateTime } from "@/lib/format";
import { StockMovementType } from "@/prisma/client";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  void request;
  const auth = await requirePermission("estoque", "Adicionar");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;

    // Buscar a movimentação alvo
    const movement = await prisma.stockMovement.findFirst({
      where: {
        id,
        lojaId: auth.user.lojaId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            barcode: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            code: true,
            barcode: true,
          },
        },
      },
    });

    if (!movement) {
      return NextResponse.json(
        { error: "Movimentação não encontrada ou não pertence a esta loja." },
        { status: 404 },
      );
    }

    // REGRA: Após reverter uma movimentação, não é possível revertê-la novamente
    if (movement.isReverted) {
      return NextResponse.json(
        {
          error:
            "Esta movimentação já foi revertida anteriormente e não pode ser revertida novamente.",
        },
        { status: 400 },
      );
    }

    // REGRA DE SEGURANÇA MANDATÓRIA:
    // Só é possível desfazer uma movimentação se não houver NENHUMA outra movimentação posterior
    // contendo os itens desta movimentação, para evitar inconsistências no saldo físico.
    const subsequentMovement = await prisma.stockMovement.findFirst({
      where: {
        lojaId: auth.user.lojaId,
        productId: movement.productId,
        variantId: movement.variantId ?? null,
        createdAt: {
          gt: movement.createdAt,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (subsequentMovement) {
      return NextResponse.json(
        {
          error: `Não é possível reverter esta movimentação: existem movimentações posteriores registradas para este item (a partir de ${dateTime(subsequentMovement.createdAt)}). A reversão fora de ordem comprometeria a consistência do estoque.`,
        },
        { status: 400 },
      );
    }

    // Determinar o tipo inverso e a quantidade inversa
    let inverseType: StockMovementType;
    let inverseQty = Number(movement.quantity);

    switch (movement.type) {
      case "ENTRY":
        inverseType = "OUT";
        break;
      case "OUT":
        inverseType = "ENTRY";
        break;
      case "SALE":
        inverseType = "SALE_CANCEL";
        break;
      case "SALE_CANCEL":
        inverseType = "OUT";
        break;
      case "ADJUSTMENT":
        inverseType = "ADJUSTMENT";
        inverseQty = Number(movement.previousStock);
        break;
      default:
        inverseType = "ADJUSTMENT";
        inverseQty = Number(movement.previousStock);
        break;
    }

    // Executar a transação de reversão
    const revertMovement = await prisma.$transaction(async (tx) => {
      let currentStock = 0;
      let newStock = 0;

      if (movement.variantId) {
        const variant = await tx.productVariant.findUniqueOrThrow({
          where: { id: movement.variantId },
        });
        currentStock = Number(variant.stock ?? 0);

        if (inverseType === "ENTRY" || inverseType === "SALE_CANCEL") {
          newStock = currentStock + inverseQty;
        } else if (inverseType === "OUT") {
          newStock = currentStock - inverseQty;
        } else if (inverseType === "ADJUSTMENT") {
          newStock = inverseQty;
        }

        await tx.productVariant.update({
          where: { id: movement.variantId },
          data: { stock: newStock },
        });
      } else {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: movement.productId },
        });
        currentStock = Number(product.stock ?? 0);

        if (inverseType === "ENTRY" || inverseType === "SALE_CANCEL") {
          newStock = currentStock + inverseQty;
        } else if (inverseType === "OUT") {
          newStock = currentStock - inverseQty;
        } else if (inverseType === "ADJUSTMENT") {
          newStock = inverseQty;
        }

        await tx.product.update({
          where: { id: movement.productId },
          data: { stock: newStock },
        });
      }

      // Marca a movimentação original como revertida para que nunca mais seja revertida
      await tx.stockMovement.update({
        where: { id: movement.id },
        data: {
          isReverted: true,
          revertedAt: new Date(),
        },
      });

      const notes = `Reversão da movimentação anterior (${movement.type} de ${movement.quantity} un em ${dateTime(movement.createdAt)})`;

      const created = await tx.stockMovement.create({
        data: {
          lojaId: auth.user.lojaId,
          title: `Reversão: ${movement.title || "Movimentação"}`,
          type: inverseType,
          productId: movement.productId,
          variantId: movement.variantId,
          quantity: inverseQty,
          previousStock: currentStock,
          resultStock: newStock,
          notes,
          isReverted: true,
          revertedAt: new Date(),
          userId: auth.user.id,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
              barcode: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              code: true,
              barcode: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return created;
    });

    // Registrar log de auditoria
    await createAuditLog({
      action: "STOCK_REVERT",
      entity: "StockMovement",
      entityId: revertMovement.id,
      details: {
        originalMovementId: movement.id,
        originalType: movement.type,
        originalQuantity: Number(movement.quantity),
        revertedType: revertMovement.type,
        revertedQuantity: Number(revertMovement.quantity),
        previousStock: Number(revertMovement.previousStock),
        resultStock: Number(revertMovement.resultStock),
        productId: revertMovement.productId,
        variantId: revertMovement.variantId,
      },
      userId: auth.user.id,
      lojaId: auth.user.lojaId,
    });

    return NextResponse.json(
      {
        ...revertMovement,
        quantity: Number(revertMovement.quantity),
        previousStock: Number(revertMovement.previousStock),
        resultStock: Number(revertMovement.resultStock),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao reverter movimentação de estoque:", error);
    return NextResponse.json(
      { error: "Erro ao reverter movimentação de estoque." },
      { status: 500 },
    );
  }
}
