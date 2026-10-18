# 13 - Tabelas e Paginação

Este documento documenta os padrões estruturais, estilos, colunas de ações e componentes de navegação paginada no **Zelo**.

---

## 1. Tabelas no Desktop (TanStack Table)

Para gerenciar ordenação, filtragem e paginação eficiente no cliente, o Zelo utiliza o **TanStack Table v8** associado aos componentes primitivos de tabela (`src/components/ui/table.tsx`).

### 1.1. Estrutura do Contêiner da Tabela
A tabela deve sempre ser encapsulada dentro de um `Card` sem padding interno para garantir bordas suaves, cantos arredondados e integridade visual:

```tsx
<div className="hidden md:block">
  <Card className="border-border/70 p-0 overflow-hidden">
    <CardContent className="p-0">
      <div className="w-full overflow-x-auto">
        <Table className="table-fixed w-full">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
</div>
```

---

## 2. Padrões de Colunas e Formatação

| Tipo de Dado | Alinhamento | Classes Recomendadas | Exemplo de Renderização |
|---|---|---|---|
| **Nome / Identificação** | Esquerda (`text-left`) | `font-medium text-sm text-foreground truncate` | "Camiseta Dry Fit Preta" |
| **Imagem / Thumbnail** | Esquerda | `w-14 shrink-0` | `<ProductThumb />` de 48px |
| **Valores Monetários** | Direita (`text-right`) | `font-semibold tabular-nums text-foreground` | `currency(item.salePrice)` |
| **Quantidades e Estoque** | Direita (`text-right`) | `tabular-nums text-sm` com badge de tom | `12 un.` com indicador de cor |
| **Datas e Horários** | Esquerda ou Centro | `text-xs text-muted-foreground tabular-nums` | `dateTime(item.date)` |
| **Status / Ativo** | Centralizado | `<Badge />` ou `<Switch />` | `<SaleStatusBadge status={item.status} />` |
| **Ações do Registro** | Direita (`text-right`) | `w-14 text-right` | Botão 3 pontos com Popover |

### 2.1. Menu de Ações da Linha
Na última coluna de cada linha, utiliza-se o botão de 3 pontos com menu suspenso:
```tsx
<Popover>
  <PopoverTrigger
    render={
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
        aria-label="Ações do registro"
      >
        <BoxIcon name="dots-vertical-rounded" className="text-lg" />
      </Button>
    }
  />
  <PopoverContent className="w-48 p-1.5" align="end">
    {/* Botões: Visualizar, Editar, Ativar/Desativar, Excluir */}
  </PopoverContent>
</Popover>
```

---

## 3. O Componente de Paginação (`<TablePagination />`)

O Zelo centraliza o controle de paginação no componente **`<TablePagination />`** (`src/components/ui/table-pagination.tsx`).

### 3.1. Propriedades e Sintaxe
```tsx
<TablePagination
  pageIndex={pageIndex}
  pageSize={pageSize}
  totalFiltered={totalFiltered}
  pageCount={table.getPageCount()}
  canPreviousPage={table.getCanPreviousPage()}
  canNextPage={table.getCanNextPage()}
  onPreviousPage={() => table.previousPage()}
  onNextPage={() => table.nextPage()}
/>
```

### 3.2. Anatomia Visual:
- **Indicador de Intervalo:** Exibido à esquerda em `text-sm font-medium text-muted-foreground`:
  `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, totalFiltered)} de ${totalFiltered}` (ou `"0 de 0"` quando vazio).
- **Controles de Navegação:** Exibidos à direita com:
  - Botão Anterior: `Button size="icon" variant="outline" className="h-9 w-9 rounded-xl border border-border/70"` com BoxIcon `chevron-left`.
  - Página Atual: `"1 / 3"` tabular com `px-1 font-medium text-muted-foreground`.
  - Botão Próximo: Botão idêntico com BoxIcon `chevron-right`.

---

## 4. Paginação: Padrões e Inconsistências Identificadas

### 4.1. [PADRÃO CONFIRMADO]: Paginação Acima da Listagem
Nas telas `/clientes`, `/historico` e `/registros`, o componente `<TablePagination />` é posicionado **acima da listagem** (`mb-3 px-0.5`).
- **Vantagem:** O usuário visualiza o volume de dados e navega entre páginas sem necessidade de rolar tabelas extensas.

### 4.2. [INCONSISTÊNCIA ENCONTRADA]: Paginação em `/produtos`
Na tela `/produtos`:
- No **mobile**, a paginação fica acima da listagem.
- No **desktop**, a paginação fica **abaixo da tabela**, implementada com markup inline (botões `h-8 w-8`) em vez de reutilizar `<TablePagination />`.
- **Recomendação para novos desenvolvimentos:** Utilizar o componente compartilhado `<TablePagination />` acima da listagem.

### 4.3. [INCONSISTÊNCIA ENCONTRADA]: Paginação em `/estoque`
Na tela `/estoque`:
- A paginação é feita via backend com botões textuais ("Anterior" / "Próxima") abaixo da tabela, sem o componente `<TablePagination />`.

---

## 5. Tamanho de Páginas (PageSize) Responsivo

O Zelo adota diferentes limites de registros dependendo da tela:
- **No Mobile:** Limite compacto de **5 registros por página** para evitar rolagem vertical excessiva em celulares.
- **No Desktop:** Limite de **8 a 10 registros por página** em tabelas gerais, e **25 a 40 registros** em auditorias e movimentações.

```tsx
// Efeito comum nas páginas do Zelo:
useEffect(() => {
  table.setPageSize(isMobile ? 5 : 8);
}, [isMobile, table]);
```
Ao alterar filtros de busca ou status, a tabela é resetada automaticamente para a primeira página:
```tsx
useEffect(() => {
  table.setPageIndex(0);
}, [globalFilter, statusFilter, table]);
```
