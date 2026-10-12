import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, "O nome da categoria deve ter no mínimo 2 caracteres")
    .max(50, "O nome da categoria é muito longo"),
  active: z.boolean().default(true),
  lowStockThreshold: z.coerce.number().min(0, "O valor mínimo é 0").optional().nullable(),
});

export const productVariantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "O nome da variação é obrigatório"),
  code: z.string().max(50).optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  attributes: z.record(z.string(), z.any()).optional().nullable(),
  costPrice: z.coerce.number().min(0).max(9999999).optional().nullable(),
  salePrice: z.coerce.number().min(0).max(9999999).optional().nullable(),
  stock: z.coerce.number().max(9999999).default(0),
  minStock: z.coerce.number().min(0).max(9999999).default(0),
  image: z.string().max(2048).optional().nullable(),
});

export const productSchema = z.object({
  code: z.string().max(50, "O código é muito longo").optional().nullable(),
  barcode: z.string().max(50, "O código de barras é muito longo").optional().nullable(),
  name: z.string().min(2, "O nome do produto deve ter pelo menos 2 caracteres").max(100, "O nome do produto é muito longo"),
  categoryId: z.string().optional().nullable(),
  description: z.string().max(500, "A descrição é muito longa").optional().nullable(),
  image: z.string().max(2048).optional().nullable(),
  costPrice: z.coerce.number().min(0, "O preço de custo não pode ser negativo").max(9999999, "Valor muito alto").optional().nullable(),
  salePrice: z.coerce
    .number()
    .min(0, "O preço de venda é obrigatório")
    .max(9999999, "Valor muito alto"),
  stock: z.coerce.number().max(9999999, "Valor muito alto").default(0),
  minStock: z.coerce.number().min(0, "O estoque mínimo não pode ser negativo").max(9999999, "Valor muito alto").default(0),
  notes: z.string().max(500, "A observação é muito longa").optional().nullable(),
  active: z.boolean().default(true).optional(),
  hasVariants: z.boolean().default(false).optional(),
  variants: z.array(productVariantSchema).optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
