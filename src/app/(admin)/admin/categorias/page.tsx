import type { Metadata } from "next";
import { CategoriesClient } from "./categories-client";

export const metadata: Metadata = {
  title: "Categorias Globais | Zelo Admin",
  description: "Taxonomia central de categorias para a biblioteca global de catálogos e produtos.",
};

export default function AdminCategoriasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          Categorias Globais
        </h2>
        <p className="text-xs text-muted-foreground">
          Estrutura taxonômica global que padroniza os produtos importados para as lojas dos parceiros.
        </p>
      </div>

      <CategoriesClient />
    </div>
  );
}
