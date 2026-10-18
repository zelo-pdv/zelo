# 05 - Páginas e Telas de Detalhes

Este documento documenta os padrões visuais e comportamentais para apresentação detalhada de informações no **Zelo** (ex.: visualização profunda de clientes e seus históricos de compras em `ClientDetail`, e detalhe completo de pedidos em `HistoricoPage`).

---

## 1. Padrão Arquitetural de Detalhes

No Zelo, telas de detalhes **não costumam ser páginas inteiras isoladas com nova rota**, mas sim **sobreposições contextuais ricas** acionadas a partir das listagens principais.

Isso preserva o contexto da navegação, a velocidade de consulta no balcão e evita recarregamento desnecessário de dados.

### 1.1. Padrão Híbrido Universal
- **No Mobile (`< 768px`):** Abre em **`Drawer` inferior** com altura de `90vh`, cabeçalho centralizado, área central rolável (`ScrollArea`) e rodapé fixo com ações contextuais.
- **No Desktop (`>= 768px`):** Abre em **`Dialog` centralizado** (`sm:max-w-xl` ou `sm:max-w-md`), com rolagem vertical interna (`max-h-[92vh] overflow-y-auto`) e rodapé alinhado à direita.

```tsx
// Referência: src/components/clients/client-detail.tsx
export default function ClientDetail({ client, sales, onClose }: ClientDetailProps) {
  const isMobile = useIsMobile();
  const isOpen = Boolean(client);

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(o) => !o && onClose()} blur>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="shrink-0 px-4 text-center">
            <DrawerTitle className="text-center font-semibold">
              Detalhes do cliente
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="pb-4">{DetailContent}</div>
              </ScrollArea>
            </div>
            <div className="shrink-0 pt-3 mt-2 border-t border-border w-full flex flex-col gap-2">
              {/* Ações primárias e secundárias mobile */}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()} blur>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Detalhes do cliente</DialogTitle>
        </DialogHeader>
        <div className="py-2">{DetailContent}</div>
        <DialogFooter className="mt-2 flex-row items-center justify-end">
          {/* Ações desktop */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 2. Blocos de Conteúdo e Apresentação de Métricas

Para exibir dados sem poluição visual, o Zelo adota quatro componentes visuais essenciais:

### 2.1. Mini Cards Estatísticos (`MiniStat`)
Utilizados para resumir indicadores do registro (ex.: Total Gasto, Total Pendente, Média por Pedido):

```tsx
function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 truncate text-sm font-semibold tabular-nums",
          tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}
```

### 2.2. Bloco de Informações Cadastrais
Agrupamento em card neutro com tipografia limpa e separadores sutis:
- **Nome Principal:** `text-sm font-semibold text-foreground`.
- **Informações Secundárias (Telefone, E-mail, Documento):** `text-xs text-muted-foreground`.
- **Endereço Completo:** Exibido em bloco discreto com BoxIcon de localização (`map-pin` ou `home`).

### 2.3. Cartões Expansíveis de Histórico e Subitens
Em registros complexos (como a lista de compras anteriores de um cliente), cada pedido é exibido em um mini card com expansão ao clique:

```tsx
<div className="rounded-lg border border-border/70 bg-card/60 transition hover:border-border">
  <div
    onClick={() => setExpanded((prev) => !prev)}
    className="flex items-center justify-between p-2.5 text-sm cursor-pointer select-none"
  >
    <div className="min-w-0 flex items-center gap-2">
      <BoxIcon
        name="chevron-down"
        className={cn(
          "text-sm text-muted-foreground transition-transform duration-200 shrink-0",
          expanded && "rotate-180"
        )}
      />
      <div>
        <div className="text-xs font-medium text-foreground">{dateTime(sale.date)}</div>
        <div className="text-[11px] text-muted-foreground">
          {sale.items.length} itens · {getPaymentLabel(sale.paymentMethod)}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <span className="font-semibold tabular-nums text-sm">{currency(sale.total)}</span>
      <SaleStatusBadge status={sale.status} className="text-[10px] px-1.5 h-4.5" />
    </div>
  </div>

  {/* Conteúdo expandido com animação suave */}
  {expanded && (
    <div className="border-t border-border/50 px-3 py-2 text-xs bg-muted/20 space-y-2 animate-in fade-in-50 duration-150">
      {/* Lista de itens comprados e valores */}
    </div>
  )}
</div>
```

---

## 3. Rodapé de Ações Contextuais

As ações de detalhes concentram integrações rápidas com o cliente ou comandos de gestão:

### 3.1. Integração Direta com WhatsApp
Quando o registro possui telefone cadastrado:
- Exibe botão com BoxIcon `message-rounded-dots` direcionando para link seguro:
  `https://wa.me/55DDDNÚMERO?text=Olá, [PrimeiroNome]!` com `target="_blank"` e `rel="noreferrer"`.

### 3.2. Ações de Operação (Marcar como Pago, Cancelar, Comprovante)
- **Marcar como Pago:** Botão outline em tom verde (`border-green-600/40 text-green-700 hover:bg-green-50 dark:text-green-400`).
- **Ver Comprovante:** Botão primário com BoxIcon `receipt`.
- **Cancelar Registro:** Botão outline em tom destrutivo (`border-destructive/40 text-destructive hover:bg-destructive/10`).

### 3.3. Disposição dos Botões:
- **No Mobile:** Botões verticais em largura total (`w-full rounded-full font-medium`), com a ação principal no topo e botão `"Fechar"` em variante `ghost` na base.
- **No Desktop:** Botões compactos alinhados horizontalmente à direita no `DialogFooter`.
