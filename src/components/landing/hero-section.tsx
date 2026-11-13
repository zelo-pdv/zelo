import Link from "next/link";
import { BoxIcon } from "@/components/ui/box-icon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  isAuthenticated?: boolean;
}

export function HeroSection({ isAuthenticated = false }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
      {/* Luz ambiente de fundo (Glow sutil) */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/30 to-primary/5 opacity-40 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="container mx-auto max-w-5xl px-4 text-center sm:px-6">
        {/* Headline Principal */}
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl md:leading-[1.15] max-w-4xl mx-auto">
          O controle das suas vendas e estoque,{" "}
          <span className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
            sem dor de cabeça.
          </span>
        </h1>

        {/* Subheadline Clara e Objetiva */}
        <p className="mt-5 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Abandone de vez o caderno de papel. Tenha Ponto de Venda no celular
          com leitor de código de barras, comprovantes instantâneos no WhatsApp,
          catálogo com variações e controle de clientes em um só lugar.
        </p>

        {/* Botões de Ação */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-md mx-auto">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "default" }),
                "w-full sm:w-auto h-12 px-7 rounded-full text-base font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
              )}
            >
              <BoxIcon name="bx-grid-alt" className="text-lg" />
              <span>Entrar no Meu Painel</span>
              <BoxIcon name="bx-arrow-back" className="text-sm rotate-180 ml-0.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/cadastro"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "w-full sm:w-auto h-12 px-7 rounded-full text-base font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group"
                )}
              >
                <span>Criar Conta Gratuita</span>
                <BoxIcon
                  name="bx-arrow-back"
                  className="text-sm rotate-180 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full sm:w-auto h-12 px-6 rounded-full text-base font-medium border-border/80 bg-background/60 hover:bg-muted text-foreground flex items-center justify-center gap-2"
                )}
              >
                <BoxIcon name="bx-log-in" className="text-lg" />
                <span>Já tenho conta</span>
              </Link>
            </>
          )}
        </div>

        {/* Indicadores de Credibilidade / Trust Badges */}
        <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <BoxIcon name="bxs-check-circle" className="text-emerald-500 text-base" />
            <span>100% gratuito para começar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BoxIcon name="bxs-check-circle" className="text-emerald-500 text-base" />
            <span>Sem necessidade de cartão</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BoxIcon name="bxs-check-circle" className="text-emerald-500 text-base" />
            <span>Funciona no celular e computador</span>
          </div>
        </div>
      </div>
    </section>
  );
}
