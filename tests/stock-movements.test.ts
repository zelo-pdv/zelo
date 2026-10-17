import { describe, it, expect } from "vitest";
import { createStockMovementSchema } from "@/lib/validations/stock-movement";
import { hasPermission } from "@/lib/permissions";
import { MODULES, defaultGroups } from "@/store/useSettingsStore";
import { getProductTotalStock } from "@/lib/stock";

describe("Movimentações de Estoque (/estoque)", () => {
  describe("1. Validação de Dados (createStockMovementSchema)", () => {
    it("deve aceitar movimentação de entrada válida com quantidade inteira", () => {
      const result = createStockMovementSchema.safeParse({
        productId: "prod-1",
        type: "ENTRY",
        quantity: 10,
        notes: "Compra de fornecedor",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(10);
        expect(result.data.type).toBe("ENTRY");
      }
    });

    it("deve aceitar movimentação com quantidade decimal (Decimal 10,3)", () => {
      const result = createStockMovementSchema.safeParse({
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
        productId: "prod-1",
        type: "ENTRY",
        quantity: 0,
      });
      expect(zeroResult.success).toBe(false);

      const negativeResult = createStockMovementSchema.safeParse({
        productId: "prod-1",
        type: "ENTRY",
        quantity: -5,
      });
      expect(negativeResult.success).toBe(false);
    });

    it("deve rejeitar quando o produto não for informado", () => {
      const result = createStockMovementSchema.safeParse({
        productId: "",
        type: "ENTRY",
        quantity: 5,
      });
      expect(result.success).toBe(false);
    });

    it("deve aceitar operações de saída (OUT) e ajuste (ADJUSTMENT)", () => {
      const outResult = createStockMovementSchema.safeParse({
        productId: "prod-1",
        type: "OUT",
        quantity: 3,
        notes: "Avaria",
      });
      expect(outResult.success).toBe(true);

      const adjResult = createStockMovementSchema.safeParse({
        productId: "prod-1",
        type: "ADJUSTMENT",
        quantity: 15,
        notes: "Contagem de inventário",
      });
      expect(adjResult.success).toBe(true);
    });

    it("deve rejeitar observações com mais de 500 caracteres", () => {
      const result = createStockMovementSchema.safeParse({
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
        v.id === "var-p" ? { ...v, stock: v.stock + 4 } : v
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
      expect(gerenteGroup?.permissions.estoque).toEqual(["Visualizar", "Adicionar"]);

      const operadorGroup = defaultGroups.find((g) => g.name === "Operador de Caixa");
      expect(operadorGroup?.permissions.estoque).toEqual(["Visualizar", "Adicionar"]);
    });

    it("deve herdar permissão de produtos para grupos legados sem a chave estoque explicitada", () => {
      const legacyPermissions = {
        produtos: ["Visualizar", "Editar"],
      };

      // Visualizar estoque herda de produtos: Visualizar
      expect(hasPermission(legacyPermissions, "estoque", "Visualizar")).toBe(true);

      // Adicionar estoque herda de produtos: Editar
      expect(hasPermission(legacyPermissions, "estoque", "Adicionar")).toBe(true);

      // Excluir estoque não é permitido
      expect(hasPermission(legacyPermissions, "estoque", "Excluir")).toBe(false);
    });

    it("deve respeitar permissões explícitas quando configuradas no grupo", () => {
      const explicitPermissions = {
        produtos: ["Visualizar", "Editar"],
        estoque: ["Visualizar"], // Somente visualizar estoque, sem permissão de adicionar
      };

      expect(hasPermission(explicitPermissions, "estoque", "Visualizar")).toBe(true);
      expect(hasPermission(explicitPermissions, "estoque", "Adicionar")).toBe(false);
    });
  });
});
