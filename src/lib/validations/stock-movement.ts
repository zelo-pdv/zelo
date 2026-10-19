import { z } from "zod";

export const stockMovementTypeSchema = z.enum([
  "ENTRY",
  "OUT",
  "ADJUSTMENT",
  "SALE",
  "SALE_CANCEL",
]);

export const stockMovementItemSchema = z.object({
  productId: z.string().min(1, "Selecione um produto"),
  variantId: z.string().optional().nullable(),
  type: z.enum(["ENTRY", "OUT", "ADJUSTMENT"]).default("ENTRY"),
  quantity: z.coerce
    .number()
    .positive("A quantidade deve ser maior que zero")
    .max(9999999, "Valor muito alto"),
  notes: z.string().max(500, "A observação deve ter no máximo 500 caracteres").optional().nullable(),
});

export const createStockMovementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "O título da movimentação é obrigatório")
    .max(100, "O título deve ter no máximo 100 caracteres"),
  productId: z.string().min(1, "Selecione um produto"),
  variantId: z.string().optional().nullable(),
  type: z.enum(["ENTRY", "OUT", "ADJUSTMENT"]).default("ENTRY"),
  quantity: z.coerce
    .number()
    .positive("A quantidade deve ser maior que zero")
    .max(9999999, "Valor muito alto"),
  notes: z.string().max(500, "A observação deve ter no máximo 500 caracteres").optional().nullable(),
});

export const createBatchStockMovementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "O título da movimentação é obrigatório")
    .max(100, "O título deve ter no máximo 100 caracteres"),
  notes: z.string().max(500, "A observação deve ter no máximo 500 caracteres").optional().nullable(),
  items: z.array(stockMovementItemSchema).min(1, "Adicione pelo menos um produto"),
});

export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
export type StockMovementItemInput = z.infer<typeof stockMovementItemSchema>;
export type CreateBatchStockMovementInput = z.infer<typeof createBatchStockMovementSchema>;
