import { apiRequest } from "@/lib/api-request";
import type {
  CreateStockMovementInput,
  CreateBatchStockMovementInput,
} from "@/lib/validations/stock-movement";

export type StockMovementFrontend = {
  id: string;
  title: string;
  type: "ENTRY" | "OUT" | "ADJUSTMENT" | "SALE" | "SALE_CANCEL";
  quantity: number;
  previousStock: number;
  resultStock: number;
  notes?: string | null;
  isReverted: boolean;
  revertedAt?: string | null;
  productId: string;
  variantId?: string | null;
  lojaId: string;
  userId?: string | null;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    code?: string | null;
    barcode?: string | null;
  };
  variant?: {
    id: string;
    name: string;
    code?: string | null;
    barcode?: string | null;
  } | null;
  user?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
};

export type StockMovementsListResponse = {
  items: StockMovementFrontend[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const stockMovementsService = {
  async list(params?: {
    page?: number;
    limit?: number;
    q?: string;
    type?: string;
    productId?: string;
  }): Promise<StockMovementsListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.q) searchParams.set("q", params.q);
    if (params?.type && params.type !== "ALL") searchParams.set("type", params.type);
    if (params?.productId) searchParams.set("productId", params.productId);

    const query = searchParams.toString();
    const url = `/stock-movements${query ? `?${query}` : ""}`;
    return apiRequest<StockMovementsListResponse>(url);
  },

  async create(
    data: CreateStockMovementInput | CreateBatchStockMovementInput,
  ): Promise<StockMovementFrontend | StockMovementFrontend[]> {
    return apiRequest<StockMovementFrontend | StockMovementFrontend[]>(
      "/stock-movements",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  async revert(id: string): Promise<StockMovementFrontend> {
    return apiRequest<StockMovementFrontend>(`/stock-movements/${id}/revert`, {
      method: "POST",
    });
  },
};

