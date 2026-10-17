export interface StockCheckableItem {
  id?: string;
  name?: string;
  stock?: number | string | null | { toNumber?: () => number; toString?: () => string };
  minStock?: number | string | null | { toNumber?: () => number; toString?: () => string };
  active?: boolean | null;
  deletedAt?: Date | string | null;
}

export interface StockCheckableProduct extends StockCheckableItem {
  id?: string;
  name?: string;
  variants?: StockCheckableItem[] | null;
}

/**
 * Checks if a minimum stock has been explicitly and validly configured for an item.
 *
 * Rules:
 * - Must not be null or undefined.
 * - Empty strings are considered unconfigured.
 * - Negative numbers or NaN are invalid.
 * - Explicit 0 is valid.
 */
export function hasExplicitMinStock(minStock: unknown): boolean {
  if (minStock === null || minStock === undefined || minStock === "") {
    return false;
  }
  const num = Number(minStock);
  return !Number.isNaN(num) && num >= 0;
}

/**
 * Converts a stock or minStock value to a number safely.
 */
export function parseStockNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "object" && val !== null && "toNumber" in val && typeof (val as any).toNumber === "function") {
    return (val as any).toNumber();
  }
  const num = Number(val);
  return Number.isNaN(num) ? 0 : num;
}

/**
 * Checks if a single item (product or variant) is in low stock.
 *
 * Mandatory Rules:
 * 1. Stock tracking must be enabled (`trackStock === true`).
 * 2. Item must have an explicitly configured and valid minimum stock.
 * 3. Current stock must be less than or equal to the configured minimum stock.
 * 4. If stock tracking is disabled, never consider it low stock.
 * 5. If minimum stock is unconfigured, never consider it low stock.
 * 6. Absence of minimum stock is not interpreted as zero.
 * 7. Minimum stock explicitly configured as 0 evaluates `stock <= 0`.
 */
export function isItemLowStock(
  item: StockCheckableItem | null | undefined,
  trackStock: boolean
): boolean {
  if (!trackStock || !item) {
    return false;
  }

  if (!hasExplicitMinStock(item.minStock)) {
    return false;
  }

  const min = parseStockNumber(item.minStock);
  const current = parseStockNumber(item.stock);

  return current <= min;
}

/**
 * Checks if a product is in low stock, taking product variations into account.
 *
 * If the product has variations:
 * - Evaluates each active variation.
 * - If at least one active variation is in low stock (meeting all mandatory rules for that variation),
 *   the product is considered in low stock.
 * - If none of the variations are in low stock (or variations don't have minimum stock configured),
 *   the product is not considered in low stock.
 *
 * If the product has no variations:
 * - Evaluates the product's own stock and minimum stock.
 */
export function isProductLowStock(
  product: StockCheckableProduct | null | undefined,
  trackStock: boolean
): boolean {
  if (!trackStock || !product) {
    return false;
  }

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;

  if (hasVariants) {
    const activeVariants = product.variants!.filter(
      (v) => v.active !== false && !v.deletedAt
    );

    if (activeVariants.length > 0) {
      return activeVariants.some((variant) => isItemLowStock(variant, trackStock));
    }
  }

  return isItemLowStock(product, trackStock);
}

/**
 * Filters a list of products returning only those that meet the low stock conditions.
 */
export function getLowStockProducts<T extends StockCheckableProduct>(
  products: T[] | null | undefined,
  trackStock: boolean
): T[] {
  if (!trackStock || !Array.isArray(products) || products.length === 0) {
    return [];
  }

  return products.filter(
    (product) => product.active !== false && isProductLowStock(product, trackStock)
  );
}

/**
 * Checks whether a product has active variations.
 */
export function hasProductVariants(
  product: StockCheckableProduct | null | undefined
): boolean {
  if (!product || !Array.isArray(product.variants) || product.variants.length === 0) {
    return false;
  }
  return product.variants.some((v) => v.active !== false && !v.deletedAt);
}

/**
 * Returns the list of active variations of a product that are currently in low stock.
 */
export function getProductLowStockVariants<T extends StockCheckableItem>(
  product: { variants?: T[] | null } | null | undefined,
  trackStock: boolean
): T[] {
  if (!trackStock || !product || !Array.isArray(product.variants) || product.variants.length === 0) {
    return [];
  }

  return product.variants.filter(
    (v) => v.active !== false && !v.deletedAt && isItemLowStock(v, trackStock)
  );
}

/**
 * Calculates the total stock of a product.
 *
 * Rules:
 * 1. If the product has variations:
 *    - The total stock is the sum of the stock of all active variations (non-deleted).
 *    - The parent product's own stock is NOT added to the variations (avoiding double counting).
 * 2. If the product does NOT have variations:
 *    - The product is a simple product; its own stock is returned.
 * 3. Does not invent stock for unconfigured items (null/undefined defaults to 0).
 */
export function getProductTotalStock(
  product: StockCheckableProduct | null | undefined
): number {
  if (!product) return 0;

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;

  if (hasVariants) {
    const activeVariants = product.variants!.filter(
      (v) => v.active !== false && !v.deletedAt
    );

    // Sum active variations' stock without adding the parent product stock
    return activeVariants.reduce(
      (total, v) => total + parseStockNumber(v.stock),
      0
    );
  }

  return parseStockNumber(product.stock);
}

