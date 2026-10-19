import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { createStockMovementSchema, createBatchStockMovementSchema } from "@/lib/validations/stock-movement";
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
        { title: { contains: q, mode: "insensitive" } },
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
    const isBatch = Array.isArray(body?.items);

    type ItemPayload = {
      productId: string;
      variantId?: string | null;
      type: StockMovementType;
      quantity: number;
      notes?: string | null;
    };

    let itemsToProcess: ItemPayload[] = [];
    let generalNotes = typeof body?.notes === "string" ? body.notes.trim() : null;
    let movementTitle = "Movimentação de Estoque";

    if (isBatch) {
      const validation = createBatchStockMovementSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: "Dados inválidos: " + validation.error.issues[0].message },
          { status: 400 },
        );
      }
      itemsToProcess = validation.data.items as ItemPayload[];
      generalNotes = validation.data.notes?.trim() || null;
      movementTitle = validation.data.title.trim();
    } else {
      const validation = createStockMovementSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: "Dados inválidos: " + validation.error.issues[0].message },
          { status: 400 },
        );
      }
      itemsToProcess = [validation.data as ItemPayload];
      movementTitle = validation.data.title.trim();
    }

    // Pré-validação de cada produto no contexto multi-tenant
    for (const item of itemsToProcess) {
      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
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
          { error: `Produto ID ${item.productId} não encontrado ou não pertence a esta loja.` },
          { status: 404 },
        );
      }

      const hasVariants = product.variants && product.variants.length > 0;
      if (hasVariants) {
        if (!item.variantId) {
          return NextResponse.json(
            {
              error: `O produto "${product.name}" possui variações. Selecione uma variação para cada movimentação.`,
            },
            { status: 400 },
          );
        }

        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          return NextResponse.json(
            { error: `Variação inválida para o produto "${product.name}".` },
            { status: 400 },
          );
        }
      } else if (item.variantId) {
        return NextResponse.json(
          { error: `O produto "${product.name}" não possui variações.` },
          { status: 400 },
        );
      }
    }

    // Executa a transação atômica para todos os itens
    const createdMovements = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of itemsToProcess) {
        let prevStock = 0;
        let newStock = 0;

        if (item.variantId) {
          const currentVariant = await tx.productVariant.findUniqueOrThrow({
            where: { id: item.variantId },
          });
          prevStock = Number(currentVariant.stock ?? 0);

          if (item.type === "ENTRY") {
            newStock = prevStock + item.quantity;
          } else if (item.type === "OUT") {
            newStock = prevStock - item.quantity;
          } else if (item.type === "ADJUSTMENT") {
            newStock = item.quantity;
          }

          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: newStock },
          });
        } else {
          const currentProduct = await tx.product.findUniqueOrThrow({
            where: { id: item.productId },
          });
          prevStock = Number(currentProduct.stock ?? 0);

          if (item.type === "ENTRY") {
            newStock = prevStock + item.quantity;
          } else if (item.type === "OUT") {
            newStock = prevStock - item.quantity;
          } else if (item.type === "ADJUSTMENT") {
            newStock = item.quantity;
          }

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newStock },
          });
        }

        const finalNotes = item.notes?.trim() || generalNotes || null;

        const created = await tx.stockMovement.create({
          data: {
            lojaId: auth.user.lojaId,
            title: movementTitle,
            type: item.type,
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            previousStock: prevStock,
            resultStock: newStock,
            notes: finalNotes,
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

        results.push(created);
      }

      return results;
    });

    // Registra logs de auditoria para cada item
    for (const mov of createdMovements) {
      await createAuditLog({
        action: "STOCK_ENTRY",
        entity: "StockMovement",
        entityId: mov.id,
        details: {
          type: mov.type,
          productId: mov.productId,
          productName: mov.product?.name,
          variantId: mov.variantId,
          variantName: mov.variant?.name,
          quantity: Number(mov.quantity),
          previousStock: Number(mov.previousStock),
          resultStock: Number(mov.resultStock),
          notes: mov.notes,
        },
        userId: auth.user.id,
        lojaId: auth.user.lojaId,
      });
    }

    const serialized = createdMovements.map((mov) => ({
      ...mov,
      quantity: Number(mov.quantity),
      previousStock: Number(mov.previousStock),
      resultStock: Number(mov.resultStock),
    }));

    if (!isBatch) {
      return NextResponse.json(serialized[0], { status: 201 });
    }

    return NextResponse.json(
      {
        count: serialized.length,
        items: serialized,
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
