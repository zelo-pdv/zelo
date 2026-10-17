import type {
  ActionKey,
  ModuleKey,
  Permissions,
} from "@/store/useSettingsStore";

export function hasPermission(
  permissions: Permissions | null | undefined,
  module: ModuleKey,
  action: ActionKey,
  isAdmin?: boolean,
): boolean {
  if (isAdmin) return true;

  if (permissions?.[module] !== undefined) {
    return permissions[module]?.includes(action) ?? false;
  }

  // Fallback para grupos legados: se 'estoque' não estiver definido, herda de 'produtos'
  if (module === "estoque") {
    if (action === "Visualizar") {
      return permissions?.["produtos"]?.includes("Visualizar") ?? false;
    }
    if (action === "Adicionar") {
      return permissions?.["produtos"]?.includes("Editar") ?? false;
    }
  }

  return false;
}
