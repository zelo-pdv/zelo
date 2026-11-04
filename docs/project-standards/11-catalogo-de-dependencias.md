# 11. Catálogo Técnico de Dependências e Tecnologias

Este documento apresenta uma análise criteriosa e detalhada de todas as principais bibliotecas presentes no `package.json` do Zelo, organizadas por finalidade técnica, grau de criticidade, padrão de integração e recomendações de consolidação para novos projetos.

---

## 1. Framework Principal e Linguagem

### `next` (v15.5.20)
- **Finalidade:** Framework fullstack React com suporte nativo a App Router, Route Handlers, SSR, Streaming e bundling otimizado.
- **Onde é utilizada:** Todo o ecossistema (`src/app/`, `middleware.ts`, `next.config.ts`).
- **Problema que resolve:** Elimina a necessidade de gerenciar separadamente um servidor backend Express e um bundler frontend Vite/Webpack.
- **Criticidade:** **Essencial**.
- **Reutilização:** Universal para qualquer aplicação web moderna.
- **Alternativas:** Remix, Vite + Express/Fastify, Astro.

### `react` e `react-dom` (v19.1.0)
- **Finalidade:** Biblioteca declarativa de interfaces e renderizador DOM.
- **Onde é utilizada:** Todos os componentes e layouts.
- **Problema que resolve:** Construção de interfaces com React Server Components (RSC), Actions e Hooks modernos.
- **Criticidade:** **Essencial**.

### `typescript` (v5.x)
- **Finalidade:** Tipagem estática em tempo de desenvolvimento.
- **Onde é utilizada:** Todo o repositório (`tsconfig.json`).
- **Criticidade:** **Essencial**.

---

## 2. Banco de Dados e Camada de Persistência

### `@prisma/client` e `prisma` (v7.9.1)
- **Finalidade:** ORM (Object-Relational Mapping) type-safe para modelagem, migrações e consultas a banco de dados.
- **Onde é utilizada:** `src/lib/prisma.ts`, `prisma/schema.prisma` e todos os Route Handlers em `src/app/api/`.
- **Problema que resolve:** Evita escrita manual de SQL suscetível a SQL Injection e fornece tipagem automática de todas as tabelas.
- **Criticidade:** **Essencial**.
- **Alternativas:** Drizzle ORM, Kysely.

### `@prisma/adapter-pg` (v7.9.1) e `pg` (v8.22.0)
- **Finalidade:** Adaptador para execução do Prisma sobre o driver de conexão nativo do PostgreSQL (`pg.Pool`).
- **Onde é utilizada:** `src/lib/prisma.ts`.
- **Problema que resolve:** Melhora drástica de desempenho, reutilização de pool de conexões e estabilidade em ambientes de alta carga.
- **Criticidade:** **Essencial** para bancos PostgreSQL.

---

## 3. Estilização, Design System e Componentes UI

### `tailwindcss` (v4.x) e `@tailwindcss/postcss`
- **Finalidade:** Framework CSS utilitário com compilação ultra-rápida.
- **Onde é utilizada:** `src/app/globals.css` e em todas as classes JSX.
- **Problema que resolve:** Elimina arquivos CSS gigantescos desconexos, viabilizando estilização direta com design tokens consistentes e suporte nativo a OKLCH.
- **Criticidade:** **Essencial**.

### `@base-ui/react` (v1.6.0)
- **Finalidade:** Primitivos de componentes headless (acessibilidade WAI-ARIA, foco, teclado) desenvolvidos pela equipe do MUI/Shadcn.
- **Onde é utilizada:** `src/components/ui/` (Dialog, Drawer, Popover, Tooltip, Select).
- **Problema que resolve:** Permite construir componentes sofisticados e 100% acessíveis sem impor estilos CSS pré-definidos.
- **Criticidade:** **Recomendado**.
- **Alternativas:** Radix UI, React Aria.

### `clsx` (v2.1.1) e `tailwind-merge` (v3.6.0)
- **Finalidade:** Fusão inteligente de classes CSS utilitárias no helper `cn()`.
- **Onde é utilizada:** `src/lib/utils.ts`.
- **Problema que resolve:** Resolve conflitos de classes Tailwind passadas por propriedades (props).
- **Criticidade:** **Essencial**.

### `sonner` (v2.0.7)
- **Finalidade:** Sistema de notificações flutuantes (Toasts).
- **Onde é utilizada:** `src/app/layout.tsx` e em todos os feedbacks de ações.
- **Problema que resolve:** Notificações elegantes, com suporte nativo a temas e acessibilidade para leitores de tela.
- **Criticidade:** **Recomendado**.

### `next-themes` (v0.4.6)
- **Finalidade:** Gerenciamento de tema Dark / Light / Sistema sem flash de layout.
- **Onde é utilizada:** `src/components/theme-provider.tsx`.
- **Criticidade:** **Recomendado**.

---

## 4. Ícones

### `boxicons` (v2.1.4)
- **Finalidade:** Família de ícones primária e oficial do sistema.
- **Onde é utilizada:** `src/components/ui/box-icon.tsx` e na navegação.
- **Problema que resolve:** Estética leve e consistente nos formatos linha (`bx-`), sólido (`bxs-`) e marcas (`bxl-`).
- **Criticidade:** **Recomendado**.

### `lucide-react` (v1.25.0)
- **Finalidade:** Biblioteca secundária de ícones SVG.
- **Onde é utilizada:** `product-form.tsx`, `sidebar.tsx` e componentes gerados pelo Shadcn.
- **Nota de Débito:** Gera redundância com `boxicons`. Consulte a Seção 9.

---

## 5. Gerenciamento de Estado e Validação

### `zustand` (v5.0.14)
- **Finalidade:** Gerenciamento de estado global leve e flexível baseado em hooks.
- **Onde é utilizada:** `src/store/useCartStore.ts`, `useSettingsStore.ts`, `useDataStore.ts`.
- **Problema que resolve:** Evita a complexidade e o boilerplate de Redux e o "prop drilling" excessivo.
- **Criticidade:** **Essencial**.

### `zod` (v4.4.3)
- **Finalidade:** Declaração e validação estrita de schemas em tempo de execução.
- **Onde é utilizada:** `src/lib/validations/` e em todos os Route Handlers de API.
- **Problema que resolve:** Garante que dados externos (inputs e requisições HTTP) correspondam aos tipos esperados pelo sistema.
- **Criticidade:** **Essencial**.

---

## 6. Autenticação e Segurança

### `jose` (v6.2.8)
- **Finalidade:** Assinatura e verificação de JWTs em conformidade com padrões Web Crypto API.
- **Onde é utilizada:** `middleware.ts`, `src/lib/jwt-auth.ts`, `src/lib/auth.ts`.
- **Problema que resolve:** Funciona universalmente tanto no Node.js quanto em Edge Runtimes sem dependências nativas legadas.
- **Criticidade:** **Essencial**.

### `bcryptjs` (v3.0.3) e `bcrypt` (v6.0.0)
- **Finalidade:** Hashing unidirecional seguro de senhas com sal (salt).
- **Onde é utilizada:** `src/app/api/auth/`.
- **Problema que resolve:** Protege credenciais de usuários contra vazamento em caso de comprometimento do banco.
- **Criticidade:** **Essencial**.

---

## 7. PWA e Service Worker

### `@serwist/next` e `serwist` (v9.5.12)
- **Finalidade:** Compilação do Service Worker com injeção de precache e estratégias de runtime caching.
- **Onde é utilizada:** `next.config.ts`, `src/app/sw.ts`.
- **Problema que resolve:** Transforma a aplicação web em um PWA instalável com carregamento instantâneo.
- **Criticidade:** **Essencial para PWA**.

---

## 8. Manipulação de Mídia, Documentos e IA

### `@supabase/supabase-js` (v2.117.2)
- **Finalidade:** Integração com o Supabase Storage para armazenamento de fotos e PDFs em buckets na nuvem.
- **Onde é utilizada:** `src/lib/supabase.ts`.
- **Criticidade:** **Opcional** (substituível por S3, Cloudflare R2 ou Firebase Storage).

### `html5-qrcode` (v2.3.8)
- **Finalidade:** Leitura de códigos de barra (EAN/UPC) e QR Codes em tempo real via câmera do smartphone.
- **Onde é utilizada:** `src/components/barcode-scanner.tsx`.
- **Criticidade:** **Específica de casos de uso com código de barras**.

### `jspdf` (v4.2.1), `jspdf-autotable` (v5.0.8), `papaparse` (v5.7.0)
- **Finalidade:** Geração de relatórios em PDF para impressão e exportação/importação de planilhas CSV no navegador.
- **Onde é utilizada:** `src/lib/export.ts`.
- **Criticidade:** **Reutilizável** para qualquer módulo de relatórios.

### `@google/genai` (v2.30.0)
- **Finalidade:** SDK oficial da Google para chamadas ao Gemini Flash/Pro para extração multimodal de documentos e imagens.
- **Onde é utilizada:** `src/lib/catalog-ingestion/gemini-extractor.ts`.
- **Criticidade:** **Específica para recursos com IA**.

---

## 9. Auditoria de Dependências Redundantes ou Órfãs `[PARCIALMENTE ADOTADO]`

A análise do repositório identificou 4 grupos de duplicidades no `package.json` que merecem atenção em novos projetos:

| Dependência A | Dependência B | Diagnóstico e Recomendação para Novos Projetos |
| :--- | :--- | :--- |
| `jose` | `jsonwebtoken` | **Duplicação de JWT:** `jose` é moderno e suporta Edge/Node. `jsonwebtoken` é uma biblioteca legada de Node.js. **Recomendação:** Manter exclusivamente `jose` e remover `jsonwebtoken`. |
| `bcrypt` | `bcryptjs` | **Duplicação de Hash:** `bcrypt` exige compilação nativa em C++ (node-gyp no Docker), enquanto `bcryptjs` é 100% puro JS. **Recomendação:** Padronizar exclusivamente em `bcryptjs` para builds rápidos e sem dores de cabeça no Alpine Linux. |
| `boxicons` | `lucide-react` | **Duplicação de Ícones:** Boxicons é a biblioteca oficial, mas Lucide foi puxada pelo CLI do Shadcn. **Recomendação:** Escolher apenas uma e eliminar a outra do `package.json`. |
| `@hookform/resolvers` | *(Nenhuma)* | **Dependência Órfã:** Não existe `react-hook-form` instalado. **Recomendação:** Ou instalar `react-hook-form` para adoção formal, ou remover `@hookform/resolvers`. |
