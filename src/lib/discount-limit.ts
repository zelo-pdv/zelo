export type DiscountLimitMode = "INHERIT" | "CUSTOM" | "UNLIMITED";

export interface EffectiveDiscountLimit {
  unlimited: boolean;
  source: "user" | "group" | "store" | "none";
  maxPercentage: number | null;
  maxValue: number | null;
}

export interface DiscountValidationResult {
  valid: boolean;
  maxAllowedDiscount: number;
  error?: string;
}

export interface UserLimitInput {
  id?: string;
  isAdmin?: boolean;
  isOwner?: boolean;
  discountLimitMode?: string | null;
  maxDiscountPercentage?: number | string | any | null;
  maxDiscountValue?: number | string | any | null;
}

export interface GroupLimitInput {
  discountLimitMode?: string | null;
  maxDiscountPercentage?: number | string | any | null;
  maxDiscountValue?: number | string | any | null;
}

export interface StoreSalesConfigInput {
  discountLimitEnabled?: boolean;
  maxDiscountPercentage?: number | null;
  maxDiscountValue?: number | null;
}

function parseNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/**
 * Resolves the effective discount limit for a user, respecting the hierarchy:
 * 1. Admin/Owner: Unlimited (unless explicitly configured with a custom limit)
 * 2. User level:
 *    - "UNLIMITED": unlimited
 *    - "CUSTOM": uses user's percentage and/or value
 *    - "INHERIT" (or null): falls back to group level
 * 3. Group level:
 *    - "UNLIMITED": unlimited
 *    - "CUSTOM": uses group's percentage and/or value
 *    - "INHERIT" (or null): falls back to store level
 * 4. Store level (Settings.config.sales):
 *    - If discountLimitEnabled is true: uses store percentage and/or value
 *    - If false: unlimited
 */
export function getEffectiveDiscountLimit(
  user?: UserLimitInput | null,
  group?: GroupLimitInput | null,
  storeSalesConfig?: StoreSalesConfigInput | null,
): EffectiveDiscountLimit {
  const isAdminOrOwner = Boolean(user?.isAdmin || user?.isOwner);

  // 1. User level check
  if (user) {
    const userMode = user.discountLimitMode || "INHERIT";
    if (userMode === "UNLIMITED") {
      return { unlimited: true, source: "user", maxPercentage: null, maxValue: null };
    }
    if (userMode === "CUSTOM") {
      const p = parseNum(user.maxDiscountPercentage);
      const v = parseNum(user.maxDiscountValue);
      return {
        unlimited: p === null && v === null,
        source: "user",
        maxPercentage: p,
        maxValue: v,
      };
    }
  }

  // If admin/owner and not CUSTOM on user level, unlimited
  if (isAdminOrOwner) {
    return { unlimited: true, source: "none", maxPercentage: null, maxValue: null };
  }

  // 2. Group level check
  if (group) {
    const groupMode = group.discountLimitMode || "INHERIT";
    if (groupMode === "UNLIMITED") {
      return { unlimited: true, source: "group", maxPercentage: null, maxValue: null };
    }
    if (groupMode === "CUSTOM") {
      const p = parseNum(group.maxDiscountPercentage);
      const v = parseNum(group.maxDiscountValue);
      return {
        unlimited: p === null && v === null,
        source: "group",
        maxPercentage: p,
        maxValue: v,
      };
    }
  }

  // 3. Store level check
  if (storeSalesConfig?.discountLimitEnabled) {
    const p = parseNum(storeSalesConfig.maxDiscountPercentage);
    const v = parseNum(storeSalesConfig.maxDiscountValue);
    if (p !== null || v !== null) {
      return {
        unlimited: false,
        source: "store",
        maxPercentage: p,
        maxValue: v,
      };
    }
  }

  // Default: unlimited
  return { unlimited: true, source: "none", maxPercentage: null, maxValue: null };
}

/**
 * Calculates maximum allowed discount in R$ for a given subtotal.
 */
export function calculateMaxAllowedDiscount(
  subtotal: number,
  limit: EffectiveDiscountLimit,
): number {
  if (subtotal <= 0) return 0;
  if (limit.unlimited) return subtotal;

  const allowedByPercentage =
    limit.maxPercentage !== null && limit.maxPercentage !== undefined
      ? (subtotal * limit.maxPercentage) / 100
      : null;

  const allowedByValue =
    limit.maxValue !== null && limit.maxValue !== undefined
      ? limit.maxValue
      : null;

  let maxAllowed = subtotal;

  if (allowedByPercentage !== null && allowedByValue !== null) {
    maxAllowed = Math.min(allowedByPercentage, allowedByValue);
  } else if (allowedByPercentage !== null) {
    maxAllowed = allowedByPercentage;
  } else if (allowedByValue !== null) {
    maxAllowed = allowedByValue;
  }

  return Math.max(0, Math.min(subtotal, maxAllowed));
}

/**
 * Validates a discount against subtotal and limit.
 */
export function validateDiscountLimit(
  subtotal: number,
  discount: number,
  limit: EffectiveDiscountLimit,
): DiscountValidationResult {
  const maxAllowed = calculateMaxAllowedDiscount(subtotal, limit);

  if (discount <= 0) {
    return { valid: true, maxAllowedDiscount: maxAllowed };
  }

  // Small epsilon for floating point comparisons
  if (discount > maxAllowed + 0.009) {
    let detail = "";
    if (limit.maxPercentage !== null && limit.maxValue !== null) {
      detail = ` (máximo: ${limit.maxPercentage}% ou R$ ${limit.maxValue.toFixed(2).replace(".", ",")})`;
    } else if (limit.maxPercentage !== null) {
      detail = ` (máximo: ${limit.maxPercentage}%)`;
    } else if (limit.maxValue !== null) {
      detail = ` (máximo: R$ ${limit.maxValue.toFixed(2).replace(".", ",")})`;
    }

    return {
      valid: false,
      maxAllowedDiscount: maxAllowed,
      error: `Desconto de R$ ${discount.toFixed(2).replace(".", ",")} excede o limite permitido de R$ ${maxAllowed.toFixed(2).replace(".", ",")}${detail}.`,
    };
  }

  return { valid: true, maxAllowedDiscount: maxAllowed };
}
