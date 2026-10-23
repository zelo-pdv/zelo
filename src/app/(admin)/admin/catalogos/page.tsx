import type { Metadata } from "next";
import { CatalogsClient } from "./catalogs-client";

export const metadata: Metadata = {
  title: "Catálogos e Revistas Digitais | Zelo Admin",
  description: "Gerenciamento central de revistas, ciclos de vendas e arquivos PDF seguros das marcas parceiras.",
};

export default function AdminCatalogosPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          Catálogos e Revistas Digitais
        </h2>
        <p className="text-xs text-muted-foreground">
          Cadastre campanhas e ciclos das marcas oficiais, envie os arquivos PDF para o storage seguro e gerencie a curadoria de produtos.
        </p>
      </div>

      <CatalogsClient />
    </div>
  );
}
