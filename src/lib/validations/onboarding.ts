import { z } from "zod";
import { SaleStatus } from "@/types";

export const onboardingSchema = z.object({
  trackStock: z.boolean().default(true),
  blockOutOfStock: z.boolean().default(false),
  requireClient: z.boolean().default(false),
  defaultPaymentMethod: z.string().default("PIX"),
  defaultSaleStatus: z.nativeEnum(SaleStatus).default(SaleStatus.PAGO),
  hideCostPrice: z.boolean().default(false),
  showProductImages: z.boolean().default(true),
  storePhone: z.string().optional().default(""),
  step: z.number().int().min(1).max(4).optional().default(1),
  completed: z.boolean().optional().default(false),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
