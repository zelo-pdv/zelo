import { describe, it, expect } from "vitest";
import { getSaleStatusConfig } from "@/lib/sale-status";
import { SaleStatus } from "@/types";

describe("getSaleStatusConfig (Padronização Visual de Status de Venda)", () => {
  it("deve retornar configuração correta para status PAGO", () => {
    const configEnum = getSaleStatusConfig(SaleStatus.PAGO);
    const configString = getSaleStatusConfig("PAGO");

    expect(configEnum.label).toBe("Pago");
    expect(configEnum.variant).toBe("secondary");
    expect(configEnum.className).toContain("bg-secondary");
    expect(configEnum.className).toContain("text-secondary-foreground");

    expect(configString).toEqual(configEnum);
  });

  it("deve retornar configuração padronizada para status PENDENTE com cores e suporte a dark mode", () => {
    const configEnum = getSaleStatusConfig(SaleStatus.PENDENTE);
    const configString = getSaleStatusConfig("PENDENTE");

    expect(configEnum.label).toBe("Pendente");
    expect(configEnum.variant).toBe("outline");
    expect(configEnum.className).toContain("border-amber-500/40");
    expect(configEnum.className).toContain("bg-amber-500/10");
    expect(configEnum.className).toContain("text-amber-700");
    expect(configEnum.className).toContain("dark:bg-amber-500/15");
    expect(configEnum.className).toContain("dark:text-amber-400");

    expect(configString).toEqual(configEnum);
  });

  it("deve retornar configuração correta para status CANCELADO com suporte a dark mode", () => {
    const configEnum = getSaleStatusConfig(SaleStatus.CANCELADO);
    const configString = getSaleStatusConfig("CANCELADO");

    expect(configEnum.label).toBe("Cancelado");
    expect(configEnum.variant).toBe("outline");
    expect(configEnum.className).toContain("border-destructive/40");
    expect(configEnum.className).toContain("bg-destructive/10");
    expect(configEnum.className).toContain("text-destructive");
    expect(configEnum.className).toContain("dark:bg-destructive/20");

    expect(configString).toEqual(configEnum);
  });

  it("deve retornar fallback seguro para status desconhecido ou vazio", () => {
    const configUnknown = getSaleStatusConfig("OUTRO");
    expect(configUnknown.label).toBe("OUTRO");
    expect(configUnknown.variant).toBe("outline");

    const configEmpty = getSaleStatusConfig("");
    expect(configEmpty.label).toBe("");
    expect(configEmpty.variant).toBe("outline");
  });
});
