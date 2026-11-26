import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-permission";
import { createAuditLog } from "@/lib/audit";

const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, "Selecione ao menos um usuário.")
    .max(200, "Máximo de 200 usuários por operação."),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }
  const currentUser = auth.user;

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
      const store = await tx.loja.findUnique({
        where: { id: currentUser.lojaId },
        select: { ownerId: true },
      });

      const users = await tx.user.findMany({
        where: {
          id: { in: uniqueIds },
          lojaId: currentUser.lojaId,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      const foundMap = new Map(users.map((u) => [u.id, u]));

      for (const id of uniqueIds) {
        const target = foundMap.get(id);
        if (!target) {
          failed.push({ id, reason: "Usuário não encontrado." });
          continue;
        }
        if (store?.ownerId && target.id === store.ownerId) {
          failed.push({
            id,
            reason: "O proprietário da loja não pode ser deletado.",
          });
          continue;
        }
        if (target.id === currentUser.id) {
          failed.push({
            id,
            reason: "Você não pode excluir o próprio usuário.",
          });
          continue;
        }

        deletedIds.push(target.id);
        deletedNames.push(target.name);
      }

      if (deletedIds.length > 0) {
        await tx.user.deleteMany({
          where: {
            id: { in: deletedIds },
            lojaId: currentUser.lojaId,
          },
        });
      }
    });

    if (deletedIds.length > 0) {
      await createAuditLog({
        action: "BULK_DELETE_USERS",
        entity: "User",
        entityId: "bulk",
        details: {
          count: deletedIds.length,
          deletedIds,
          deletedNames: deletedNames.slice(0, 10),
          failedCount: failed.length,
        },
        userId: currentUser.id,
        lojaId: currentUser.lojaId,
      });
    }

    return NextResponse.json({ deletedIds, failed });
  } catch (error) {
    console.error("Erro na exclusão em lote de usuários:", error);
    return NextResponse.json(
      { error: "Erro ao excluir usuários em lote." },
      { status: 500 },
    );
  }
}
