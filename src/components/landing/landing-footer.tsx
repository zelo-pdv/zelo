import Link from "next/link";
import Image from "next/image";
import { BoxIcon } from "@/components/ui/box-icon";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/60 text-muted-foreground text-xs sm:text-sm">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Coluna 1: Marca & Resumo */}
          <div className="md:col-span-2 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <div className="relative flex h-8 w-8 items-center justify-center">
                <Image
                  src="/zelo-black.png"
                  alt="Zelo"
                  width={32}
                  height={32}
                  className="object-contain dark:hidden"
                />
                <Image
                  src="/zelo-white.png"
                  alt="Zelo"
                  width={32}
                  height={32}
                  className="hidden object-contain dark:block"
                />
              </div>
              <span className="font-heading text-lg font-bold tracking-tight text-foreground">
                Zelo
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed">
              Sistema de gestão comercial, catálogo digital e Ponto de Venda (PDV) ágil para autônomos, revendedores e pequenos comércios.
            </p>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BoxIcon name="bx-shield-quarter" className="text-sm text-primary" />
              <span>Conforme à LGPD (Lei nº 13.709/2018) • Dados protegidos</span>
            </div>
          </div>

          {/* Coluna 2: Navegação */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-foreground">
              Navegação
            </div>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a href="#recursos" className="hover:text-foreground transition-colors">
                  Recursos
                </a>
              </li>
              <li>
                <a href="#demonstracao" className="hover:text-foreground transition-colors">
                  Telas do Sistema
                </a>
              </li>
              <li>
                <a href="#planos" className="hover:text-foreground transition-colors">
                  Planos e Preços
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground transition-colors">
                  Perguntas Frequentes
                </a>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Acesso & Legal */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-foreground">
              Acesso & Termos
            </div>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/cadastro" className="hover:text-foreground transition-colors font-medium text-primary">
                  Criar Conta Gratuita
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Entrar na Minha Loja
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="hover:text-foreground transition-colors">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Linha Inferior */}
        <div className="mt-12 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Zelo. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1">
            Feito para impulsionar pequenos negócios e revendedores.
          </p>
        </div>
      </div>
    </footer>
  );
}
