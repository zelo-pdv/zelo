# 14 - Cards, Badges e Feedbacks

Este documento define os padrões visuais e de interação para apresentação de informações condensadas, indicadores de status, estados de carregamento, telas vazias e notificações no **Zelo**.

---

## 1. Cards de Resumo e Indicadores (KPIs)

O Zelo adota dois modelos consagrados de cards para resumir dados:

### 1.1. `StatCard` (Dashboard Executivo)
Utilizado em `/dashboard` para exibir métricas-chave de vendas e estoque:

```tsx
function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
  iconSolid = true,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "@container/card relative overflow-hidden transition-all duration-200",
        tone === "default" && "border-l-4 border-l-primary/60",
        tone === "pending" && "border-l-4 border-l-amber-500/60",
        tone === "warn" && "border-l-4 border-l-destructive/60",
        tone === "success" && "border-l-4 border-l-emerald-500/60",
      )}
    >
      <CardContent className="p-4 md:p-5 flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </div>
          <div className="mt-1.5 truncate text-xl font-semibold tracking-tight md:text-2xl tabular-nums">
            {value}
          </div>
          {hint && (
            <div className="mt-1 text-xs text-muted-foreground truncate">
              {hint}
            </div>
          )}
        </div>
        {icon && (
          <div
            className="shrink-0 flex items-center justify-center size-12 sm:size-14 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-500 select-none pointer-events-none"
            aria-hidden="true"
          >
            <BoxIcon name={icon} className="text-2xl sm:text-[28px] text-current" solid={iconSolid} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- **Borda de Acento à Esquerda (`border-l-4`):** Identifica visualmente o tom sem colorir o card inteiro de forma agressiva.
- **Ícone em Container Circular:** Container neutro circular de 48px a 56px (`rounded-full bg-zinc-100 dark:bg-zinc-800/80`).

### 1.2. `MiniStat` (Detalhes Rápidos)
Utilizado em sobreposições de detalhes para dados secundários:
```tsx
<div className="rounded-xl border border-border bg-card px-3 py-2">
  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
    Total Pago
  </div>
  <div className="mt-0.5 truncate text-sm font-semibold tabular-nums text-foreground">
    R$ 1.450,00
  </div>
</div>
```

---

## 2. Badges e Indicadores de Status

### 2.1. O Componente `<Badge />`
- **Arquivo:** `src/components/ui/badge.tsx`
- **Formato:** Formato de pílula arredondada `rounded-4xl` com altura compacta `h-5 px-2 py-0.5 text-xs font-medium`.

### 2.2. Badge Especializado de Vendas (`<SaleStatusBadge />`)
Localizado em `src/components/sale-status-badge.tsx`, padroniza os status de vendas em todo o sistema:

```tsx
<SaleStatusBadge status={sale.status} />
```

| Status | Variante | Estilos Aplicados | Significado Visual |
|---|---|---|---|
| **`PAGO`** | `secondary` | `bg-secondary text-secondary-foreground font-medium` | Venda concluída e faturada (tom neutro de alto contraste) |
| **`PENDENTE`** | `outline` | `border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium` | Venda fiado ou a receber (atenção sem alarme) |
| **`CANCELADO`**| `outline` | `border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20 font-medium` | Venda cancelada com estorno de estoque |

### 2.3. Badges de Nível de Estoque
Utilizados em `/produtos` e `/estoque`:
- **Estoque Regular:** `bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400` com ponto circular `bg-emerald-500`.
- **Estoque Baixo:** `bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400` com ponto circular `bg-amber-500`.
- **Estoque Negativo / Esgotado:** `bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400` com ponto circular `bg-rose-500`.

---

## 3. Feedback do Usuário: Notificações com Sonner

Todas as mensagens de retorno da API utilizam a biblioteca **`sonner`**, customizada em `src/components/ui/sonner.tsx` para integrar os ícones do sistema:

### 3.1. Ícones Mapeados no Toaster
- **Sucesso:** `<BoxIcon name="check-circle" solid className="text-base text-current" />`
- **Erro:** `<BoxIcon name="x-circle" solid className="text-base text-current" />`
- **Aviso:** `<BoxIcon name="error" solid className="text-base text-current" />`
- **Informação:** `<BoxIcon name="info-circle" solid className="text-base text-current" />`
- **Carregamento:** `<BoxIcon name="loader-alt" className="text-base bx-spin text-current" />`

### 3.2. Boas Práticas na Criação de Mensagens
- Mensagens devem ser descritivas e positivas (ex.: `"Produto cadastrado com sucesso!"` em vez de apenas `"Salvo"`).
- Em casos de erro, comunique o motivo real ou use mensagem de salvaguarda acolhedora (ex.: `toast.error(error.message || "Não foi possível conectar ao servidor. Tente novamente.")`).

---

## 4. Estados de Carregamento e Telas Vazias

### 4.1. Carregador Global (`<GlobalLoader />`)
- **Arquivo:** `src/components/ui/global-loader.tsx`
- Utilizado no carregamento inicial de telas protegidas (`loading = true`). Exibe spinner elegante da marca centralizado na tela.

### 4.2. Estado Vazio (Empty State)
Quando uma tabela ou consulta não retorna registros:

```tsx
<Card className="border-border/70 p-12 text-center">
  <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
    <BoxIcon name="package" className="text-4xl opacity-40" />
    <p className="text-sm font-medium text-foreground">
      Nenhum produto cadastrado na loja
    </p>
    <p className="text-xs text-muted-foreground max-w-sm">
      Comece adicionando seu catálogo de produtos para poder realizar vendas no balcão.
    </p>
    <Button
      type="button"
      onClick={onCreateClick}
      className="rounded-full mt-2"
    >
      <BoxIcon name="plus" className="mr-1.5 text-base" /> Cadastrar primeiro produto
    </Button>
  </div>
</Card>
```
- **Elementos Obrigatórios:** Ícone do domínio em tamanho `text-4xl opacity-40`, título acolhedor, descrição curta e botão de ação primária que inicia o fluxo.
