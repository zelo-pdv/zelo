import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description:
    "Acesse sua conta no Zelo para gerenciar seus pedidos, catálogo de produtos, clientes e cobranças.",
  alternates: {
    canonical: "/login",
  },
};

export default function LoginPage() {
  // Usuários já autenticados são redirecionados automaticamente pelo middleware.ts
  return <LoginForm />;
}
