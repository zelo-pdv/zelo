import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { createAuditLog } from "@/lib/audit";

const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, "Selecione ao menos um cliente.")
    .max(200, "Máximo de 200 clientes por operação."),
});

export async function POST(request: Request) {
  const auth = await requirePermission("clientes", "Excluir");
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
      const clients = await tx.client.findMany({
        where: {
          id: { in: uniqueIds },
          lojaId: auth.user.lojaId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
      });

      const foundMap = new Map(clients.map((c) => [c.id, c]));

      for (const id of uniqueIds) {
        const client = foundMap.get(id);
        if (!client) {
          failed.push({ id, reason: "Cliente não encontrado." });
          continue;
        }
        if (client.name.trim().toLowerCase() === "consumidor final") {
          failed.push({
            id,
            reason: 'O cliente padrão "Consumidor Final" não pode ser excluído.',
          });
          continue;
        }
        deletedIds.push(client.id);
        deletedNames.push(client.name);
      }

      if (deletedIds.length > 0) {
        await tx.client.updateMany({
          where: {
            id: { in: deletedIds },
            lojaId: auth.user.lojaId,
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
            active: false,
          },
        });
      }
    });

    if (deletedIds.length > 0) {
      await createAuditLog({
        action: "BULK_DELETE_CLIENTS",
        entity: "Client",
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
    console.error("Erro na exclusão em lote de clientes:", error);
    return NextResponse.json(
      { error: "Erro ao excluir clientes em lote." },
      { status: 500 },
    );
  }
}
