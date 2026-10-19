---
name: zelo-ui-standards
description: "Padrões oficiais de arquitetura, UI/UX, componentes e engenharia de interface do ecossistema Zelo. OBRIGATÓRIO utilizar ao criar novas páginas, editar telas existentes, construir ou modificar formulários, tabelas, filtros, drawers, dialogs, botões, cards, componentes compartilhados ou regras de interface no frontend."
---

# Zelo UI/UX Standards & Engineering Guidelines

Este skill encapsula a referência oficial de padrões visuais, estruturais e comportamentais do Zelo. Sempre que uma tarefa envolver o frontend da aplicação, utilize os guias documentados em `docs/ui-standards/`.

---

## 1. Regra de Decisão Rápida: Onde Consultar

Ao receber uma demanda de frontend, consulte imediatamente o arquivo especializado:

| Demanda / Tipo de Tarefa | Arquivo de Referência |
| :--- | :--- |
| **Criar uma nova página do zero** | [`docs/ui-standards/18-regras-para-novas-paginas.md`](file:///c:/projetos/zelo/docs/ui-standards/18-regras-para-novas-paginas.md) |
| **Telas de listagem e gerenciamento (CRUD)** | [`docs/ui-standards/04-paginas-de-listagem.md`](file:///c:/projetos/zelo/docs/ui-standards/04-paginas-de-listagem.md) |
| **Telas ou painéis de detalhes** | [`docs/ui-standards/05-paginas-de-detalhes.md`](file:///c:/projetos/zelo/docs/ui-standards/05-paginas-de-detalhes.md) |
| **Telas de configurações e preferências** | [`docs/ui-standards/06-paginas-de-configuracoes.md`](file:///c:/projetos/zelo/docs/ui-standards/06-paginas-de-configuracoes.md) |
| **Formulários, validações e rascunhos** | [`docs/ui-standards/07-formularios.md`](file:///c:/projetos/zelo/docs/ui-standards/07-formularios.md) |
| **Bottom Sheets e painéis móveis** | [`docs/ui-standards/08-drawers.md`](file:///c:/projetos/zelo/docs/ui-standards/08-drawers.md) |
| **Modais e diálogos desktop** | [`docs/ui-standards/09-dialogs-e-modais.md`](file:///c:/projetos/zelo/docs/ui-standards/09-dialogs-e-modais.md) |
| **Inputs, textareas e máscaras** | [`docs/ui-standards/10-inputs-e-campos.md`](file:///c:/projetos/zelo/docs/ui-standards/10-inputs-e-campos.md) |
| **Selects, filtros e datas** | [`docs/ui-standards/11-selects-e-filtros.md`](file:///c:/projetos/zelo/docs/ui-standards/11-selects-e-filtros.md) |
| **Botões, ações e Boxicons** | [`docs/ui-standards/12-botoes-acoes-e-icones.md`](file:///c:/projetos/zelo/docs/ui-standards/12-botoes-acoes-e-icones.md) |
| **Tabelas e paginação TanStack** | [`docs/ui-standards/13-tabelas-e-paginacao.md`](file:///c:/projetos/zelo/docs/ui-standards/13-tabelas-e-paginacao.md) |
| **Cards, badges, toasts e feedbacks** | [`docs/ui-standards/14-cards-badges-e-feedbacks.md`](file:///c:/projetos/zelo/docs/ui-standards/14-cards-badges-e-feedbacks.md) |
| **Responsividade e alvos de toque** | [`docs/ui-standards/15-responsividade.md`](file:///c:/projetos/zelo/docs/ui-standards/15-responsividade.md) |
| **Animações, transições e toque PWA** | [`docs/ui-standards/16-animacoes-e-interacoes.md`](file:///c:/projetos/zelo/docs/ui-standards/16-animacoes-e-interacoes.md) |
| **Catálogo de Componentes Compartilhados** | [`docs/ui-standards/17-componentes-compartilhados.md`](file:///c:/projetos/zelo/docs/ui-standards/17-componentes-compartilhados.md) |
| **Design tokens, OKLCH e tipografia** | [`docs/ui-standards/02-identidade-visual.md`](file:///c:/projetos/zelo/docs/ui-standards/02-identidade-visual.md) |
| **Layout geral, Header e BottomNav** | [`docs/ui-standards/03-layout-e-estrutura-de-paginas.md`](file:///c:/projetos/zelo/docs/ui-standards/03-layout-e-estrutura-de-paginas.md) |

---

## 2. Princípios Inegociáveis

1. **Compensação de Espaçamento no Mobile:**
   Todo contêiner principal de página sob a rota `(auth)` deve incluir `space-y-6 pb-24 md:pb-6` para que o conteúdo não fique escondido sob a barra de navegação inferior móvel (`BottomNavigation`).

2. **Polimorfismo Responsivo (Breakpoint 768px):**
   - Dispositivos móveis (`< 768px`): Modais abrem como `Drawer blur` na base da tela com botões empilhados verticalmente (Salvar no topo `h-11 rounded-full`, Cancelar embaixo em `ghost`). Listas usam card com linhas separadas por `divide-y`. Ação primária vira o botão flutuante `MobileActionFab`.
   - Desktop (`>= 768px`): Modais abrem como `Dialog blur` centralizados (`sm:max-w-xl`). Listas usam tabelas estruturadas TanStack Table. Ação primária fica no cabeçalho em pílula `rounded-full h-9 px-4`.

3. **Prevenção de Perda de Dados:**
   - Modais com formulários devem incluir as propriedades `disablePointerDismissal={true}` e `preventEscapeClose={true}`.
   - Formulários devem salvar rascunhos em `localStorage` e sinalizar ao usuário se houver modificações pendentes (`isDirty`).

4. **Prevenção de Zoom no iOS:**
   - Todo campo de entrada de texto (`Input`, `Textarea`, `SelectTrigger`) deve carregar a tipografia responsiva `text-base md:text-sm` para impedir que o Safari amplie a tela no momento do foco.

5. **Ícones Oficiais:**
   - O sistema utiliza **Boxicons** (`<BoxIcon name="..." solid={boolean} />`). Não importe ícones de outras bibliotecas sem necessidade documentada.

6. **Controle de Acesso RBAC:**
   - Proteja botões e seções restritas com `<Can module="..." action="...">` ou com o hook `usePermissions`.

7. **Validação e Feedbacks:**
   - Validações de entrada sempre via schemas Zod tolerantes (`.nullable().optional()`).
   - Feedbacks ao usuário via `toast.success` e `toast.error` da biblioteca `sonner`.

8. **Paginação Híbrida Responsiva:**
   - Componente `<TablePagination />` posicionado **acima da listagem** no mobile (`md:hidden mb-3`) e **abaixo da tabela** no desktop (`hidden md:block mt-4`).

