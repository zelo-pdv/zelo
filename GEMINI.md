# Zelo - Guia de Arquitetura e Engenharia de Software

Este documento centraliza as principais diretrizes técnicas, arquitetura, regras de negócio, tecnologias, rotas e convenções do ecossistema **Zelo**.

---

## 1. Gerenciador de Pacotes e Scripts

> [!IMPORTANT]
> **GERENCIADOR OFICIAL: `pnpm`**
>
> - **SEMPRE** utilize `pnpm` para instalar dependências e executar scripts (ex.: `pnpm add <pacote>`, `pnpm add -D <pacote>`, `pnpm dev`, `pnpm build`).
> - **NUNCA** utilize `npm install` ou `npm run`.
> - O uso de `npx` é permitido apenas quando estritamente necessário (como em geradores rápidos de CLI, ex.: `npx prisma generate`), mas sempre dê preferência a `pnpm dlx` ou scripts via `pnpm` quando disponível.

### Comandos Comuns:
```bash
pnpm dev              # Inicia o servidor de desenvolvimento
pnpm build            # Executa o prisma generate e o build de produção do Next.js
pnpm lint             # Executa a verificação do ESLint
pnpm test:e2e         # Executa testes ponta a ponta
```

---

## 2. Stack Tecnológica

- **Framework Web:** [Next.js 15 (App Router)](https://nextjs.org/) com React 19.
- **Linguagem:** TypeScript (tipagem estrita com `strict: true`).
- **ORM & Banco de Dados:** [Prisma ORM](https://www.prisma.io/) com PostgreSQL (Supabase / `@prisma/adapter-pg`).
- **Estilização & Design System:**
  - Tailwind CSS v4 com `tw-animate-css` e `@tailwindcss/postcss`.
  - [Shadcn UI](https://ui.shadcn.com/) / Base UI (`@base-ui/react`).
  - Ícones: **Boxicons** (`boxicons`) prioritariamente, com suporte a Lucide React.
  - Feedback visual: `sonner` (Toasts elegantes e acessíveis).
  - Temas: `next-themes` (suporte a Dark Mode e personalização de cores primárias).
- **Gerenciamento de Estado:**
  - [Zustand](https://github.com/pmndrs/zustand) com persistência em `localStorage` para estados globais do cliente (ex.: carrinho de vendas, configurações ativas, controle de layout, comprovantes).
- **Validação de Dados:** [Zod v4](https://zod.dev/) para validação em runtime tanto nas rotas da API quanto nos formulários do cliente.
- **Autenticação & Segurança:**
  - Autenticação stateless via cookies HTTP-only (`zelo_session`).
  - Tokens JWT assinados com `jose` e `jsonwebtoken`.
  - Hashing seguro de senhas com `bcrypt` / `bcryptjs`.
- **PWA & Offline:** `@serwist/next` (Service Worker para cache, manifesto e instalação PWA).
- **Manipulação de Documentos e Mídia:**
  - Exportação e relatórios: `jspdf`, `jspdf-autotable`, `papaparse` (CSV).
  - Captura e comprovantes: `html-to-image`.
  - Leitor de código de barras / QR Code: `html5-qrcode`.

---

## 3. Arquitetura de Pastas

```text
src/
├── app/
│   ├── (auth)/             # Rotas protegidas (Dashboard, Produtos, Clientes, etc.)
│   │   ├── layout.tsx      # Sidebar/Bottom Nav responsivo e verificação de sessão/onboarding
│   │   ├── dashboard/      # Métricas e KPIs de faturamento e estoque
│   │   ├── nova-venda/     # PDV / Ponto de Venda rápido com carrinho e leitor
│   │   ├── produtos/       # Catálogo de produtos, estoque e variações
│   │   ├── clientes/       # Gestão de clientes e histórico de compras
│   │   ├── historico/      # Histórico geral de vendas e emissão de comprovantes
│   │   ├── usuarios/       # Gestão de operadores e equipe da loja
│   │   ├── configuracoes/  # Configurações da loja, grupos de acesso e Gerenciamento de Dados
│   │   └── registros/      # Logs de auditoria do sistema
│   ├── api/                # Endpoints HTTP da API REST (Next.js Route Handlers)
│   ├── cadastro/           # Criação de conta (loja + administrador inicial)
│   ├── login/              # Autenticação de usuários existentes
│   ├── onboarding/         # Assistente de configuração inicial após cadastro
│   ├── layout.tsx          # Root layout com Providers (Theme, Permissions, Toaster)
│   └── sw.ts               # Service Worker PWA
├── components/             # Componentes modulares de UI e domínio
│   ├── ui/                 # Componentes base (Button, Dialog, Drawer, Input, etc.)
│   ├── auth/               # Providers e guardas de permissão
│   ├── clients/            # Formulários, listagens e detalhes de clientes
│   ├── produtos/           # Formulários, controle de estoque e filtros
│   ├── nova-venda/         # Modais de cliente, seletor de produtos e carrinho
│   └── ...
├── hooks/                  # Custom React Hooks (sync em abas, detecção mobile, etc.)
├── lib/                    # Utilitários, conexões com banco, middlewares e schemas
│   ├── auth.ts             # Assinatura e verificação de JWT
│   ├── prisma.ts           # Instância singleton do Prisma Client
│   ├── require-permission.ts # Middleware de autorização RBAC nas rotas
│   ├── masks.ts            # Máscaras de telefone, CPF/CNPJ, CEP e moeda
│   └── validations/        # Schemas Zod de validação
├── services/               # Camada de comunicação com a API client-side
├── store/                  # Stores Zustand (useCartStore, useSettingsStore, etc.)
└── types/                  # Definições de tipos TypeScript compartilhadas
```

---

## 4. Principais Páginas e Fluxos

1. **Autenticação & Registro:**
   - `/login`: Autenticação por e-mail e senha. Verifica credenciais, status do usuário e loja ativa. Emite cookie de sessão.
   - `/cadastro`: Criação atômica de conta criando: Loja, Usuário Administrador (owner), Grupos de permissões padrões, Cliente padrão (*"Consumidor Final"*), Categoria padrão (*"Geral"*) e Configurações iniciais com flag de onboarding pendente. Redireciona diretamente para o Onboarding.
2. **Onboarding Inicial (`/onboarding`):**
   - Questionário de 4 etapas para personalização rápida:
     1. Perfil e segmento do negócio.
     2. Ativação/Desativação do controle de estoque e alertas de estoque baixo.
     3. Regras de vendas (obrigatoriedade de cliente, bloqueio de venda sem estoque, formas de pagamento aceitas).
     4. Conclusão e acesso direto ao sistema.
   - Possui opção no topo para pular a qualquer momento com valores seguros pré-definidos.
3. **Ponto de Venda / Nova Venda (`/nova-venda`):**
   - Interface rápida com leitor de código de barras/câmera, busca com filtros, seleção de variações de produto, atribuição de cliente, aplicação de descontos (respeitando limites RBAC) e finalização em múltiplas formas de pagamento.
4. **Catálogo de Produtos (`/produtos`):**
   - Gestão de produtos simples e com variações (ex: tamanho, cor), preço de custo, preço de venda, código de barras e limites de estoque baixo configuráveis por categoria ou globalmente.
5. **Clientes (`/clientes`):**
   - Cadastro completo com busca de CEP via ViaCEP.
   - A seção de endereço inicia recolhida por padrão para agilizar o preenchimento.
   - **Regra de integridade:** O cliente *"Consumidor Final"* é protegido contra exclusão ou desativação.
6. **Histórico de Vendas (`/historico`):**
   - Listagem ordenada de vendas com filtros por data, status (Pago/Pendente/Cancelado) e cliente.
   - Cancelamento de venda com estorno automático de estoque e comprovante imprimível/compartilhável em WhatsApp.
7. **Configurações (`/configuracoes`):**
   - Dados da loja, regras de estoque, formas de pagamento, grupos de acesso com permissões refinadas e **Gerenciamento de Dados** (para exclusão de registros da loja ou exclusão definitiva da conta mediante confirmação com a senha do usuário).

---

## 5. Regras de Negócio Cruciais

### Isolamento Multi-tenant
- Toda tabela relacionada a dados operacionais (`Product`, `Client`, `Sale`, `AccessGroup`, `User`, `Category`, `Settings`, `Address`) possui a coluna obrigatória `lojaId`.
- Nenhuma query, listagem, atualização ou exclusão pode ser executada sem filtrar estritamente por `lojaId: user.lojaId`.

### RBAC (Role-Based Access Control)
- Permissões são estruturadas por módulo (`dashboard`, `nova-venda`, `produtos`, `clientes`, `historico`, `usuarios`, `configuracoes`) e ação (`Visualizar`, `Adicionar`, `Editar`, `Excluir`).
- Toda rota de API que altera ou expõe dados deve validar a permissão via helper `requirePermission(modulo, acao)`.
- O proprietário da loja (`isOwner` / `lojaOwnerId`) possui controle administrativo integral.

### Controle de Estoque Flexível
- A loja pode operar com **Controle de Estoque Ativado** ou **Desativado** (`trackStock: boolean`).
- Quando desativado:
  - Não bloqueia vendas por falta de estoque.
  - Oculta indicadores irrelevantes no dashboard (ex.: card de Estoque Baixo, redistribuindo os KPIs em 2 colunas no desktop).
  - Não exige controle manual de quantidade física.

### Proteção de Registros Essenciais
- **Cliente "Consumidor Final":** Não pode ser excluído nem desativado, pois garante a integridade de vendas avulsas e do PDV.
- **Exclusões em Gerenciamento de Dados:**
  - Ambas as ações (*Excluir dados* e *Excluir conta*) exigem autenticação obrigatória via senha atual do administrador verificada com `bcrypt.compare`.
  - Excluir dados apaga itens operacionais, preservando o usuário administrador, a loja e restaurando os registros padrão (*Consumidor Final* e categoria *Geral*).

---

## 6. Design System & Convenções de Interface

- **Mobile First & Responsividade:**
  - Todos os diálogos e modais adotam o padrão híbrido: `Dialog` em telas grandes (`sm:` / desktop) e `Drawer` (bottom-sheet retrátil com scroll-area) em dispositivos móveis (`useIsMobile`).
  - Proibido qualquer transbordamento ou rolagem horizontal indesejada (`overflow-x-hidden`).
- **Padrões de Formulários:**
  - Campos opcionais avançados (como endereços secundários) devem permanecer minimizados/recolhidos por padrão para manter a tela limpa e rápida.
  - Feedback de ações sempre via Toasts com `sonner` (mensagens descritivas e amigáveis ao usuário).
- **Validações Tolerantes:**
  - Schemas Zod devem aceitar `.nullable().optional()` em campos de texto opcionais ou telefones, convertendo strings vazias e nulos com segurança para persistência no banco.

---

## 7. Diretrizes de Frontend e Padrões de Interface (Consulta Obrigatória)

> [!IMPORTANT]
> **CONSULTA OBRIGATÓRIA A `docs/ui-standards/` ANTES DE QUALQUER DESENVOLVIMENTO DE FRONTEND**
>
> Para QUALQUER tarefa envolvendo criação de novas páginas, atualização de telas existentes, formulários, tabelas, modais, drawers, filtros, botões ou componentes visuais no Zelo, é **MANDATÓRIO** consultar e seguir as especificações documentadas em `docs/ui-standards/`:
>
> - **Índice e Matriz de Decisão:** [`docs/ui-standards/README.md`](docs/ui-standards/README.md)
> - **Guia Prático e Checklist Pré-Entrega:** [`docs/ui-standards/18-regras-para-novas-paginas.md`](docs/ui-standards/18-regras-para-novas-paginas.md)
> - **Catálogo de Componentes Compartilhados:** [`docs/ui-standards/17-componentes-compartilhados.md`](docs/ui-standards/17-componentes-compartilhados.md)
> - **Páginas de Listagem (CRUD):** [`docs/ui-standards/04-paginas-de-listagem.md`](docs/ui-standards/04-paginas-de-listagem.md)
> - **Páginas de Detalhes:** [`docs/ui-standards/05-paginas-de-detalhes.md`](docs/ui-standards/05-paginas-de-detalhes.md)
> - **Páginas de Configurações:** [`docs/ui-standards/06-paginas-de-configuracoes.md`](docs/ui-standards/06-paginas-de-configuracoes.md)
> - **Formulários e Validação Zod:** [`docs/ui-standards/07-formularios.md`](docs/ui-standards/07-formularios.md)
> - **Drawers (Mobile):** [`docs/ui-standards/08-drawers.md`](docs/ui-standards/08-drawers.md)
> - **Dialogs e Modais (Desktop):** [`docs/ui-standards/09-dialogs-e-modais.md`](docs/ui-standards/09-dialogs-e-modais.md)
> - **Inputs, Textareas e Máscaras:** [`docs/ui-standards/10-inputs-e-campos.md`](docs/ui-standards/10-inputs-e-campos.md)
> - **Selects e Filtros em Popover:** [`docs/ui-standards/11-selects-e-filtros.md`](docs/ui-standards/11-selects-e-filtros.md)
> - **Botões, Ações e Boxicons:** [`docs/ui-standards/12-botoes-acoes-e-icones.md`](docs/ui-standards/12-botoes-acoes-e-icones.md)
> - **Tabelas e Paginação:** [`docs/ui-standards/13-tabelas-e-paginacao.md`](docs/ui-standards/13-tabelas-e-paginacao.md)
> - **Cards, Badges e Toasts Sonner:** [`docs/ui-standards/14-cards-badges-e-feedbacks.md`](docs/ui-standards/14-cards-badges-e-feedbacks.md)
> - **Responsividade e Alvos de Toque:** [`docs/ui-standards/15-responsividade.md`](docs/ui-standards/15-responsividade.md)
> - **Animações e Microinterações:** [`docs/ui-standards/16-animacoes-e-interacoes.md`](docs/ui-standards/16-animacoes-e-interacoes.md)
>
> **Regras Sistêmicas Críticas:**
> 1. **Compensação de Bottom Nav:** Todo container sob `(auth)` deve ter `space-y-6 pb-24 md:pb-6`.
> 2. **Polimorfismo:** `Drawer blur` no mobile (`< 768px`) e `Dialog blur` no desktop (`>= 768px`).
> 3. **Prevenção de Perda de Dados:** Modais de formulário devem bloquear fechamento acidental via `disablePointerDismissal={true}` e `preventEscapeClose={true}`.
> 4. **Prevenção de Zoom iOS:** Entradas de texto devem incluir `text-base md:text-sm`.
> 5. **Ações:** Botão pílula `rounded-full` no cabeçalho desktop e `MobileActionFab` flutuante no mobile.
> 6. **Ícones:** Uso exclusivo de Boxicons via `<BoxIcon name="..." />`.
> 7. **RBAC:** Proteção mandatória com `<Can module="..." action="...">` ou `usePermissions`.
> 8. **Paginação Híbrida:** `<TablePagination />` acima da listagem no mobile (`md:hidden mb-3`) e abaixo da tabela no desktop (`hidden md:block mt-4`).


