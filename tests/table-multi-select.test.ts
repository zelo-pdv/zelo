import { describe, it, expect } from "vitest";

describe("Tabelas - Seleção Múltipla e Regras de Negócio", () => {
  interface Client {
    id: string;
    name: string;
    active: boolean;
  }

  interface User {
    id: string;
    name: string;
    isFirstUser: boolean;
    active: boolean;
  }

  interface Sale {
    id: string;
    saleNumber: string;
    status: "PAGO" | "PENDENTE" | "CANCELADO";
    total: number;
  }

  it("Clientes: deve proteger 'Consumidor Final' contra seleção e exclusão/desativação em lote", () => {
    const clients: Client[] = [
      { id: "1", name: "Consumidor Final", active: true },
      { id: "2", name: "João Silva", active: true },
      { id: "3", name: "Maria Oliveira", active: false },
    ];

    const isClientSelectable = (c: Client) =>
      c.name.trim().toLowerCase() !== "consumidor final";

    expect(isClientSelectable(clients[0])).toBe(false);
    expect(isClientSelectable(clients[1])).toBe(true);
    expect(isClientSelectable(clients[2])).toBe(true);

    // Filtro de segurança nas ações em massa
    const selectedClients = [clients[0], clients[1], clients[2]];
    const validClientsForBulk = selectedClients.filter(isClientSelectable);

    expect(validClientsForBulk).toHaveLength(2);
    expect(validClientsForBulk.map((c) => c.id)).toEqual(["2", "3"]);
  });

  it("Usuários: deve proteger o proprietário (isFirstUser) e o usuário logado contra ações em lote", () => {
    const currentUserId = "user-admin";
    const users: User[] = [
      { id: "user-owner", name: "Owner da Loja", isFirstUser: true, active: true },
      { id: "user-admin", name: "Admin Atual", isFirstUser: false, active: true },
      { id: "user-operator", name: "Operador de Caixa", isFirstUser: false, active: true },
      { id: "user-seller", name: "Vendedor", isFirstUser: false, active: false },
    ];

    const isUserSelectable = (u: User) => !u.isFirstUser && u.id !== currentUserId;

    expect(isUserSelectable(users[0])).toBe(false);
    expect(isUserSelectable(users[1])).toBe(false);
    expect(isUserSelectable(users[2])).toBe(true);
    expect(isUserSelectable(users[3])).toBe(true);

    const selectedUsers = users;
    const validUsersForBulk = selectedUsers.filter(
      (u) => !u.isFirstUser && u.id !== currentUserId
    );

    expect(validUsersForBulk).toHaveLength(2);
    expect(validUsersForBulk.map((u) => u.id)).toEqual(["user-operator", "user-seller"]);
  });

  it("Histórico: cancelamento em lote deve filtrar apenas vendas ativas/pendentes", () => {
    const sales: Sale[] = [
      { id: "1", saleNumber: "001", status: "PAGO", total: 100 },
      { id: "2", saleNumber: "002", status: "PENDENTE", total: 50 },
      { id: "3", saleNumber: "003", status: "CANCELADO", total: 80 },
    ];

    const selectedSales = [sales[0], sales[1], sales[2]];
    const cancellableSales = selectedSales.filter((s) => s.status !== "CANCELADO");

    expect(cancellableSales).toHaveLength(2);
    expect(cancellableSales.map((s) => s.id)).toEqual(["1", "2"]);
  });

  it("Produtos: permite seleção de múltiplos produtos para exportação e exclusão", () => {
    const products = [
      { id: "p1", name: "Camiseta Algodão", active: true },
      { id: "p2", name: "Calça Jeans", active: true },
      { id: "p3", name: "Tênis Esportivo", active: false },
    ];

    const rowSelection: Record<string, boolean> = { "0": true, "2": true };
    const selectedRows = Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((idx) => products[Number(idx)]);

    expect(selectedRows).toHaveLength(2);
    expect(selectedRows[0].name).toBe("Camiseta Algodão");
    expect(selectedRows[1].name).toBe("Tênis Esportivo");
  });
});
