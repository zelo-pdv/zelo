import type { Metadata } from "next";
import { StoresClient } from "./stores-client";

export const metadata: Metadata = {
  title: "Gestão de Lojas e Contas | Zelo Admin",
  description: "Gerenciamento central de contas, auditoria de lojas e ativação/desativação.",
};

export default function AdminContasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          Lojas e Contas Cadastradas
        </h2>
        <p className="text-xs text-muted-foreground">
          Consulte o catálogo de lojas, métricas de vendas, status de ativação e dados dos proprietários.
        </p>
      </div>

      <StoresClient />
    </div>
  );
}
