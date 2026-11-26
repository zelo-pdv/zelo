import { apiRequest } from "@/lib/api-request";
import { User } from "@/prisma/client";

export type UserInput = Omit<Partial<User>, "maxDiscountPercentage" | "maxDiscountValue"> & {
  maxDiscountPercentage?: number | string | null;
  maxDiscountValue?: number | string | null;
};

export const usersService = {
  async list() {
    return apiRequest<any[]>("/users");
  },

  async create(data: UserInput) {
    return apiRequest<any>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UserInput) {
    return apiRequest<any>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return apiRequest<void>(`/users/${id}`, {
      method: "DELETE",
    });
  },

  async bulkDelete(ids: string[]): Promise<{
    deletedIds: string[];
    failed: { id: string; reason: string }[];
  }> {
    return apiRequest("/users/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  async toggleActive(id: string, active: boolean) {
    return this.update(id, { active });
  },
};
