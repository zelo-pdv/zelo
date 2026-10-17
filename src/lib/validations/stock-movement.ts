import { z } from "zod";

export const stockMovementTypeSchema = z.enum([
  "ENTRY",
  "OUT",
  "ADJUSTMENT",
  "SALE",
  "SALE_CANCEL",
]);

export const createStockMovementSchema = z.object({
  productId: z.string().min(1, "Selecione um produto"),
  variantId: z.string().optional().nullable(),
  type: z.enum(["ENTRY", "OUT", "ADJUSTMENT"]).default("ENTRY"),
  quantity: z.coerce
    .number()
    .positive("A quantidade deve ser maior que zero")
    .max(9999999, "Valor muito alto"),
  notes: z.string().max(500, "A observação deve ter no máximo 500 caracteres").optional().nullable(),
});

export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
