"use client";

import { useState } from "react";
import { BoxIcon } from "@/components/ui/box-icon";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { registerSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth.service";
import { maskPhone } from "@/lib/masks";
import { ModeToggle } from "@/components/layout/mode-toggle";

export function RegisterForm() {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação com Zod no cliente
    const validation = registerSchema.safeParse({
      ownerName,
      storeName,
      email,
      phone,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message || "Verifique os dados informados.");
      return;
    }

    setLoading(true);
    try {
      const res = (await authService.register(validation.data)) as any;

      toast.success("Conta criada com sucesso! Vamos personalizar sua loja.");
      const destination = res?.redirectTo || "/onboarding";
      router.push(destination);
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background font-sans overflow-x-hidden">
      {/* Lado Esquerdo - Branding & Imagem (somente Desktop) */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-10 xl:p-12 relative overflow-hidden bg-linear-to-br from-[#1e40af] via-[#1d4ed8] to-[#1e3a8a] dark:from-[#0b192e] dark:via-[#0f2240] dark:to-[#071120] text-white border-r border-blue-900/30 dark:border-blue-950/60">
        {/* Detalhes sutis de iluminação */}
        <div className="absolute inset-0 z-0 opacity-25 dark:opacity-15 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.4),transparent_50%)]" />
        <div className="absolute bottom-0 right-0 z-0 opacity-20 dark:opacity-10 pointer-events-none bg-[radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.4),transparent_60%)] w-150 h-150" />

        {/* Topo - Nome Zelo */}
        <div className="relative z-10 flex items-center">
          <span className="text-2xl font-bold tracking-tight text-white">Zelo</span>
        </div>

        {/* Meio - Logo do Zelo em destaque */}
        <div className="relative z-10 my-auto flex items-center justify-center py-6 w-full">
          <div className="relative flex items-center justify-center">
            <Image
              src="/zelo-white.png"
              alt="Zelo - Gestão e PDV para Revendedores"
              width={260}
              height={260}
              priority
              className="w-56 h-56 xl:w-64 xl:h-64 object-contain"
            />
          </div>
        </div>

        {/* Rodapé do lado esquerdo */}
        <div className="relative z-10 max-w-lg mt-auto">
          <h2 className="text-3xl xl:text-4xl font-bold mb-4 leading-tight text-white tracking-tight">
            O caderno de pedidos da revendedora, inteligente e prático
          </h2>
          <p className="text-blue-100/80 text-base xl:text-lg">
            Comece hoje mesmo a organizar suas vendas, encomendas e cobranças sem complicação.
          </p>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="flex flex-1 flex-col justify-center items-center px-6 py-12 lg:px-12 relative overflow-hidden bg-background">
        <div className="absolute top-4 right-4 z-20">
          <ModeToggle />
        </div>

        <div className="relative z-10 w-full max-w-105 my-auto">
          {/* Mobile Logo */}
          <div className="flex lg:hidden flex-col items-center mb-6 gap-3">
            <Image
              src="/zelo-black.png"
              alt="Zelo - Gestão e PDV para Revendedores"
              width={88}
              height={88}
              className="object-contain dark:hidden"
            />
            <Image
              src="/zelo-white.png"
              alt="Zelo - Gestão e PDV para Revendedores"
              width={88}
              height={88}
              className="object-contain hidden dark:block"
            />
          </div>

          <div className="mb-6 text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1.5">
              Crie sua conta no Zelo
            </h1>
            <p className="text-sm text-muted-foreground">
              Cadastre sua loja em segundos para começar a gerenciar suas vendas.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="ownerName" className="font-semibold text-foreground/90 text-sm">
                  Seu Nome
                </Label>
                <Input
                  id="ownerName"
                  type="text"
                  autoComplete="name"
                  placeholder="Ex: Maria da Silva"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  disabled={loading}
                  className="h-11 px-3.5 rounded-xl border-border/70 bg-card focus-visible:ring-primary/30 focus-visible:border-primary shadow-xs text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="storeName" className="font-semibold text-foreground/90 text-sm">
                  Nome da sua Loja
                </Label>
                <Input
                  id="storeName"
                  type="text"
                  placeholder="Ex: Boutique Bella"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  disabled={loading}
                  className="h-11 px-3.5 rounded-xl border-border/70 bg-card focus-visible:ring-primary/30 focus-visible:border-primary shadow-xs text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-semibold text-foreground/90 text-sm">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-11 px-3.5 rounded-xl border-border/70 bg-card focus-visible:ring-primary/30 focus-visible:border-primary shadow-xs text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="font-semibold text-foreground/90 text-sm">
                WhatsApp / Telefone <span className="text-xs font-normal text-muted-foreground">(Opcional)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                maxLength={15}
                disabled={loading}
                className="h-11 px-3.5 rounded-xl border-border/70 bg-card focus-visible:ring-primary/30 focus-visible:border-primary shadow-xs text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="font-semibold text-foreground/90 text-sm">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Mínimo 6 dígitos"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-11 px-3.5 pr-10 rounded-xl border-border/70 bg-card focus-visible:ring-primary/30 focus-visible:border-primary shadow-xs text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    tabIndex={-1}
                  >
                    <BoxIcon name={showPassword ? "hide" : "show"} className="text-lg" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="font-semibold text-foreground/90 text-sm">
                  Confirmar Senha
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repita sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="h-11 px-3.5 pr-10 rounded-xl border-border/70 bg-card focus-visible:ring-primary/30 focus-visible:border-primary shadow-xs text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
                    tabIndex={-1}
                  >
                    <BoxIcon name={showConfirmPassword ? "hide" : "show"} className="text-lg" />
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold rounded-xl shadow-lg shadow-black/10 dark:shadow-white/5 transition-all active:scale-[0.98] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 mt-2 cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <>
                  <BoxIcon name="loader-alt" className="mr-2 text-xl bx-spin" />
                  Criando conta e preparando loja...
                </>
              ) : (
                <>
                  Criar minha conta
                  <BoxIcon name="right-arrow-alt" className="ml-2 text-xl" />
                </>
              )}
            </Button>

            <div className="pt-3 text-center">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-primary hover:underline transition-colors"
                >
                  Entrar
                </Link>
              </p>
            </div>

            <div className="pt-4 text-center text-xs text-muted-foreground border-t border-border/40">
              <span>Ao criar uma conta, você declara estar de acordo com a nossa </span>
              <Link
                href="/privacidade"
                className="underline hover:text-foreground transition-colors font-medium"
              >
                Política de Privacidade
              </Link>
              .
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
