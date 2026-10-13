import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { BoxIcon } from "@/components/ui/box-icon";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Conheça como o Zelo coleta, utiliza, armazena e protege seus dados em total conformidade com a LGPD (Lei nº 13.709/2018).",
  alternates: {
    canonical: "/privacidade",
  },
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
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
                className="object-contain hidden dark:block"
              />
            </div>
            <span className="font-bold text-lg tracking-tight">Zelo</span>
          </Link>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-muted text-foreground transition-colors"
            >
              <BoxIcon name="bx-arrow-back" className="text-base" />
              <span>Voltar</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 container mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-16">
        {/* Título & Badge */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-4">
            <BoxIcon name="bx-shield-quarter" className="text-sm" />
            <span>Transparência e LGPD (Lei nº 13.709/2018)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
            Política de Privacidade do Zelo
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            Esta política explica como o sistema Zelo trata as informações de usuários, lojas parceiras e operações comerciais, garantindo segurança, privacidade e integridade técnica.
          </p>
          <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2 justify-center sm:justify-start">
            <BoxIcon name="bx-calendar" className="text-sm" />
            <span>Última atualização: Outubro de 2026</span>
          </div>
        </div>

        {/* Destaque: Ausência de Rastreadores */}
        <div className="mb-8 p-4 sm:p-5 rounded-xl border border-blue-500/30 bg-blue-500/5 text-sm space-y-2">
          <div className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400">
            <BoxIcon name="bx-check-shield" className="text-lg" />
            <span>Nosso Compromisso com a sua Privacidade</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            O Zelo <strong>não vende, não aluga e não comercializa</strong> seus dados pessoais ou operacionais. Não utilizamos cookies de rastreamento publicitário de terceiros, pixels de redes sociais nem tecnologias invasivas. Todos os mecanismos técnicos de armazenamento servem estritamente para o funcionamento e a segurança do sistema.
          </p>
        </div>

        {/* Seções da Política */}
        <div className="space-y-8 text-foreground/90 leading-relaxed text-sm sm:text-base">
          {/* Seção 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-foreground text-sm font-bold">1</span>
              Apresentação e Papéis na LGPD
            </h2>
            <p className="text-muted-foreground">
              O <strong>Zelo</strong> é uma plataforma de gestão de pedidos, vendas e catálogo de produtos desenvolvida para auxiliar revendedores e microempreendedores.
            </p>
            <p className="text-muted-foreground">
              De acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018):
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
              <li>
                <strong>Controlador dos Dados da Conta:</strong> O Zelo atua como controlador em relação aos dados de cadastro do titular da loja e operadores do sistema (nome, e-mail de acesso, telefone).
              </li>
              <li>
                <strong>Operador Técnico de Dados de Terceiros:</strong> Em relação aos dados de clientes e pedidos cadastrados pela loja dentro do sistema, o titular da loja atua como <em>Controlador</em> e o Zelo opera estritamente como <em>Operador de processamento técnico</em>, disponibilizando a infraestrutura para organização das atividades comerciais.
              </li>
            </ul>
          </section>

          {/* Seção 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-foreground text-sm font-bold">2</span>
              Dados Coletados e Tratados
            </h2>
            <p className="text-muted-foreground">
              O Zelo trata exclusivamente as categorias de informações necessárias para prover a gestão comercial:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg border border-border/60 bg-card/40 space-y-2">
                <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <BoxIcon name="bx-user" className="text-base text-primary" />
                  <span>Dados dos Usuários e Operadores</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nome completo, endereço de e-mail corporativo, senha (armazenada exclusivamente como hash unidirecional via bcrypt com salt), número de telefone/WhatsApp e data/hora do último acesso.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border/60 bg-card/40 space-y-2">
                <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <BoxIcon name="bx-store-alt" className="text-base text-primary" />
                  <span>Dados da Loja e Estabelecimento</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nome fantasia, razão social/documento fiscal opcional (CPF ou CNPJ), telefone de contato e preferências de configuração da loja (controle de estoque, métodos de pagamento aceitos).
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border/60 bg-card/40 space-y-2">
                <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <BoxIcon name="bx-group" className="text-base text-primary" />
                  <span>Dados de Clientes Cadastrados</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nome, telefone, e-mail (opcional), endereço de entrega (opcional) e anotações comerciais internas adicionadas pelo operador para facilitar o atendimento.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border/60 bg-card/40 space-y-2">
                <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <BoxIcon name="bx-receipt" className="text-base text-primary" />
                  <span>Dados Operacionais e Transações</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Catálogo de produtos, preços de custo e venda, quantidades em estoque, histórico de pedidos, formas de pagamento selecionadas e comprovantes de venda gerados.
                </p>
              </div>
            </div>
          </section>

          {/* Seção 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-foreground text-sm font-bold">3</span>
              Cookies e Armazenamento Local
            </h2>
            <p className="text-muted-foreground">
              O Zelo emprega exclusivamente tecnologias técnicas essenciais à navegação segura:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground text-sm">
              <li>
                <strong>Cookie de Autenticação (<code className="text-xs bg-muted px-1 py-0.5 rounded">token</code> / <code className="text-xs bg-muted px-1 py-0.5 rounded">zelo_session</code>):</strong> Cookie estritamente necessário para manter sua sessão autenticada. É emitido com os atributos de proteção <em>HttpOnly</em> (inacessível a scripts maliciosos), <em>Secure</em> (trafegado via HTTPS) e <em>SameSite=Lax</em> (proteção contra ataques CSRF).
              </li>
              <li>
                <strong>Armazenamento Local (<code className="text-xs bg-muted px-1 py-0.5 rounded">localStorage</code>):</strong> Utilizado unicamente para salvar a preferência de tema (Claro / Escuro), o estado temporário do carrinho de vendas no PDV e, caso expressamente selecionado pelo usuário na tela de login, o preenchimento automático do e-mail na opção &quot;Lembrar meu e-mail&quot;.
              </li>
              <li>
                <strong>Service Worker (PWA):</strong> Responsável pelo cache de ativos estáticos da interface (ícones, folhas de estilo e scripts) para permitir carregamento rápido e suporte à instalação do aplicativo em celulares e desktops.
              </li>
            </ul>
          </section>

          {/* Seção 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-foreground text-sm font-bold">4</span>
              Finalidades e Bases Legais do Tratamento
            </h2>
            <p className="text-muted-foreground">
              O tratamento de dados pessoais no Zelo fundamenta-se nas seguintes bases legais estabelecidas pelo Art. 7º da LGPD:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground text-sm">
              <li>
                <strong>Execução de Contrato (Art. 7º, V):</strong> Permitir a autenticação, navegação, cadastro de produtos, registro de pedidos, emissão de comprovantes e operação da loja.
              </li>
              <li>
                <strong>Cumprimento de Obrigação Legal (Art. 7º, II):</strong> Manutenção de registros de acesso a aplicações de internet, em estrita conformidade com o Artigo 15 do Marco Civil da Internet (Lei nº 12.965/2014).
              </li>
              <li>
                <strong>Legítimo Interesse e Segurança (Art. 7º, IX):</strong> Manutenção de trilhas de auditoria interna para rastreabilidade de ações críticas (criação, edição e exclusão de itens e operadores) e prevenção a fraudes ou acessos indevidos.
              </li>
            </ul>
          </section>

          {/* Seção 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-foreground text-sm font-bold">5</span>
              Segurança e Prestadores Técnicos
            </h2>
            <p className="text-muted-foreground">
              Adotamos salvaguardas técnicas e administrativas rigorosas para manter os dados protegidos:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground text-sm">
              <li>
                <strong>Isolamento Multi-tenant:</strong> Todos os registros operacionais são estritamente vinculados ao identificador exclusivo da loja (<code className="text-xs bg-muted px-1 py-0.5 rounded">lojaId</code>), impedindo que dados de uma loja sejam acessados por qualquer outra organização.
              </li>
              <li>
                <strong>Banco de Dados em Nuvem:</strong> Os dados estruturados são armazenados em instâncias gerenciadas de PostgreSQL com tráfego criptografado e controle de chaves de serviço.
              </li>
              <li>
                <strong>Integração de CEP:</strong> A consulta de endereços utiliza a API pública do ViaCEP. Durante a consulta, é enviado apenas o código postal (CEP), sem qualquer correlação com nomes ou identificadores pessoais de clientes.
              </li>
            </ul>
          </section>

          {/* Seção 6 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-foreground text-sm font-bold">6</span>
              Retenção, Zona de Perigo e Exclusão de Dados
            </h2>
            <p className="text-muted-foreground">
              Os dados permanecem armazenados enquanto a conta da loja estiver ativa. O titular da loja conta com controle total sobre seus dados através do módulo de <strong>Configurações &gt; Zona de Perigo</strong>:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
              <li>
                <strong>Exclusão de Registros Operacionais:</strong> Permite ao proprietário da loja limpar vendas, produtos e clientes operacionais preservando as credenciais de acesso, mediante confirmação da senha administrativa.
              </li>
              <li>
                <strong>Exclusão Definitiva da Conta:</strong> Permite o encerramento da loja e a exclusão dos dados de operadores, mediante verificação obrigatória de senha.
              </li>
            </ul>
          </section>

          {/* Seção 7 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-foreground text-sm font-bold">7</span>
              Direitos dos Titulares de Dados
            </h2>
            <p className="text-muted-foreground">
              Em atendimento ao Artigo 18 da LGPD, os usuários têm o direito de solicitar a qualquer momento:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
              <div className="p-2.5 rounded-md border border-border/50 bg-muted/20">
                ✓ Confirmação da existência de tratamento e acesso aos dados
              </div>
              <div className="p-2.5 rounded-md border border-border/50 bg-muted/20">
                ✓ Correção de dados incompletos, inexatos ou desatualizados
              </div>
              <div className="p-2.5 rounded-md border border-border/50 bg-muted/20">
                ✓ Portabilidade dos dados (exportação via relatórios em CSV e PDF)
              </div>
              <div className="p-2.5 rounded-md border border-border/50 bg-muted/20">
                ✓ Eliminação ou anonimização dos dados pessoais tratados
              </div>
            </div>
          </section>

          {/* Seção 8 */}
          <section className="space-y-3 border-t border-border/60 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-foreground text-sm font-bold">8</span>
              Identificação Institucional e Canal de Atendimento
            </h2>
            <p className="text-muted-foreground text-sm">
              O Zelo encontra-se em estágio contínuo de evolução. Informações cadastrais definitivas (Razão Social, CNPJ corporativo e endereço físico) serão oficializadas pela equipe administrativa no momento do lançamento comercial amplo.
            </p>
            <div className="p-4 rounded-xl bg-card border border-border/80 space-y-1.5 text-xs sm:text-sm">
              <div className="font-semibold text-foreground">Canal de Privacidade e Encarregado pelo Tratamento de Dados (DPO):</div>
              <div className="text-muted-foreground">
                Para exercer seus direitos de titular ou tirar dúvidas sobre esta política, utilize o canal de suporte oficial integrado ao sistema Zelo ou entre em contato pelo e-mail institucional indicado na plataforma.
              </div>
            </div>
          </section>
        </div>

        {/* Rodapé da Página */}
        <div className="mt-12 pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Zelo. Todos os direitos reservados.</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:underline">Entrar</Link>
            <Link href="/cadastro" className="hover:underline">Criar Conta</Link>
            <Link href="/privacidade" className="hover:underline font-medium text-foreground">Privacidade</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
