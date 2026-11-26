import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

export async function GET(req: Request) {
  try {
    const auth = await requirePermission("registros", "Visualizar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const category = searchParams.get("category")?.toLowerCase();
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status"); // PAGO, PENDENTE, CANCELADO
    const paymentMethod = searchParams.get("paymentMethod");
    const search = searchParams.get("search")?.trim();

    const where: any = {
      lojaId: user.lojaId,
    };

    if (userId && userId !== "todos" && userId !== "all") {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    } else if (category && category !== "todos" && category !== "all") {
      switch (category) {
        case "vendas":
          where.OR = [
            { entity: "Sale" },
            {
              action: {
                in: [
                  "CREATE_SALE",
                  "UPDATE_SALE",
                  "UPDATE_SALE_STATUS",
                  "CANCEL_SALE",
                  "DELETE_SALE",
                  "SYNC_OFFLINE_SALES",
                ],
              },
            },
          ];
          break;
        case "produtos":
          where.OR = [
            { entity: { in: ["Product", "StockMovement"] } },
            {
              action: {
                in: [
                  "CREATE_PRODUCT",
                  "CREATE",
                  "UPDATE_PRODUCT",
                  "DELETE_PRODUCT",
                  "UPDATE_STOCK",
                  "STOCK_ENTRY",
                  "STOCK_REVERT",
                  "IMPORT_CATALOG_PRODUCTS",
                  "IMPORT_PRODUCTS",
                ],
              },
            },
          ];
          break;
        case "clientes":
          where.OR = [
            { entity: "Client" },
            {
              action: {
                in: ["CREATE_CLIENT", "UPDATE_CLIENT", "DELETE_CLIENT", "IMPORT_CLIENTS"],
              },
            },
          ];
          break;
        case "usuarios":
          where.OR = [
            { entity: "User" },
            {
              action: {
                in: ["CREATE_USER", "UPDATE_USER", "DELETE_USER"],
              },
            },
          ];
          break;
        case "grupos":
          where.OR = [
            { entity: "AccessGroup" },
            {
              action: {
                in: ["CREATE_ACCESS_GROUP", "UPDATE_ACCESS_GROUP", "DELETE_ACCESS_GROUP"],
              },
            },
          ];
          break;
        case "configuracoes":
          where.OR = [
            { entity: { in: ["Settings", "Loja"] } },
            {
              action: {
                in: ["UPDATE_SETTINGS", "UPDATE_STORE"],
              },
            },
          ];
          break;
      }
    }

    const tzOffsetParam = searchParams.get("tzOffset");
    const tzOffsetMinutes =
      tzOffsetParam !== null && !Number.isNaN(Number(tzOffsetParam))
        ? Number(tzOffsetParam)
        : 180; // Padrão BRT (-03:00)

    const parseDateBoundary = (rawDate: string, endOfDay: boolean): Date => {
      if (rawDate.includes("T")) return new Date(rawDate);
      const [y, m, d] = rawDate.split("-").map(Number);
      if (!y || !m || !d) return new Date(rawDate);
      const utcMs = Date.UTC(
        y,
        m - 1,
        d,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0
      );
      return new Date(utcMs + tzOffsetMinutes * 60_000);
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = parseDateBoundary(startDate, false);
      }
      if (endDate) {
        where.createdAt.lte = parseDateBoundary(endDate, true);
      }
    }

    // Filtros adicionais de vendas (status e forma de pagamento)
    const andConditions: any[] = [];

    if (status && status !== "todos" && status !== "all") {
      if (status === "CANCELADO") {
        andConditions.push({
          OR: [
            { action: "CANCEL_SALE" },
            { details: { path: ["status"], equals: "CANCELADO" } },
            { details: { path: ["newStatus"], equals: "CANCELADO" } },
          ],
        });
      } else {
        andConditions.push({
          OR: [
            { details: { path: ["status"], equals: status } },
            { details: { path: ["newStatus"], equals: status } },
            { details: { path: ["oldStatus"], equals: status } },
          ],
        });
      }
    }

    if (paymentMethod && paymentMethod !== "todos" && paymentMethod !== "all") {
      andConditions.push({
        details: { path: ["paymentMethod"], equals: paymentMethod },
      });
    }

    if (search) {
      const searchNum = parseInt(search.replace(/\D/g, ""), 10);
      const searchOrList: any[] = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
      ];

      if (!isNaN(searchNum) && search.includes("#")) {
        searchOrList.push({ details: { path: ["saleNumber"], equals: searchNum } });
      }

      // Consulta insensível a acentos no banco de dados via unaccent para operadores e detalhes JSON
      try {
        const matchingUsers = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "User"
          WHERE "lojaId" = ${user.lojaId}
            AND unaccent("name") ILIKE unaccent(${'%' + search + '%'})
        `;
        if (matchingUsers.length > 0) {
          searchOrList.push({ userId: { in: matchingUsers.map((u) => u.id) } });
        }
      } catch {
        // Fallback seguro caso o banco de dados não possua unaccent disponível
      }

      try {
        const matchingLogDetails = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "AuditLog"
          WHERE "lojaId" = ${user.lojaId}
            AND unaccent(CAST("details" AS TEXT)) ILIKE unaccent(${'%' + search + '%'})
          ORDER BY "createdAt" DESC
          LIMIT 500
        `;
        if (matchingLogDetails.length > 0) {
          searchOrList.push({ id: { in: matchingLogDetails.map((l) => l.id) } });
        }
      } catch {
        try {
          const matchingLogDetailsPlain = await prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM "AuditLog"
            WHERE "lojaId" = ${user.lojaId}
              AND CAST("details" AS TEXT) ILIKE ${'%' + search + '%'}
            ORDER BY "createdAt" DESC
            LIMIT 500
          `;
          if (matchingLogDetailsPlain.length > 0) {
            searchOrList.push({ id: { in: matchingLogDetailsPlain.map((l) => l.id) } });
          }
        } catch {
          // Ignora se raw query não estiver disponível em mocks unitários
        }
      }

      andConditions.push({ OR: searchOrList });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [logs, total, storeUsers] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: limit,
        skip,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({
        where,
      }),
      prisma.user.findMany({
        where: { lojaId: user.lojaId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      data: logs,
      users: storeUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar logs de auditoria:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar logs." },
      { status: 500 }
    );
  }
}
