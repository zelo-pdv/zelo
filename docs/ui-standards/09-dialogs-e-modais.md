# 09 - Dialogs e Modais (Padrão Desktop de Sobreposição)

Este documento documenta os padrões, regras visuais e comportamentos dos **Dialogs** (diálogos e modais centralizados) no ecossistema **Zelo**, baseados na implementação do `@base-ui/react/dialog` (`src/components/ui/dialog.tsx`) e `AlertDialog` (`src/components/ui/alert-dialog.tsx`).

---

## 1. Finalidade e Papel do Dialog

No Zelo, o Dialog é o **padrão oficial de sobreposição em telas médias e grandes (`>= 768px`)**. Ele é utilizado para:
- Criação e edição de cadastros no desktop (`UserForm`, `ClientForm`, `ProductForm`).
- Visualização de detalhes de clientes e pedidos no desktop.
- Confirmações de ações destrutivas (`AlertDialog`).
- Modais utilitários de importação de planilhas CSV (`ClientsImportModal`, `ProductsImportModal`).
- Modais de configuração secundários (`DashboardConfigModal`, `ProductsConfigModal`).

---

## 2. Anatomia de um Dialog Desktop

```text
+-----------------------------------------------------------------------+
| [ DIALOG OVERLAY (Backdrop Blur: bg-black/40 backdrop-blur-sm) ]     |
|                                                                       |
|   +---------------------------------------------------------------+   |
|   | [ DialogHeader: DialogTitle ]               [ (X) Fechar ]    |   |
|   +---------------------------------------------------------------+   |
|   |                                                               |   |
|   | [ CONTEÚDO DO FORMULÁRIO / INFORMAÇÕES ]                      |   |
|   | (max-h-[92vh] com overflow-y-auto e espaçamento gap-4)        |   |
|   |                                                               |   |
|   +---------------------------------------------------------------+   |
|   | [ DialogFooter (Alinhado à direita): Cancelar + Salvar ]      |   |
|   +---------------------------------------------------------------+   |
+-----------------------------------------------------------------------+
```

### 2.1. Código Canônico de Dialog de Formulário
```tsx
<Dialog open={open} onOpenChange={onOpenChange} blur>
  <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
    <DialogHeader>
      <DialogTitle>{isEdit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4 py-2">
      {FormFields}
    </div>

    <DialogFooter className="mt-4 flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={loading}
      >
        Cancelar
      </Button>
      <LoadingButton
        loading={loading}
        onClick={submit}
        className="min-w-28"
      >
        Salvar
      </LoadingButton>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 3. Categorias e Dimensões de Dialogs

As dimensões máximas do Dialog variam conforme a complexidade do conteúdo:

| Categoria de Dialog | Largura Máxima (`max-w`) | Altura Máxima | Exemplo Real no Sistema |
|---|---|---|---|
| **Diálogo de Confirmação Simples** | `sm:max-w-sm` (384px) | Automática | Confirmação de logout ou limpeza rápida |
| **Confirmação Destrutiva (`AlertDialog`)** | `max-w-md` (448px) | Automática | Remoção de produto, cliente ou usuário |
| **Diálogo de Detalhes / Resumo** | `sm:max-w-md` (448px) | `max-h-[90vh]` | Detalhes da venda em `/historico` |
| **Formulário Padrão (Clientes/Usuários)** | `sm:max-w-lg` ou `sm:max-w-xl` (512px a 576px) | `max-h-[92vh]` | `ClientForm`, `UserForm` |
| **Formulário Amplo com Colunas (Produtos)** | `sm:max-w-2xl` ou `md:max-w-3xl` (672px a 768px) | `h-[90vh]` | `ProductForm` (com imagens e variações) |
| **Modais de Importação CSV** | `sm:max-w-md` (448px) | Automática | `ClientsImportModal`, `ProductsImportModal` |

---

## 4. Prevenção de Fechamento Acidental

Assim como no Drawer, o Dialog do Zelo protege o usuário contra cliques involuntários durante o preenchimento de formulários:

1. **`disablePointerDismissal = true` (Padrão Ativo):** Clicar no fundo escurecido fora da caixa do diálogo **não fecha o modal**.
2. **`preventEscapeClose = true` (Padrão Ativo):** Pressionar a tecla `Escape` no teclado físico é bloqueado por padrão durante o preenchimento de formulários (`eventDetails.reason === "escape-key"`).
3. **Fechamento Deliberado:** O fechamento só ocorre pelo clique no botão `"Cancelar"`, no botão de fechar (`showCloseButton` com ícone `x`) ou após a conclusão da submissão com sucesso.

---

## 5. Overlay, Efeito Blur e Animações

- **Overlay:** Fundo com `bg-black/40` e animação de fade (`data-open:fade-in-0 data-closed:fade-out-0`).
- **Backdrop Blur:** Quando `blur={true}` ou `isForm={true}`, aplica `supports-backdrop-filter:backdrop-blur-sm`.
- **Animação do Popup:** Efeito sutil de zoom e escala:
  `data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95`.
- **Botão de Fechar:** Embutido automaticamente no canto superior direito (`DialogPrimitive.Close` posicionado em `absolute top-2 right-2`), utilizando `BoxIcon name="x" className="text-lg"`.

---

## 6. Diálogos de Alerta e Confirmação (`AlertDialog`)

Para ações de risco (exclusões de produtos, clientes ou descarte irreversível), o Zelo utiliza o componente especializado **`<AlertDialog />`** (`src/components/ui/alert-dialog.tsx`):

```tsx
<AlertDialog open={!!product} onOpenChange={(open) => !open && onClose()}>
  <AlertDialogContent className="max-w-md p-6">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-lg font-bold">
        Remover produto?
      </AlertDialogTitle>
      <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
        {product?.name} será removido do catálogo. O histórico de vendas deste produto
        será mantido intacto no sistema. Esta ação não pode ser desfeita.
      </AlertDialogDescription>
    </AlertDialogHeader>

    <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-4">
      <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
      <LoadingButton
        loading={busy}
        variant="destructive"
        onClick={handleConfirm}
      >
        Remover
      </LoadingButton>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- **Ordem dos Botões:** No desktop (`sm:flex-row`), o botão Cancelar fica à esquerda e a ação destrutiva fica à direita.
- **Variação Destrutiva:** O botão de confirmação utiliza `variant="destructive"` ou texto destrutivo vermelho.
- **Aviso de Histórico Preservado:** Diálogos de exclusão deixam explícito que o histórico financeiro/vendas do cliente ou produto será mantido intacto para fins de auditoria e relatórios.
