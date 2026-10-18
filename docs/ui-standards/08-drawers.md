# 08 - Drawers (Padrão Mobile First de Sobreposição)

Este documento detalha o funcionamento, arquitetura e convenções dos **Drawers** (painéis inferiores móveis / bottom sheets) no ecossistema **Zelo**, baseados na implementação nativa do `@base-ui/react/drawer` (`src/components/ui/drawer.tsx`).

---

## 1. Finalidade e Papel do Drawer

No Zelo, o Drawer é o **principal mecanismo de sobreposição em telas móveis (`< 768px`)**. Ele é utilizado para:
- Criação e edição de cadastros (`ProductForm`, `ClientForm`, `UserForm`).
- Visualização de detalhes de clientes e vendas (`ClientDetail`, Detalhes de Pedido).
- Etapa de checkout e seleção de pagamento em Nova Venda (`checkout drawer`).
- Menus e filtros avançados no mobile.
- Confirmações críticas de exclusão em dispositivos móveis.

---

## 2. Anatomia e Composição Estrutural

O Drawer do Zelo obedece à seguinte estrutura hierárquica estrita:

```text
+-----------------------------------------------------------+
| [ DRAWER OVERLAY (Backdrop Blur com bg-black/40) ]        |
|                                                           |
| +-------------------------------------------------------+ |
| | [ ALÇA DE ARRASTE OPCIONAL (DrawerSwipeHandle) ]       | |
| | [ CABEÇALHO FIXO: DrawerHeader + DrawerTitle Central] | |
| +-------------------------------------------------------+ |
| |                                                       | |
| | [ CONTEÚDO CENTRAL COM ROLAGEM INDEPENDENTE ]         | |
| | (ScrollArea h-full com overflow-hidden no container)  | |
| |                                                       | |
| +-------------------------------------------------------+ |
| | [ RODAPÉ DE AÇÕES FIXO (border-t border-border) ]     | |
| | [ Botão Primário: Salvar (h-11 rounded-full) ]        | |
| | [ Botão Secundário: Cancelar/Fechar (variant="ghost")] | |
| +-------------------------------------------------------+ |
+-----------------------------------------------------------+
```

### 2.1. Código Canônico de um Drawer no Zelo
```tsx
<Drawer open={open} onOpenChange={onOpenChange} blur>
  <DrawerContent className="h-[90vh]">
    {/* Cabeçalho Fixo */}
    <DrawerHeader className="shrink-0 px-4 text-center">
      <DrawerTitle className="text-center font-semibold">
        {isEdit ? "Editar registro" : "Novo registro"}
      </DrawerTitle>
    </DrawerHeader>

    {/* Área de Conteúdo com Scroll Controlado */}
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="pb-4">
            {FormFields}
          </div>
        </ScrollArea>
      </div>

      {/* Rodapé de Ações Fixo na Base */}
      <div className="shrink-0 pt-3 flex flex-col gap-2 w-full border-t border-border">
        <LoadingButton
          onClick={submit}
          loading={isSubmitting}
          className="h-11 w-full rounded-full font-medium"
        >
          Salvar
        </LoadingButton>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
          className="h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </Button>
      </div>
    </div>
  </DrawerContent>
</Drawer>
```

---

## 3. Comportamento e Regras de Transição

### 3.1. Direção e Gesto de Fechamento
- **Direção da Abertura:** Sobe suavemente a partir da borda inferior da tela (`swipeDirection="down"`).
- **Fechamento por Gesto:** O usuário pode arrastar o painel para baixo para dispensá-lo voluntariamente. O movimento responde em tempo real à física do toque através da variável CSS `--drawer-swipe-movement-y`.

### 3.2. Animação Física Fluida (CSS Global)
Conforme configurado em `src/app/globals.css`:
```css
[data-slot="drawer-popup"] {
  transform: translate3d(var(--drawer-swipe-movement-x, 0px), var(--drawer-swipe-movement-y, 0px), 0);
  transition: transform 320ms cubic-bezier(0.32, 0.72, 0, 1);
  will-change: transform;
}

[data-slot="drawer-popup"][data-starting-style],
[data-slot="drawer-popup"][data-ending-style] {
  transform: translate3d(0, 100%, 0) !important;
}
```

### 3.3. Overlay e Efeito de Blur
- Fundo escurecido translúcido em `bg-black/40`.
- Quando `blur={true}` (padrão ativo), ativa `supports-backdrop-filter:backdrop-blur-sm`, desfocando elegantemente a tela de fundo para focar a atenção do operador.

---

## 4. Prevenção de Fechamento Acidental

> [!IMPORTANT]
> **PROTEÇÃO CONTRA PERDA DE DIGITAÇÃO NO MOBILE**
>
> É comum o usuário tocar sem querer na área superior (overlay) enquanto digita em um celular.
> O componente `Drawer` do Zelo foi arquitetado com bloqueios estritos:

1. **Bloqueio de Toque Fora (`outside-press`):** Tocar no backdrop escurecido **não fecha o Drawer**.
2. **Bloqueio de Tecla Escape (`escape-key`):** Em dispositivos com teclado físico conectado, a tecla Escape não fecha o Drawer acidentalmente (`preventEscapeClose = true`).
3. **Mecanismos Permitidos de Fechamento:**
   - Clicar deliberadamente no botão `"Cancelar"` ou `"Fechar"`.
   - Executar o gesto tátil de puxar o Drawer para baixo até o limite de descarte (`swipe`).

---

## 5. Rodapé de Ações do Drawer

O rodapé do Drawer adota uma convenção vertical padronizada:
- **Botão Principal (Salvar / Confirmar):**
  - Posicionado sempre **no topo** do rodapé.
  - Altura: `h-11`, cantos `rounded-full`, largura total (`w-full`), variante `default`.
  - Utiliza `LoadingButton` para exibir feedback de spinner sem desalinhar o botão.
- **Botão Secundário (Cancelar / Fechar / Voltar):**
  - Posicionado **abaixo** do botão primário.
  - Altura: `h-10`, cantos `rounded-full`, largura total (`w-full`), variante `ghost`.
  - Texto neutro: `text-muted-foreground hover:text-foreground`.

---

## 6. Acessibilidade e Movimento Reduzido

- **Bloqueio de Foco:** O foco do teclado fica contido dentro do painel enquanto aberto (`modal={true}`).
- **Prefers Reduced Motion:** Quando o usuário possui preferência por redução de movimento configurada no sistema operacional, a duração da transição é anulada instantaneamente via `@media (prefers-reduced-motion: reduce)`.
