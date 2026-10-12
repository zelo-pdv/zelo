import { z } from "zod";

// Schema de Endereço Estruturado
export const addressSchema = z.object({
  street: z.string().min(3, "Mínimo 3 caracteres").max(100).or(z.literal("")).nullable().optional(),
  number: z.string().max(20).or(z.literal("")).nullable().optional(),
  complement: z.string().max(50).or(z.literal("")).nullable().optional(),
  neighborhood: z.string().max(50).or(z.literal("")).nullable().optional(),
  city: z.string().min(2, "Cidade é obrigatória").max(50).or(z.literal("")).nullable().optional(),
  state: z.string().min(2, "Estado é obrigatório").max(2).or(z.literal("")).nullable().optional(),
  zipCode: z.string().max(20).or(z.literal("")).nullable().optional(),
});

// Schema Base do Cliente (Sem ID, pois será gerado pelo Prisma)
export const clientFormSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório (mínimo 2 caracteres)").max(100),
  phone: z
    .string()
    .min(10, "Telefone inválido (mínimo 10 dígitos)")
    .max(20, "Telefone muito longo")
    .or(z.literal(""))
    .nullable()
    .optional(),
  email: z
    .string()
    .email("E-mail inválido")
    .max(100)
    .or(z.literal(""))
    .nullable()
    .optional(),
  address: addressSchema.nullable().optional(),
  notes: z.string().max(500).or(z.literal("")).nullable().optional(),
  active: z.boolean().default(true),
});
