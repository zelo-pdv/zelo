import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { createStockMovementSchema } from "@/lib/validations/stock-movement";
import { createAuditLog } from "@/lib/audit";
import { Prisma, StockMovementType } from "@/prisma/client";

export async function GET(request: Request) {
  const auth = await requirePermission("estoque", "Visualizar");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "30", 10)),
    );
    const q = searchParams.get("q")?.trim();
    const type = searchParams.get("type")?.trim();
    const productId = searchParams.get("productId")?.trim();

    const where: Prisma.StockMovementWhereInput = {
      lojaId: auth.user.lojaId,
    };

    if (
      type &&
      Object.values(StockMovementType).includes(type as StockMovementType)
    ) {
      where.type = type as StockMovementType;
    }

    if (productId) {
      where.productId = productId;
    }

    if (q) {
      where.OR = [
        { product: { name: { contains: q, mode: "insensitive" } } },
        { product: { code: { contains: q, mode: "insensitive" } } },
        { variant: { name: { contains: q, mode: "insensitive" } } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
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
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const serializedItems = items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      previousStock: Number(item.previousStock),
      resultStock: Number(item.resultStock),
    }));

    return NextResponse.json({
      items: serializedItems,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Erro ao listar Estoque:", error);
    return NextResponse.json(
      { error: "Erro ao listar Estoque." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("estoque", "Adicionar");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const validation = createStockMovementSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos: " + validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { productId, variantId, type, quantity, notes } = validation.data;

    // Multi-tenant check
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        lojaId: auth.user.lojaId,
        deletedAt: null,
      },
      include: {
        variants: {
          where: { deletedAt: null },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado ou não pertence a esta loja." },
        { status: 404 },
      );
    }

    const hasVariants = product.variants && product.variants.length > 0;

    if (hasVariants) {
      if (!variantId) {
        return NextResponse.json(
          {
            error:
              "Este produto possui variações. Selecione uma variação para movimentar o estoque.",
          },
          { status: 400 },
        );
      }

      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) {
        return NextResponse.json(
          { error: "Variação inválida ou não pertence a este produto." },
          { status: 400 },
        );
      }
    } else if (variantId) {
      return NextResponse.json(
        { error: "Este produto não possui variações." },
        { status: 400 },
      );
    }

    const movement = await prisma.$transaction(async (tx) => {
      let prevStock = 0;
      let newStock = 0;

      if (variantId) {
        const currentVariant = await tx.productVariant.findUniqueOrThrow({
          where: { id: variantId },
        });
        prevStock = Number(currentVariant.stock ?? 0);

        if (type === "ENTRY") {
          newStock = prevStock + quantity;
        } else if (type === "OUT") {
          newStock = prevStock - quantity;
        } else if (type === "ADJUSTMENT") {
          newStock = quantity;
        }

        await tx.productVariant.update({
          where: { id: variantId },
          data: { stock: newStock },
        });
      } else {
        const currentProduct = await tx.product.findUniqueOrThrow({
          where: { id: productId },
        });
        prevStock = Number(currentProduct.stock ?? 0);

        if (type === "ENTRY") {
          newStock = prevStock + quantity;
        } else if (type === "OUT") {
          newStock = prevStock - quantity;
        } else if (type === "ADJUSTMENT") {
          newStock = quantity;
        }

        await tx.product.update({
          where: { id: productId },
          data: { stock: newStock },
        });
      }

      const created = await tx.stockMovement.create({
        data: {
          lojaId: auth.user.lojaId,
          type,
          productId,
          variantId: variantId || null,
          quantity,
          previousStock: prevStock,
          resultStock: newStock,
          notes: notes?.trim() || null,
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

    await createAuditLog({
      action: "STOCK_ENTRY",
      entity: "StockMovement",
      entityId: movement.id,
      details: {
        type: movement.type,
        productId: movement.productId,
        productName: movement.product?.name,
        variantId: movement.variantId,
        variantName: movement.variant?.name,
        quantity: Number(movement.quantity),
        previousStock: Number(movement.previousStock),
        resultStock: Number(movement.resultStock),
        notes: movement.notes,
      },
      userId: auth.user.id,
      lojaId: auth.user.lojaId,
    });

    return NextResponse.json(
      {
        ...movement,
        quantity: Number(movement.quantity),
        previousStock: Number(movement.previousStock),
        resultStock: Number(movement.resultStock),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao registrar movimentação de estoque:", error);
    return NextResponse.json(
      { error: "Erro ao registrar movimentação de estoque." },
      { status: 500 },
    );
  }
}
