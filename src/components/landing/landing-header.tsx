"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { BoxIcon } from "@/components/ui/box-icon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LandingHeaderProps {
  isAuthenticated?: boolean;
}

export function LandingHeader({ isAuthenticated = false }: LandingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md transition-all">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logotipo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          aria-label="Ir para a página inicial do Zelo"
        >
          <div className="relative flex h-9 w-9 items-center justify-center">
            <Image
              src="/zelo-black.png"
              alt="Zelo"
              width={36}
              height={36}
              priority
              className="object-contain dark:hidden"
            />
            <Image
              src="/zelo-white.png"
              alt="Zelo"
              width={36}
              height={36}
              priority
              className="hidden object-contain dark:block"
            />
          </div>
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
            Zelo
          </span>
        </Link>

        {/* Links Desktop */}
        <nav
          className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground"
          aria-label="Navegação principal"
        >
          <a
            href="#recursos"
            className="transition-colors hover:text-foreground"
          >
            Recursos
          </a>
          <a
            href="#demonstracao"
            className="transition-colors hover:text-foreground"
          >
            Conheça o App
          </a>
          <a
            href="#planos"
            className="transition-colors hover:text-foreground"
          >
            Planos
          </a>
          <a
            href="#faq"
            className="transition-colors hover:text-foreground"
          >
            Dúvidas
          </a>
        </nav>

        {/* Ação Desktop: Somente o seletor de tema */}
        <div className="hidden md:flex items-center">
          <ModeToggle />
        </div>

        {/* Ações Mobile: Toggle de tema e Menu Hambúrguer (ambos com mesmo tamanho e estilo) */}
        <div className="flex md:hidden items-center gap-2">
          <ModeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-white dark:bg-card shadow-xs hover:bg-muted text-foreground transition-colors cursor-pointer select-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-expanded={mobileMenuOpen}
            aria-label="Alternar menu de navegação"
          >
            <BoxIcon
              name={mobileMenuOpen ? "bx-x" : "bx-menu"}
              className="text-xl"
            />
          </button>
        </div>
      </div>

      {/* Menu Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-border/60 bg-background/95 backdrop-blur-md px-4 py-5 md:hidden animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3.5 text-base font-medium">
            <a
              href="#recursos"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-foreground/90 hover:bg-muted"
            >
              <span>Recursos</span>
              <BoxIcon name="bx-chevron-right" className="text-muted-foreground" />
            </a>
            <a
              href="#demonstracao"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-foreground/90 hover:bg-muted"
            >
              <span>Conheça o App</span>
              <BoxIcon name="bx-chevron-right" className="text-muted-foreground" />
            </a>
            <a
              href="#planos"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-foreground/90 hover:bg-muted"
            >
              <span>Planos</span>
              <BoxIcon name="bx-chevron-right" className="text-muted-foreground" />
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-foreground/90 hover:bg-muted"
            >
              <span>Dúvidas</span>
              <BoxIcon name="bx-chevron-right" className="text-muted-foreground" />
            </a>

            <div className="pt-3 border-t border-border/50 flex flex-col gap-2.5">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "w-full h-11 rounded-full font-medium justify-center shadow-xs"
                  )}
                >
                  <BoxIcon name="bx-grid-alt" className="text-lg mr-2" />
                  <span>Acessar Meu Painel</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/cadastro"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "w-full h-11 rounded-full font-medium justify-center shadow-xs"
                    )}
                  >
                    <span>Criar conta grátis</span>
                    <BoxIcon name="bx-arrow-back" className="text-base rotate-180 ml-1.5" />
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full h-11 rounded-full font-medium justify-center text-foreground"
                    )}
                  >
                    <BoxIcon name="bx-log-in" className="text-lg mr-1.5" />
                    <span>Fazer login</span>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
