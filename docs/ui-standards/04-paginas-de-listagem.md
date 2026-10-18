# 04 - Páginas de Listagem e Gerenciamento

Este documento define a arquitetura oficial das páginas cuja finalidade é listar, pesquisar, filtrar, adicionar, editar e excluir registros no **Zelo** (ex.: Produtos, Clientes, Usuários, Histórico de Vendas e Movimentações de Estoque).

---

## 1. Visão Geral da Anatomia de Listagem

As telas de gerenciamento do Zelo são estruturadas em três blocos essenciais:

```text
+--------------------------------------------------------------------------+
| 1. BARRA SUPERIOR DE FERRAMENTAS                                         |
| [Ícone Busca + Input de Pesquisa] [Filtros (Popover)]      [Ações Desktop] |
+--------------------------------------------------------------------------+
| 2. BARRA DE PAGINAÇÃO (Padrão predominante: acima da listagem)           |
| "1–8 de 24"                                          [<] [ 1 / 3 ] [>]   |
+--------------------------------------------------------------------------+
| 3. ÁREA DE DADOS                                                         |
| - Desktop: Tabela em Card com cabeçalho fixo e hover nas linhas          |
| - Mobile:  Cartão agrupado com cantos arredondados e divisores divide-y  |
+--------------------------------------------------------------------------+
| 4. BOTÃO FLUTUANTE MOBILE (Canto inferior direito)                       |
|                                                                    ( + ) |
+--------------------------------------------------------------------------+
```

---

## 2. Barra Superior de Ferramentas (Busca e Filtros)

O cabeçalho operacional combina o campo de busca em tempo real com o botão de filtros e as ações da tela.

### 2.1. Estrutura de Código Recomendada
```tsx
<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
  {/* Lado Esquerdo: Busca e Filtros */}
  <div className="flex items-center gap-2 w-full sm:flex-1">
    {/* Campo de Busca */}
    <div className="relative w-full sm:w-[40%] sm:max-w-[40%] min-w-0">
      <BoxIcon
        name="search"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-muted-foreground pointer-events-none"
      />
      <Input
        placeholder="Buscar..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        autoComplete="new-password"
        name="search-table"
        id="search-table"
        className="rounded-xl pl-10 h-11 bg-white dark:bg-card border-border/70 w-full text-sm shadow-xs"
      />
    </div>

    {/* Botão de Filtros com Popover */}
    <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="rounded-xl shrink-0 h-11 px-3 sm:px-4 gap-1.5 text-xs sm:text-sm font-medium border-border/70 bg-white dark:bg-card shadow-xs cursor-pointer"
            aria-label="Abrir filtros"
          >
            <BoxIcon name="slider-alt" className="text-lg" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary text-[11px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 p-4 space-y-4">
        {/* Conteúdo interno dos filtros */}
      </PopoverContent>
    </Popover>
  </div>

  {/* Lado Direito: Ações Principais no Desktop */}
  <div className="hidden md:flex items-center gap-2 shrink-0">
    {/* Botões secundários e botão primário */}
  </div>
</div>
```

### 2.2. Regras de Busca e Filtros:
- **Campo de Busca:**
  - Largura no desktop: `sm:w-[40%] sm:max-w-[40%]`.
  - Largura no mobile: `w-full` (ocupa o espaço disponível ao lado do botão de filtro).
  - Altura: `h-11`, borda suave `border-border/70`, fundo `bg-white dark:bg-card`, cantos `rounded-xl`.
  - Ícone de lupa: `BoxIcon name="search"` posicionado absolutamente à esquerda com padding `pl-10`.
- **Botão de Filtros:**
  - Altura: `h-11`, cantos `rounded-xl`, variante `outline`.
  - Ícone oficial: `BoxIcon name="slider-alt"`.
  - Contador de filtros ativos: Exibido como badge circular `flex h-5 w-5 rounded-full bg-primary-foreground text-primary text-[11px] font-bold` quando `activeFiltersCount > 0`.
- **Painel do Popover de Filtros:**
  - Largura padrão: `w-80 p-4 space-y-4`.
  - Grupos de filtro com título em caixa alta: `text-xs font-semibold text-muted-foreground uppercase tracking-wider`.
  - Botão de limpar: `Button variant="destructive" size="sm" className="w-full text-xs font-medium"` com texto `"Limpar dados"` ou `"Limpar filtros"`, desabilitado quando não houver filtros ativos.

---

## 3. Ações da Página (Desktop vs. Mobile)

### 3.1. Versão Desktop (`hidden md:flex`)
No desktop, todas as ações são organizadas horizontalmente à direita da barra superior:
- **Botões de Ação Secundária (Importar, Exportar, Configurar, Ver Histórico):**
  - Formato pílula: `Button variant="outline" size="sm" className="rounded-full shrink-0 gap-1.5 cursor-pointer"`
  - Ícones representativos com BoxIcon (`upload`, `download`, `cog`, `transfer`).
- **Botão de Ação Primária (Novo Registro / Adicionar):**
  - Formato pílula com preenchimento: `Button variant="default" size="sm" className="rounded-full shrink-0 gap-1 cursor-pointer font-medium"`
  - Ícone BoxIcon `plus` e label direto: `"Adicionar"`.

### 3.2. Versão Mobile (`md:hidden`)
No mobile, as ações da barra superior são ocultadas para preservar espaço para busca e filtros, sendo substituídas pelo componente **`MobileActionFab`**:
- Fica fixo no canto inferior direito em `bottom-[calc(84px+env(safe-area-inset-bottom))]` (perfeitamente acima da BottomNavigation).
- Botão circular principal de 56px (`size-14 rounded-full bg-primary`) com ícone `plus`.
- Ao tocar, o botão rotaciona 45 graus (transformando-se em um "x" de fechar com fundo vermelho `bg-rose-500`) e expande os botões secundários verticalmente com animação suave e stagger de delay.

---

## 4. Apresentação dos Dados: Tabela vs. Cards

### 4.1. Visualização em Tabela no Desktop (`hidden md:block`)
A tabela deve sempre ser envolvida por um `Card` sem padding interno para manter as bordas arredondadas e a elevação:

```tsx
<div className="hidden md:block">
  <Card className="border-border/70 p-0 overflow-hidden">
    <CardContent className="p-0">
      <div className="w-full overflow-x-auto">
        <Table className="table-fixed w-full">
          <TableHeader>
            {/* Headers da TanStack Table */}
          </TableHeader>
          <TableBody>
            {/* Linhas da Tabela */}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
</div>
```

- **Estilo das Linhas:** `TableRow` possui hover translúcido `hover:bg-muted/30`.
- **Alinhamentos:**
  - Textos e nomes: Alinhados à esquerda (`text-left`).
  - Quantidades, datas e valores monetários: Alinhados à direita (`text-right tabular-nums`).
  - Status e Switches: Centralizados.
  - Coluna de Ações: Largura compacta fixa (ex.: `w-14` ou `w-20`) alinhada à direita com botão de 3 pontos (`dots-vertical-rounded`).

### 4.2. Visualização em Lista Mobile (`md:hidden`)
Em dispositivos móveis, as linhas da tabela se transformam em uma lista densa e compacta dentro de um contêiner unificado:

```tsx
<div className="md:hidden rounded-2xl bg-white dark:bg-card border border-border/70 shadow-xs divide-y divide-border/50 overflow-hidden mb-6">
  {rows.map((row) => (
    <div key={row.id} className="p-3.5 sm:p-4 flex items-center gap-3.5 transition-colors hover:bg-muted/20">
      {/* Imagem / Ícone à esquerda */}
      <ProductThumb name={item.name} image={item.image} className="h-14 w-14 rounded-2xl shrink-0" />
      
      {/* Conteúdo Central */}
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-foreground text-sm line-clamp-1 truncate">
            {item.name}
          </span>
          {/* Badge de status secundário se houver */}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{/* Dado secundário */}</span>
          <span className="text-muted-foreground/40 font-light">|</span>
          <span className="font-semibold text-foreground">{/* Valor principal */}</span>
        </div>
      </div>

      {/* Menu de Ações (3 pontos) */}
      <Popover>
        <PopoverTrigger render={
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0 rounded-lg">
            <BoxIcon name="dots-vertical-rounded" className="text-lg" />
          </Button>
        } />
        <PopoverContent className="w-48 p-1.5" align="end">
          {/* Itens de ação: Visualizar, Editar, Ativar/Desativar, Excluir */}
        </PopoverContent>
      </Popover>
    </div>
  ))}
</div>
```

---

## 5. Paginação de Dados

O Zelo possui um componente compartilhado dedicado: **`<TablePagination />`** (`src/components/ui/table-pagination.tsx`).

### 5.1. Posição Recomendada
- O padrão predominante em `/clientes`, `/historico` e `/registros` posiciona a paginação **acima da listagem** (`mb-3 px-0.5`).
- Isso permite que o usuário veja a contagem de registros e navegue pelas páginas imediatamente, sem precisar rolar até a base de telas com muitos itens.

### 5.2. Estrutura do Controle
- **Lado Esquerdo:** Indicador textual: `"1–8 de 24"` ou `"0 de 0"` em `text-sm font-medium text-muted-foreground`.
- **Lado Direito:** Controles compactos:
  - Botão Anterior: `Button size="icon" variant="outline" className="h-9 w-9 rounded-xl border border-border/70"` com BoxIcon `chevron-left`.
  - Página Atual: `"1 / 3"` com `tabular-nums font-medium text-muted-foreground`.
  - Botão Próximo: Botão idêntico com BoxIcon `chevron-right`.

---

## 6. Estados e Ciclo de Vida da Listagem

### 6.1. Estado de Carregamento (Loading)
- No carregamento inicial da tela, exibe o componente de tela cheia **`<GlobalLoader />`**.
- Em recarregamentos silenciosos de fundo (ex.: acionados via `useDataSync`), **não exibe loader de tela cheia**, atualizando os dados diretamente sem travar a interface do usuário.

### 6.2. Lista Vazia (Sem Registros Cadastrados)
Quando a tabela não possui nenhum dado cadastrado na loja:
- Renderiza um `Card border-border/70 p-12 text-center` com ícone grande semitransparente (`text-4xl opacity-40`), texto explicativo amigável e um botão de ação primária centralizado: `"Cadastrar primeiro registro"`.

### 6.3. Busca ou Filtros sem Resultados
Quando existem dados na loja, mas o filtro de busca ou status não localizou nenhum resultado:
- Exibe célula/linha única com altura `h-24` ou `h-32`: `"Nenhum resultado encontrado."` com mensagem sugerindo ajustar os termos de pesquisa ou botão `"Limpar filtros"`.

### 6.4. Pós-Operação (Criação, Edição e Exclusão)
- **Criação com Sucesso:** Atualiza a lista local no estado React (`setList([novo, ...prev])`), fecha o modal/drawer, dispara `toast.success("... cadastrado com sucesso!")` e emite evento `notifyLocalSync("recurso")`.
- **Edição com Sucesso:** Atualiza o registro correspondente no estado via `.map()`, fecha o modal e dispara toast de confirmação.
- **Exclusão:** Aciona modal de confirmação `AlertDialog`, bloqueia com estado ocupado no `LoadingButton`, remove o item do estado via `.filter()`, exibe `toast.success("... removido com sucesso!")` e notifica sincronização local.
- **Tratamento de Erros:** Exibe `toast.error(error.message)` com descrição legível do problema, mantendo o formulário aberto para que o usuário não perca os dados digitados.
