import type { Metadata } from "next";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = {
  title: "Login Administrativo | Zelo Admin",
  description: "Acesso exclusivo aos administradores globais da plataforma Zelo.",
  alternates: {
    canonical: "/admin/login",
  },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
        <AdminLoginForm />
      </div>
    </div>
  );
}
