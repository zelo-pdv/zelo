import { create } from "zustand";
import { SaleStatus } from "@/types";
import { settingsService } from "@/services/settings.service";
import { notifyLocalSync } from "@/hooks/use-data-sync";

export type ModuleKey =
  | "dashboard"
  | "produtos"
  | "estoque"
  | "nova-venda"
  | "clientes"
  | "historico";

export type ActionKey = "Visualizar" | "Adicionar" | "Editar" | "Excluir";

export interface ModuleDef {
  key: ModuleKey;
  label: string;
  actions: { key: ActionKey; label: string }[];
}

export const MODULES: ModuleDef[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    actions: [{ key: "Visualizar", label: "Visualizar" }],
  },
  {
    key: "produtos",
    label: "Produtos",
    actions: [
      { key: "Visualizar", label: "Visualizar" },
      { key: "Adicionar", label: "Adicionar" },
      { key: "Editar", label: "Editar" },
      { key: "Excluir", label: "Excluir" },
    ],
  },
  {
    key: "estoque",
    label: "Estoque",
    actions: [
      { key: "Visualizar", label: "Visualizar" },
      { key: "Adicionar", label: "Registrar entrada" },
    ],
  },
  {
    key: "nova-venda",
    label: "Nova Venda",
    actions: [
      { key: "Visualizar", label: "Visualizar" },
      { key: "Adicionar", label: "Registrar venda" },
    ],
  },
  {
    key: "clientes",
    label: "Clientes",
    actions: [
      { key: "Visualizar", label: "Visualizar" },
      { key: "Adicionar", label: "Adicionar" },
      { key: "Editar", label: "Editar" },
      { key: "Excluir", label: "Excluir" },
    ],
  },
  {
    key: "historico",
    label: "Histórico",
    actions: [
      { key: "Visualizar", label: "Visualizar" },
      { key: "Editar", label: "Editar" },
      { key: "Excluir", label: "Excluir" },
    ],
  },
];

export type Permissions = Partial<Record<ModuleKey, ActionKey[]>>;

export interface AccessGroup {
  id: string;
  name: string;
  description: string;
  active: boolean;
  permissions: Permissions;
  createdAt: string;
}

export interface StoreAddress {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

export interface StoreInfo {
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  addressData?: StoreAddress | null;
  document: string;
}

export interface VoucherSettings {
  logo: string; // data URL
  resellerName: string;
  footerText: string;
  showContact: boolean;
}

export interface NotificationSettings {
  enableToasts: boolean;
  outOfStockWarning: boolean;
}

export const defaultNotificationSettings: NotificationSettings = {
  enableToasts: true,
  outOfStockWarning: true,
};

export interface SalesSettings {
  requireClient: boolean;
  blockOutOfStock: boolean;
  defaultPaymentMethod: string;
  defaultSaleStatus: SaleStatus;
  paymentMethods: string[];
  openPriceEnabled?: boolean;
  openPriceMode?: "ALL" | "SPECIFIC";
  openPriceProductIds?: string[];
  discountLimitEnabled?: boolean;
  maxDiscountPercentage?: number | null;
  maxDiscountValue?: number | null;
}

export const defaultSalesSettings: SalesSettings = {
  requireClient: false,
  blockOutOfStock: false,
  defaultPaymentMethod: "DINHEIRO",
  defaultSaleStatus: SaleStatus.PAGO,
  paymentMethods: ["DINHEIRO", "PIX", "CARTAO_DEBITO", "CARTAO_DE_CREDITO"],
  openPriceEnabled: false,
  openPriceMode: "ALL",
  openPriceProductIds: [],
  discountLimitEnabled: false,
  maxDiscountPercentage: null,
  maxDiscountValue: null,
};

export type DashboardPeriod = "today" | "week" | "month";

export interface DashboardSettings {
  defaultPeriod?: DashboardPeriod;
  recentSalesCount?: number;
  hideLowStockCard: boolean;
  hideRecentSales?: boolean;
}

export const defaultDashboardSettings: DashboardSettings = {
  defaultPeriod: "today",
  recentSalesCount: 5,
  hideLowStockCard: false,
  hideRecentSales: false,
};

export interface ProductsSettings {
  trackStock: boolean;
  showProductImages?: boolean;
  categoryLowStockThresholds?: Record<string, number>;
}

export const defaultProductsSettings: ProductsSettings = {
  trackStock: false,
  showProductImages: true,
  categoryLowStockThresholds: {},
};

interface SettingsState {
  store: StoreInfo;
  groups: AccessGroup[];
  voucher: VoucherSettings;
  notifications: NotificationSettings;
  sales: SalesSettings;
  dashboard: DashboardSettings;
  products: ProductsSettings;
  setStore: (s: StoreInfo) => Promise<any>;
  setVoucher: (v: VoucherSettings) => Promise<any>;
  setNotificationSettings: (s: Partial<NotificationSettings>) => Promise<any>;
  setSalesSettings: (s: Partial<SalesSettings>) => Promise<any>;
  setDashboardSettings: (s: Partial<DashboardSettings>) => Promise<any>;
  setProductsSettings: (s: Partial<ProductsSettings>) => Promise<any>;
  addGroup: (g: Omit<AccessGroup, "id" | "createdAt">) => Promise<any>;
  updateGroup: (id: string, g: Partial<AccessGroup>) => Promise<any>;
  removeGroup: (id: string) => Promise<any>;
  toggleGroup: (id: string) => Promise<any>;
  fetchSettings: () => Promise<void>;
}

const uid = () => "g_" + Math.random().toString(36).slice(2, 10);

const defaultStore: StoreInfo = {
  name: "Minha Loja",
  ownerName: "",
  phone: "",
  email: "",
  address: "",
  document: "",
};

const defaultVoucher: VoucherSettings = {
  logo: "",
  resellerName: "",
  footerText: "Obrigado pela preferência!",
  showContact: true,
};

const allPerms = (): Permissions =>
  Object.fromEntries(
    MODULES.map((m) => [m.key, m.actions.map((a) => a.key)]),
  ) as Permissions;

const viewOnly = (): Permissions =>
  Object.fromEntries(
    MODULES.map((m) => [m.key, ["Visualizar" as ActionKey]]),
  ) as Permissions;

export const defaultGroups: AccessGroup[] = [
  {
    id: "g_admin",
    name: "Administrador",
    description: "Acesso total a todos os módulos do sistema.",
    active: true,
    permissions: allPerms(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "g_gerente",
    name: "Gerente",
    description: "Acesso gerencial com controle de vendas, produtos e clientes.",
    active: true,
    permissions: {
      dashboard: ["Visualizar"],
      historico: ["Visualizar", "Editar", "Excluir"],
      "nova-venda": ["Visualizar", "Adicionar"],
      clientes: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      produtos: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      estoque: ["Visualizar", "Adicionar"],
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: "g_operador",
    name: "Operador de Caixa",
    description: "Pode registrar vendas e consultar produtos e clientes.",
    active: true,
    permissions: {
      dashboard: ["Visualizar"],
      produtos: ["Visualizar"],
      estoque: ["Visualizar", "Adicionar"],
      "nova-venda": ["Visualizar", "Adicionar"],
      clientes: ["Visualizar", "Adicionar"],
      historico: ["Visualizar"],
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: "g_consulta",
    name: "Somente consulta",
    description: "Permissão de visualização em todos os módulos.",
    active: false,
    permissions: viewOnly(),
    createdAt: new Date().toISOString(),
  },
];

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  store: defaultStore,
  groups: defaultGroups,
  voucher: defaultVoucher,
  notifications: defaultNotificationSettings,
  sales: defaultSalesSettings,
  dashboard: defaultDashboardSettings,
  products: defaultProductsSettings,
  
  fetchSettings: async () => {
    try {
      const config: any = await settingsService.get();
      if (config) {
        if (config.products) {
          delete config.products.globalLowStockThreshold;
          delete config.products.hideCostPrice;
        }
        set((state) => ({
          ...state,
          store: config.store ? { ...state.store, ...config.store } : state.store,
          groups: config.groups ?? state.groups,
          voucher: config.voucher ? { ...state.voucher, ...config.voucher } : state.voucher,
          notifications: config.notifications ? { ...state.notifications, ...config.notifications } : state.notifications,
          sales: config.sales ? { ...state.sales, ...config.sales } : state.sales,
          dashboard: config.dashboard ? { ...state.dashboard, ...config.dashboard } : state.dashboard,
          products: config.products ? { ...state.products, ...config.products } : state.products,
        }));
      }
    } catch (e) {
      console.error("Failed to fetch settings", e);
    }
  },

  setStore: async (s) => {
    const previous = get().store;
    set({ store: s });
    try {
      const res = await settingsService.update({ store: s });
      notifyLocalSync("settings");
      return res;
    } catch (error) {
      set({ store: previous });
      throw error;
    }
  },

  setVoucher: async (v) => {
    const previous = get().voucher;
    set({ voucher: v });
    try {
      const res = await settingsService.update({ voucher: v });
      notifyLocalSync("settings");
      return res;
    } catch (error) {
      set({ voucher: previous });
      throw error;
    }
  },

  setNotificationSettings: async (s) => {
    const previous = get().notifications;
    set((state) => ({
      notifications: { ...(state.notifications ?? defaultNotificationSettings), ...s },
    }));
    try {
      const res = await settingsService.update({ notifications: s });
      notifyLocalSync("settings");
      return res;
    } catch (error) {
      set({ notifications: previous });
      throw error;
    }
  },

  setSalesSettings: async (s) => {
    const previous = get().sales;
    set((state) => ({
      sales: { ...(state.sales ?? defaultSalesSettings), ...s },
    }));
    try {
      const res = await settingsService.update({ sales: s });
      notifyLocalSync("settings");
      return res;
    } catch (error) {
      set({ sales: previous });
      throw error;
    }
  },

  setDashboardSettings: async (s) => {
    const previous = get().dashboard;
    set((state) => ({
      dashboard: { ...(state.dashboard ?? defaultDashboardSettings), ...s },
    }));
    try {
      const res = await settingsService.update({ dashboard: s });
      notifyLocalSync("settings");
      return res;
    } catch (error) {
      set({ dashboard: previous });
      throw error;
    }
  },

  setProductsSettings: async (s) => {
    const previous = get().products;
    set((state) => {
      const next = { ...(state.products ?? defaultProductsSettings), ...s };
      delete (next as any).globalLowStockThreshold;
      delete (next as any).hideCostPrice;
      return { products: next };
    });
    try {
      const payload = { ...s };
      delete (payload as any).globalLowStockThreshold;
      delete (payload as any).hideCostPrice;
      const res = await settingsService.update({ products: payload });
      notifyLocalSync("settings");
      return res;
    } catch (error) {
      set({ products: previous });
      throw error;
    }
  },

  addGroup: async (g) => {
    const previous = get().groups;
    const newGroup = { ...g, id: uid(), createdAt: new Date().toISOString() };
    const nextGroups = [newGroup, ...previous];
    set({ groups: nextGroups });
    try {
      const res = await settingsService.update({ groups: nextGroups });
      notifyLocalSync("settings");
      return res;
    } catch (error) {
      set({ groups: previous });
      throw error;
    }
  },

  updateGroup: async (id, g) => {
    const previous = get().groups;
    const nextGroups = previous.map((it) => (it.id === id ? { ...it, ...g } : it));
    set({ groups: nextGroups });
    try {
      const res = await settingsService.update({ groups: nextGroups });
      notifyLocalSync("settings");
      return res;
    } catch (error) {
      set({ groups: previous });
      throw error;
    }
  },

  removeGroup: async (id) => {
    const previous = get().groups;
    const nextGroups = previous.filter((it) => it.id !== id);
    set({ groups: nextGroups });
    try {
      const res = await settingsService.update({ groups: nextGroups });
      notifyLocalSync("settings");
      return res;
    } catch (error) {
      set({ groups: previous });
      throw error;
    }
  },

  toggleGroup: async (id) => {
    const previous = get().groups;
    const nextGroups = previous.map((it) => (it.id === id ? { ...it, active: !it.active } : it));
    set({ groups: nextGroups });
    try {
      const res = await settingsService.update({ groups: nextGroups });
      notifyLocalSync("settings");
      return res;
    } catch (error) {
      set({ groups: previous });
      throw error;
    }
  },
}));

