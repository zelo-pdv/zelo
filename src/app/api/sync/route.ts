import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import {
  getEffectiveDiscountLimit,
  validateDiscountLimit,
} from "@/lib/discount-limit";
import { SaleStatus } from "@/prisma/client";

export const dynamic = "force-dynamic";

class SyncValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SyncValidationError";
    this.status = status;
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const lojaId = user.lojaId;

    const [
      productAgg,
      clientAgg,
      saleAgg,
      categoryAgg,
      userAgg,
      groupAgg,
      stockMovementAgg,
      settingsRecord,
    ] = await Promise.all([
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
      prisma.stockMovement.aggregate({
        where: { lojaId },
        _max: { createdAt: true },
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
      stock_movements: `${stockMovementAgg._max.createdAt?.getTime() ?? 0}_${stockMovementAgg._count.id}`,
      session: Buffer.from(sessionHash).toString("base64"),
      settings: `${settingsRecord?.updatedAt?.getTime() ?? 0}`,
    });
  } catch (error) {
    console.error("Erro na rota de sincronização GET:", error);
    return NextResponse.json(
      { error: "Erro interno de sincronização" },
      { status: 500 }
    );
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

const VALID_SALE_STATUSES = new Set<string>(Object.values(SaleStatus));

export async function POST(req: Request) {
  try {
    const auth = await requirePermission("nova-venda", "Adicionar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const body = await req.json();
    const clients: SyncClientPayload[] = Array.isArray(body.clients)
      ? body.clients
      : [];
    const products: SyncProductPayload[] = Array.isArray(body.products)
      ? body.products
      : [];
    const sales: SyncSalePayload[] = Array.isArray(body.sales)
      ? body.sales
      : [];

    if (clients.length === 0 && products.length === 0 && sales.length === 0) {
      return NextResponse.json({ success: true, idMap: {}, syncedSales: [] });
    }

    // Validação granular de RBAC para entidades auxiliares enviadas no lote
    const validClientsInput = clients.filter((c) => c?.tempId && c?.name?.trim());
    if (
      validClientsInput.length > 0 &&
      !user.isAdmin &&
      !hasPermission(user.permissions, "clientes", "Adicionar")
    ) {
      return NextResponse.json(
        {
          error:
            "Você não possui permissão para cadastrar clientes durante a sincronização.",
        },
        { status: 403 }
      );
    }

    const validProductsInput = products.filter(
      (p) => p?.tempId && p?.name?.trim()
    );
    if (
      validProductsInput.length > 0 &&
      !user.isAdmin &&
      !hasPermission(user.permissions, "produtos", "Adicionar")
    ) {
      return NextResponse.json(
        {
          error:
            "Você não possui permissão para cadastrar produtos durante a sincronização.",
        },
        { status: 403 }
      );
    }

    const idMap: Record<string, string> = {};
    const syncedSales: Array<{
      tempId: string;
      serverId: string;
      saleNumber: number;
    }> = [];

    // Recupera configurações da loja
    const storeSettings = await prisma.settings.findUnique({
      where: { lojaId: user.lojaId },
    });
    const config = (storeSettings?.config as any) ?? {};
    const trackStock =
      config?.products?.trackStock !== undefined
        ? Boolean(config.products.trackStock)
        : true;
    const blockOutOfStock = Boolean(config?.sales?.blockOutOfStock);
    const openPriceEnabled = Boolean(config?.sales?.openPriceEnabled);
    const openPriceMode = config?.sales?.openPriceMode ?? "ALL";
    const openPriceProductIds: string[] = Array.isArray(
      config?.sales?.openPriceProductIds
    )
      ? config.sales.openPriceProductIds
      : [];

    // Executa sincronização em transação atômica serializada por loja
    await prisma.$transaction(async (tx) => {
      if (typeof (tx as any).$executeRaw === "function") {
        await (tx as any).$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.lojaId}))`;
      }

      const createdProductsMap = new Map<
        string,
        { id: string; name: string; salePrice: number; stock: number }
      >();

      // 1. SINCRONIZAÇÃO DE CLIENTES
      for (const c of validClientsInput) {
        let existing = null;
        if (c.phone && c.phone.trim().length > 0) {
          existing = await tx.client.findFirst({
            where: {
              lojaId: user.lojaId,
              phone: c.phone.trim(),
              deletedAt: null,
            },
          });
        }

        if (existing) {
          idMap[c.tempId] = existing.id;
        } else {
          const created = await tx.client.create({
            data: {
              name: c.name.trim(),
              phone: c.phone?.trim() || "",
              email: c.email?.trim() || null,
              notes: c.notes
                ? `${c.notes} (Cadastrado offline)`
                : "Cadastrado offline",
              lojaId: user.lojaId,
              active: true,
            },
          });
          idMap[c.tempId] = created.id;
        }
      }

      // 2. SINCRONIZAÇÃO DE PRODUTOS
      for (const p of validProductsInput) {
        const sanitizedSalePrice = Math.max(0, Number(p.salePrice) || 0);
        const sanitizedStock = Math.max(0, Number(p.stock) || 0);

        let existing = null;
        if (p.barcode && p.barcode.trim().length > 0) {
          existing = await tx.product.findFirst({
            where: {
              lojaId: user.lojaId,
              barcode: p.barcode.trim(),
              deletedAt: null,
            },
          });
        } else if (p.code && p.code.trim().length > 0) {
          existing = await tx.product.findFirst({
            where: {
              lojaId: user.lojaId,
              code: p.code.trim(),
              deletedAt: null,
            },
          });
        }

        if (existing) {
          idMap[p.tempId] = existing.id;
          createdProductsMap.set(existing.id, {
            id: existing.id,
            name: existing.name,
            salePrice: Number(existing.salePrice ?? sanitizedSalePrice),
            stock: Number(existing.stock ?? 0),
          });
        } else {
          const created = await tx.product.create({
            data: {
              name: p.name.trim(),
              salePrice: sanitizedSalePrice,
              costPrice:
                p.costPrice != null ? Math.max(0, Number(p.costPrice)) : null,
              stock: sanitizedStock,
              barcode: p.barcode?.trim() || null,
              code: p.code?.trim() || null,
              categoryId: p.categoryId || null,
              description: p.description || null,
              notes: "Cadastrado offline",
              lojaId: user.lojaId,
              active: true,
            },
          });
          idMap[p.tempId] = created.id;
          createdProductsMap.set(created.id, {
            id: created.id,
            name: created.name,
            salePrice: Number(created.salePrice ?? sanitizedSalePrice),
            stock: Number(created.stock ?? sanitizedStock),
          });
        }
      }

      // 3. SINCRONIZAÇÃO DE VENDAS
      for (const s of sales) {
        if (!s?.tempId || !Array.isArray(s.items) || s.items.length === 0) {
          continue;
        }

        // Idempotência por tempId da venda offline
        const existingSyncedSale = await tx.sale.findFirst({
          where: { lojaId: user.lojaId, offlineTempId: s.tempId },
          select: { id: true, saleNumber: true },
        });
        if (existingSyncedSale) {
          idMap[s.tempId] = existingSyncedSale.id;
          syncedSales.push({
            tempId: s.tempId,
            serverId: existingSyncedSale.id,
            saleNumber: existingSyncedSale.saleNumber ?? 0,
          });
          continue;
        }

        const requestedStatus = s.status || SaleStatus.PAGO;
        if (!VALID_SALE_STATUSES.has(requestedStatus)) {
          throw new SyncValidationError(
            `Status de venda inválido: ${requestedStatus}`,
            400
          );
        }

        // Resolve clientId
        let resolvedClientId = s.clientId || null;
        if (resolvedClientId && idMap[resolvedClientId]) {
          resolvedClientId = idMap[resolvedClientId];
        }

        if (resolvedClientId) {
          const clientExists = await tx.client.findFirst({
            where: {
              id: resolvedClientId,
              lojaId: user.lojaId,
              deletedAt: null,
            },
            select: { id: true },
          });
          if (!clientExists) {
            resolvedClientId = null;
          }
        }

        // Monta os itens validando pertencimento à loja e preço oficial no servidor
        const saleItemsData: Array<{
          productId: string;
          variantId: string | null;
          productName: string;
          variantName: string | null;
          quantity: number;
          unitPrice: number;
          subtotal: number;
        }> = [];
        let calculatedTotal = 0;

        for (const item of s.items) {
          const resolvedProductId = idMap[item.productId] || item.productId;
          const qty = Number(item.quantity);
          if (!Number.isFinite(qty) || qty <= 0) {
            throw new SyncValidationError(
              "Quantidade inválida em item da venda offline.",
              400
            );
          }

          const dbProduct =
            createdProductsMap.get(resolvedProductId) ||
            (await tx.product.findFirst({
              where: {
                id: resolvedProductId,
                lojaId: user.lojaId,
                deletedAt: null,
              },
              select: { id: true, name: true, salePrice: true, stock: true },
            }));

          if (!dbProduct) {
            throw new SyncValidationError(
              `Produto não encontrado para a loja: ${item.productName || resolvedProductId}`,
              400
            );
          }

          let dbVariant: {
            id: string;
            name: string;
            salePrice: any;
            stock: any;
          } | null = null;
          if (item.variantId) {
            dbVariant = await tx.productVariant.findFirst({
              where: {
                id: item.variantId,
                productId: resolvedProductId,
                lojaId: user.lojaId,
                deletedAt: null,
              },
              select: { id: true, name: true, salePrice: true, stock: true },
            });
            if (!dbVariant) {
              throw new SyncValidationError(
                `Variação inválida para o produto ${dbProduct.name}.`,
                400
              );
            }
          }

          const stockToCheck = dbVariant ? dbVariant.stock : dbProduct.stock;
          if (
            trackStock &&
            blockOutOfStock &&
            stockToCheck !== null &&
            Number(stockToCheck) < qty
          ) {
            throw new SyncValidationError(
              `Estoque insuficiente para o produto ${dbProduct.name}${
                dbVariant ? " - " + dbVariant.name : ""
              }.`,
              400
            );
          }

          const isProductOpenPrice =
            openPriceEnabled &&
            (openPriceMode === "ALL" ||
              openPriceProductIds.includes(resolvedProductId));

          const serverPrice =
            dbVariant && dbVariant.salePrice !== null
              ? Number(dbVariant.salePrice)
              : dbProduct.salePrice != null
                ? Number(dbProduct.salePrice)
                : Number(item.unitPrice) || 0;

          const price =
            isProductOpenPrice && Number(item.unitPrice) > 0
              ? Number(item.unitPrice)
              : serverPrice;

          const subtotal = qty * price;
          calculatedTotal += subtotal;

          saleItemsData.push({
            productId: resolvedProductId,
            variantId: item.variantId || null,
            productName: dbProduct.name || item.productName,
            variantName: dbVariant?.name || item.variantName || null,
            quantity: qty,
            unitPrice: price,
            subtotal,
          });
        }

        const discount = Number(s.discount) || 0;
        const surcharge = Number(s.surcharge) || 0;
        if (discount < 0 || discount > calculatedTotal) {
          throw new SyncValidationError(
            "Desconto inválido na venda offline.",
            400
          );
        }
        if (surcharge < 0) {
          throw new SyncValidationError(
            "Acréscimo inválido na venda offline.",
            400
          );
        }

        if (discount > 0) {
          const sellerUser = await tx.user.findUnique({
            where: { id: user.id },
            include: { group: true },
          });

          const effectiveLimit = getEffectiveDiscountLimit(
            {
              id: sellerUser?.id,
              isAdmin: user.isAdmin,
              isOwner: user.isOwner,
              discountLimitMode: sellerUser?.discountLimitMode,
              maxDiscountPercentage: sellerUser?.maxDiscountPercentage,
              maxDiscountValue: sellerUser?.maxDiscountValue,
            },
            sellerUser?.group,
            config?.sales
          );

          const limitValidation = validateDiscountLimit(
            calculatedTotal,
            discount,
            effectiveLimit
          );

          if (!limitValidation.valid) {
            throw new SyncValidationError(
              limitValidation.error || "Desconto excede o limite permitido.",
              400
            );
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

        const finalTotal = Math.max(0, calculatedTotal - discount + surcharge);

        const createdSale = await tx.sale.create({
          data: {
            lojaId: user.lojaId,
            sellerId: user.id,
            saleNumber: nextNumber,
            offlineTempId: s.tempId,
            clientId: resolvedClientId,
            clientName: s.clientName || "Consumidor Final",
            total: finalTotal,
            discount,
            surcharge,
            paymentMethod: s.paymentMethod || "DINHEIRO",
            status: requestedStatus as SaleStatus,
            dueDate: s.dueDate ? new Date(s.dueDate) : null,
            notes: s.notes
              ? `${s.notes} [Venda offline sincronizada]`
              : "[Venda offline sincronizada]",
            date: s.createdAt ? new Date(s.createdAt) : new Date(),
            items: {
              create: saleItemsData,
            },
          },
        });

        // Baixa de estoque no servidor
        if (trackStock && requestedStatus !== SaleStatus.CANCELADO) {
          for (const item of saleItemsData) {
            if (item.variantId) {
              const currentVariant = await tx.productVariant.findUnique({
                where: { id: item.variantId },
                select: { stock: true },
              });
              const prevStock = currentVariant
                ? Number(currentVariant.stock)
                : 0;
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

    if (syncedSales.length > 0) {
      await createAuditLog({
        action: "SYNC_OFFLINE_SALES",
        entity: "Sale",
        entityId: syncedSales.map((s) => s.serverId).join(","),
        details: { count: syncedSales.length, sales: syncedSales },
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
    if (error instanceof SyncValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Erro na sincronização offline:", error);
    return NextResponse.json(
      {
        error:
          error?.message || "Erro interno ao processar sincronização offline.",
      },
      { status: 500 }
    );
  }
}
