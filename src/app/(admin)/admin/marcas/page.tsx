import type { Metadata } from "next";
import { BrandsClient } from "./brands-client";

export const metadata: Metadata = {
  title: "Marcas e Fornecedores | Zelo Admin",
  description: "Cadastro central de marcas parceiras e fornecedores da plataforma.",
};

export default function AdminMarcasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          Marcas e Fornecedores
        </h2>
        <p className="text-xs text-muted-foreground">
          Cadastre marcas oficiais (ex: Natura, O Boticário, Avon, Eudora) e gerencie logotipos para os catálogos digitais.
        </p>
      </div>

      <BrandsClient />
    </div>
  );
}
