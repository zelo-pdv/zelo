import { describe, it, expect } from "vitest";
import { normalizeText, textIncludes, textEquals } from "@/lib/search";

describe("normalizeText (Normalização insensível a acentos)", () => {
  it("deve remover acentos e converter para minúsculas", () => {
    expect(normalizeText("Calçado")).toBe("calcado");
    expect(normalizeText("Vestuário")).toBe("vestuario");
    expect(normalizeText("Óculos")).toBe("oculos");
    expect(normalizeText("Sabonete")).toBe("sabonete");
    expect(normalizeText("AÇÃO")).toBe("acao");
    expect(normalizeText("João")).toBe("joao");
    expect(normalizeText("Cláudia")).toBe("claudia");
    expect(normalizeText("Fábio")).toBe("fabio");
  });

  it("deve tratar valores vazios, nulos ou indefinidos de forma segura", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
    expect(normalizeText("")).toBe("");
    expect(normalizeText("   ")).toBe("");
  });

  it("deve converter números para string", () => {
    expect(normalizeText(12345)).toBe("12345");
    expect(normalizeText(0)).toBe("0");
  });
});

describe("textIncludes (Busca insensível a acentos e maiúsculas/minúsculas)", () => {
  it("deve atender aos exemplos do usuário", () => {
    expect(textIncludes("Calçado", "calcado")).toBe(true);
    expect(textIncludes("Vestuário", "vestuario")).toBe(true);
    expect(textIncludes("Óculos", "oculos")).toBe(true);
    expect(textIncludes("Sabonete", "sabonete")).toBe(true);
  });

  it("deve funcionar quando a busca tiver acento e o alvo não tiver", () => {
    expect(textIncludes("Calcado", "calçado")).toBe(true);
    expect(textIncludes("Vestuario", "vestuário")).toBe(true);
    expect(textIncludes("Oculos", "óculos")).toBe(true);
  });

  it("deve ser insensível a maiúsculas e minúsculas", () => {
    expect(textIncludes("Calçado", "CALCADO")).toBe(true);
    expect(textIncludes("CALÇADO", "calcado")).toBe(true);
    expect(textIncludes("cAlÇaDo", "CaLcAdO")).toBe(true);
    expect(textIncludes("Vestuário", "VESTUARIO")).toBe(true);
    expect(textIncludes("Óculos", "OCULOS")).toBe(true);
  });

  it("deve preservar a busca parcial (substring)", () => {
    expect(textIncludes("Calçado Esportivo Masculino", "calc")).toBe(true);
    expect(textIncludes("Calçado Esportivo Masculino", "esport")).toBe(true);
    expect(textIncludes("Calçado Esportivo Masculino", "masc")).toBe(true);
    expect(textIncludes("Óculos de Sol Aviador", "ocul")).toBe(true);
    expect(textIncludes("Óculos de Sol Aviador", "sol")).toBe(true);
  });

  it("deve retornar false quando não houver correspondência", () => {
    expect(textIncludes("Calçado", "tenis")).toBe(false);
    expect(textIncludes("Vestuário", "calcado")).toBe(false);
    expect(textIncludes("Óculos", "relogio")).toBe(false);
  });

  it("deve retornar true quando o termo de busca for vazio", () => {
    expect(textIncludes("Calçado", "")).toBe(true);
    expect(textIncludes("Calçado", "   ")).toBe(true);
    expect(textIncludes("Calçado", null)).toBe(true);
    expect(textIncludes("Calçado", undefined)).toBe(true);
  });

  it("deve retornar false quando o alvo for vazio mas a busca não", () => {
    expect(textIncludes("", "calcado")).toBe(false);
    expect(textIncludes(null, "calcado")).toBe(false);
    expect(textIncludes(undefined, "calcado")).toBe(false);
  });

  it("deve filtrar catálogo de produtos como no data-table e PDV", () => {
    const products = [
      { id: "1", name: "Tênis Esportivo", category: { name: "Calçados" }, description: "Para corrida" },
      { id: "2", name: "Óculos de Grau", category: { name: "Acessórios" }, description: "Lente anti-reflexo" },
      { id: "3", name: "Camisa Polo", category: { name: "Vestuário" }, description: "Algodão pima" },
      { id: "4", name: "Sabonete Líquido", category: { name: "Higiene" }, description: "Neutro" },
    ];

    const filterProducts = (query: string) =>
      products.filter(
        (p) =>
          textIncludes(p.name, query) ||
          textIncludes(p.category?.name, query) ||
          textIncludes(p.description, query),
      );

    expect(filterProducts("calcados")).toHaveLength(1);
    expect(filterProducts("calcados")[0]?.name).toBe("Tênis Esportivo");

    expect(filterProducts("oculos")).toHaveLength(1);
    expect(filterProducts("oculos")[0]?.name).toBe("Óculos de Grau");

    expect(filterProducts("vestuario")).toHaveLength(1);
    expect(filterProducts("vestuario")[0]?.name).toBe("Camisa Polo");

    expect(filterProducts("sabonete")).toHaveLength(1);
    expect(filterProducts("sabonete")[0]?.name).toBe("Sabonete Líquido");

    expect(filterProducts("liquido")).toHaveLength(1);
    expect(filterProducts("liquido")[0]?.name).toBe("Sabonete Líquido");

    expect(filterProducts("algodao")).toHaveLength(1);
    expect(filterProducts("algodao")[0]?.name).toBe("Camisa Polo");

    expect(filterProducts("inexistente")).toHaveLength(0);
  });

  it("deve filtrar clientes por nome e telefone", () => {
    const clients = [
      { id: "1", name: "João da Silva", phone: "(11) 98765-4321" },
      { id: "2", name: "Cláudia Ferreira", phone: "(21) 91234-5678" },
      { id: "3", name: "Fábio Souza", phone: "(31) 99999-8888" },
    ];

    const filterClients = (query: string) =>
      clients.filter((c) => textIncludes(c.name, query) || textIncludes(c.phone, query));

    expect(filterClients("joao")).toHaveLength(1);
    expect(filterClients("joao")[0]?.name).toBe("João da Silva");

    expect(filterClients("JOAO")).toHaveLength(1);

    expect(filterClients("claudia")).toHaveLength(1);
    expect(filterClients("claudia")[0]?.name).toBe("Cláudia Ferreira");

    expect(filterClients("fabio")).toHaveLength(1);
    expect(filterClients("fabio")[0]?.name).toBe("Fábio Souza");

    expect(filterClients("98765")).toHaveLength(1);
    expect(filterClients("98765")[0]?.name).toBe("João da Silva");
  });
});

describe("textEquals (Comparação exata insensível a acentos)", () => {
  it("deve considerar iguais termos equivalentes sem acento", () => {
    expect(textEquals("Calçado", "calcado")).toBe(true);
    expect(textEquals("789123456", "789123456")).toBe(true);
    expect(textEquals("Calçado", "Calçados")).toBe(false);
  });
});
