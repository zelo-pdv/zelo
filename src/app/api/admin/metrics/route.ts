import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalStores,
      activeStores,
      newStoresLast30Days,
      totalUsers,
      totalClients,
      totalProducts,
      totalVariants,
      totalSalesCount,
      paidSalesAggregation,
      recentStores,
    ] = await Promise.all([
      prisma.loja.count(),
      prisma.loja.count({ where: { active: true } }),
      prisma.loja.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count(),
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.productVariant.count({ where: { deletedAt: null } }),
      prisma.sale.count({ where: { deletedAt: null } }),
      prisma.sale.aggregate({
        where: {
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
      prisma.loja.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          ownerName: true,
          email: true,
          phone: true,
          active: true,
          createdAt: true,
          _count: {
            select: {
              products: true,
              sales: true,
              users: true,
            },
          },
        },
      }),
    ]);

    const totalGmv = Number(paidSalesAggregation._sum.total || 0);

    return NextResponse.json({
      success: true,
      data: {
        stores: {
          total: totalStores,
          active: activeStores,
          inactive: totalStores - activeStores,
          newLast30Days: newStoresLast30Days,
          activationRate: totalStores > 0 ? Math.round((activeStores / totalStores) * 100) : 0,
        },
        sales: {
          totalCount: totalSalesCount,
          paidCount: paidSalesAggregation._count.id,
          totalGmv,
        },
        catalog: {
          totalProducts,
          totalVariants,
        },
        users: {
          totalUsers,
          totalClients,
        },
        recentStores,
      },
    });
  } catch (error) {
    console.error("Erro ao carregar métricas administrativas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
