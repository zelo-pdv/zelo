import { describe, it, expect } from "vitest";
import { getRequiredAsteriskProps } from "@/lib/forms";
import { clientFormSchema } from "@/lib/validations/client";
import { productSchema, productVariantSchema, categorySchema } from "@/lib/validations/product";
import { userFormSchema } from "@/lib/validations/user";
import { accessGroupSchema } from "@/lib/validations/access-group";
import { lojaSchema } from "@/lib/validations/loja";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { saleSchema } from "@/lib/validations/sale";

describe("Padronização Visual de Campos Obrigatórios e Opcionais", () => {
  describe("1. getRequiredAsteriskProps (Propriedades Padronizadas do Asterisco)", () => {
    it("deve retornar o símbolo de asterisco (*)", () => {
      const props = getRequiredAsteriskProps();
      expect(props.symbol).toBe("*");
    });

    it("deve conter classe com cor de destaque do design system e espaçamento", () => {
      const props = getRequiredAsteriskProps();
      expect(props.className).toContain("text-destructive");
      expect(props.className).toContain("font-bold");
      expect(props.className).toContain("ml-0.5");
    });

    it("deve fornecer texto acessível para tooltip nativo", () => {
      const props = getRequiredAsteriskProps();
      expect(props.title).toBe("Campo obrigatório");
    });

    it("deve ocultar o caractere decorativo para leitores de tela para evitar redundância", () => {
      const props = getRequiredAsteriskProps();
      expect(props["aria-hidden"]).toBe("true");
    });
  });

  describe("2. Regras de Obrigatoriedade: Produtos e Variações", () => {
    it("Produto: nome e preço de venda são obrigatórios no schema Zod", () => {
      expect(productSchema.safeParse({ name: "", salePrice: 10 }).success).toBe(false);
      expect(productSchema.safeParse({ name: "Camiseta", salePrice: -1 }).success).toBe(false);
      expect(productSchema.safeParse({ name: "Camiseta", salePrice: 10 }).success).toBe(true);
    });

    it("Produto: custo, sku, código de barras, descrição, estoque e mínimo são opcionais", () => {
      const validWithoutOptionals = productSchema.safeParse({
        name: "Camiseta",
        salePrice: 29.9,
      });
      expect(validWithoutOptionals.success).toBe(true);
    });

    it("Variação: nome é obrigatório, demais campos são opcionais", () => {
      expect(productVariantSchema.safeParse({ name: "" }).success).toBe(false);
      expect(productVariantSchema.safeParse({ name: "Tamanho G" }).success).toBe(true);
      expect(productVariantSchema.safeParse({ name: "Tamanho G", salePrice: null, minStock: null }).success).toBe(true);
    });

    it("Categoria: nome é obrigatório, estoque mínimo de alerta é opcional", () => {
      expect(categorySchema.safeParse({ name: "" }).success).toBe(false);
      expect(categorySchema.safeParse({ name: "Calçados" }).success).toBe(true);
      expect(categorySchema.safeParse({ name: "Calçados", lowStockThreshold: null }).success).toBe(true);
    });
  });

  describe("3. Regras de Obrigatoriedade: Clientes", () => {
    it("Cliente: nome é o único campo obrigatório", () => {
      expect(clientFormSchema.safeParse({ name: "" }).success).toBe(false);
      expect(clientFormSchema.safeParse({ name: "João Silva" }).success).toBe(true);
    });

    it("Cliente: telefone, e-mail, notas e todos os campos de endereço são opcionais", () => {
      const res = clientFormSchema.safeParse({
        name: "Maria Santos",
        phone: null,
        email: null,
        notes: null,
        address: null,
      });
      expect(res.success).toBe(true);
    });
  });

  describe("4. Regras de Obrigatoriedade: Usuários e Equipe", () => {
    it("Usuário: nome, e-mail e grupo de acesso são obrigatórios", () => {
      expect(userFormSchema.safeParse({ name: "", email: "a@b.com", groupId: "g1", active: true }).success).toBe(false);
      expect(userFormSchema.safeParse({ name: "Lucas", email: "invalido", groupId: "g1", active: true }).success).toBe(false);
      expect(userFormSchema.safeParse({ name: "Lucas", email: "a@b.com", groupId: "", active: true }).success).toBe(false);
      expect(userFormSchema.safeParse({ name: "Lucas", email: "a@b.com", groupId: "g1", active: true }).success).toBe(true);
    });

    it("Usuário: telefone é opcional", () => {
      expect(
        userFormSchema.safeParse({
          name: "Lucas",
          email: "lucas@loja.com",
          groupId: "g1",
          active: true,
          phone: null,
        }).success
      ).toBe(true);
    });
  });

  describe("5. Regras de Obrigatoriedade: Grupos de Acesso", () => {
    it("Grupo de Acesso: nome é obrigatório e descrição é opcional", () => {
      expect(accessGroupSchema.safeParse({ name: "" }).success).toBe(false);
      expect(accessGroupSchema.safeParse({ name: "Gerentes", description: null }).success).toBe(true);
    });
  });

  describe("6. Regras de Obrigatoriedade: Loja / Configurações", () => {
    it("Loja: nome e responsável são obrigatórios, demais campos são opcionais", () => {
      expect(lojaSchema.safeParse({ name: "", ownerName: "Carlos" }).success).toBe(false);
      expect(lojaSchema.safeParse({ name: "Loja Teste", ownerName: "" }).success).toBe(false);
      expect(
        lojaSchema.safeParse({
          name: "Loja Teste",
          ownerName: "Carlos",
          phone: null,
          email: null,
          document: null,
          address: null,
        }).success
      ).toBe(true);
    });
  });

  describe("7. Regras de Obrigatoriedade: Cadastro e Login", () => {
    it("Login: e-mail e senha são obrigatórios", () => {
      expect(loginSchema.safeParse({ email: "", password: "123" }).success).toBe(false);
      expect(loginSchema.safeParse({ email: "user@test.com", password: "" }).success).toBe(false);
      expect(loginSchema.safeParse({ email: "user@test.com", password: "password123" }).success).toBe(true);
    });

    it("Cadastro: ownerName, storeName, email, password, confirmPassword são obrigatórios, telefone é opcional", () => {
      expect(
        registerSchema.safeParse({
          ownerName: "Maria",
          storeName: "Loja da Maria",
          email: "maria@loja.com",
          password: "password123",
          confirmPassword: "password123",
          phone: "",
        }).success
      ).toBe(true);

      // Faltando nome da loja
      expect(
        registerSchema.safeParse({
          ownerName: "Maria",
          storeName: "",
          email: "maria@loja.com",
          password: "password123",
          confirmPassword: "password123",
        }).success
      ).toBe(false);
    });
  });

  describe("8. Regras de Obrigatoriedade: Venda (PDV)", () => {
    it("Venda: itens, paymentMethod e status são obrigatórios; dueDate e notes são opcionais", () => {
      expect(
        saleSchema.safeParse({
          items: [
            {
              productId: "p1",
              productName: "Perfume",
              quantity: 1,
              unitPrice: 50,
            },
          ],
          total: 50,
          paymentMethod: "PIX",
          status: "PAGO",
          dueDate: null,
          notes: null,
        }).success
      ).toBe(true);

      expect(
        saleSchema.safeParse({
          items: [],
          total: 0,
          paymentMethod: "PIX",
          status: "PAGO",
        }).success
      ).toBe(false);
    });
  });
});
