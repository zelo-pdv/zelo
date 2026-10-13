import type { Metadata } from "next";
import { requireGuest } from "../../../proxy";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Criar Conta",
  description:
    "Crie sua conta no Zelo e configure sua loja em poucos passos. Organize suas vendas, catálogo e estoque.",
  alternates: {
    canonical: "/cadastro",
  },
};

export default async function CadastroPage() {
  // Se o usuário já estiver logado, redireciona adequadamente
  await requireGuest();

  return <RegisterForm />;
}
