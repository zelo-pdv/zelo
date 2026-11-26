import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { getProductTotalStock } from "@/lib/stock";

export async function GET(req: Request) {
  try {
    const auth = await requirePermission("relatorios", "Visualizar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "top-products";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const categoryId = searchParams.get("categoryId");
    const onlyOverdue = searchParams.get("onlyOverdue") === "true";
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "100", 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 1000) : 100;

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

    // Configuração de datas considerando o fuso horário do cliente
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = parseDateBoundary(startDate, false);
    }
    if (endDate) {
      dateFilter.lte = parseDateBoundary(endDate, true);
    }

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Busca dados da loja para cabeçalho do relatório
    const store = await prisma.loja.findUnique({
      where: { id: user.lojaId },
      select: { name: true, ownerName: true, phone: true },
    });

    const storeInfo = {
      name: store?.name || "Minha Loja",
      ownerName: store?.ownerName || "",
      phone: store?.phone || "",
    };

    // 1. PRODUTOS MAIS VENDIDOS
    if (reportType === "top-products") {
      const sales = await prisma.sale.findMany({
        where: {
          lojaId: user.lojaId,
          deletedAt: null,
          status: { not: "CANCELADO" },
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
        include: {
          items: {
            include: {
              variant: {
                select: { id: true, name: true, stock: true },
              },
              product: {
                include: { category: true, variants: { where: { deletedAt: null } } },
              },
            },
          },
        },
      });

      const productMap = new Map<string, {
        productId: string;
        variantId: string | null;
        productName: string;
        variantName: string | null;
        code: string;
        categoryName: string;
        categoryId: string | null;
        quantitySold: number;
        totalRevenue: number;
        grossRevenue: number;
        currentStock: number;
        salePrice: number;
      }>();

      for (const sale of sales) {
        const items = sale.items || [];
        const saleGrossItems = items.reduce((sum, it) => sum + Number(it.subtotal), 0);
        const saleNetTotal =
          sale.total !== undefined && sale.total !== null
            ? Math.max(0, Number(sale.total))
            : saleGrossItems;
        const netFactor = saleGrossItems > 0 ? saleNetTotal / saleGrossItems : 1;

        for (const item of items) {
          if (categoryId && item.product?.categoryId !== categoryId) {
            continue;
          }

          const pid = item.productId;
          const vid = item.variantId || null;
          const mapKey = vid ? `${pid}::${vid}` : pid;
          const existing = productMap.get(mapKey);
          const qty = Number(item.quantity);
          const grossSubtotal = Number(item.subtotal);
          const effectiveRevenue = grossSubtotal * netFactor;

          if (existing) {
            existing.quantitySold += qty;
            existing.totalRevenue += effectiveRevenue;
            existing.grossRevenue += grossSubtotal;
            existing.salePrice =
              existing.quantitySold > 0
                ? existing.totalRevenue / existing.quantitySold
                : existing.salePrice;
          } else {
            const variantName = item.variant?.name || item.variantName || null;
            const variantStock = vid
              ? Number(
                  item.variant?.stock ??
                    item.product?.variants?.find((v) => v.id === vid)?.stock ??
                    0
                )
              : getProductTotalStock(item.product);

            productMap.set(mapKey, {
              productId: pid,
              variantId: vid,
              productName: item.productName || item.product?.name || "Produto",
              variantName,
              code: item.product?.code || "",
              categoryName: item.product?.category?.name || "Geral",
              categoryId: item.product?.categoryId || null,
              quantitySold: qty,
              totalRevenue: effectiveRevenue,
              grossRevenue: grossSubtotal,
              currentStock: variantStock,
              salePrice:
                qty > 0 ? effectiveRevenue / qty : Number(item.unitPrice) * netFactor,
            });
          }
        }
      }

      const list = Array.from(productMap.values())
        .sort((a, b) => b.quantitySold - a.quantitySold || b.totalRevenue - a.totalRevenue)
        .slice(0, limit);

      const totalItemsSold = list.reduce((acc, p) => acc + p.quantitySold, 0);
      const totalRevenue = list.reduce((acc, p) => acc + p.totalRevenue, 0);
      const topItem = list[0];
      const topProductLabel = topItem
        ? topItem.variantName
          ? `${topItem.productName} (${topItem.variantName})`
          : topItem.productName
        : "Nenhum";

      return NextResponse.json({
        reportType,
        store: storeInfo,
        summary: {
          totalProductsCount: list.length,
          totalItemsSold,
          totalRevenue,
          topProduct: topProductLabel,
        },
        data: list,
      });
    }

    // 2. PRODUTOS MENOS VENDIDOS / SEM GIRO
    if (reportType === "least-products") {
      const allProducts = await prisma.product.findMany({
        where: {
          lojaId: user.lojaId,
          active: true,
          deletedAt: null,
          ...(categoryId ? { categoryId } : {}),
        },
        include: {
          category: true,
          variants: { where: { deletedAt: null } },
        },
      });

      const sales = await prisma.sale.findMany({
        where: {
          lojaId: user.lojaId,
          deletedAt: null,
          status: { not: "CANCELADO" },
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
        include: {
          items: {
            select: { productId: true, quantity: true, subtotal: true },
          },
        },
      });

      const salesCountMap = new Map<string, { qty: number; revenue: number }>();
      for (const sale of sales) {
        const items = sale.items || [];
        const saleGrossItems = items.reduce((sum, it) => sum + Number(it.subtotal), 0);
        const saleNetTotal =
          sale.total !== undefined && sale.total !== null
            ? Math.max(0, Number(sale.total))
            : saleGrossItems;
        const netFactor = saleGrossItems > 0 ? saleNetTotal / saleGrossItems : 1;

        for (const item of items) {
          const prev = salesCountMap.get(item.productId) || { qty: 0, revenue: 0 };
          prev.qty += Number(item.quantity);
          prev.revenue += Number(item.subtotal) * netFactor;
          salesCountMap.set(item.productId, prev);
        }
      }

      const fullList = allProducts
        .map((p) => {
          const sold = salesCountMap.get(p.id) || { qty: 0, revenue: 0 };
          const stock = getProductTotalStock(p);
          const costPrice = Number(p.costPrice ?? 0);
          const salePrice = Number(p.salePrice ?? 0);
          const valuationMethod = costPrice > 0 ? "cost" : "sale_price_fallback";
          const stockValue = stock * (costPrice > 0 ? costPrice : salePrice);

          return {
            productId: p.id,
            productName: p.name,
            code: p.code || "",
            categoryName: p.category?.name || "Geral",
            quantitySold: sold.qty,
            totalRevenue: sold.revenue,
            currentStock: stock,
            salePrice,
            costPrice,
            stockValue,
            valuationMethod,
          };
        })
        .sort((a, b) => {
          // Ordena primeiro pelos que menos venderam, depois pelo maior estoque parado
          if (a.quantitySold !== b.quantitySold) {
            return a.quantitySold - b.quantitySold;
          }
          return b.currentStock - a.currentStock;
        });

      const zeroSalesCount = fullList.filter((p) => p.quantitySold === 0).length;
      const totalStockItems = fullList.reduce((acc, p) => acc + p.currentStock, 0);
      const totalStockValue = fullList.reduce((acc, p) => acc + p.stockValue, 0);
      const costValuedCount = fullList.filter((p) => p.valuationMethod === "cost").length;
      const saleFallbackCount = fullList.filter(
        (p) => p.valuationMethod === "sale_price_fallback" && p.currentStock > 0
      ).length;

      const list = fullList.slice(0, limit);

      return NextResponse.json({
        reportType,
        store: storeInfo,
        summary: {
          totalProductsCount: fullList.length,
          displayedCount: list.length,
          zeroSalesCount,
          totalStockItems,
          totalStockValue,
          costValuedCount,
          saleFallbackCount,
        },
        data: list,
      });
    }

    // 3. CLIENTES QUE MAIS COMPRAM
    if (reportType === "top-clients") {
      const sales = await prisma.sale.findMany({
        where: {
          lojaId: user.lojaId,
          deletedAt: null,
          status: { not: "CANCELADO" },
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
        include: {
          client: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
        orderBy: { date: "desc" },
      });

      const clientMap = new Map<string, {
        clientId: string | null;
        clientName: string;
        phone: string;
        email: string;
        salesCount: number;
        totalSpent: number;
        lastPurchaseDate: string;
      }>();

      for (const sale of sales) {
        const key = sale.clientId || sale.clientName || "Consumidor Final";
        const existing = clientMap.get(key);
        const total = Number(sale.total);
        const saleDateStr = sale.date.toISOString();

        if (existing) {
          existing.salesCount += 1;
          existing.totalSpent += total;
          if (new Date(saleDateStr) > new Date(existing.lastPurchaseDate)) {
            existing.lastPurchaseDate = saleDateStr;
          }
        } else {
          clientMap.set(key, {
            clientId: sale.clientId,
            clientName: sale.client?.name || sale.clientName || "Consumidor Final",
            phone: sale.client?.phone || "",
            email: sale.client?.email || "",
            salesCount: 1,
            totalSpent: total,
            lastPurchaseDate: saleDateStr,
          });
        }
      }

      const list = Array.from(clientMap.values())
        .map((c) => ({
          ...c,
          averageTicket: c.salesCount > 0 ? c.totalSpent / c.salesCount : 0,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, limit);

      const totalRevenueFromTop = list.reduce((acc, c) => acc + c.totalSpent, 0);
      const totalOrdersCount = list.reduce((acc, c) => acc + c.salesCount, 0);
      const overallAvgTicket = totalOrdersCount > 0 ? totalRevenueFromTop / totalOrdersCount : 0;

      return NextResponse.json({
        reportType,
        store: storeInfo,
        summary: {
          totalClientsCount: list.length,
          totalRevenueFromTop,
          totalOrdersCount,
          averageTicket: overallAvgTicket,
          topClient: list[0]?.clientName || "Nenhum",
        },
        data: list,
      });
    }

    // 4. CLIENTES QUE DEVEM (PENDÊNCIAS & FIADO)
    if (reportType === "debtor-clients") {
      const pendingSales = await prisma.sale.findMany({
        where: {
          lojaId: user.lojaId,
          deletedAt: null,
          status: "PENDENTE",
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
        include: {
          client: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
        orderBy: { dueDate: "asc" },
      });

      const localNow = new Date(Date.now() - tzOffsetMinutes * 60_000);
      const todayLocalYmd = localNow.toISOString().slice(0, 10);

      const debtorMap = new Map<string, {
        clientId: string | null;
        clientName: string;
        phone: string;
        email: string;
        pendingSalesCount: number;
        totalDebt: number;
        oldestDueDate: string | null;
        oldestSaleDate: string;
        isOverdue: boolean;
        overdueSalesCount: number;
        overdueDebt: number;
      }>();

      for (const sale of pendingSales) {
        const key = sale.clientId || sale.clientName || "Consumidor Final";
        const total = Number(sale.total);
        const saleDateStr = sale.date.toISOString();
        const dueDateStr = sale.dueDate ? sale.dueDate.toISOString() : null;
        const dueYmd = dueDateStr ? dueDateStr.slice(0, 10) : null;

        const isSaleOverdue = dueYmd ? dueYmd < todayLocalYmd : false;

        const existing = debtorMap.get(key);
        if (existing) {
          existing.pendingSalesCount += 1;
          existing.totalDebt += total;
          if (isSaleOverdue) {
            existing.overdueSalesCount += 1;
            existing.overdueDebt += total;
            existing.isOverdue = true;
          }
          if (dueDateStr && (!existing.oldestDueDate || new Date(dueDateStr) < new Date(existing.oldestDueDate))) {
            existing.oldestDueDate = dueDateStr;
          }
        } else {
          debtorMap.set(key, {
            clientId: sale.clientId,
            clientName: sale.client?.name || sale.clientName || "Consumidor Final",
            phone: sale.client?.phone || "",
            email: sale.client?.email || "",
            pendingSalesCount: 1,
            totalDebt: total,
            oldestDueDate: dueDateStr,
            oldestSaleDate: saleDateStr,
            isOverdue: isSaleOverdue,
            overdueSalesCount: isSaleOverdue ? 1 : 0,
            overdueDebt: isSaleOverdue ? total : 0,
          });
        }
      }

      let list = Array.from(debtorMap.values());

      if (onlyOverdue) {
        list = list.filter((c) => c.isOverdue);
      }

      list = list.sort((a, b) => b.totalDebt - a.totalDebt).slice(0, limit);

      const totalPendingDebt = list.reduce((acc, c) => acc + c.totalDebt, 0);
      const totalOverdueDebt = list.reduce((acc, c) => acc + c.overdueDebt, 0);
      const totalPendingSales = list.reduce((acc, c) => acc + c.pendingSalesCount, 0);

      return NextResponse.json({
        reportType,
        store: storeInfo,
        summary: {
          debtorsCount: list.length,
          totalPendingDebt,
          totalOverdueDebt,
          totalPendingSales,
        },
        data: list,
      });
    }

    // 5. RESUMO FINANCEIRO E FORMAS DE PAGAMENTO
    if (reportType === "financial-summary") {
      const sales = await prisma.sale.findMany({
        where: {
          lojaId: user.lojaId,
          deletedAt: null,
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
      });

      let grossRevenue = 0;
      let paidRevenue = 0;
      let pendingRevenue = 0;
      let cancelledRevenue = 0;
      let totalDiscount = 0;
      let totalSurcharge = 0;

      const paymentMap = new Map<string, { count: number; total: number }>();
      const statusMap = {
        PAGO: { count: 0, total: 0 },
        PENDENTE: { count: 0, total: 0 },
        CANCELADO: { count: 0, total: 0 },
      };

      for (const sale of sales) {
        const total = Number(sale.total);
        const discount = Number(sale.discount ?? 0);
        const surcharge = Number(sale.surcharge ?? 0);

        if (sale.status === "PAGO") {
          paidRevenue += total;
          grossRevenue += total;
          statusMap.PAGO.count++;
          statusMap.PAGO.total += total;
        } else if (sale.status === "PENDENTE") {
          pendingRevenue += total;
          grossRevenue += total;
          statusMap.PENDENTE.count++;
          statusMap.PENDENTE.total += total;
        } else if (sale.status === "CANCELADO") {
          cancelledRevenue += total;
          statusMap.CANCELADO.count++;
          statusMap.CANCELADO.total += total;
        }

        // Descontos, acréscimos e forma de pagamento (apenas de vendas não canceladas)
        if (sale.status !== "CANCELADO") {
          totalDiscount += discount;
          totalSurcharge += surcharge;

          const pm = sale.paymentMethod || "OUTRO";
          const prev = paymentMap.get(pm) || { count: 0, total: 0 };
          prev.count++;
          prev.total += total;
          paymentMap.set(pm, prev);
        }
      }

      const paymentsList = Array.from(paymentMap.entries()).map(([method, val]) => ({
        method,
        count: val.count,
        total: val.total,
        percentage: grossRevenue > 0 ? (val.total / grossRevenue) * 100 : 0,
      })).sort((a, b) => b.total - a.total);

      const netRevenue = paidRevenue;
      const validSalesCount = statusMap.PAGO.count + statusMap.PENDENTE.count;
      const averageTicket = validSalesCount > 0 ? grossRevenue / validSalesCount : 0;

      return NextResponse.json({
        reportType,
        store: storeInfo,
        summary: {
          totalSalesCount: sales.length,
          validSalesCount,
          grossRevenue,
          netRevenue,
          pendingRevenue,
          cancelledRevenue,
          totalDiscount,
          totalSurcharge,
          averageTicket,
        },
        statusBreakdown: statusMap,
        paymentsBreakdown: paymentsList,
        data: paymentsList,
      });
    }

    return NextResponse.json(
      { error: "Tipo de relatório inválido." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar relatório." },
      { status: 500 }
    );
  }
}
