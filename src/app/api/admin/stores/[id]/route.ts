import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;

    const store = await prisma.loja.findUnique({
      where: { id },
      include: {
        address: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            active: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            products: true,
            productVariants: true,
            sales: true,
            users: true,
            clients: true,
            categories: true,
            stockMovements: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Loja não encontrada." },
        { status: 404 }
      );
    }

    const [salesAggregate, recentSales, recentAuditLogs] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          lojaId: id,
          status: "PAGO",
          deletedAt: null,
        },
        _sum: {
          total: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.sale.findMany({
        where: { lojaId: id },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          total: true,
          status: true,
          paymentMethod: true,
          clientName: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { lojaId: id },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          createdAt: true,
          user: {
            select: { name: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...store,
        financial: {
          totalPaidSalesCount: salesAggregate._count.id,
          totalPaidVolume: Number(salesAggregate._sum.total || 0),
        },
        recentSales,
        recentAuditLogs: recentAuditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          userName: log.user?.name || "Sistema",
          createdAt: log.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Erro ao obter detalhes da loja:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
