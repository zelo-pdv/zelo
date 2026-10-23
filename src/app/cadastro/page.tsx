import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Criar Conta",
  description:
    "Crie sua conta no Zelo e configure sua loja em poucos passos. Organize suas vendas, catálogo e estoque.",
  alternates: {
    canonical: "/cadastro",
  },
};

export default function CadastroPage() {
  // Usuários já autenticados são redirecionados automaticamente pelo middleware.ts
  return <RegisterForm />;
}
