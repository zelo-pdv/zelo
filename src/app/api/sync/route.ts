import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const lojaId = user.lojaId;

    const [productAgg, clientAgg, saleAgg, categoryAgg, userAgg, groupAgg, settingsRecord] = await Promise.all([
      prisma.product.aggregate({
        where: { lojaId },
        _max: { updatedAt: true },
        _count: { id: true },
      }),
      prisma.client.aggregate({
        where: { lojaId },
        _max: { updatedAt: true },
        _count: { id: true },
      }),
      prisma.sale.aggregate({
        where: { lojaId },
        _max: { updatedAt: true },
        _count: { id: true },
      }),
      prisma.category.aggregate({
        where: { lojaId },
        _max: { updatedAt: true },
        _count: { id: true },
      }),
      prisma.user.aggregate({
        where: { lojaId },
        _max: { updatedAt: true },
        _count: { id: true },
      }),
      prisma.accessGroup.aggregate({
        where: { lojaId },
        _max: { updatedAt: true },
        _count: { id: true },
      }),
      prisma.settings.findUnique({
        where: { lojaId },
        select: { updatedAt: true },
      }),
    ]);

    const sessionHash = JSON.stringify({
      id: user.id,
      groupId: user.groupId,
      groupName: user.groupName,
      isAdmin: user.isAdmin,
      permissions: user.permissions,
      active: user.active,
    });

    return NextResponse.json({
      products: `${productAgg._max.updatedAt?.getTime() ?? 0}_${productAgg._count.id}`,
      clients: `${clientAgg._max.updatedAt?.getTime() ?? 0}_${clientAgg._count.id}`,
      sales: `${saleAgg._max.updatedAt?.getTime() ?? 0}_${saleAgg._count.id}`,
      categories: `${categoryAgg._max.updatedAt?.getTime() ?? 0}_${categoryAgg._count.id}`,
      users: `${userAgg._max.updatedAt?.getTime() ?? 0}_${userAgg._count.id}`,
      access_groups: `${groupAgg._max.updatedAt?.getTime() ?? 0}_${groupAgg._count.id}`,
      session: Buffer.from(sessionHash).toString("base64"),
      settings: `${settingsRecord?.updatedAt?.getTime() ?? 0}`,
    });
  } catch (error) {
    console.error("Erro na rota de sincronização GET:", error);
    return NextResponse.json({ error: "Erro interno de sincronização" }, { status: 500 });
  }
}

interface SyncClientPayload {
  tempId: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
}

interface SyncProductPayload {
  tempId: string;
  name: string;
  salePrice: number;
  costPrice?: number | null;
  stock?: number;
  barcode?: string | null;
  code?: string | null;
  categoryId?: string | null;
  description?: string | null;
}

interface SyncSalePayload {
  tempId: string;
  clientId?: string | null;
  clientName?: string | null;
  items: Array<{
    productId: string;
    variantId?: string | null;
    productName: string;
    variantName?: string | null;
    quantity: number;
    unitPrice: number;
  }>;
  total: number;
  discount?: number | null;
  surcharge?: number | null;
  paymentMethod: string;
  status: string;
  dueDate?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export async function POST(req: Request) {
  try {
    const auth = await requirePermission("nova-venda", "Adicionar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const body = await req.json();
    const clients: SyncClientPayload[] = Array.isArray(body.clients) ? body.clients : [];
    const products: SyncProductPayload[] = Array.isArray(body.products) ? body.products : [];
    const sales: SyncSalePayload[] = Array.isArray(body.sales) ? body.sales : [];

    if (clients.length === 0 && products.length === 0 && sales.length === 0) {
      return NextResponse.json({ success: true, idMap: {}, syncedSales: [] });
    }

    const idMap: Record<string, string> = {};
    const syncedSales: Array<{ tempId: string; serverId: string; saleNumber: number }> = [];

    // Recupera configurações da loja
    const storeSettings = await prisma.settings.findUnique({
      where: { lojaId: user.lojaId },
    });
    const config = (storeSettings?.config as any) ?? {};
    const trackStock = config?.products?.trackStock !== undefined ? Boolean(config.products.trackStock) : true;

    // Executa sincronização em transação atômica
    await prisma.$transaction(async (tx) => {
      // 1. SINCRONIZAÇÃO DE CLIENTES
      for (const c of clients) {
        if (!c.tempId || !c.name) continue;

        // Verifica se cliente com mesmo telefone já existe na loja para evitar duplicatas
        let existing = null;
        if (c.phone && c.phone.trim().length > 0) {
          existing = await tx.client.findFirst({
            where: { lojaId: user.lojaId, phone: c.phone.trim(), deletedAt: null },
          });
        }

        if (existing) {
          idMap[c.tempId] = existing.id;
        } else {
          const created = await tx.client.create({
            data: {
              name: c.name.trim(),
              phone: c.phone || "",
              email: c.email || null,
              notes: c.notes ? `${c.notes} (Cadastrado offline)` : "Cadastrado offline",
              lojaId: user.lojaId,
              active: true,
            },
          });
          idMap[c.tempId] = created.id;
        }
      }

      // 2. SINCRONIZAÇÃO DE PRODUTOS
      for (const p of products) {
        if (!p.tempId || !p.name) continue;

        let existing = null;
        if (p.barcode && p.barcode.trim().length > 0) {
          existing = await tx.product.findFirst({
            where: { lojaId: user.lojaId, barcode: p.barcode.trim(), deletedAt: null },
          });
        } else if (p.code && p.code.trim().length > 0) {
          existing = await tx.product.findFirst({
            where: { lojaId: user.lojaId, code: p.code.trim(), deletedAt: null },
          });
        }

        if (existing) {
          idMap[p.tempId] = existing.id;
        } else {
          const created = await tx.product.create({
            data: {
              name: p.name.trim(),
              salePrice: Number(p.salePrice || 0),
              costPrice: p.costPrice != null ? Number(p.costPrice) : null,
              stock: Number(p.stock || 0),
              barcode: p.barcode || null,
              code: p.code || null,
              categoryId: p.categoryId || null,
              description: p.description || null,
              notes: "Cadastrado offline",
              lojaId: user.lojaId,
              active: true,
            },
          });
          idMap[p.tempId] = created.id;
        }
      }

      // 3. SINCRONIZAÇÃO DE VENDAS
      for (const s of sales) {
        if (!s.tempId || !Array.isArray(s.items) || s.items.length === 0) continue;

        // Resolve clientId
        let resolvedClientId = s.clientId || null;
        if (resolvedClientId && idMap[resolvedClientId]) {
          resolvedClientId = idMap[resolvedClientId];
        }

        if (resolvedClientId) {
          const clientExists = await tx.client.findFirst({
            where: { id: resolvedClientId, lojaId: user.lojaId },
          });
          if (!clientExists) {
            resolvedClientId = null;
          }
        }

        // Determina próximo saleNumber sequencial
        const lastSale = await tx.sale.findFirst({
          where: { lojaId: user.lojaId, saleNumber: { not: null } },
          orderBy: { saleNumber: "desc" },
          select: { saleNumber: true },
        });

        let nextNumber = (lastSale?.saleNumber ?? 0) + 1;
        while (
          await tx.sale.findFirst({
            where: { lojaId: user.lojaId, saleNumber: nextNumber },
            select: { id: true },
          })
        ) {
          nextNumber++;
        }

        // Monta os itens mapeando IDs de produtos temporários
        const saleItemsData = [];
        let calculatedTotal = 0;

        for (const item of s.items) {
          const resolvedProductId = idMap[item.productId] || item.productId;
          const qty = Number(item.quantity) || 1;
          const price = Number(item.unitPrice) || 0;
          const subtotal = qty * price;
          calculatedTotal += subtotal;

          saleItemsData.push({
            productId: resolvedProductId,
            variantId: item.variantId || null,
            productName: item.productName,
            variantName: item.variantName || null,
            quantity: qty,
            unitPrice: price,
            subtotal: subtotal,
          });
        }

        const discount = Number(s.discount) || 0;
        const surcharge = Number(s.surcharge) || 0;
        const finalTotal = Math.max(0, calculatedTotal - discount + surcharge);

        const createdSale = await tx.sale.create({
          data: {
            lojaId: user.lojaId,
            sellerId: user.id,
            saleNumber: nextNumber,
            clientId: resolvedClientId,
            clientName: s.clientName || "Consumidor Final",
            total: finalTotal,
            discount,
            surcharge,
            paymentMethod: s.paymentMethod || "DINHEIRO",
            status: (s.status as any) || "PAGO",
            dueDate: s.dueDate ? new Date(s.dueDate) : null,
            notes: s.notes ? `${s.notes} [Venda offline sincronizada]` : "[Venda offline sincronizada]",
            date: s.createdAt ? new Date(s.createdAt) : new Date(),
            items: {
              create: saleItemsData,
            },
          },
        });

        // Baixa de estoque no servidor
        if (trackStock) {
          for (const item of saleItemsData) {
            if (item.variantId) {
              const currentVariant = await tx.productVariant.findUnique({
                where: { id: item.variantId },
                select: { stock: true },
              });
              const prevStock = currentVariant ? Number(currentVariant.stock) : 0;
              const updatedVariant = await tx.productVariant.update({
                where: { id: item.variantId },
                data: {
                  stock: {
                    decrement: item.quantity,
                  },
                },
                select: { stock: true },
              });

              await tx.stockMovement.create({
                data: {
                  lojaId: user.lojaId,
                  type: "SALE",
                  productId: item.productId,
                  variantId: item.variantId,
                  quantity: item.quantity,
                  previousStock: prevStock,
                  resultStock: Number(updatedVariant.stock ?? 0),
                  userId: user.id,
                  notes: `Venda offline #${createdSale.saleNumber}`,
                },
              });
            } else {
              const dbProduct = await tx.product.findUnique({
                where: { id: item.productId },
                select: { stock: true },
              });
              if (dbProduct) {
                const prevStock = Number(dbProduct.stock);
                const updatedProduct = await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    stock: {
                      decrement: item.quantity,
                    },
                  },
                  select: { stock: true },
                });

                await tx.stockMovement.create({
                  data: {
                    lojaId: user.lojaId,
                    type: "SALE",
                    productId: item.productId,
                    quantity: item.quantity,
                    previousStock: prevStock,
                    resultStock: Number(updatedProduct.stock ?? 0),
                    userId: user.id,
                    notes: `Venda offline #${createdSale.saleNumber}`,
                  },
                });
              }
            }
          }
        }

        idMap[s.tempId] = createdSale.id;
        syncedSales.push({
          tempId: s.tempId,
          serverId: createdSale.id,
          saleNumber: nextNumber,
        });
      }
    });

    if (sales.length > 0) {
      await createAuditLog({
        action: "SYNC_OFFLINE_SALES",
        entity: "Sale",
        entityId: syncedSales.map((s) => s.serverId).join(","),
        details: { count: sales.length, sales: syncedSales },
        userId: user.id,
        lojaId: user.lojaId,
      });
    }

    return NextResponse.json({
      success: true,
      idMap,
      syncedSales,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Erro na sincronização offline:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao processar sincronização offline." },
      { status: 500 },
    );
  }
}
