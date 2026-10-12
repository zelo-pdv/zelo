import { apiRequest } from "@/lib/api-request";
import type { OnboardingFormValues } from "@/lib/validations/onboarding";

export interface OnboardingStateResponse {
  loja: {
    id: string;
    name: string;
    ownerName: string;
    phone: string | null;
    email: string | null;
  };
  config: any;
  onboarding: {
    completed: boolean;
    step: number;
    updatedAt?: string;
    completedAt?: string;
  };
}

export const onboardingService = {
  async getState(): Promise<OnboardingStateResponse> {
    return apiRequest("/onboarding");
  },

  async saveStep(data: Partial<OnboardingFormValues>) {
    return apiRequest("/onboarding", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async complete(data: OnboardingFormValues) {
    return apiRequest("/onboarding", {
      method: "POST",
      body: JSON.stringify({ ...data, completed: true }),
    });
  },

  async skip(data?: Partial<OnboardingFormValues>) {
    return apiRequest("/onboarding", {
      method: "POST",
      body: JSON.stringify({
        trackStock: true,
        blockOutOfStock: true,
        requireClient: false,
        defaultPaymentMethod: "PIX",
        defaultSaleStatus: "PAGO",
        hideCostPrice: false,
        showProductImages: true,
        step: 4,
        completed: true,
        ...data,
      }),
    });
  },
};
