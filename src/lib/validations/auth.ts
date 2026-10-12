import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Digite um e-mail válido.").max(100, "O e-mail é muito longo.").toLowerCase(),
  password: z.string().min(1, "A senha é obrigatória.").max(100, "A senha é muito longa."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    ownerName: z
      .string()
      .trim()
      .min(2, "Seu nome deve ter pelo menos 2 caracteres.")
      .max(60, "Seu nome é muito longo."),
    storeName: z
      .string()
      .trim()
      .min(2, "O nome da loja deve ter pelo menos 2 caracteres.")
      .max(50, "O nome da loja é muito longo."),
    email: z
      .string()
      .email("Digite um e-mail válido.")
      .max(100, "O e-mail é muito longo.")
      .toLowerCase()
      .trim(),
    phone: z
      .string()
      .optional()
      .transform((val) => (val ? val.trim() : "")),
    password: z
      .string()
      .min(6, "A senha deve ter pelo menos 6 caracteres.")
      .max(100, "A senha é muito longa."),
    confirmPassword: z
      .string()
      .min(1, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
