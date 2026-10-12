import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";
import { requirePermission } from "@/lib/require-permission";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission("produtos", "Editar");

  if (!auth.authorized) {
    console.log("Usuário não autorizado para editar produtos.");
    return auth.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const existingProduct = await prisma.product.findFirst({
      where: { id, lojaId: auth.user.lojaId, deletedAt: null },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    const hasOnlyIncrementStock =
      body.incrementStock !== undefined &&
      Object.keys(body).filter((k) => k !== "incrementStock").length === 0;

    if (hasOnlyIncrementStock) {
      const product = await prisma.product.update({
        where: { id },
        data: {
          stock: {
            increment: Number(body.incrementStock),
          },
        },
        include: { category: true },
      });

      await createAuditLog({
        action: "UPDATE_STOCK",
        entity: "Product",
        entityId: id,
        details: {
          oldStock: Number(existingProduct.stock),
          newStock: Number(product.stock),
          increment: Number(body.incrementStock),
        },
        userId: auth.user.id,
        lojaId: auth.user.lojaId,
      });

      return NextResponse.json({
        ...product,
        costPrice: Number(product.costPrice),
        salePrice: Number(product.salePrice),
      });
    }

    const { incrementStock, ...bodyWithoutIncrement } = body;
    const validation = productSchema.partial().safeParse(bodyWithoutIncrement);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos: " + validation.error.issues[0].message,
        },
        { status: 400 },
      );
    }

    const data = validation.data;
    const { variants, ...restData } = data;
    const productData = { ...restData };
    delete (productData as { hasVariants?: boolean }).hasVariants;

    const sentKeys = new Set(Object.keys(bodyWithoutIncrement));
    for (const key of Object.keys(productData)) {
      if (!sentKeys.has(key)) {
        delete (productData as any)[key];
      }
    }

    Object.keys(productData).forEach(
      (key) =>
        productData[key as keyof typeof productData] === undefined &&
        delete productData[key as keyof typeof productData],
    );

    if (Object.keys(productData).length === 0 && !variants && incrementStock === undefined) {
      return NextResponse.json(
        { error: "Nenhum dado para atualizar." },
        { status: 400 },
      );
    }

    if (productData.categoryId) {
      const existingCategory = await prisma.category.findFirst({
        where: { id: productData.categoryId, lojaId: auth.user.lojaId },
      });
      if (!existingCategory) {
        return NextResponse.json(
          { error: "Categoria inválida ou não pertence à loja." },
          { status: 400 },
        );
      }
    }

    const toNull = (v?: string | null) =>
      v === "" || v === undefined ? null : v;

    const normalizedData: any = {
      ...productData,
      ...(incrementStock !== undefined && productData.stock === undefined
        ? { stock: { increment: Number(incrementStock) } }
        : {}),
      ...(productData.code !== undefined && { code: toNull(productData.code) }),
      ...(productData.barcode !== undefined && { barcode: toNull(productData.barcode) }),
      ...(productData.description !== undefined && {
        description: toNull(productData.description),
      }),
      ...(productData.image !== undefined && { image: toNull(productData.image) }),
      ...(productData.notes !== undefined && { notes: toNull(productData.notes) }),
      ...(productData.categoryId !== undefined && {
        categoryId: toNull(productData.categoryId),
      }),
    };

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...normalizedData,
        variants: variants !== undefined ? {
          deleteMany: {
            id: { notIn: variants.map(v => v.id).filter(Boolean) as string[] }
          },
          update: variants.filter(v => v.id).map(v => ({
            where: { id: v.id },
            data: {
              name: v.name,
              code: toNull(v.code),
              barcode: toNull(v.barcode),
              attributes: (v.attributes ?? {}) as any,
              costPrice: v.costPrice,
              salePrice: v.salePrice,
              stock: v.stock,
              minStock: v.minStock,
              image: toNull(v.image),
            }
          })),
          create: variants.filter(v => !v.id).map(v => ({
            name: v.name,
            code: toNull(v.code),
            barcode: toNull(v.barcode),
            attributes: (v.attributes ?? {}) as any,
            costPrice: v.costPrice,
            salePrice: v.salePrice,
            stock: v.stock,
            minStock: v.minStock,
            image: toNull(v.image),
            lojaId: auth.user.lojaId
          }))
        } : undefined
      },
      include: {
        category: true,
        variants: { where: { deletedAt: null } }
      },
    });

    const changedFields: any = { name: product.name };
    let hasChanges = false;
    if (normalizedData.salePrice !== undefined && Number(normalizedData.salePrice) !== Number(existingProduct.salePrice)) {
      changedFields.oldSalePrice = Number(existingProduct.salePrice);
      changedFields.newSalePrice = Number(product.salePrice);
      hasChanges = true;
    }
    if (normalizedData.costPrice !== undefined && Number(normalizedData.costPrice) !== Number(existingProduct.costPrice)) {
      changedFields.oldCostPrice = Number(existingProduct.costPrice);
      changedFields.newCostPrice = Number(product.costPrice);
      hasChanges = true;
    }
    if (normalizedData.stock !== undefined && Number(normalizedData.stock) !== Number(existingProduct.stock)) {
      changedFields.oldStock = Number(existingProduct.stock);
      changedFields.newStock = Number(product.stock);
      hasChanges = true;
    }
    if (normalizedData.name !== undefined && normalizedData.name !== existingProduct.name) {
      changedFields.oldName = existingProduct.name;
      changedFields.newName = product.name;
      hasChanges = true;
    }

    if (hasChanges) {
      await createAuditLog({
        action: "UPDATE_PRODUCT",
        entity: "Product",
        entityId: id,
        details: changedFields,
        userId: auth.user.id,
        lojaId: auth.user.lojaId,
      });
    }

    return NextResponse.json({
      ...product,
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um produto com este código (SKU)." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao atualizar produto" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission("produtos", "Excluir");

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;

    const existingProduct = await prisma.product.findFirst({
      where: { id, lojaId: auth.user.lojaId, deletedAt: null },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    // Soft delete: preserva o histórico de vendas intacto e libera SKU/código de barras
    const suffix = `_del_${Date.now()}`;
    await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
        code: existingProduct.code ? `${existingProduct.code}${suffix}` : null,
        barcode: existingProduct.barcode ? `${existingProduct.barcode}${suffix}` : null,
      },
    });

    await createAuditLog({
      action: "DELETE_PRODUCT",
      entity: "Product",
      entityId: id,
      details: {
        name: existingProduct.name,
      },
      userId: auth.user.id,
      lojaId: auth.user.lojaId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar produto:", error);

    return NextResponse.json(
      { error: "Erro ao deletar produto" },
      { status: 400 },
    );
  }
}
