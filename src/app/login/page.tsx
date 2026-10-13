import type { Metadata } from "next";
import { requireGuest } from "../../../proxy";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description:
    "Acesse sua conta no Zelo para gerenciar seus pedidos, catálogo de produtos, clientes e cobranças.",
  alternates: {
    canonical: "/login",
  },
};

export default async function LoginPage() {
  // Intercepta a rota: se o usuário JÁ ESTIVER LOGADO, ele é
  // jogado direto pro /dashboard antes de ver a tela de login.
  await requireGuest();

  // Se não estiver logado, renderiza o formulário (Client Component)
  return <LoginForm />;
}
