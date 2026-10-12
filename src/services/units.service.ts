// A funcionalidade de unidades de medida foi removida do sistema.
export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  decimalPlaces: number;
  lojaId: string;
}

export type UnitFormData = Omit<Unit, "id" | "lojaId">;

export const unitsService = {
  async getUnits(): Promise<Unit[]> {
    return [];
  },
  async createUnit(): Promise<any> {
    throw new Error("Funcionalidade de unidades de medida descontinuada.");
  },
  async updateUnit(): Promise<void> {
    throw new Error("Funcionalidade de unidades de medida descontinuada.");
  },
  async deleteUnit(): Promise<void> {
    throw new Error("Funcionalidade de unidades de medida descontinuada.");
  },
};
