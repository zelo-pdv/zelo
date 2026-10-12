import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { lojaSchema } from "@/lib/validations/loja";
import { requireAdmin } from "@/lib/require-permission";
import { createAuditLog } from "@/lib/audit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    if (auth.user.lojaId !== id) {
      return NextResponse.json(
        { error: "Acesso não autorizado para esta loja." },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validação com Zod no back-end
    const parsed = lojaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos: " + parsed.error.issues[0].message },
        { status: 400 },
      );
    }
    const { address, ...lojaData } = parsed.data;

    // Avoid Prisma unique constraint errors for empty strings
    if (lojaData.email === "") lojaData.email = null;
    if (lojaData.document === "") lojaData.document = null;

    if (address) {
      const hasAnyValue = Object.values(address).some(
        (v) => !!v && String(v).trim() !== "",
      );
      const existingAddress = await prisma.address.findFirst({
        where: { lojaId: id },
      });

      if (hasAnyValue) {
        if (existingAddress) {
          await prisma.address.update({
            where: { id: existingAddress.id },
            data: {
              street: address.street || "",
              number: address.number || "",
              complement: address.complement || "",
              neighborhood: address.neighborhood || "",
              city: address.city || "",
              state: address.state || "",
              zipCode: address.zipCode || "",
            },
          });
        } else {
          await prisma.address.create({
            data: {
              lojaId: id,
              street: address.street || "",
              number: address.number || "",
              complement: address.complement || "",
              neighborhood: address.neighborhood || "",
              city: address.city || "",
              state: address.state || "",
              zipCode: address.zipCode || "",
            },
          });
        }
      }
    }

    const updatedLoja = await prisma.loja.update({
      where: { id },
      data: lojaData,
      include: {
        address: true,
      },
    });

    const firstAddress =
      Array.isArray(updatedLoja.address) && updatedLoja.address.length > 0
        ? updatedLoja.address[0]
        : null;

    await createAuditLog({
      action: "UPDATE_STORE",
      entity: "Loja",
      entityId: id,
      details: {
        name: updatedLoja.name,
        ownerName: updatedLoja.ownerName,
        phone: updatedLoja.phone,
      },
      userId: auth.user.id,
      lojaId: id,
    });

    return NextResponse.json({
      ...updatedLoja,
      address: firstAddress,
    });
  } catch (error) {
    console.error("Erro ao atualizar loja:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar dados." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    if (auth.user.lojaId !== id) {
      return NextResponse.json(
        { error: "Acesso não autorizado para esta loja." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "account"; // "account" (deleta tudo e a conta) ou "data" (deleta apenas dados/registros)

    // Validação de senha obrigatória para ações destrutivas
    let password = "";
    try {
      const body = await request.json();
      password = body?.password || "";
    } catch {
      // Caso a requisição não traga body JSON, tenta obter do header
      password = request.headers.get("x-confirm-password") || "";
    }

    if (!password) {
      return NextResponse.json(
        { error: "A senha de confirmação é obrigatória." },
        { status: 400 },
      );
    }

    // Busca senha hash atual do usuário administrador
    const userInDb = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { password: true },
    });

    if (!userInDb) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 },
      );
    }

    const { default: bcrypt } = await import("bcryptjs");
    const isPasswordValid = await bcrypt.compare(password, userInDb.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Senha incorreta. A operação foi cancelada." },
        { status: 401 },
      );
    }

    if (mode === "data") {
      // Exclui apenas registros operacionais (vendas, produtos, clientes, etc.), preservando loja e usuários
      await prisma.$transaction(async (tx) => {
        const sales = await tx.sale.findMany({
          where: { lojaId: id },
          select: { id: true },
        });
        const saleIds = sales.map((s) => s.id);
        if (saleIds.length > 0) {
          await tx.saleItem.deleteMany({
            where: { saleId: { in: saleIds } },
          });
        }

        await tx.sale.deleteMany({ where: { lojaId: id } });
        await tx.productVariant.deleteMany({ where: { lojaId: id } });
        await tx.product.deleteMany({ where: { lojaId: id } });
        await tx.category.deleteMany({ where: { lojaId: id } });
        await tx.client.deleteMany({ where: { lojaId: id } });
        await tx.auditLog.deleteMany({ where: { lojaId: id } });

        // Recria apenas categoria e cliente essenciais padrão
        await tx.client.create({
          data: {
            name: "Consumidor Final",
            phone: "",
            lojaId: id,
          },
        });

        await tx.category.create({
          data: {
            name: "Geral",
            lojaId: id,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Todos os dados e registros operacionais foram excluídos com sucesso.",
      });
    }

    // mode === "account": Exclui a conta completa (loja, usuários, configurações e todos os dados)
    await prisma.$transaction(async (tx) => {
      const sales = await tx.sale.findMany({
        where: { lojaId: id },
        select: { id: true },
      });
      const saleIds = sales.map((s) => s.id);
      if (saleIds.length > 0) {
        await tx.saleItem.deleteMany({
          where: { saleId: { in: saleIds } },
        });
      }

      await tx.sale.deleteMany({ where: { lojaId: id } });
      await tx.productVariant.deleteMany({ where: { lojaId: id } });
      await tx.product.deleteMany({ where: { lojaId: id } });
      await tx.category.deleteMany({ where: { lojaId: id } });
      await tx.address.deleteMany({ where: { lojaId: id } });
      await tx.client.deleteMany({ where: { lojaId: id } });
      await tx.unit.deleteMany({ where: { lojaId: id } });
      await tx.settings.deleteMany({ where: { lojaId: id } });
      await tx.auditLog.deleteMany({ where: { lojaId: id } });

      await tx.loja.update({
        where: { id },
        data: { ownerId: null },
      });

      await tx.user.deleteMany({ where: { lojaId: id } });
      await tx.accessGroup.deleteMany({ where: { lojaId: id } });
      await tx.loja.delete({ where: { id } });
    });

    const { deleteAuthCookies } = await import("@/lib/cookies");
    await deleteAuthCookies();

    return NextResponse.json({
      success: true,
      message: "Conta e todos os dados excluídos com sucesso.",
      redirectTo: "/login",
    });
  } catch (error) {
    console.error("Erro ao excluir conta/dados:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a exclusão." },
      { status: 500 },
    );
  }
}
