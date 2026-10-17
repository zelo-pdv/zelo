import { describe, it, expect } from "vitest";
import {
  isItemLowStock,
  isProductLowStock,
  getProductLowStockVariants,
  getProductTotalStock,
} from "@/lib/stock";
import { productVariantSchema } from "@/lib/validations/product";

describe("Estoque Mínimo Individual por Variação", () => {
  describe("1. Cenário Obrigatório da Especificação (Perfume)", () => {
    const perfume = {
      id: "prod-perfume",
      name: "Perfume",
      stock: 0,
      minStock: null,
      variants: [
        { id: "var-30ml", name: "Frasco de 30 ml", stock: 2, minStock: 5, active: true },
        { id: "var-50ml", name: "Frasco de 50 ml", stock: 8, minStock: 3, active: true },
      ],
    };

    it("somente a variação de 30 ml deve ser identificada como estoque baixo", () => {
      const var30ml = perfume.variants[0];
      const var50ml = perfume.variants[1];

      // Variação 30 ml: estoque 2 <= mínimo 5 -> Estoque baixo
      expect(isItemLowStock(var30ml, true)).toBe(true);

      // Variação 50 ml: estoque 8 > mínimo 3 -> Estoque normal
      expect(isItemLowStock(var50ml, true)).toBe(false);
    });

    it("o produto pai deve ser marcado como estoque baixo pois possui pelo menos uma variação baixa", () => {
      expect(isProductLowStock(perfume, true)).toBe(true);
    });

    it("getProductLowStockVariants deve retornar exatamente e somente a variação de 30 ml", () => {
      const lowVariants = getProductLowStockVariants(perfume, true);
      expect(lowVariants).toHaveLength(1);
      expect(lowVariants[0].id).toBe("var-30ml");
      expect(lowVariants[0].name).toBe("Frasco de 30 ml");
    });

    it("o estoque total do produto deve ser a soma das variações (10 unidades)", () => {
      expect(getProductTotalStock(perfume)).toBe(10);
    });
  });

  describe("2. Independência do Estoque Mínimo do Produto Pai", () => {
    it("não deve herdar nem usar o estoque mínimo do produto pai nas variações", () => {
      const product = {
        name: "Camisa Polo",
        stock: 0,
        minStock: 20, // Mínimo residual ou configurado no pai
        variants: [
          // Nenhuma variação tem minStock configurado
          { name: "P", stock: 1, minStock: null, active: true },
          { name: "M", stock: 2, minStock: null, active: true },
        ],
      };

      // Variações sem minStock NÃO são estoque baixo
      expect(isItemLowStock(product.variants[0], true)).toBe(false);
      expect(isItemLowStock(product.variants[1], true)).toBe(false);

      // O produto não deve ser considerado baixo mesmo que o total (3) seja menor que o minStock do pai (20)
      expect(isProductLowStock(product, true)).toBe(false);
      expect(getProductLowStockVariants(product, true)).toEqual([]);
    });

    it("pai com minStock null não afeta variações com minStock próprio", () => {
      const product = {
        name: "Batom",
        stock: 0,
        minStock: null,
        variants: [
          { name: "Vermelho", stock: 1, minStock: 4, active: true }, // baixo
          { name: "Nude", stock: 10, minStock: 2, active: true },    // normal
        ],
      };

      expect(isItemLowStock(product.variants[0], true)).toBe(true);
      expect(isItemLowStock(product.variants[1], true)).toBe(false);
      expect(isProductLowStock(product, true)).toBe(true);
    });
  });

  describe("3. Variações sem Estoque Mínimo Configurado", () => {
    it("não deve considerar estoque baixo se minStock for null ou undefined, mesmo com estoque 0", () => {
      const variantNull = { name: "V1", stock: 0, minStock: null, active: true };
      const variantUndefined = { name: "V2", stock: 0, minStock: undefined, active: true };

      expect(isItemLowStock(variantNull, true)).toBe(false);
      expect(isItemLowStock(variantUndefined, true)).toBe(false);
    });

    it("não deve considerar estoque baixo se todas as variações estiverem sem mínimo", () => {
      const product = {
        name: "Vestido",
        stock: 0,
        variants: [
          { name: "P", stock: 0, minStock: null, active: true },
          { name: "M", stock: 0, minStock: null, active: true },
        ],
      };

      expect(isProductLowStock(product, true)).toBe(false);
      expect(getProductLowStockVariants(product, true)).toHaveLength(0);
    });
  });

  describe("4. Variações com Mínimo Explicitamente Configurado como 0", () => {
    it("deve disparar estoque baixo quando stock <= 0 e minStock for explicitamente 0", () => {
      const varZeroStock = { name: "V1", stock: 0, minStock: 0, active: true };
      expect(isItemLowStock(varZeroStock, true)).toBe(true);

      const varNegStock = { name: "V2", stock: -1, minStock: 0, active: true };
      expect(isItemLowStock(varNegStock, true)).toBe(true);
    });

    it("não deve disparar estoque baixo quando stock > 0 e minStock for 0", () => {
      const varPositive = { name: "V1", stock: 1, minStock: 0, active: true };
      expect(isItemLowStock(varPositive, true)).toBe(false);
    });
  });

  describe("5. Variações Inativas ou Excluídas", () => {
    it("deve ignorar variações inativas mesmo se tiverem estoque abaixo do mínimo", () => {
      const product = {
        name: "Sapato",
        stock: 0,
        variants: [
          { name: "38", stock: 1, minStock: 5, active: false }, // inativo
        ],
      };

      expect(isProductLowStock(product, true)).toBe(false);
      expect(getProductLowStockVariants(product, true)).toHaveLength(0);
    });

    it("deve ignorar variações deletadas logicamente", () => {
      const product = {
        name: "Sapato",
        stock: 0,
        variants: [
          { name: "39", stock: 1, minStock: 5, active: true, deletedAt: new Date() }, // deletado
        ],
      };

      expect(isProductLowStock(product, true)).toBe(false);
      expect(getProductLowStockVariants(product, true)).toHaveLength(0);
    });
  });

  describe("6. Controle de Estoque Desabilitado (trackStock: false)", () => {
    it("nunca deve considerar estoque baixo quando trackStock for falso", () => {
      const perfume = {
        name: "Perfume",
        variants: [
          { name: "30 ml", stock: 2, minStock: 5, active: true },
          { name: "50 ml", stock: 8, minStock: 3, active: true },
        ],
      };

      expect(isItemLowStock(perfume.variants[0], false)).toBe(false);
      expect(isProductLowStock(perfume, false)).toBe(false);
      expect(getProductLowStockVariants(perfume, false)).toHaveLength(0);
    });
  });

  describe("7. Validação Zod de Variação (productVariantSchema)", () => {
    it("deve aceitar minStock numérico válido", () => {
      const result = productVariantSchema.parse({
        name: "30 ml",
        stock: 2,
        minStock: 5,
      });
      expect(result.minStock).toBe(5);
    });

    it("deve aceitar minStock string numérica convertendo para número", () => {
      const result = productVariantSchema.parse({
        name: "30 ml",
        stock: 2,
        minStock: "5",
      });
      expect(result.minStock).toBe(5);
    });

    it("deve converter string vazia ou nulo para null", () => {
      const resNull = productVariantSchema.parse({
        name: "30 ml",
        stock: 2,
        minStock: null,
      });
      expect(resNull.minStock).toBeNull();

      const resEmpty = productVariantSchema.parse({
        name: "30 ml",
        stock: 2,
        minStock: "",
      });
      expect(resEmpty.minStock).toBeNull();
    });

    it("deve rejeitar minStock negativo", () => {
      expect(() =>
        productVariantSchema.parse({
          name: "30 ml",
          stock: 2,
          minStock: -1,
        })
      ).toThrow();
    });
  });
});
