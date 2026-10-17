import { describe, it, expect } from "vitest";
import {
  getProductTotalStock,
  hasProductVariants,
  isProductLowStock,
} from "@/lib/stock";

describe("Cálculo do Estoque Total de Produtos com Variações", () => {
  it("Exemplo obrigatório: Camiseta com P (3), M (5) e G (2) deve apresentar total de 10 unidades", () => {
    const product = {
      name: "Camiseta",
      stock: 0,
      variants: [
        { name: "P", stock: 3, active: true },
        { name: "M", stock: 5, active: true },
        { name: "G", stock: 2, active: true },
      ],
    };

    expect(getProductTotalStock(product)).toBe(10);
  });

  it("não deve somar o estoque do produto principal ao estoque das variações para evitar dupla contagem", () => {
    const product = {
      name: "Camiseta",
      stock: 10, // Estoque antigo ou residual no produto pai
      variants: [
        { name: "P", stock: 3, active: true },
        { name: "M", stock: 5, active: true },
        { name: "G", stock: 2, active: true },
      ],
    };

    // O total deve ser estritamente a soma das variações (10), e NÃO 10 + 10 = 20
    expect(getProductTotalStock(product)).toBe(10);
  });

  it("deve preservar o funcionamento de produtos simples sem variações", () => {
    const simpleProduct1 = {
      name: "Caneca",
      stock: 15,
      variants: [],
    };
    expect(getProductTotalStock(simpleProduct1)).toBe(15);

    const simpleProduct2 = {
      name: "Caderno",
      stock: 7,
      variants: null,
    };
    expect(getProductTotalStock(simpleProduct2)).toBe(7);

    const simpleProduct3 = {
      name: "Lápis",
      stock: 0,
    };
    expect(getProductTotalStock(simpleProduct3)).toBe(0);
  });

  it("deve desconsiderar variações inativas ou excluídas logicamente", () => {
    const product = {
      name: "Bermuda",
      stock: 0,
      variants: [
        { name: "38", stock: 4, active: true },
        { name: "40", stock: 6, active: false }, // Inativo
        { name: "42", stock: 5, active: true, deletedAt: new Date() }, // Excluído
      ],
    };

    expect(getProductTotalStock(product)).toBe(4);
  });

  it("não deve inventar estoque para variações com estoque null ou undefined", () => {
    const product = {
      name: "Vestido",
      stock: 0,
      variants: [
        { name: "P", stock: null, active: true },
        { name: "M", stock: undefined, active: true },
        { name: "G", stock: 4, active: true },
      ],
    };

    expect(getProductTotalStock(product)).toBe(4);
  });

  it("deve calcular corretamente variações com estoque negativo (vendas a descoberto)", () => {
    const product = {
      name: "Tênis",
      stock: 0,
      variants: [
        { name: "39", stock: -2, active: true },
        { name: "40", stock: 5, active: true },
      ],
    };

    expect(getProductTotalStock(product)).toBe(3);
  });

  it("deve suportar objetos Decimal do Prisma (com método toNumber)", () => {
    const product = {
      name: "Tecido",
      stock: { toNumber: () => 0 },
      variants: [
        { name: "Azul", stock: { toNumber: () => 2.5 }, active: true },
        { name: "Vermelho", stock: { toNumber: () => 7.5 }, active: true },
      ],
    };

    expect(getProductTotalStock(product)).toBe(10);
  });

  it("deve retornar 0 se o produto for nulo ou indefinido", () => {
    expect(getProductTotalStock(null)).toBe(0);
    expect(getProductTotalStock(undefined)).toBe(0);
  });

  it("hasProductVariants deve identificar corretamente produtos com variações ativas", () => {
    expect(
      hasProductVariants({
        variants: [{ name: "P", stock: 1, active: true }],
      })
    ).toBe(true);

    expect(
      hasProductVariants({
        variants: [{ name: "P", stock: 1, active: false }],
      })
    ).toBe(false);

    expect(
      hasProductVariants({
        variants: [],
      })
    ).toBe(false);

    expect(
      hasProductVariants({
        variants: null,
      })
    ).toBe(false);
  });

  it("integração: estoque baixo deve continuar avaliando cada variação individualmente", () => {
    const product = {
      name: "Camiseta",
      stock: 10,
      minStock: null,
      variants: [
        { name: "P", stock: 2, minStock: 5, active: true }, // Estoque baixo!
        { name: "M", stock: 5, minStock: null, active: true },
        { name: "G", stock: 10, minStock: 5, active: true },
      ],
    };

    // Total de estoque é 17
    expect(getProductTotalStock(product)).toBe(17);
    // Mas o produto está em alerta de estoque baixo porque a variação P está abaixo do mínimo
    expect(isProductLowStock(product, true)).toBe(true);
  });
});
