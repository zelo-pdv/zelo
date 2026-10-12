import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";
import { requirePermission } from "@/lib/require-permission";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requirePermission("produtos", "Visualizar");

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const products = await prisma.product.findMany({
      where: { lojaId: auth.user.lojaId, deletedAt: null },
      include: { category: true, variants: { where: { deletedAt: null } } },
      orderBy: { name: "asc" },
    });

    const serializedProducts = products.map((product) => ({
      ...product,
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
    }));

    return NextResponse.json(serializedProducts);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);

    return NextResponse.json(
      { error: "Erro ao buscar produtos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("produtos", "Adicionar");

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const data = productSchema.parse(body);

    if (data.categoryId) {
      const existingCategory = await prisma.category.findFirst({
        where: { id: data.categoryId, lojaId: auth.user.lojaId },
      });
      if (!existingCategory) {
        return NextResponse.json({ error: "Categoria inválida ou não pertence à loja." }, { status: 400 });
      }
    }

    const { hasVariants, variants, ...productData } = data;

    const toNull = (v?: string | null) =>
      v === "" || v === undefined ? null : v;

    const product = await prisma.product.create({
      data: {
        ...productData,
        code: toNull(productData.code),
        barcode: toNull(productData.barcode),
        description: toNull(productData.description),
        image: toNull(productData.image),
        notes: toNull(productData.notes),
        categoryId: toNull(productData.categoryId),
        costPrice: productData.costPrice,
        salePrice: productData.salePrice,
        lojaId: auth.user.lojaId,
        variants: hasVariants && variants ? {
          create: variants.map(v => ({
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

    await createAuditLog({
      action: "CREATE_PRODUCT",
      entity: "Product",
      entityId: product.id,
      details: { name: product.name, salePrice: Number(product.salePrice), stock: Number(product.stock) },
      userId: auth.user.id,
      lojaId: auth.user.lojaId,
    });

    return NextResponse.json(
      {
        ...product,
        costPrice: Number(product.costPrice),
        salePrice: Number(product.salePrice),
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (error && (error.name === "ZodError" || error.issues)) {
      const issueDetails = error.issues
        ?.map((i: any) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json(
        {
          error: "Dados inválidos.",
          details: issueDetails || "Erro de validação nos campos informados.",
        },
        { status: 400 },
      );
    }
    if (error.code === "P2002") {
      const target = error.meta?.target || "campo";
      return NextResponse.json(
        {
          error: "Conflito de dados: Este registro já existe.",
          details: `Os campos restritos que geraram o erro foram: ${target}`,
        },
        { status: 400 },
      );
    }

    console.error("DETALHES DO ERRO AO CRIAR PRODUTO:", error);

    return NextResponse.json(
      {
        error: "Erro ao criar produto.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
