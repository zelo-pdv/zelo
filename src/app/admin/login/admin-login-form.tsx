"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BoxIcon } from "@/components/ui/box-icon";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Falha no login administrativo.");
        setLoading(false);
        return;
      }

      toast.success(`Bem-vindo, ${data.admin?.name || "Administrador"}!`);
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="relative size-12 flex items-center justify-center mb-1">
          <Image
            src="/zelo-black.png"
            alt="Zelo"
            width={48}
            height={48}
            priority
            className="size-11 object-contain dark:hidden"
          />
          <Image
            src="/zelo-white.png"
            alt="Zelo"
            width={48}
            height={48}
            priority
            className="size-11 object-contain hidden dark:block"
          />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-primary" />
          Área Administrativa Global
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Acesso Restrito
        </h1>
        <p className="text-xs text-muted-foreground max-w-xs">
          Informe suas credenciais de administrador da plataforma para acessar o painel de controle.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="admin-email" className="text-xs font-medium">
            E-mail do Administrador
          </Label>
          <div className="relative">
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@zelo.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              autoFocus
              className="text-base md:text-sm pl-9"
              required
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <BoxIcon name="envelope" className="size-4" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-password" className="text-xs font-medium">
            Senha
          </Label>
          <div className="relative">
            <Input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              className="text-base md:text-sm pl-9 pr-9"
              required
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <BoxIcon name="lock-alt" className="size-4" />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              <BoxIcon name={showPassword ? "hide" : "show"} className="size-4" />
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg font-medium text-sm h-10 transition-all"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <BoxIcon name="loader-alt" className="size-4 animate-spin" />
              Autenticando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <BoxIcon name="log-in" className="size-4" />
              Entrar no Painel Global
            </span>
          )}
        </Button>
      </form>

      <div className="pt-2 text-center border-t border-border/40">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <BoxIcon name="arrow-back" className="size-3.5" />
          Voltar para a área do lojista
        </Link>
      </div>
    </div>
  );
}
