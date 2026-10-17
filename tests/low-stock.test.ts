import { describe, it, expect } from "vitest";
import {
  isProductLowStock,
  isItemLowStock,
  hasExplicitMinStock,
  getLowStockProducts,
} from "@/lib/stock";

describe("Regras Obrigatórias de Estoque Baixo", () => {
  describe("1. hasExplicitMinStock", () => {
    it("deve identificar ausência de configuração como falso", () => {
      expect(hasExplicitMinStock(null)).toBe(false);
      expect(hasExplicitMinStock(undefined)).toBe(false);
      expect(hasExplicitMinStock("")).toBe(false);
    });

    it("deve diferenciar explicitamente zero de ausência de configuração", () => {
      expect(hasExplicitMinStock(0)).toBe(true);
      expect(hasExplicitMinStock("0")).toBe(true);
      expect(hasExplicitMinStock(0.0)).toBe(true);
    });

    it("deve considerar valores positivos válidos", () => {
      expect(hasExplicitMinStock(5)).toBe(true);
      expect(hasExplicitMinStock("10")).toBe(true);
      expect(hasExplicitMinStock(0.5)).toBe(true);
    });

    it("não deve considerar valores negativos ou inválidos", () => {
      expect(hasExplicitMinStock(-1)).toBe(false);
      expect(hasExplicitMinStock("-5")).toBe(false);
      expect(hasExplicitMinStock("abc")).toBe(false);
    });
  });

  describe("2. Exemplos obrigatórios da especificação", () => {
    it("Controle habilitado, estoque 3, mínimo 5: estoque baixo", () => {
      const product = { stock: 3, minStock: 5 };
      expect(isItemLowStock(product, true)).toBe(true);
      expect(isProductLowStock(product, true)).toBe(true);
    });

    it("Controle habilitado, estoque 5, mínimo 5: estoque baixo", () => {
      const product = { stock: 5, minStock: 5 };
      expect(isItemLowStock(product, true)).toBe(true);
      expect(isProductLowStock(product, true)).toBe(true);
    });

    it("Controle habilitado, estoque 6, mínimo 5: estoque normal", () => {
      const product = { stock: 6, minStock: 5 };
      expect(isItemLowStock(product, true)).toBe(false);
      expect(isProductLowStock(product, true)).toBe(false);
    });

    it("Controle habilitado, estoque 0, mínimo não configurado (null): não considerar estoque baixo", () => {
      const product = { stock: 0, minStock: null };
      expect(isItemLowStock(product, true)).toBe(false);
      expect(isProductLowStock(product, true)).toBe(false);
    });

    it("Controle habilitado, estoque 0, mínimo não configurado (undefined): não considerar estoque baixo", () => {
      const product = { stock: 0, minStock: undefined };
      expect(isItemLowStock(product, true)).toBe(false);
      expect(isProductLowStock(product, true)).toBe(false);
    });

    it("Controle desabilitado, estoque 0, mínimo 5: não considerar estoque baixo", () => {
      const product = { stock: 0, minStock: 5 };
      expect(isItemLowStock(product, false)).toBe(false);
      expect(isProductLowStock(product, false)).toBe(false);
    });

    it("Controle desabilitado, estoque -3, mínimo 5: não considerar estoque baixo", () => {
      const product = { stock: -3, minStock: 5 };
      expect(isItemLowStock(product, false)).toBe(false);
      expect(isProductLowStock(product, false)).toBe(false);
    });
  });

  describe("3. Diferenciação de mínimo configurado como zero vs ausência de configuração", () => {
    it("Controle habilitado, estoque 0, mínimo configurado como 0: estoque baixo (0 <= 0)", () => {
      const product = { stock: 0, minStock: 0 };
      expect(isItemLowStock(product, true)).toBe(true);
      expect(isProductLowStock(product, true)).toBe(true);
    });

    it("Controle habilitado, estoque 1, mínimo configurado como 0: normal (1 > 0)", () => {
      const product = { stock: 1, minStock: 0 };
      expect(isItemLowStock(product, true)).toBe(false);
      expect(isProductLowStock(product, true)).toBe(false);
    });

    it("Controle habilitado, estoque -1, mínimo configurado como 0: estoque baixo (-1 <= 0)", () => {
      const product = { stock: -1, minStock: 0 };
      expect(isItemLowStock(product, true)).toBe(true);
      expect(isProductLowStock(product, true)).toBe(true);
    });

    it("Controle habilitado, estoque -3, mínimo NÃO configurado: não considerar estoque baixo", () => {
      const product = { stock: -3, minStock: null };
      expect(isItemLowStock(product, true)).toBe(false);
      expect(isProductLowStock(product, true)).toBe(false);
    });
  });

  describe("4. Produtos com variações", () => {
    it("deve considerar produto com estoque baixo se pelo menos uma variação ativa atender às regras", () => {
      const product = {
        name: "Camiseta",
        stock: 12,
        minStock: null,
        variants: [
          { name: "P", stock: 2, minStock: 5, active: true },
          { name: "M", stock: 10, minStock: 5, active: true },
        ],
      };
      expect(isProductLowStock(product, true)).toBe(true);
    });

    it("não deve considerar estoque baixo se todas as variações tiverem estoque normal", () => {
      const product = {
        name: "Camiseta",
        stock: 20,
        minStock: null,
        variants: [
          { name: "P", stock: 10, minStock: 5, active: true },
          { name: "M", stock: 10, minStock: 5, active: true },
        ],
      };
      expect(isProductLowStock(product, true)).toBe(false);
    });

    it("não deve considerar estoque baixo se as variações não tiverem estoque mínimo configurado", () => {
      const product = {
        name: "Camiseta",
        stock: 0,
        minStock: null,
        variants: [
          { name: "P", stock: 0, minStock: null, active: true },
          { name: "M", stock: 0, minStock: null, active: true },
        ],
      };
      expect(isProductLowStock(product, true)).toBe(false);
    });

    it("deve desconsiderar variações inativas ao calcular estoque baixo", () => {
      const product = {
        name: "Camiseta",
        stock: 10,
        minStock: null,
        variants: [
          { name: "P", stock: 1, minStock: 5, active: false },
          { name: "M", stock: 10, minStock: 5, active: true },
        ],
      };
      expect(isProductLowStock(product, true)).toBe(false);
    });

    it("não deve considerar produto com variação se controle de estoque estiver desabilitado", () => {
      const product = {
        name: "Camiseta",
        stock: 1,
        minStock: null,
        variants: [
          { name: "P", stock: 1, minStock: 5, active: true },
        ],
      };
      expect(isProductLowStock(product, false)).toBe(false);
    });
  });

  describe("5. getLowStockProducts", () => {
    const catalog = [
      { id: "1", name: "P1", stock: 2, minStock: 5, active: true },
      { id: "2", name: "P2", stock: 6, minStock: 5, active: true },
      { id: "3", name: "P3", stock: 0, minStock: null, active: true },
      { id: "4", name: "P4", stock: 0, minStock: 0, active: true },
      { id: "5", name: "P5", stock: 1, minStock: 5, active: false }, // inativo
    ];

    it("deve retornar somente produtos ativos que atendem aos critérios de estoque baixo", () => {
      const low = getLowStockProducts(catalog, true);
      expect(low.map((p) => p.id)).toEqual(["1", "4"]);
    });

    it("deve retornar lista vazia se controle de estoque estiver desabilitado", () => {
      const low = getLowStockProducts(catalog, false);
      expect(low).toEqual([]);
    });
  });
});
