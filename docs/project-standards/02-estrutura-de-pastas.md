# 02. Estrutura de Pastas e Organização do Repositório

Este documento apresenta a estrutura de diretórios e arquivos adotada no ecossistema Zelo, detalha as responsabilidades de cada pasta e propõe uma **estrutura de referência padronizada e reutilizável** para qualquer novo projeto fullstack com Next.js e PWA.

---

## 1. Mapeamento da Estrutura Atual do Zelo

Abaixo está o mapeamento real das pastas do projeto Zelo, acompanhado da responsabilidade primária de cada diretório:

```text
c:\projetos\zelo\
├── .agents/                 # Configurações de agentes e automações do workspace
├── docs/                    # Documentações técnicas e guias arquiteturais
│   ├── project-standards/   # Padrões arquiteturais globais (esta documentação)
│   └── ui-standards/        # Guia visual detalhado e especificações de interface
├── prisma/                  # Configurações de banco de dados e ORM
│   ├── migrations/          # Histórico de migrações SQL executadas
│   ├── schema.prisma        # Modelo de dados relacional e generators
│   └── seed.ts              # Script de população de dados essenciais
├── public/                  # Arquivos estáticos servidos diretamente na raiz
│   ├── site.webmanifest     # Manifesto PWA com nomes, ícones e cores de tema
│   ├── sw.js                # Output compilado do Service Worker
│   └── icons & imagens      # Favicons, ícones de toque e logotipos
├── scripts/                 # Scripts operacionais de infraestrutura e provisionamento
├── src/                     # Código-fonte principal da aplicação
│   ├── app/                 # Next.js App Router (Páginas, Layouts e APIs)
│   │   ├── (admin)/         # Route Group de administração da plataforma (/admin/*)
│   │   ├── (auth)/          # Route Group privado autenticado (/dashboard, etc.)
│   │   ├── api/             # Route Handlers REST (/api/v1/...)
│   │   ├── cadastro/        # Fluxo público de criação de conta
│   │   ├── login/           # Tela pública de login com e-mail e senha
│   │   ├── onboarding/      # Assistente inicial de primeiro acesso
│   │   ├── layout.tsx       # Root Layout global (PWA, Temas, Fontes, Toaster)
│   │   ├── globals.css      # Design tokens Tailwind v4 e variáveis OKLCH
│   │   └── sw.ts            # Código-fonte TypeScript do Service Worker (Serwist)
│   ├── components/          # Componentes visuais React reutilizáveis e de domínio
│   │   ├── admin/           # Telas e widgets administrativos
│   │   ├── auth/            # Contextos e wrappers de RBAC e permissões
│   │   ├── layout/          # Sidebar, Navbar, Bottom Navigation e Headers
│   │   ├── ui/              # Componentes base (Shadcn / Base UI customizados)
│   │   └── [modulos]/       # Componentes de módulos (ex: produtos, clients, etc.)
│   ├── hooks/               # Custom React Hooks compartilhados
│   ├── lib/                 # Utilitários puros, bibliotecas de infra e validações
│   │   ├── validations/     # Schemas Zod de validação (frontend e backend)
│   │   ├── auth.ts          # Autenticação de servidor e recuperação de usuário
│   │   ├── jwt-auth.ts      # Verificação e assinatura JWT com jose
│   │   ├── masks.ts         # Máscaras de formatação de inputs (Telefone, CEP, CPF)
│   │   ├── prisma.ts        # Singleton do cliente Prisma com adapter-pg
│   │   └── utils.ts         # Helper clássico `cn` (clsx + tailwind-merge)
│   ├── services/            # Camada de comunicação client-side com as APIs
│   ├── store/               # Gerenciamento de estado global com Zustand
│   └── types/               # Tipagens e interfaces TypeScript compartilhadas
├── tests/                   # Testes automatizados de integração/API com Vitest
├── tests-e2e/               # Testes ponta a ponta em navegador com Playwright
├── Dockerfile               # Dockerfile multi-stage para compilação e produção
├── docker-compose.yml       # Orquestração do ambiente completo (App + PostgreSQL)
├── middleware.ts            # Middleware de controle de rotas e segurança
├── next.config.ts           # Configuração do Next.js e Serwist PWA
└── package.json             # Dependências e scripts oficiais via pnpm
```

---

## 2. Onde Criar Cada Tipo de Arquivo (Guia de Alocação)

Para manter a separação estrita de responsabilidades em novos projetos, siga rigorosamente a tabela de alocação:

| Tipo de Artefato | Onde Armazenar | Exemplo de Caminho | Convenção de Nomenclatura |
| :--- | :--- | :--- | :--- |
| **Página (Tela)** | `src/app/(contexto)/<rota>/page.tsx` | `src/app/(auth)/tarefas/page.tsx` | `page.tsx` (export default) |
| **Layout Compartilhado** | `src/app/(contexto)/layout.tsx` | `src/app/(auth)/layout.tsx` | `layout.tsx` (export default) |
| **Endpoint de API** | `src/app/api/<entidade>/route.ts` | `src/app/api/tasks/route.ts` | `route.ts` (export GET, POST...) |
| **Endpoint com ID** | `src/app/api/<entidade>/[id]/route.ts`| `src/app/api/tasks/[id]/route.ts` | `route.ts` (export PATCH, DELETE...) |
| **Componente Base de UI** | `src/components/ui/` | `src/components/ui/button.tsx` | `kebab-case.tsx` |
| **Componente de Domínio** | `src/components/<modulo>/` | `src/components/tasks/task-form.tsx`| `kebab-case.tsx` |
| **Tabela TanStack** | `src/app/(contexto)/<modulo>/` | `src/app/(auth)/tasks/data-table.tsx`| `data-table.tsx`, `columns.tsx` |
| **Custom Hook** | `src/hooks/` | `src/hooks/use-media-query.ts` | `use-kebab-case.ts` |
| **Schema Zod** | `src/lib/validations/` | `src/lib/validations/task.ts` | `<entidade>.ts` |
| **Serviço Client-side** | `src/services/` | `src/services/tasks.service.ts` | `<entidade>.service.ts` |
| **Store Global Zustand** | `src/store/` | `src/store/useTaskStore.ts` | `use<Entidade>Store.ts` |
| **Tipos TypeScript** | `src/types/` | `src/types/task.ts` | `<entidade>.ts` |
| **Função Utilitária Pura** | `src/lib/` | `src/lib/date-utils.ts` | `kebab-case.ts` |
| **Cliente de Infraestrutura**| `src/lib/` | `src/lib/s3-storage.ts` | `kebab-case.ts` |

---

## 3. Como Evitar Arquivos Gigantes e Responsabilidades Misturadas

Uma lição técnica crítica observada na evolução do Zelo foi a tendência de telas e formulários concentrarem centenas de linhas quando todas as responsabilidades ficavam juntas no mesmo arquivo.

### Padrão de Fracionamento Recomendado:
Para evitar componentes com mais de 300 linhas, decomponha o módulo em 4 partes padronizadas:

1. **`page.tsx` (Orquestrador de Tela):**
   - Responsável apenas por obter parâmetros, verificar permissão com `usePermissions`, controlar estados de modal aberto/fechado e disparar toasts com `sonner`.
2. **`columns.tsx` (Definição de Colunas TanStack):**
   - Isola exclusivamente as colunas da tabela, formatação de células e badges de status.
3. **`data-table.tsx` (Renderização da Lista):**
   - Concentra o hook `useReactTable`, a barra de pesquisa, paginação e botões de lote (bulk actions).
4. **`<modulo>-form.tsx` (Formulário):**
   - Concentra as entradas de dados, validação de inputs, máscaras e a casca polimórfica Dialog/Drawer.

---

## 4. Estrutura de Referência Recomendada para Novos Projetos

Ao iniciar um novo projeto (ex.: Sistema Financeiro, Gestor de Chamados, App de Hábitos), adote a seguinte estrutura modular:

```text
novo-projeto/
├── docs/
│   └── project-standards/       # Cópia destes padrões para referência da IA/Time
├── prisma/
│   ├── schema.prisma            # Schema limpo com modelos do novo domínio
│   ├── migrations/
│   └── seed.ts
├── public/
│   ├── site.webmanifest         # PWA Manifest configurado
│   ├── icons/                   # Ícones 192x192 e 512x512
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── (auth)/              # Módulos privados protegidos
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── [modulo-1]/page.tsx
│   │   │   ├── configuracoes/page.tsx
│   │   │   └── layout.tsx       # Auth layout (validação DB + Sidebar + BottomNav)
│   │   ├── api/                 # Endpoints HTTP REST
│   │   │   ├── auth/            # login, logout, register
│   │   │   ├── sync/route.ts    # Versões para sincronização multi-abas
│   │   │   └── [entidades]/route.ts
│   │   ├── login/page.tsx       # Autenticação
│   │   ├── globals.css          # Tailwind CSS v4
│   │   ├── layout.tsx           # RootLayout com PWAUpdater e Toaster
│   │   └── sw.ts                # Service Worker Serwist
│   ├── components/
│   │   ├── auth/                # PermissionsProvider e guardas
│   │   ├── layout/              # Sidebar, BottomNavigation, Header
│   │   ├── ui/                  # Componentes base (Button, Dialog, Drawer, Input)
│   │   └── [modulos]/           # Componentes específicos de cada domínio
│   ├── hooks/                   # useIsMobile, useDataSync, etc.
│   ├── lib/
│   │   ├── validations/         # Schemas Zod compartilhados
│   │   ├── api-request.ts       # Wrapper fetch padronizado
│   │   ├── auth.ts              # getCurrentUser() no servidor
│   │   ├── cookies.ts           # setAuthCookies / deleteAuthCookies
│   │   ├── jwt-auth.ts          # jose jwtVerify / sign
│   │   ├── masks.ts             # Máscaras de entrada
│   │   ├── prisma.ts            # Singleton Prisma + adapter-pg
│   │   └── utils.ts             # cn (clsx + twMerge)
│   ├── services/                # [entidade].service.ts
│   ├── store/                   # Zustand stores
│   └── types/                   # Tipagens TypeScript
├── Dockerfile                   # Build standalone multi-stage
├── docker-compose.yml           # App + PostgreSQL
├── middleware.ts                # Interceptação de rotas via JWT
├── next.config.ts               # Serwist + standalone
├── package.json                 # pnpm
└── tsconfig.json                # strict: true, paths: {"@/*": ["./src/*"]}
```

---

## 5. Auditoria de Fidelidade: Padrões Existentes vs. Débitos

### Padrão Existente no Zelo `[PADRÃO EXISTENTE]`
- Excelente separação horizontal entre `app/api/`, `services/`, `lib/validations/` e `components/ui/`.
- Uso consistente do alias `@/*` mapeando para `./src/*` em todo o projeto.

### Débitos Técnicos Identificados no Zelo `[PARCIALMENTE ADOTADO]`
1. **Arquivos temporários e backups na raiz:** No Zelo, existem scripts avulsos (`transform.js`, `transform-clean.js`, etc.) e backups de schema (`schema.prisma.bak`) mantidos na raiz e na pasta `prisma/`.
   - **Correção mandatória para novos projetos:** Scripts de migração ou automação de banco devem residir exclusivamente em `scripts/` e nunca subir para o repositório como arquivos soltos na raiz.
2. **Duplicação de Tipos:** A interface `AccessGroup` e os tipos de permissão estão declarados tanto em `src/types/permissions.ts` quanto em `src/store/useSettingsStore.ts`.
   - **Correção mandatória para novos projetos:** Tipos compartilhados devem existir estritamente em `src/types/` e ser consumidos pelas stores e serviços via importação.
