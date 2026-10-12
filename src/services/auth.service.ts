import { apiRequest } from "@/lib/api-request";
import type { LoginFormValues, RegisterFormValues } from "@/lib/validations/auth";

export const authService = {
  async login(data: LoginFormValues) {
    return apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async register(data: RegisterFormValues) {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async logout() {
    return apiRequest("/auth/logout", {
      method: "POST",
    });
  },
};
