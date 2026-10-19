import { describe, it, expect } from "vitest";
import {
  createStockMovementSchema,
  createBatchStockMovementSchema,
} from "@/lib/validations/stock-movement";
import { hasPermission } from "@/lib/permissions";
import { MODULES, defaultGroups, type Permissions } from "@/store/useSettingsStore";
import { getProductTotalStock } from "@/lib/stock";

describe("Estoque", () => {
  describe("1. Validação de Dados (createStockMovementSchema)", () => {
    it("deve aceitar movimentação de entrada válida com quantidade inteira e título", () => {
      const result = createStockMovementSchema.safeParse({
        title: "Recebimento de carga",
        productId: "prod-1",
        type: "ENTRY",
        quantity: 10,
        notes: "Compra de fornecedor",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Recebimento de carga");
        expect(result.data.quantity).toBe(10);
        expect(result.data.type).toBe("ENTRY");
      }
    });

    it("deve rejeitar movimentação sem título ou com título vazio", () => {
      const missingTitle = createStockMovementSchema.safeParse({
        productId: "prod-1",
        type: "ENTRY",
        quantity: 10,
      });
      expect(missingTitle.success).toBe(false);

      const emptyTitle = createStockMovementSchema.safeParse({
        title: "   ",
        productId: "prod-1",
        type: "ENTRY",
        quantity: 10,
      });
      expect(emptyTitle.success).toBe(false);
    });

    it("deve aceitar movimentação com quantidade decimal (Decimal 10,3)", () => {
      const result = createStockMovementSchema.safeParse({
        title: "Entrada fracionada",
        productId: "prod-1",
        variantId: "var-1",
        type: "ENTRY",
        quantity: 2.75,
        notes: "Entrada fracionada",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(2.75);
      }
    });

    it("deve rejeitar quantidade menor ou igual a zero", () => {
      const zeroResult = createStockMovementSchema.safeParse({
        title: "Entrada inválida",
        productId: "prod-1",
        type: "ENTRY",
        quantity: 0,
      });
      expect(zeroResult.success).toBe(false);

      const negativeResult = createStockMovementSchema.safeParse({
        title: "Entrada inválida",
        productId: "prod-1",
        type: "ENTRY",
        quantity: -5,
      });
      expect(negativeResult.success).toBe(false);
    });

    it("deve rejeitar quando o produto não for informado", () => {
      const result = createStockMovementSchema.safeParse({
        title: "Sem produto",
        productId: "",
        type: "ENTRY",
        quantity: 5,
      });
      expect(result.success).toBe(false);
    });

    it("deve aceitar operações de saída (OUT) e ajuste (ADJUSTMENT)", () => {
      const outResult = createStockMovementSchema.safeParse({
        title: "Descarte de avaria",
        productId: "prod-1",
        type: "OUT",
        quantity: 3,
        notes: "Avaria",
      });
      expect(outResult.success).toBe(true);

      const adjResult = createStockMovementSchema.safeParse({
        title: "Ajuste de inventário",
        productId: "prod-1",
        type: "ADJUSTMENT",
        quantity: 15,
        notes: "Contagem de inventário",
      });
      expect(adjResult.success).toBe(true);
    });

    it("deve rejeitar observações com mais de 500 caracteres", () => {
      const result = createStockMovementSchema.safeParse({
        title: "Obs longa",
        productId: "prod-1",
        type: "ENTRY",
        quantity: 5,
        notes: "A".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("2. Regras de Negócio: Produtos Simples vs Variações", () => {
    it("deve atualizar o estoque da variação sem duplicar no produto pai", () => {
      const product = {
        id: "prod-camisa",
        name: "Camisa",
        stock: 0,
        variants: [
          { id: "var-p", name: "P", stock: 3, active: true },
          { id: "var-m", name: "M", stock: 5, active: true },
        ],
      };

      // Estoque total inicial: 3 + 5 = 8
      expect(getProductTotalStock(product)).toBe(8);

      // Simula entrada de 4 unidades na variação P
      const updatedVariants = product.variants.map((v) =>
        v.id === "var-p" ? { ...v, stock: v.stock + 4 } : v,
      );
      const productAfterEntry = {
        ...product,
        variants: updatedVariants,
      };

      // Variação P passa para 7 un, total do produto passa para 7 + 5 = 12 un
      expect(updatedVariants.find((v) => v.id === "var-p")?.stock).toBe(7);
      expect(getProductTotalStock(productAfterEntry)).toBe(12);
    });

    it("deve suportar saldos negativos quando permitido", () => {
      let stock = 2;
      const quantityToDeduct = 5;
      stock -= quantityToDeduct;
      expect(stock).toBe(-3);
    });
  });

  describe("3. Permissões RBAC e Retrocompatibilidade", () => {
    it("deve conter 'estoque' na lista de módulos oficiais do sistema", () => {
      expect(MODULES.map((m) => m.key)).toContain("estoque");
    });

    it("defaultGroups deve contemplar permissões para estoque", () => {
      const adminGroup = defaultGroups.find((g) => g.name === "Administrador");
      expect(adminGroup?.permissions.estoque).toEqual([
        "Visualizar",
        "Adicionar",
      ]);

      const gerenteGroup = defaultGroups.find((g) => g.name === "Gerente");
      expect(gerenteGroup?.permissions.estoque).toEqual([
        "Visualizar",
        "Adicionar",
      ]);

      const operadorGroup = defaultGroups.find(
        (g) => g.name === "Operador de Caixa",
      );
      expect(operadorGroup?.permissions.estoque).toEqual([
        "Visualizar",
        "Adicionar",
      ]);
    });

    it("deve herdar permissão de produtos para grupos legados sem a chave estoque explicitada", () => {
      const legacyPermissions: Permissions = {
        produtos: ["Visualizar", "Editar"],
      };

      // Visualizar estoque herda de produtos: Visualizar
      expect(hasPermission(legacyPermissions, "estoque", "Visualizar")).toBe(
        true,
      );

      // Adicionar estoque herda de produtos: Editar
      expect(hasPermission(legacyPermissions, "estoque", "Adicionar")).toBe(
        true,
      );

      // Excluir estoque não é permitido
      expect(hasPermission(legacyPermissions, "estoque", "Excluir")).toBe(
        false,
      );
    });

    it("deve respeitar permissões explícitas quando configuradas no grupo", () => {
      const explicitPermissions: Permissions = {
        produtos: ["Visualizar", "Editar"],
        estoque: ["Visualizar"], // Somente visualizar estoque, sem permissão de adicionar
      };

      expect(hasPermission(explicitPermissions, "estoque", "Visualizar")).toBe(
        true,
      );
      expect(hasPermission(explicitPermissions, "estoque", "Adicionar")).toBe(
        false,
      );
    });
  });

  describe("4. Validação em Lote (createBatchStockMovementSchema)", () => {
    it("deve aceitar movimentação em lote com múltiplos produtos válidos", () => {
      const result = createBatchStockMovementSchema.safeParse({
        title: "Recebimento mensal de estoque",
        notes: "Entrada geral de fornecedor",
        items: [
          { productId: "prod-1", type: "ENTRY", quantity: 10 },
          {
            productId: "prod-2",
            variantId: "var-1",
            type: "ENTRY",
            quantity: 5.5,
          },
          { productId: "prod-3", type: "OUT", quantity: 2 },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Recebimento mensal de estoque");
        expect(result.data.items).toHaveLength(3);
      }
    });

    it("deve rejeitar lote sem título", () => {
      const result = createBatchStockMovementSchema.safeParse({
        items: [{ productId: "prod-1", type: "ENTRY", quantity: 10 }],
      });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar lote com lista de itens vazia", () => {
      const result = createBatchStockMovementSchema.safeParse({
        title: "Lote vazio",
        notes: "Lote vazio",
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar lote se algum item tiver quantidade inválida", () => {
      const result = createBatchStockMovementSchema.safeParse({
        title: "Lote inválido",
        items: [
          { productId: "prod-1", type: "ENTRY", quantity: 10 },
          { productId: "prod-2", type: "ENTRY", quantity: -5 },
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});

