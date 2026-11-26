import { apiRequest } from "@/lib/api-request";
import { Address, Client } from "@/prisma/client";
import { ClientWithAddress } from "@/types";

export type ClientPayload = Omit<Client, "id" | "createdAt" | "updatedAt"> & {
  address?: Address;
};

export const clientsService = {
  async list(): Promise<ClientWithAddress[]> {
    return apiRequest<ClientWithAddress[]>("/clients");
  },

  async create(data: ClientPayload): Promise<ClientWithAddress> {
    return apiRequest<ClientWithAddress>("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: Partial<ClientPayload>,
  ): Promise<ClientWithAddress> {
    return apiRequest<ClientWithAddress>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async remove(id: string) {
    return apiRequest<void>(`/clients/${id}`, {
      method: "DELETE",
    });
  },

  async bulkRemove(ids: string[]): Promise<{
    deletedIds: string[];
    failed: { id: string; reason: string }[];
  }> {
    return apiRequest("/clients/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },
};
