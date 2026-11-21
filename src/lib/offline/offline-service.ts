import { getOfflineDb, type LocalProduct, type LocalClient, type LocalSale, type LocalSaleCartItem } from "./db";

/**
 * Utilitário para gerar identificadores únicos mesmo sem conexão.
 */
export function generateLocalId(prefix: "cli" | "prod" | "sale"): string {
  const uuid = typeof crypto !== "undefined" && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  return `temp_${prefix}_${uuid}`;
}

/**
 * Salva ou atualiza os produtos e clientes remotos no banco local,
 * preservando com cuidado quaisquer registros locais ainda pendentes de sincronização.
 */
export async function cacheCatalogData(params: {
  products?: any[];
  clients?: any[];
  settings?: any;
}): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;

  await db.transaction("rw", [db.products, db.clients, db.settings], async () => {
    // 1. Atualiza Produtos
    if (params.products && Array.isArray(params.products)) {
      // Coleta IDs dos produtos criados offline para não sobrescrever
      const localOnlyProducts = await db.products.where("isLocalOnly").equals(1 as any).toArray();
      const localOnlyIds = new Set(localOnlyProducts.map((p) => p.id));

      const formattedProducts: LocalProduct[] = params.products
        .filter((p) => !localOnlyIds.has(p.id))
        .map((p) => ({
          id: p.id,
          code: p.code || null,
          barcode: p.barcode || null,
          name: p.name,
          description: p.description || null,
          image: p.image || null,
          costPrice: p.costPrice != null ? Number(p.costPrice) : null,
          salePrice: Number(p.salePrice || 0),
          stock: Number(p.stock || 0),
          minStock: p.minStock != null ? Number(p.minStock) : null,
          category: p.category?.name || p.category || null,
          categoryId: p.categoryId || null,
          active: p.active !== false,
          variants: Array.isArray(p.variants)
            ? p.variants.map((v: any) => ({
                id: v.id,
                name: v.name,
                code: v.code || null,
                barcode: v.barcode || null,
                salePrice: v.salePrice != null ? Number(v.salePrice) : null,
                costPrice: v.costPrice != null ? Number(v.costPrice) : null,
                stock: Number(v.stock || 0),
                minStock: v.minStock != null ? Number(v.minStock) : null,
                image: v.image || null,
                active: v.active !== false,
              }))
            : null,
          updatedAt: p.updatedAt || new Date().toISOString(),
          isLocalOnly: false,
        }));

      await db.products.bulkPut(formattedProducts);
    }

    // 2. Atualiza Clientes
    if (params.clients && Array.isArray(params.clients)) {
      const localOnlyClients = await db.clients.where("isLocalOnly").equals(1 as any).toArray();
      const localOnlyIds = new Set(localOnlyClients.map((c) => c.id));

      const formattedClients: LocalClient[] = params.clients
        .filter((c) => !localOnlyIds.has(c.id))
        .map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          email: c.email || null,
          notes: c.notes || null,
          active: c.active !== false,
          updatedAt: c.updatedAt || new Date().toISOString(),
          isLocalOnly: false,
        }));

      await db.clients.bulkPut(formattedClients);
    }

    // 3. Atualiza Configurações
    if (params.settings) {
      await db.settings.put({
        id: "current",
        lojaId: params.settings.lojaId,
        config: params.settings.config || params.settings,
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

/**
 * Retorna os produtos armazenados no banco local.
 */
export async function getOfflineProducts(): Promise<LocalProduct[]> {
  const db = getOfflineDb();
  if (!db) return [];
  return db.products.where("active").equals(1 as any).toArray();
}

/**
 * Retorna os clientes armazenados no banco local.
 */
export async function getOfflineClients(): Promise<LocalClient[]> {
  const db = getOfflineDb();
  if (!db) return [];
  return db.clients.where("active").equals(1 as any).toArray();
}

/**
 * Retorna as configurações armazenadas no banco local.
 */
export async function getOfflineSettings(): Promise<any | null> {
  const db = getOfflineDb();
  if (!db) return null;
  const s = await db.settings.get("current");
  return s?.config || null;
}

/**
 * Registra um cliente localmente (offline) e adiciona à fila de sincronização.
 */
export async function createOfflineClient(data: {
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
}): Promise<LocalClient> {
  const db = getOfflineDb();
  if (!db) throw new Error("IndexedDB não disponível.");

  const tempId = generateLocalId("cli");
  const localClient: LocalClient = {
    id: tempId,
    name: data.name,
    phone: data.phone,
    email: data.email || null,
    notes: data.notes || null,
    active: true,
    updatedAt: new Date().toISOString(),
    isLocalOnly: true,
  };

  await db.transaction("rw", [db.clients, db.syncQueue], async () => {
    await db.clients.put(localClient);
    await db.syncQueue.add({
      type: "CREATE_CLIENT",
      tempId,
      payload: { ...data, tempId },
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
  });

  return localClient;
}

/**
 * Registra um produto localmente (offline) e adiciona à fila de sincronização.
 */
export async function createOfflineProduct(data: {
  name: string;
  salePrice: number;
  costPrice?: number | null;
  stock?: number;
  barcode?: string | null;
  code?: string | null;
  category?: string | null;
  categoryId?: string | null;
  description?: string | null;
}): Promise<LocalProduct> {
  const db = getOfflineDb();
  if (!db) throw new Error("IndexedDB não disponível.");

  const tempId = generateLocalId("prod");
  const localProduct: LocalProduct = {
    id: tempId,
    name: data.name,
    salePrice: Number(data.salePrice),
    costPrice: data.costPrice != null ? Number(data.costPrice) : null,
    stock: Number(data.stock || 0),
    barcode: data.barcode || null,
    code: data.code || null,
    category: data.category || null,
    categoryId: data.categoryId || null,
    description: data.description || null,
    active: true,
    updatedAt: new Date().toISOString(),
    isLocalOnly: true,
  };

  await db.transaction("rw", [db.products, db.syncQueue], async () => {
    await db.products.put(localProduct);
    await db.syncQueue.add({
      type: "CREATE_PRODUCT",
      tempId,
      payload: { ...data, tempId },
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
  });

  return localProduct;
}

/**
 * Registra uma venda offline no banco local, decrementa o estoque local
 * dos produtos envolvidos e enfileira para sincronização.
 */
export async function createOfflineSale(saleData: {
  clientId?: string | null;
  clientName?: string | null;
  items: LocalSaleCartItem[];
  total: number;
  discount?: number | null;
  surcharge?: number | null;
  paymentMethod: string;
  status: string;
  dueDate?: string | null;
  notes?: string | null;
}): Promise<LocalSale> {
  const db = getOfflineDb();
  if (!db) throw new Error("IndexedDB não disponível.");

  const localSaleId = generateLocalId("sale");

  const sale: LocalSale = {
    id: localSaleId,
    clientId: saleData.clientId || null,
    clientName: saleData.clientName || "Consumidor Final",
    items: saleData.items,
    total: saleData.total,
    discount: saleData.discount || null,
    surcharge: saleData.surcharge || null,
    paymentMethod: saleData.paymentMethod,
    status: saleData.status,
    dueDate: saleData.dueDate || null,
    notes: saleData.notes || null,
    createdAt: new Date().toISOString(),
    synced: false,
  };

  await db.transaction("rw", [db.sales, db.products, db.syncQueue], async () => {
    // 1. Salva a venda local
    await db.sales.put(sale);

    // 2. Decrementa estoque localmente para refletir na tela imediatamente
    for (const item of sale.items) {
      const product = await db.products.get(item.productId);
      if (product) {
        if (item.variantId && Array.isArray(product.variants)) {
          const updatedVariants = product.variants.map((v) => {
            if (v.id === item.variantId) {
              return { ...v, stock: Math.max(0, v.stock - item.quantity) };
            }
            return v;
          });
          const newTotalStock = updatedVariants.reduce((sum, v) => sum + v.stock, 0);
          await db.products.update(item.productId, {
            variants: updatedVariants,
            stock: newTotalStock,
          });
        } else {
          const newStock = Math.max(0, product.stock - item.quantity);
          await db.products.update(item.productId, { stock: newStock });
        }
      }
    }

    // 3. Adiciona a venda à fila de sincronização
    await db.syncQueue.add({
      type: "CREATE_SALE",
      tempId: localSaleId,
      payload: sale,
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
  });

  return sale;
}

/**
 * Retorna a quantidade de itens pendentes na fila de sincronização.
 */
export async function getPendingSyncCount(): Promise<number> {
  const db = getOfflineDb();
  if (!db) return 0;
  return db.syncQueue.count();
}

/**
 * Retorna todas as vendas pendentes de sincronização.
 */
export async function getPendingOfflineSales(): Promise<LocalSale[]> {
  const db = getOfflineDb();
  if (!db) return [];
  return db.sales.where("synced").equals(0 as any).toArray();
}
