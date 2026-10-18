# Padrões de Interface e Engenharia de Frontend - Zelo

Este diretório reúne a documentação oficial de arquitetura visual, componentes, comportamentos responsivos e convenções de interface do ecossistema **Zelo**.

Esta documentação foi elaborada a partir de uma **auditoria completa do código-fonte real** existente no projeto, mapeando o comportamento efetivo de layouts, modais, formulários, tabelas, filtros e componentes compartilhados.

> [!IMPORTANT]
> **REFERÊNCIA OBRIGATÓRIA PARA DESENVOLVIMENTO**
>
> Antes de criar ou estender qualquer página, formulário, diálogo, drawer, tabela ou componente no Zelo, consulte os documentos deste diretório.
> Não presuma padrões a partir de frameworks genéricos: utilize os componentes e convenções já adotados no sistema.

---

## 1. Classificação das Diretrizes

Ao longo desta documentação, todas as regras e comportamentos foram catalogados segundo quatro categorias estritas:

- **[PADRÃO CONFIRMADO]:** Comportamento amplamente repetido e comprovado na base de código, que deve ser seguido obrigatoriamente em novos desenvolvimentos.
- **[VARIAÇÃO INTENCIONAL]:** Diferença justificada pela especificidade ou modelo operacional da página/funcionalidade.
- **[INCONSISTÊNCIA ENCONTRADA]:** Divergência entre telas similares que não possui justificativa arquitetural evidente. **Não deve ser propagada para novas páginas** e deve aguardar definição futura de alinhamento.
- **[RECOMENDAÇÃO]:** Orientação prática baseada na convergência dos componentes mais modernos do sistema para assegurar consistência nos próximos incrementos.

---

## 2. Mapa da Documentação (Índice de Arquivos)

| # | Arquivo | Finalidade Principal |
|---|---|---|
| **01** | [Auditoria e Inventário de Telas](01-auditoria-e-inventario.md) | Mapeamento completo de todas as 17 rotas do frontend e catálogo das inconsistências detectadas |
| **02** | [Identidade Visual e Tokens](02-identidade-visual.md) | Paleta de cores em OKLCH (Light/Dark), tipografia (Outfit / Noto Sans), raios e sombras |
| **03** | [Layout e Estrutura de Páginas](03-layout-e-estrutura-de-paginas.md) | Casca da aplicação (Sidebar, SiteHeader, BottomNav), containers e espaçamentos globais |
| **04** | [Páginas de Listagem e Gerenciamento](04-paginas-de-listagem.md) | Estrutura de CRUDs (busca, filtros, ações desktop vs. mobile, estados de tela e feedback) |
| **05** | [Páginas e Telas de Detalhes](05-paginas-de-detalhes.md) | Apresentação de dados profundos, mini-cards estatísticos e histórico de movimentações |
| **06** | [Páginas de Configurações](06-paginas-de-configuracoes.md) | Padrão de cards expansíveis em seções, botões de ação e exclusões com senha |
| **07** | [Formulários](07-formularios.md) | Validação Zod, labels com asterisco, estados de loading, seções retráteis e salvamento seguro |
| **08** | [Drawers (Mobile First)](08-drawers.md) | Sobreposições móveis de baixo para cima, alça, prevenção de fechamento acidental e rodapés |
| **09** | [Dialogs e Modais (Desktop)](09-dialogs-e-modais.md) | Modais centralizados, backdrop blur, dimensões máximas, botões de ação e diálogos de alerta |
| **10** | [Inputs e Controles de Formulário](10-inputs-e-campos.md) | Inputs, textareas, switch, checkbox, máscaras BR, prevenção de zoom no iOS e destaques |
| **11** | [Selects e Filtros](11-selects-e-filtros.md) | Componente Select, popover de filtros avançados, chips de filtros ativos e seleção de datas |
| **12** | [Botões, Ações e Ícones](12-botoes-acoes-e-icones.md) | Botões pílula (`rounded-full`), LoadingButton, MobileActionFab e catálogo Boxicons |
| **13** | [Tabelas e Paginação](13-tabelas-e-paginacao.md) | Tabelas TanStack, linhas, colunas de ações, visual em cards no mobile e componente TablePagination |
| **14** | [Cards, Badges e Feedbacks](14-cards-badges-e-feedbacks.md) | StatCards com borda acentuada, badges de status de venda, empty states e toasts Sonner |
| **15** | [Responsividade e Mobile](15-responsividade.md) | Breakpoint único (`768px`), hook `useIsMobile`, áreas de toque, safe areas e regras de toque PWA |
| **16** | [Animações e Interações](16-animacoes-e-interacoes.md) | Transições de tema com View Transitions, drawers fluidos, fade-in e prefers-reduced-motion |
| **17** | [Componentes Compartilhados](17-componentes-compartilhados.md) | Catálogo dos componentes de `@/components/ui` e `@/components`, props e guia de importação |
| **18** | [Regras para Novas Páginas](18-regras-para-novas-paginas.md) | Passo a passo e checklist de conformidade para o agente/desenvolvedor antes de codificar |

---

## 3. Matriz de Decisão: Qual Documento Consultar?

| Cenário de Desenvolvimento | Documentos Essenciais para Consulta |
|---|---|
| **Criar uma nova listagem com busca e filtros** | [04-paginas-de-listagem.md](04-paginas-de-listagem.md), [13-tabelas-e-paginacao.md](13-tabelas-e-paginacao.md), [11-selects-e-filtros.md](11-selects-e-filtros.md), [12-botoes-acoes-e-icones.md](12-botoes-acoes-e-icones.md) |
| **Criar ou editar formulário de cadastro/edição** | [07-formularios.md](07-formularios.md), [08-drawers.md](08-drawers.md), [09-dialogs-e-modais.md](09-dialogs-e-modais.md), [10-inputs-e-campos.md](10-inputs-e-campos.md) |
| **Criar modal de confirmação ou ação destrutiva** | [09-dialogs-e-modais.md](09-dialogs-e-modais.md), [08-drawers.md](08-drawers.md), [12-botoes-acoes-e-icones.md](12-botoes-acoes-e-icones.md) |
| **Exibir detalhes, resumo ou histórico de registro** | [05-paginas-de-detalhes.md](05-paginas-de-detalhes.md), [14-cards-badges-e-feedbacks.md](14-cards-badges-e-feedbacks.md) |
| **Adicionar seção em página de configurações** | [06-paginas-de-configuracoes.md](06-paginas-de-configuracoes.md), [10-inputs-e-campos.md](10-inputs-e-campos.md) |
| **Adicionar métricas, cards de KPI ou gráficos** | [14-cards-badges-e-feedbacks.md](14-cards-badges-e-feedbacks.md), [02-identidade-visual.md](02-identidade-visual.md) |
| **Escolher ícones e padronizar botões de ação** | [12-botoes-acoes-e-icones.md](12-botoes-acoes-e-icones.md) |
| **Validar comportamento responsivo e mobile/PWA** | [15-responsividade.md](15-responsividade.md), [16-animacoes-e-interacoes.md](16-animacoes-e-interacoes.md) |
| **Verificar se já existe componente pronto** | [17-componentes-compartilhados.md](17-componentes-compartilhados.md) |
| **Antes de entregar qualquer nova página** | [18-regras-para-novas-paginas.md](18-regras-para-novas-paginas.md) |

---

## 4. Pilares Arquiteturais do Zelo

1. **Padrão Híbrido Universal (Mobile First):**
   - No mobile (`< 768px`), formulários, detalhes e confirmações abrem em **`Drawer` inferior** com alça de toque e botões verticais em largura total.
   - No desktop (`>= 768px`), os mesmos fluxos abrem em **`Dialog` centralizado** ou `AlertDialog` com botões alinhados à direita.
2. **Prevenção de Fechamento Acidental:**
   - Drawers e Dialogs operam com bloqueio estrito de fechamento ao tocar no backdrop (`outside-press`) e pela tecla Escape para preservar dados não salvos.
3. **Boxicons como Padrão de Ícones:**
   - O projeto utiliza a biblioteca Boxicons prioritariamente via componente `<BoxIcon name="..." />` com chaveamento dinâmico para ícones sólidos (`bxs-`) quando ativo.
4. **Isolamento e Sincronização:**
   - Telas de listagem mantêm sincronia em tempo real entre abas e dispositivos via hook `useDataSync` e notificação de eventos `notifyLocalSync`.
5. **Acessibilidade e Usabilidade PWA:**
   - Textos de botões e navegação possuem proteção contra seleção acidental (`user-select: none`). Inputs e textareas mantêm irrestritamente a capacidade nativa de digitação e seleção (`user-select: text !important`).
