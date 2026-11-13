import Link from "next/link";
import { BoxIcon } from "@/components/ui/box-icon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CtaSectionProps {
  isAuthenticated?: boolean;
}

export function CtaSection({ isAuthenticated = false }: CtaSectionProps) {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/15 via-primary/5 to-card p-8 sm:p-12 md:p-16 text-center shadow-lg overflow-hidden">
          {/* Efeito Glow interno */}
          <div
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-96 rounded-full bg-primary/20 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary">
              <BoxIcon name="bx-rocket" className="text-sm" />
              <span>Comece hoje mesmo</span>
            </div>

            <h2 className="font-heading text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Pronto para transformar a gestão das suas vendas?
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Junte-se a revendedores e lojistas que economizam tempo e profissionalizam o atendimento aos clientes com o Zelo.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "w-full sm:w-auto h-12 px-8 rounded-full text-base font-semibold shadow-md shadow-primary/25 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  )}
                >
                  <BoxIcon name="bx-grid-alt" className="text-lg" />
                  <span>Acessar Meu Painel</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/cadastro"
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "w-full sm:w-auto h-12 px-8 rounded-full text-base font-semibold shadow-md shadow-primary/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                    )}
                  >
                    <span>Criar Minha Conta Grátis</span>
                    <BoxIcon
                      name="bx-arrow-back"
                      className="text-sm rotate-180 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                  <Link
                    href="/login"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full sm:w-auto h-12 px-6 rounded-full text-base font-medium border-border/80 bg-background/80 hover:bg-muted text-foreground flex items-center justify-center gap-2"
                    )}
                  >
                    <BoxIcon name="bx-log-in" className="text-lg" />
                    <span>Fazer Login</span>
                  </Link>
                </>
              )}
            </div>

            <div className="pt-4 text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-4">
              <span>✓ Sem taxa por venda</span>
              <span>•</span>
              <span>✓ Sem cadastro de cartão</span>
              <span>•</span>
              <span>✓ Ativação imediata</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
