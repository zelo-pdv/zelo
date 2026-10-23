import { apiRequest } from "@/lib/api-request";

export interface PublishedCatalog {
  id: string;
  title: string;
  cycle: string | null;
  description: string | null;
  coverUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  brand: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  _count: {
    products: number;
  };
  approvedProductsCount: number;
}

export interface CatalogProductDetail {
  id: string;
  catalogId: string;
  globalProductId: string;
  pageNumber: number | null;
  cyclePrice: number | null;
  regularPrice: number | null;
  promoPrice: number | null;
  promoMinQuantity: number | null;
  promoRule: string | null;
  cropUrl: string | null;
  curationStatus: string;
  isImported: boolean;
  globalProduct: {
    id: string;
    name: string;
    referenceSku: string | null;
    barcode: string | null;
    description: string | null;
    imageUrl: string | null;
    suggestedPrice: number | null;
    costPrice: number | null;
    globalCategory?: {
      id: string;
      name: string;
      icon: string | null;
    } | null;
    variants: Array<{
      id: string;
      name: string;
      size: string | null;
      colorName: string | null;
      colorCode: string | null;
      barcode: string | null;
      priceOverride: number | null;
    }>;
  };
}

export interface CatalogDetailResponse {
  id: string;
  title: string;
  cycle: string | null;
  description: string | null;
  coverUrl: string | null;
  brand: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  products: CatalogProductDetail[];
}

export const catalogsService = {
  async listPublished(params?: { search?: string; brandId?: string }): Promise<PublishedCatalog[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.brandId) searchParams.set("brandId", params.brandId);
    const qs = searchParams.toString();
    const res = await apiRequest<{ success: boolean; data: PublishedCatalog[] }>(
      `/catalogs${qs ? `?${qs}` : ""}`
    );
    return res.data;
  },

  async getById(id: string): Promise<CatalogDetailResponse> {
    const res = await apiRequest<{ success: boolean; data: CatalogDetailResponse }>(
      `/catalogs/${id}`
    );
    return res.data;
  },

  async importProducts(
    catalogId: string,
    options: {
      globalProductIds: string[];
      categoryId?: string | null;
      defaultStock?: number;
    }
  ): Promise<{ success: boolean; message: string; importedCount: number; skippedCount: number }> {
    return apiRequest(`/catalogs/${catalogId}/import`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  },
};
