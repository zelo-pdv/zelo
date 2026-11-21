import Dexie, { type Table } from "dexie";

export interface LocalProductVariant {
  id: string;
  name: string;
  code?: string | null;
  barcode?: string | null;
  salePrice?: number | null;
  costPrice?: number | null;
  stock: number;
  minStock?: number | null;
  image?: string | null;
  active?: boolean;
}

export interface LocalProduct {
  id: string; // CUID ou temp_prod_xxx
  code?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  image?: string | null;
  costPrice?: number | null;
  salePrice: number;
  stock: number;
  minStock?: number | null;
  category?: string | null;
  categoryId?: string | null;
  active: boolean;
  variants?: LocalProductVariant[] | null;
  updatedAt?: string;
  isLocalOnly?: boolean; // true se foi cadastrado offline e aguarda sync
}

export interface LocalClient {
  id: string; // CUID ou temp_cli_xxx
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  active: boolean;
  updatedAt?: string;
  isLocalOnly?: boolean; // true se foi cadastrado offline e aguarda sync
}

export interface LocalSaleCartItem {
  cartItemId?: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  productImage?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface LocalSale {
  id: string; // UUID local
  saleNumber?: number | null;
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
  createdAt: string;
  synced: boolean;
  syncedAt?: string | null;
  serverSaleId?: string | null;
}

export interface LocalSyncQueueItem {
  id?: number; // auto-increment
  type: "CREATE_CLIENT" | "CREATE_PRODUCT" | "CREATE_SALE";
  tempId?: string; // id local provisório para remapeamento
  payload: any;
  createdAt: string;
  attempts: number;
  lastError?: string | null;
}

export interface LocalSettings {
  id: string; // "current"
  lojaId?: string;
  config: any;
  updatedAt: string;
}

export class ZeloOfflineDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  clients!: Table<LocalClient, string>;
  sales!: Table<LocalSale, string>;
  syncQueue!: Table<LocalSyncQueueItem, number>;
  settings!: Table<LocalSettings, string>;

  constructor() {
    super("zelo_offline_db");
    this.version(1).stores({
      products: "id, code, barcode, name, active, isLocalOnly",
      clients: "id, name, phone, active, isLocalOnly",
      sales: "id, saleNumber, clientId, status, synced, createdAt",
      syncQueue: "++id, type, tempId, createdAt",
      settings: "id",
    });
  }
}

// Instância singleton segura para Next.js (Client-side)
let dbInstance: ZeloOfflineDatabase | null = null;

export function getOfflineDb(): ZeloOfflineDatabase | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!dbInstance) {
    dbInstance = new ZeloOfflineDatabase();
  }
  return dbInstance;
}
