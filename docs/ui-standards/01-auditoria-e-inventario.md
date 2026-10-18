# 01 - Auditoria e Inventário de Telas do Zelo

Este documento apresenta o levantamento minucioso de todas as páginas existentes no frontend do sistema **Zelo**, detalhando sua finalidade, componentes visuais, organização de conteúdo, responsividade, particularidades e as inconsistências identificadas durante a auditoria.

---

## 1. Inventário Geral das Telas

O frontend do Zelo possui **17 rotas com páginas (`page.tsx`)**, divididas entre a área protegida do aplicativo e os fluxos públicos/de acesso.

| Rota | Arquivo Fonte | Categoria de Página | Objetivo Principal |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Redirecionamento | Redireciona a raiz para `/login` |
| `/login` | `src/app/login/page.tsx` | Autenticação | Login com e-mail/senha, "Lembre-me", alternância de tema e branding |
| `/cadastro` | `src/app/cadastro/page.tsx` | Autenticação / Registro | Criação atômica de conta (loja + administrador inicial) |
| `/register` | `src/app/register/page.tsx` | Redirecionamento | Redirecionamento HTTP 307 para `/cadastro` |
| `/onboarding` | `src/app/onboarding/page.tsx` | Assistente / Wizard | Configuração inicial da loja em 4 etapas guiadas com opção de pular |
| `/privacidade` | `src/app/privacidade/page.tsx` | Informativa / Legal | Termos de privacidade e proteção de dados LGPD |
| `/dashboard` | `src/app/(auth)/dashboard/page.tsx` | Dashboard / Métricas | Visão geral do faturamento, contas a receber, estoque baixo, gráfico e atalhos |
| `/produtos` | `src/app/(auth)/produtos/page.tsx` | Listagem / Gerenciamento | Catálogo de produtos, busca, filtros por categoria, status, importação e exportação |
| `/nova-venda` | `src/app/(auth)/nova-venda/page.tsx` | Ponto de Venda (PDV) | Carrinho ágil com leitor de código de barras, seleção de clientes e checkout híbrido |
| `/clientes` | `src/app/(auth)/clientes/page.tsx` | Listagem / Gerenciamento | Gestão de clientes, busca, filtros de pendência/status, detalhe e histórico de compras |
| `/estoque` | `src/app/(auth)/estoque/page.tsx` | Movimentações / Auditoria | Histórico de entradas, saídas, ajustes e estornos com registro manual |
| `/historico` | `src/app/(auth)/historico/page.tsx` | Listagem / Histórico | Histórico geral de vendas, filtros por período e status, comprovante e cancelamento |
| `/relatorios` | `src/app/(auth)/relatorios/page.tsx` | Relatórios / Análises | Relatórios analíticos de vendas, produtos, clientes devedores e exportação PDF |
| `/usuarios` | `src/app/(auth)/usuarios/page.tsx` | Listagem / Gerenciamento | Gestão de operadores da loja, grupos de acesso e limites individuais de desconto |
| `/configuracoes` | `src/app/(auth)/configuracoes/page.tsx` | Configurações / Seções | Dados cadastrais da loja, regras de estoque/venda, grupos RBAC e exclusão |
| `/registros` | `src/app/(auth)/registros/page.tsx` | Auditoria / Logs | Timeline completa de atividades da loja com filtros por módulo e operador |
| `/mais` | `src/app/(auth)/mais/page.tsx` | Menu / Navegação Mobile | Hub exclusivo para dispositivos móveis com atalhos para páginas secundárias e logout |

---

## 2. Categorização das Páginas

### 2.1. Páginas de Listagem e Gerenciamento (CRUDs Principais)
- **Exemplos:** `/produtos`, `/clientes`, `/usuarios`, `/historico`, `/estoque`.
- **Finalidade:** Visualizar listagens extensas de registros, realizar buscas em tempo real, aplicar múltiplos filtros combinados, acionar ações em lote ou individuais (adicionar, editar, alternar status ativo/inativo, visualizar e excluir).
- **Padrão Estrutural:**
  - Cabeçalho com campo de busca e botão Popover de filtros compactos.
  - No desktop: barra com botões de ação em formato pílula (`rounded-full`) alinhados à direita e tabela tabular.
  - No mobile: `MobileActionFab` flutuante no canto inferior direito, paginação compacta acima da lista e visualização dividida em cartões com `divide-y`.

### 2.2. Páginas de Ponto de Venda e Operação Rápida
- **Exemplo:** `/nova-venda`.
- **Finalidade:** Operação de balcão de alta velocidade com leitor de código de barras, seleção de variações e checkout.
- **Padrão Estrutural:**
  - Seletor rápido de cliente em Card no topo.
  - Botão de adicionar produtos em estilo tracejado (`border-dashed`).
  - Carrinho com controles de quantidade rápidos (`-` e `+`) e edição de preço unitário em produtos com preço aberto.
  - Fluxo de pagamento em 2 etapas: seleção de itens -> Drawer de checkout (no mobile) ou Dialog centralizado (no desktop).

### 2.3. Páginas de Dashboard e Indicadores
- **Exemplo:** `/dashboard`.
- **Finalidade:** Apresentação executiva de faturamento, vendas pendentes, alertas de estoque e gráfico de desempenho.
- **Padrão Estrutural:**
  - Saudação personalizada no topo com nome do usuário e botão de configurações do dashboard.
  - Filtro segmentado de períodos (Hoje / Semana / Mês).
  - Cards de KPI (`StatCard`) com borda lateral colorida e ícone neutro em container circular. No mobile, organizados em carrossel horizontal com efeito de encaixe magnético (`snap-mandatory`). No desktop, em grid responsivo de 2 ou 3 colunas.
  - Gráfico de barras SVG nativo responsivo (`SalesPeriodChart`).

### 2.4. Páginas de Configurações e Preferências
- **Exemplo:** `/configuracoes`.
- **Finalidade:** Gerenciamento dos dados da empresa, notificações, regras de negócio e administração de dados.
- **Padrão Estrutural:**
  - Seções verticais em Cards expansíveis/retráteis com cabeçalho clicável e rotação de chevron.
  - Formulários com comparação de estado original para habilitar botões de salvar/descartar.
  - Ações destrutivas (exclusão de dados ou exclusão da conta) isoladas em seção de perigo com validação obrigatória de senha e confirmação híbrida (Drawer no mobile, AlertDialog no desktop).

### 2.5. Páginas de Relatórios e Exportação
- **Exemplo:** `/relatorios`.
- **Finalidade:** Geração de relatórios com cruzamento de dados e download de documentos formatados em PDF.
- **Padrão Estrutural:**
  - Cabeçalho com título e botão de filtros (Drawer no mobile / Dialog no desktop).
  - Seletor de tipo de relatório em pílulas/cards.
  - Tabela de pré-visualização paginada e botão de exportação via `jspdf-autotable`.

### 2.6. Páginas de Auditoria e Logs
- **Exemplo:** `/registros`.
- **Finalidade:** Rastreabilidade cronológica de todas as ações executadas no sistema por todos os operadores.
- **Padrão Estrutural:**
  - Seletor de categorias em pílulas horizontais.
  - Filtros avançados com tags/chips de filtros ativos removíveis.
  - Card único com lista de atividades dividida por separadores sutis e paginação com `TablePagination`.

### 2.7. Telas de Autenticação e Onboarding
- **Exemplos:** `/login`, `/cadastro`, `/onboarding`.
- **Finalidade:** Entrada e configuração inicial do sistema.
- **Padrão Estrutural:**
  - No desktop: layout de duas colunas (split screen) com gradiente e branding à esquerda, e formulário limpo à direita.
  - No mobile: layout vertical com logo centralizado e campos em largura total.
  - No onboarding: assistente em 4 etapas com barra de progresso no topo, cards clicáveis com seleção visual e botão de pular.

---

## 3. Análise Detalhada Página por Página

### 3.1. Produtos (`/produtos`)
- **Arquivo Principal:** `src/app/(auth)/produtos/page.tsx`
- **Componentes Auxiliares:** `data-table.tsx`, `columns.tsx`, `product-form.tsx`, `products-import-modal.tsx`, `products-config-modal.tsx`.
- **Componentes Visuais Utilizados:** `ProductsDataTable`, `MobileActionFab`, `ProductThumb`, `Badge`, `Popover`, `Select`, `Input`, `AlertDialog`, `LoadingButton`, `GlobalLoader`.
- **Versão Desktop:**
  - Barra de ferramentas superior com busca (`w-[40%]`, altura `h-11`), botão Popover de filtros com BoxIcon `slider-alt` e botões de ação em pílula à direita (Movimentações, Configurações, Importar, Exportar, Adicionar).
  - Tabela TanStack dentro de `Card border-border/70 p-0` com `table-fixed`.
  - Coluna de status com Switch e coluna de ações com botão de 3 pontos (`dots-vertical-rounded`).
  - Paginação desktop posicionada **abaixo da tabela**.
- **Versão Mobile:**
  - Paginação mobile compacta posicionada **acima da lista**.
  - Lista de produtos em cartão único com cantos `rounded-2xl` e divisores `divide-y divide-border/50`. Cada linha traz thumbnail (`ProductThumb`), nome, badge de inativo se aplicável, estoque com badge de tom dinâmico (emerald/amber/rose), preço formatado e botão de ações com menu Popover.
  - `MobileActionFab` no canto inferior direito para adicionar, importar, exportar ou configurar.
- **Padrões Compartilhados:** Popover de filtros, MobileActionFab, formulário híbrido Drawer/Dialog.
- **Particularidades a Preservar:** Respeito à flag `trackStock` (quando desativada, oculta badges e filtros de estoque baixo).

### 3.2. Clientes (`/clientes`)
- **Arquivo Principal:** `src/app/(auth)/clientes/page.tsx`
- **Componentes Auxiliares:** `data-table.tsx`, `columns.tsx`, `client-form.tsx`, `client-detail.tsx`, `delete-client.tsx`, `clients-import-modal.tsx`.
- **Componentes Visuais Utilizados:** `ClientsDataTable`, `TablePagination`, `ClientForm`, `ClientDetail`, `DeleteClient`, `MobileActionFab`, `Popover`, `Input`, `Badge`, `Button`.
- **Versão Desktop:**
  - Barra superior de busca e filtros idêntica à de produtos.
  - Componente compartilhado `TablePagination` posicionado **acima da tabela**.
  - Tabela com colunas: Nome, Telefone formatado com `maskPhone`, Total Gasto (`currency`), Pendências com badge `destructive` e Ações.
- **Versão Mobile:**
  - Paginação `TablePagination` acima da listagem.
  - Lista em cartão com `divide-y`, destacando valor pendente em badge destrutivo quando houver fiado em aberto.
  - Ações via Popover com opção "Visualizar" que abre o `ClientDetail`.
- **Particularidades a Preservar:** Proteção de integridade do cliente "Consumidor Final" (não exibe ações de excluir ou desativar).

### 3.3. Usuários (`/usuarios`)
- **Arquivo Principal:** `src/app/(auth)/usuarios/page.tsx`
- **Componentes Auxiliares:** `data-table.tsx`, `columns.tsx`, `UserForm`, `DeleteUser`, `ResetPasswordModal`.
- **Componentes Visuais Utilizados:** `UsersDataTable`, `Drawer`, `Dialog`, `AlertDialog`, `LoadingButton`, `Switch`, `Select`, `ScrollArea`, `Input`, `Label`.
- **Versão Desktop:**
  - Tabela com Colunas de Nome, E-mail, Grupo de Acesso, Desconto Máximo, Status (Switch interativo) e Menu de Ações.
  - Formulário `UserForm` abre em `Dialog sm:max-w-lg`.
- **Versão Mobile:**
  - Formulário `UserForm` abre em `Drawer` com `h-[90vh]`, `ScrollArea` no miolo e rodapé fixo com Salvar e Cancelar.
  - Lista mobile com cartões detalhando limites de desconto individual ou herdado.
- **Particularidades a Preservar:** Proteção contra alteração ou exclusão do primeiro administrador da loja (`lojaOwnerId`).

### 3.4. Estoque (`/estoque`)
- **Arquivo Principal:** `src/app/(auth)/estoque/page.tsx`
- **Componentes Auxiliares:** `stock-movement-dialog.tsx`.
- **Componentes Visuais Utilizados:** `Table`, `Card`, `Badge`, `Select`, `Input`, `Button`, `StockMovementDialog`.
- **Versão Desktop:**
  - Banner de aviso caso o controle de estoque esteja desativado.
  - Busca rápida e Select de tipo em linha (`w-44 shrink-0`).
  - Tabela completa de movimentações com colunas Data/Hora, Operação, Produto/Variação, Quantidade (+/-), Saldo anterior e resultante, Responsável e Observações.
- **Versão Mobile:**
  - Lista de movimentações em **cards individuais separados** (`Card className="border-border/70 p-3.5 space-y-2.5"`).
- **Particularidades a Preservar:** Cores semânticas para operações (Entrada/Verde, Saída/Âmbar, Venda/Violeta, Ajuste/Azul, Estorno/Cinza).

### 3.5. Histórico de Vendas (`/historico`)
- **Arquivo Principal:** `src/app/(auth)/historico/page.tsx`
- **Componentes Auxiliares:** `data-table.tsx`, `columns.tsx`, `SaleVoucher`, `AlertDialog`.
- **Componentes Visuais Utilizados:** `SalesDataTable`, `TablePagination`, `SaleStatusBadge`, `Drawer`, `Dialog`, `SaleVoucher`.
- **Versão Desktop:**
  - Barra superior de busca e Popover de filtros com período (Hoje, 7 dias, 30 dias, Mês, Personalizado com datas de início e fim).
  - Tabela com ID/Código da venda, Cliente, Data/Hora, Total, Forma de Pagamento e Status.
  - Clique na linha abre detalhes da venda em Dialog.
- **Versão Mobile:**
  - Paginação `TablePagination` acima da listagem.
  - Cards com divisores, status da venda em `SaleStatusBadge` e menu de ações para emitir comprovante WhatsApp, marcar como pago ou cancelar.
  - Detalhe da venda abre em `Drawer`.

### 3.6. Nova Venda (`/nova-venda`)
- **Arquivo Principal:** `src/app/(auth)/nova-venda/page.tsx`
- **Componentes Auxiliares:** `ClientPicker`, `ProductPicker`, `VariantPicker`, `BarcodeScanner`.
- **Componentes Visuais Utilizados:** `Card`, `Button`, `Input`, `Select`, `ScrollArea`, `Drawer`, `Dialog`, `AlertDialog`.
- **Versão Desktop:**
  - Card de seleção de cliente no topo.
  - Botão de adicionar produto tracejado.
  - Itens no carrinho com thumbnail, nome, input rápido de preço aberto quando aplicável e botões `+` e `-`.
  - Botão de finalizar que aciona modal `Dialog sm:max-w-md` para seleção de forma de pagamento, desconto e status.
- **Versão Mobile:**
  - Interface adaptada para uso com apenas uma mão.
  - Finalização abre `Drawer` inferior com todas as opções de pagamento e botão confirmar em pílula larga na base.

### 3.7. Dashboard (`/dashboard`)
- **Arquivo Principal:** `src/app/(auth)/dashboard/page.tsx`
- **Componentes Auxiliares:** `SalesPeriodChart`, `StatCard`, `DashboardConfigModal`.
- **Componentes Visuais Utilizados:** `Card`, `Badge`, `Button`, `BoxIcon`, `GlobalLoader`.
- **Versão Desktop:**
  - Grid de StatCards no topo (2 ou 3 colunas dependendo do card de estoque baixo).
  - Gráfico de barras interativo SVG com tooltip em hover.
  - Seções de produtos com estoque crítico e vendas recentes.
- **Versão Mobile:**
  - StatCards em carrossel horizontal deslizável com snap.
  - Botão de configurações do dashboard em ícone compacto quadrado `size-11 rounded-xl`.

### 3.8. Configurações (`/configuracoes`)
- **Arquivo Principal:** `src/app/(auth)/configuracoes/page.tsx`
- **Componentes Auxiliares:** `groups-section.tsx`.
- **Componentes Visuais Utilizados:** `Card`, `CardHeader`, `CardTitle`, `Switch`, `Input`, `Label`, `Button`, `LoadingButton`, `AlertDialog`, `Drawer`.
- **Estrutura:** Dividida em 5 seções em Cards expansíveis com cabeçalhos interativos.

### 3.9. Relatórios (`/relatorios`)
- **Arquivo Principal:** `src/app/(auth)/relatorios/page.tsx`
- **Componentes Visuais Utilizados:** `Card`, `Select`, `Input`, `Button`, `Drawer`, `Dialog`, `jspdf-autotable`.
- **Estrutura:** Topo com título, descrição e botão de filtros. Corpo com cards seletores dos 5 relatórios e tabela de resultados com geração de PDF.

### 3.10. Registros de Auditoria (`/registros`)
- **Arquivo Principal:** `src/app/(auth)/registros/page.tsx`
- **Componentes Visuais Utilizados:** `Card`, `TablePagination`, `Button`, `Input`, `Drawer`, `Dialog`.
- **Estrutura:** Pílulas de categorias, tags de filtros ativos removíveis e timeline paginada de auditoria.

### 3.11. Menu Mobile (`/mais`)
- **Arquivo Principal:** `src/app/(auth)/mais/page.tsx`
- **Visibilidade:** Exclusivamente mobile (`md:hidden`).
- **Componentes Visuais Utilizados:** `Link` em Card, ícones circulares com fundo `bg-primary/10`, `ChevronRight` e botão de logout em tom vermelho.

### 3.12. Autenticação e Onboarding (`/login`, `/cadastro`, `/onboarding`)
- **Arquivos:** `src/app/login/login-form.tsx`, `src/app/cadastro/register-form.tsx`, `src/app/onboarding/onboarding-wizard.tsx`.
- **Estrutura:** Login e cadastro com split screen em telas grandes e centralizado no mobile. Onboarding com wizard de 4 etapas, barra de progresso no topo e cards de seleção com contorno azul ativo.

---

## 4. Registro Consolidado de Inconsistências Identificadas

Durante a auditoria, foram identificadas as seguintes divergências no frontend do Zelo. Conforme as regras inegociáveis, **essas divergências não foram alteradas no código** e encontram-se documentadas abaixo:

### Inconsistência #1: Posicionamento e Componente de Paginação
- **Telas Envolvidas:** `/produtos` vs. `/clientes`, `/historico`, `/registros` vs. `/estoque`.
- **Diferença Observada:**
  - Em `/clientes`, `/historico` e `/registros`, o componente compartilhado `<TablePagination />` é utilizado **acima da listagem** tanto no desktop quanto no mobile.
  - Em `/produtos`, a paginação é feita inline: no mobile fica acima da listagem com controles compactos, mas no desktop fica **abaixo da tabela**.
  - Em `/estoque`, não se utiliza `<TablePagination />` nem TanStack: a paginação é manual com botões de texto ("Anterior" / "Próxima") **abaixo da tabela**.
- **Padrão Predominante:** Uso do componente compartilhado `<TablePagination />`.
- **Impacto Visual:** Quebra de simetria na transição entre catálogo de produtos e lista de clientes.
- **Intencional ou Acidental:** Acidental (fruto de refatorações incrementais em épocas diferentes).
- **Necessidade de Decisão Futura:** Definir se a paginação de tabelas desktop deve ficar sempre acima ou sempre abaixo de forma unificada.

### Inconsistência #2: Formato dos Contêineres de Lista no Mobile
- **Telas Envolvidas:** `/produtos`, `/clientes`, `/historico` vs. `/estoque`.
- **Diferença Observada:**
  - Em `/produtos`, `/clientes` e `/historico`, os itens mobile são agrupados em um **único contêiner card** com cantos `rounded-2xl` e divisores de linha `divide-y divide-border/50`.
  - Em `/estoque`, cada movimentação é renderizada em um **Card individual separado** (`grid grid-cols-1 gap-2.5`).
- **Padrão Predominante:** Contêiner único com `divide-y`.
- **Impacto Visual:** A tela de estoque apresenta maior espaçamento vertical e menor densidade de informação no mobile.
- **Intencional ou Acidental:** Possivelmente intencional devido ao maior número de detalhes de cada movimentação (saldo anterior, saldo final, responsável e observação).

### Inconsistência #3: Altura e Estilo dos Inputs de Busca
- **Telas Envolvidas:** `/produtos`, `/clientes`, `/historico` vs. `/estoque`, `/registros`.
- **Diferença Observada:**
  - Em `/produtos`, `/clientes` e `/historico`, o campo de busca possui classe `h-11 rounded-xl bg-white dark:bg-card border-border/70 shadow-xs pl-10 text-sm`.
  - Em `/estoque` e `/registros`, o campo de busca possui classe `h-9 text-sm pl-9`.
- **Padrão Predominante:** `h-11 rounded-xl` em telas principais de gerenciamento de cadastros.
- **Impacto Visual:** Diferença perceptível na altura do controle de pesquisa ao navegar entre telas.
- **Intencional ou Acidental:** Acidental. Recomenda-se adotar `h-11 rounded-xl` para buscas principais de páginas.

### Inconsistência #4: Ícone do Botão de Filtros
- **Telas Envolvidas:** `/produtos`, `/clientes`, `/historico` vs. `/relatorios`.
- **Diferença Observada:**
  - Em `/produtos`, `/clientes` e `/historico`, o botão de abrir filtros utiliza o BoxIcon `slider-alt`.
  - Em `/relatorios`, utiliza o BoxIcon `filter`.
- **Padrão Predominante:** `BoxIcon name="slider-alt"`.
- **Impacto Visual:** Pequena divergência visual no ícone representativo de filtros.
- **Intencional ou Acidental:** Acidental.

### Inconsistência #5: Raio de Borda do Botão Salvar nos Formulários
- **Telas Envolvidas:** `UserForm`, `ClientForm` vs. `ProductForm`.
- **Diferença Observada:**
  - No mobile, todos usam `LoadingButton className="h-11 w-full rounded-full font-medium"`.
  - No desktop, `UserForm` e `ClientForm` utilizam o botão com tamanho padrão e cantos padrão, enquanto `ProductForm` utiliza explicitamente `rounded-xl h-11 px-7 text-sm font-semibold`.
- **Padrão Predominante:** `rounded-full` no mobile e `rounded-xl` / default no desktop.
- **Impacto Visual:** Mínimo.
