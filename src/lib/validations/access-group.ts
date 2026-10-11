import { z } from "zod";

export const accessGroupSchema = z.object({
  name: z.string().min(1, "O nome do grupo é obrigatório"),
  description: z.string().optional().nullable(),
  active: z.boolean().default(true),
  permissions: z.record(z.string(), z.array(z.string())).default({}),
  discountLimitMode: z.enum(["INHERIT", "CUSTOM", "UNLIMITED"]).optional().default("INHERIT"),
  maxDiscountPercentage: z.coerce.number().min(0, "A porcentagem não pode ser negativa").max(100, "A porcentagem máxima é 100%").optional().nullable(),
  maxDiscountValue: z.coerce.number().min(0, "O valor não pode ser negativo").optional().nullable(),
});

export const updateAccessGroupSchema = accessGroupSchema.partial();
