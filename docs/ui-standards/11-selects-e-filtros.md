# 11 - Comboboxes, Selects e Controles de Filtros

Este documento estabelece os padrões visuais e funcionais para componentes de seleção com busca (`Combobox`), seleção simples (`Select`), painéis de filtros avançados, chips de filtros ativos e controles temporais no **Zelo**.

---

## 1. O Componente Combobox Compartilhado (Padrão Oficial do Sistema)

O Zelo adota o **`Combobox`** (`src/components/ui/combobox.tsx`) como padrão oficial de seleção em todo o ecossistema (formulários, filtros e tabelas). Ele é construído sobre o padrão Shadcn UI compondo `Popover` (`@base-ui/react/popover`) e `Command` (`cmdk` / `src/components/ui/command.tsx`).

### 1.1. Anatomia e Uso
```tsx
import { Combobox } from "@/components/ui/combobox";

<Combobox
  value={value}
  onValueChange={setValue}
  options={[
    { value: "opcao-1", label: "Opção 1" },
    { value: "opcao-2", label: "Opção 2" },
  ]}
  placeholder="Selecione uma opção"
  searchPlaceholder="Buscar opção..."
  emptyText="Nenhum resultado encontrado."
  triggerClassName="w-full h-9 rounded-lg text-xs sm:text-sm justify-between"
/>
```

### 1.2. Características Técnicas:
- **Gatilho com Indicador de Rotação:** BoxIcon `chevron-down` com opacidade sutil (`opacity-70 text-muted-foreground`), que rotaciona 180° quando o popup está aberto.
- **Campo de Busca Integrado:** Input `CommandInput` no topo do menu com BoxIcon `search`, permitindo filtrar opções instantaneamente por texto, valor ou palavras-chave (`keywords`).
- **Indicador de Item Selecionado:** BoxIcon `check` exibido à direita da opção selecionada.
- **Ancoragem e Responsividade:** Ancorado via `Popover` com Floating UI (`w-(--anchor-width)`), auto-flip em viewports reduzidos e altura limitada a `min(var(--available-height), 15rem)` com rolagem interna suave.
- **Tamanhos e Variantes:** Suporta `size="default"` (`h-8` ou `h-9` nos formulários) e `size="sm"` (`h-8` compacto em filtros de tabelas).

---

## 2. O Componente Select Legado

Para cenários onde um dropdown simples sem campo de busca for necessário, o projeto mantém `src/components/ui/select.tsx` baseado em `@base-ui/react/select`.

### 1.1. Anatomia do Select
```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="w-full h-8 rounded-md text-xs justify-between">
    <SelectValue placeholder="Selecione uma opção" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="opcao-1" className="text-xs">
      Opção 1
    </SelectItem>
    <SelectItem value="opcao-2" className="text-xs">
      Opção 2
    </SelectItem>
  </SelectContent>
</Select>
```

### 1.2. Características Técnicas:
- **Ícone do Gatilho:** BoxIcon `chevron-down` com opacidade sutil (`opacity-70 text-muted-foreground`), renderizado automaticamente no `SelectTrigger`.
- **Indicador de Item Selecionado:** BoxIcon `check` posicionado à direita de cada item ativo.
- **Portais e Posicionamento:** Renderizado via portal com cálculo dinâmico de âncora (`alignItemWithTrigger`), garantindo que o menu não seja cortado por contêineres com `overflow-hidden`.
- **Classes de Destaque:** Em formulários onde a seleção é obrigatória, o gatilho pode receber `border-primary/50 bg-primary/3`.

---

## 2. Painel de Filtros Avançados (Popover de Filtros)

Nas páginas de listagem (`/produtos`, `/clientes`, `/historico`), os filtros múltiplos são agrupados em um **Popover** suspenso acionado pelo botão de filtro da barra superior:

```tsx
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
    {/* Cabeçalho do Filtro */}
    <div className="flex items-center justify-between border-b pb-2">
      <span className="font-semibold text-sm">Filtros Avançados</span>
    </div>

    {/* Grupo 1: Status de Cadastro */}
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
        Status de Cadastro
      </Label>
      <div className="grid grid-cols-3 gap-1">
        <Button
          type="button"
          variant={statusFilter === "Todos" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setStatusFilter("Todos")}
        >
          Todos
        </Button>
        <Button
          type="button"
          variant={statusFilter === "Ativos" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs text-emerald-600 dark:text-emerald-400"
          onClick={() => setStatusFilter("Ativos")}
        >
          Ativos
        </Button>
        <Button
          type="button"
          variant={statusFilter === "Inativos" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs text-muted-foreground"
          onClick={() => setStatusFilter("Inativos")}
        >
          Inativos
        </Button>
      </div>
    </div>

    {/* Grupo 2: Seleção Dropdown */}
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
        Categoria
      </Label>
      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="w-full h-8 rounded-md text-xs justify-between">
          <SelectValue placeholder="Todas as categorias" />
        </SelectTrigger>
        <SelectContent>
          {/* Opções */}
        </SelectContent>
      </Select>
    </div>

    {/* Botão de Limpar */}
    <div className="pt-2">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="w-full text-xs font-medium"
        onClick={clearAllFilters}
        disabled={activeFiltersCount === 0}
      >
        Limpar dados
      </Button>
    </div>
  </PopoverContent>
</Popover>
```

---

## 3. Filtros por Período e Seleção de Datas

Para telas que envolvem filtros temporais (ex.: `/historico`, `/relatorios`, `/registros`), o Zelo adota botões de presets rápidos combinados com campos de data:

### 3.1. Presets de Data Padronizados
- `"Hoje"`, `"Ontem"`, `"Últimos 7 dias"`, `"Últimos 30 dias"`, `"Este mês"`, `"Personalizado"`.
- São organizados em uma grade de botões compactos (`h-7 text-xs`) com variante `default` para o preset selecionado e `outline` para os demais.

### 3.2. Intervalo Customizado
Quando o usuário seleciona `"Personalizado"`:
- Renderiza dois inputs nativos `<Input type="date" />` com altura `h-8 text-xs` em grid de 2 colunas (`Início` e `Fim`), permitindo aplicar o corte temporal preciso sem distorções de fuso horário.

---

## 4. Chips e Tags de Filtros Ativos

Na tela de auditoria (`/registros`), os filtros aplicados recebem representação visual externa em forma de tags/chips removíveis com um clique:

```tsx
<div className="flex flex-wrap items-center gap-1.5 pt-1">
  <span className="text-xs text-muted-foreground font-medium mr-1">Filtros ativos:</span>
  
  {activeCategory !== "todos" && (
    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
      {categoryLabel}
      <button onClick={() => setActiveCategory("todos")} className="hover:opacity-75 cursor-pointer">
        <BoxIcon name="x" className="text-xs" />
      </button>
    </span>
  )}

  <button
    onClick={handleClearFilters}
    className="text-[11px] text-muted-foreground hover:text-red-500 underline ml-1 cursor-pointer"
  >
    Limpar tudo
  </button>
</div>
```

---

## 5. Diferenças de Filtros entre Desktop e Mobile

- **Em Listagens CRUD:** O Popover com `align="end"` funciona de forma idêntica tanto no desktop quanto no mobile, adaptando sua largura à tela.
- **Em Relatórios e Telas Analíticas Complexas (`/relatorios` e `/registros`):**
  - No **Mobile**: Os filtros abrem em **`Drawer` inferior** com rolagem interna, facilitando o toque nos botões de data e seleção de operadores.
  - No **Desktop**: Abrem em **`Dialog` centralizado** (`sm:max-w-md`).
