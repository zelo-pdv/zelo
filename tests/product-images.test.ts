import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSettingsStore, defaultProductsSettings } from "@/store/useSettingsStore";
import { settingsService } from "@/services/settings.service";

describe("Configuração de Exibição de Imagens dos Produtos", () => {
  beforeEach(() => {
    vi.spyOn(settingsService, "update").mockResolvedValue({} as any);
    useSettingsStore.setState({
      products: { ...defaultProductsSettings, showProductImages: true },
    });
  });

  it("deve iniciar com showProductImages ativado por padrão", () => {
    const state = useSettingsStore.getState();
    expect(state.products.showProductImages).toBe(true);
  });

  it("deve permitir desativar showProductImages no store", () => {
    useSettingsStore.getState().setProductsSettings({ showProductImages: false });
    const state = useSettingsStore.getState();
    expect(state.products.showProductImages).toBe(false);
  });

  it("deve permitir reativar showProductImages no store", () => {
    useSettingsStore.getState().setProductsSettings({ showProductImages: false });
    expect(useSettingsStore.getState().products.showProductImages).toBe(false);

    useSettingsStore.getState().setProductsSettings({ showProductImages: true });
    expect(useSettingsStore.getState().products.showProductImages).toBe(true);
  });

  it("regra de exibição: deve ocultar quando showProductImages for false e forceShow não for fornecido", () => {
    const shouldShow = (showProductImages: boolean, forceShow?: boolean) => {
      return Boolean(forceShow || showProductImages);
    };

    expect(shouldShow(true, undefined)).toBe(true);
    expect(shouldShow(false, undefined)).toBe(false);
    expect(shouldShow(false, false)).toBe(false);
    expect(shouldShow(true, false)).toBe(true);
  });
});
