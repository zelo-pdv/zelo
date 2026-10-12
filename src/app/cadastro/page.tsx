import { requireGuest } from "../../../proxy";
import { RegisterForm } from "./register-form";

export const metadata = {
  title: "Criar Conta",
  description: "Crie sua conta no Zelo e configure sua loja em poucos passos.",
};

export default async function CadastroPage() {
  // Se o usuário já estiver logado, redireciona adequadamente
  await requireGuest();

  return <RegisterForm />;
}
