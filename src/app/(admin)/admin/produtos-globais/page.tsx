import type { Metadata } from "next";
import { GlobalProductsClient } from "./global-products-client";

export const metadata: Metadata = {
  title: "Produtos Globais | Zelo Admin",
  description: "Catálogo mestre centralizado de produtos oficiais das marcas parceiras.",
};

export default function AdminProdutosGlobaisPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          Produtos Globais
        </h2>
        <p className="text-xs text-muted-foreground">
          Biblioteca mestre de produtos padronizados com códigos EAN, referências, preços sugeridos e fotos para importação pelas lojas.
        </p>
      </div>

      <GlobalProductsClient />
    </div>
  );
}
