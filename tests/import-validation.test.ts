import { describe, it, expect } from "vitest";
import {
  normalizeHeaderKey,
  parseImportNumber,
  validateProductHeaders,
  validateClientHeaders,
  validateProductRow,
  validateClientRow,
  VALID_UF_SET,
} from "@/lib/validations/import";

describe("Auditoria e Validação Rigorosa de Importação CSV (Zelo)", () => {
  // ==========================================================================
  // PARTE 1 & 2: Normalização e Parsing Numérico
  // ==========================================================================
  describe("1. Normalização de Cabeçalhos e Parsing Numérico", () => {
    it("deve normalizar cabeçalhos removendo acentos, espaços extras e maiúsculas", () => {
      expect(normalizeHeaderKey("  Preço de Venda  ")).toBe("preco de venda");
      expect(normalizeHeaderKey("CÓDIGO DE BARRAS")).toBe("codigo de barras");
      expect(normalizeHeaderKey("E-mail")).toBe("e-mail");
      expect(normalizeHeaderKey("Observações")).toBe("observacoes");
    });

    it("deve fazer parse correto de valores monetários e decimais no formato brasileiro (vírgula)", () => {
      const res1 = parseImportNumber("49,90");
      expect(res1.valid).toBe(true);
      expect(res1.value).toBe(49.9);

      const res2 = parseImportNumber("1.250,50");
      expect(res2.valid).toBe(true);
      expect(res2.value).toBe(1250.5);

      const resWithCurrency = parseImportNumber("R$ 1.999,99");
      expect(resWithCurrency.valid).toBe(true);
      expect(resWithCurrency.value).toBe(1999.99);
    });

    it("deve fazer parse correto de valores monetários no formato internacional (ponto)", () => {
      const res = parseImportNumber("1250.50");
      expect(res.valid).toBe(true);
      expect(res.value).toBe(1250.5);
    });

    it("deve rejeitar valores não numéricos", () => {
      expect(parseImportNumber("gratis").valid).toBe(false);
      expect(parseImportNumber("").valid).toBe(false);
      expect(parseImportNumber(null).valid).toBe(false);
      expect(parseImportNumber(undefined).valid).toBe(false);
    });
  });

  // ==========================================================================
  // PARTE 3 & 4: Validação de Cabeçalhos e Rejeição Cruzada de Planilhas
  // ==========================================================================
  describe("2. Validação de Cabeçalhos e Incompatibilidade Cruzada", () => {
    const validProductHeaders = [
      "Nome",
      "Categoria",
      "Preço de Venda",
      "Preço de Custo",
      "Estoque",
      "Estoque Mínimo",
      "Código",
      "Código de Barras",
      "Descrição",
    ];

    const validClientHeaders = [
      "Nome",
      "Telefone",
      "E-mail",
      "CEP",
      "Logradouro",
      "Número",
      "Complemento",
      "Bairro",
      "Cidade",
      "UF",
      "Observações",
    ];

    it("deve aprovar cabeçalhos oficiais válidos de produtos", () => {
      const res = validateProductHeaders(validProductHeaders);
      expect(res.valid).toBe(true);
      expect(res.headerMap.name).toBe("Nome");
      expect(res.headerMap.salePrice).toBe("Preço de Venda");
    });

    it("deve aprovar cabeçalhos oficiais válidos de clientes", () => {
      const res = validateClientHeaders(validClientHeaders);
      expect(res.valid).toBe(true);
      expect(res.headerMap.name).toBe("Nome");
      expect(res.headerMap.phone).toBe("Telefone");
      expect(res.headerMap.email).toBe("E-mail");
    });

    // CENÁRIO CRÍTICO DO BUG RELATADO:
    it("deve REJEITAR planilha de PRODUTOS enviada para importação de CLIENTES", () => {
      const res = validateClientHeaders(validProductHeaders);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Arquivo incompatível.*Preço de Venda|preco de venda/i);
    });

    it("deve REJEITAR planilha de CLIENTES enviada para importação de PRODUTOS", () => {
      const res = validateProductHeaders(validClientHeaders);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Arquivo incompatível.*Telefone|telefone/i);
    });

    it("deve rejeitar cabeçalhos vazios ou com colunas em branco", () => {
      expect(validateProductHeaders([]).valid).toBe(false);
      expect(validateProductHeaders(["Nome", "Preço de Venda", ""]).valid).toBe(false);
      expect(validateClientHeaders(["Nome", "Telefone", "   "]).valid).toBe(false);
    });

    it("deve rejeitar planilha com colunas duplicadas no cabeçalho", () => {
      const resProd = validateProductHeaders(["Nome", "Preço de Venda", "nome"]);
      expect(resProd.valid).toBe(false);
      expect(resProd.error).toMatch(/colunas duplicadas/i);

      const resClient = validateClientHeaders(["Nome", "Telefone", "Telefone"]);
      expect(resClient.valid).toBe(false);
      expect(resClient.error).toMatch(/colunas duplicadas/i);
    });

    it("deve rejeitar colunas desconhecidas ou não mapeadas", () => {
      const resProd = validateProductHeaders(["Nome", "Preço de Venda", "ColunaInvalidaXYZ"]);
      expect(resProd.valid).toBe(false);
      expect(resProd.error).toMatch(/Coluna não reconhecida/i);

      const resClient = validateClientHeaders(["Nome", "Telefone", "LimiteCreditoDesconhecido"]);
      expect(resClient.valid).toBe(false);
      expect(resClient.error).toMatch(/Coluna não reconhecida/i);
    });

    it("deve rejeitar planilha de produtos faltando colunas obrigatórias", () => {
      // Faltando Preço de Venda
      const resNoPrice = validateProductHeaders(["Nome", "Categoria", "Estoque"]);
      expect(resNoPrice.valid).toBe(false);
      expect(resNoPrice.error).toMatch(/Preço de Venda/i);

      // Faltando Nome
      const resNoName = validateProductHeaders(["Preço de Venda", "Categoria"]);
      expect(resNoName.valid).toBe(false);
      expect(resNoName.error).toMatch(/Nome/i);
    });

    it("deve rejeitar planilha de clientes faltando Nome ou contendo apenas Nome", () => {
      const resNoName = validateClientHeaders(["Telefone", "E-mail"]);
      expect(resNoName.valid).toBe(false);
      expect(resNoName.error).toMatch(/Nome/i);

      // Planilha arbitrária só com Nome
      const resOnlyName = validateClientHeaders(["Nome"]);
      expect(resOnlyName.valid).toBe(false);
      expect(resOnlyName.error).toMatch(/Arquivo insuficiente/i);
    });
  });

  // ==========================================================================
  // PARTE 5: Validação de Linhas de Produtos
  // ==========================================================================
  describe("3. Validação de Linhas de Produtos", () => {
    const headerMap = {
      name: "Nome",
      category: "Categoria",
      salePrice: "Preço de Venda",
      costPrice: "Preço de Custo",
      stock: "Estoque",
      minStock: "Estoque Mínimo",
      code: "Código",
      barcode: "Código de Barras",
      description: "Descrição",
    };

    it("deve validar com sucesso uma linha correta de produto", () => {
      const state = { batchCodes: new Set<string>(), batchBarcodes: new Set<string>() };
      const row = {
        Nome: "Camiseta Dry Fit",
        Categoria: "Vestuário",
        "Preço de Venda": "59,90",
        "Preço de Custo": "25,00",
        Estoque: "100",
        "Estoque Mínimo": "15",
        Código: "DRY-01",
        "Código de Barras": "7891112223334",
        Descrição: "Camiseta para corrida",
      };

      const res = validateProductRow(row, 2, headerMap, state);
      expect(res.valid).toBe(true);
      expect(res.data?.name).toBe("Camiseta Dry Fit");
      expect(res.data?.salePrice).toBe(59.9);
      expect(res.data?.costPrice).toBe(25);
      expect(res.data?.stock).toBe(100);
      expect(res.data?.minStock).toBe(15);
      expect(res.data?.code).toBe("DRY-01");
      expect(res.data?.barcode).toBe("7891112223334");
    });

    it("deve rejeitar produto sem nome ou com nome vazio", () => {
      const state = { batchCodes: new Set<string>(), batchBarcodes: new Set<string>() };
      const row = { Nome: "  ", "Preço de Venda": "10.00" };
      const res = validateProductRow(row, 2, headerMap, state);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toMatch(/Nome do produto é obrigatório/i);
    });

    it("deve rejeitar preço de venda negativo ou inválido", () => {
      const state = { batchCodes: new Set<string>(), batchBarcodes: new Set<string>() };
      const row = { Nome: "Produto A", "Preço de Venda": "-15,00" };
      const res = validateProductRow(row, 2, headerMap, state);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toMatch(/não pode ser negativo/i);
    });

    it("deve rejeitar código interno ou código de barras duplicado no mesmo arquivo", () => {
      const state = { batchCodes: new Set<string>(), batchBarcodes: new Set<string>() };
      const row1 = {
        Nome: "Produto 1",
        "Preço de Venda": "10,00",
        Código: "SKU-99",
        "Código de Barras": "7890000000001",
      };
      const row2 = {
        Nome: "Produto 2",
        "Preço de Venda": "20,00",
        Código: "SKU-99",
        "Código de Barras": "7890000000002",
      };

      const res1 = validateProductRow(row1, 2, headerMap, state);
      expect(res1.valid).toBe(true);

      const res2 = validateProductRow(row2, 3, headerMap, state);
      expect(res2.valid).toBe(false);
      expect(res2.errors[0]).toMatch(/Código interno 'SKU-99' duplicado/i);
    });
  });

  // ==========================================================================
  // PARTE 6: Validação de Linhas de Clientes
  // ==========================================================================
  describe("4. Validação de Linhas de Clientes", () => {
    const headerMap = {
      name: "Nome",
      phone: "Telefone",
      email: "E-mail",
      zipCode: "CEP",
      street: "Logradouro",
      number: "Número",
      complement: "Complemento",
      neighborhood: "Bairro",
      city: "Cidade",
      state: "UF",
      notes: "Observações",
    };

    it("deve validar com sucesso um cliente completo e válido", () => {
      const state = { batchPhones: new Set<string>(), batchEmails: new Set<string>() };
      const row = {
        Nome: "Lucas Oliveira",
        Telefone: "(11) 98765-4321",
        "E-mail": "lucas@exemplo.com",
        CEP: "01310-100",
        Logradouro: "Av Paulista",
        Número: "500",
        Complemento: "Apto 12",
        Bairro: "Bela Vista",
        Cidade: "São Paulo",
        UF: "SP",
        Observações: "Cliente VIP",
      };

      const res = validateClientRow(row, 2, headerMap, state);
      expect(res.valid).toBe(true);
      expect(res.data?.name).toBe("Lucas Oliveira");
      expect(res.data?.phone).toBe("(11) 98765-4321");
      expect(res.data?.email).toBe("lucas@exemplo.com");
      expect(res.data?.address?.state).toBe("SP");
    });

    it("deve rejeitar e-mail com formato inválido", () => {
      const state = { batchPhones: new Set<string>(), batchEmails: new Set<string>() };
      const row = { Nome: "Cliente Teste", "E-mail": "email_invalido_sem_arroba" };
      const res = validateClientRow(row, 2, headerMap, state);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toMatch(/E-mail com formato inválido/i);
    });

    it("deve rejeitar telefone com menos de 10 dígitos (sem DDD)", () => {
      const state = { batchPhones: new Set<string>(), batchEmails: new Set<string>() };
      const row = { Nome: "Cliente Teste", Telefone: "9999-8888" };
      const res = validateClientRow(row, 2, headerMap, state);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toMatch(/Telefone inválido.*no mínimo 10 dígitos/i);
    });

    it("deve rejeitar telefone ou e-mail duplicado dentro do mesmo arquivo", () => {
      const state = { batchPhones: new Set<string>(), batchEmails: new Set<string>() };
      const row1 = {
        Nome: "Cliente 1",
        Telefone: "(11) 98888-7777",
        "E-mail": "dup@teste.com",
      };
      const row2 = {
        Nome: "Cliente 2",
        Telefone: "11988887777",
        "E-mail": "dup@teste.com",
      };

      const res1 = validateClientRow(row1, 2, headerMap, state);
      expect(res1.valid).toBe(true);

      const res2 = validateClientRow(row2, 3, headerMap, state);
      expect(res2.valid).toBe(false);
      expect(res2.errors.some((e) => e.includes("Telefone") && e.includes("duplicado"))).toBe(true);
      expect(res2.errors.some((e) => e.includes("E-mail") && e.includes("duplicado"))).toBe(true);
    });

    it("deve validar CEP com exatamente 8 dígitos e UF válida do Brasil", () => {
      const state = { batchPhones: new Set<string>(), batchEmails: new Set<string>() };
      const rowInvalidCep = { Nome: "Cliente CEP", CEP: "123" };
      const resCep = validateClientRow(rowInvalidCep, 2, headerMap, state);
      expect(resCep.valid).toBe(false);
      expect(resCep.errors[0]).toMatch(/CEP inválido.*8 dígitos/i);

      const rowInvalidUF = { Nome: "Cliente UF", UF: "XX" };
      const resUF = validateClientRow(rowInvalidUF, 3, headerMap, state);
      expect(resUF.valid).toBe(false);
      expect(resUF.errors[0]).toMatch(/UF inválido/i);
    });

    it("deve reconhecer todas as 27 Unidades Federativas do Brasil", () => {
      expect(VALID_UF_SET.size).toBe(27);
      expect(VALID_UF_SET.has("SP")).toBe(true);
      expect(VALID_UF_SET.has("RJ")).toBe(true);
      expect(VALID_UF_SET.has("MG")).toBe(true);
      expect(VALID_UF_SET.has("BA")).toBe(true);
      expect(VALID_UF_SET.has("DF")).toBe(true);
      expect(VALID_UF_SET.has("ZZ")).toBe(false);
    });
  });

  // ==========================================================================
  // PARTE 7: Integridade All-or-Nothing
  // ==========================================================================
  describe("5. Estratégia All-or-Nothing", () => {
    it("deve reprovar todo o lote se mesmo 1 linha entre 10 for inválida", () => {
      const headerMap = {
        name: "Nome",
        category: "Categoria",
        salePrice: "Preço de Venda",
        costPrice: "Preço de Custo",
        stock: "Estoque",
        minStock: "Estoque Mínimo",
        code: "Código",
        barcode: "Código de Barras",
        description: "Descrição",
      };

      const rows = [];
      for (let i = 1; i <= 9; i++) {
        rows.push({
          Nome: `Produto Válido ${i}`,
          "Preço de Venda": `${10 + i},00`,
          Código: `SKU-${i}`,
        });
      }
      // 10ª linha inválida (preço negativo)
      rows.push({
        Nome: "Produto Inválido 10",
        "Preço de Venda": "-5,00",
        Código: "SKU-10",
      });

      const errors: string[] = [];
      const state = { batchCodes: new Set<string>(), batchBarcodes: new Set<string>() };

      rows.forEach((row, idx) => {
        const val = validateProductRow(row, idx + 2, headerMap, state);
        if (!val.valid) {
          errors.push(...val.errors);
        }
      });

      // Houve erro na linha 11 (índice 9 + 2)
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/Linha 11 \(Produto Inválido 10\): Preço de Venda não pode ser negativo/i);
    });
  });
});
