# 16. Animações, Transições e Interações de Toque

Este documento estabelece as diretrizes de engenharia e padrões de microinterações, transições e comportamento tátil adotados no Zelo. As animações no Zelo priorizam **desempenho a 60 fps**, **aceleração por GPU**, **resposta tátil nativa** e **respeito estrito às preferências de acessibilidade**.

---

## 1. Princípios de Movimento no Zelo

1. **Propósito Funcional:** Nenhuma animação existe puramente para ornamentação. Cada transição comunica mudança de contexto, estado de carregamento ou feedback imediato de ação.
2. **GPU Acceleration:** Transformações e opacidades operam via `transform: translate3d(...)`, `opacity` e `will-change: transform` para evitar reflows e repaints custosos na CPU.
3. **Curvas Naturais:** Movimentos de entrada e saída de painéis utilizam a curva de física desacelerada `cubic-bezier(0.32, 0.72, 0, 1)`.
4. **Desempenho Mobile & PWA:** Tempos de transição não excedem **320ms** para garantir sensação instantânea de aplicativo nativo.

---

## 2. Física e Transições de Drawers (Bottom Sheets)

O componente [Drawer](file:///c:/projetos/zelo/src/components/ui/drawer.tsx) (`@base-ui/react/drawer`) possui motor de animação estilizado em [src/app/globals.css](file:///c:/projetos/zelo/src/app/globals.css#L191-L246):

```css
/* Animação fluida para todos os Drawers */
[data-slot="drawer-popup"] {
  transform: translate3d(var(--drawer-swipe-movement-x, 0px), var(--drawer-swipe-movement-y, 0px), 0);
  transition: transform 320ms cubic-bezier(0.32, 0.72, 0, 1);
  will-change: transform;
}

[data-slot="drawer-popup"][data-swipe-direction="down"][data-starting-style],
[data-slot="drawer-popup"][data-swipe-direction="down"][data-ending-style] {
  transform: translate3d(0, 100%, 0) !important;
}

/* Durante o arrasto do usuário (swipe), a transição CSS é zerada para resposta imediata ao dedo */
[data-slot="drawer-popup"][data-swiping] {
  transition-duration: 0ms !important;
}

/* Overlay com fade sincronizado */
[data-slot="drawer-overlay"] {
  transition: opacity 300ms cubic-bezier(0.32, 0.72, 0, 1);
}

[data-slot="drawer-overlay"][data-starting-style],
[data-slot="drawer-overlay"][data-ending-style] {
  opacity: 0 !important;
  pointer-events: none;
}
```

### Regras do Drawer
- **Starting/Ending Styles:** Utilizam os novos pseudo-seletores CSS nativos `@starting-style` integrados pelo `@base-ui/react` para animação limpa tanto na montagem quanto na desmontagem do DOM.
- **Swipe Responsivo:** Quando o usuário está ativamente arrastando o handle do Drawer (`[data-swiping]`), a `transition-duration` é forçada para `0ms !important` para não gerar atraso visual (input lag).

---

## 3. Transições de Dialogs e Modais Centrais

Os modais desktop (`Dialog` e `AlertDialog`) combinam fade e escala para transmitir a sensação de expansão espacial:

```tsx
// Backdrop
"fixed inset-0 isolate z-50 bg-black/40 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 supports-backdrop-filter:backdrop-blur-sm"

// Janela Modal
"duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
```

- **Duração do Backdrop:** `200ms` (fade in/out suave com desfoque de fundo `backdrop-blur-sm`).
- **Duração do Popup:** `100ms` (zoom sutil de 95% para 100% na abertura e 100% para 95% no fechamento).

---

## 4. Popovers e Menus Flutuantes

O componente [Popover](file:///c:/projetos/zelo/src/components/ui/popover.tsx) e [DropdownMenu](file:///c:/projetos/zelo/src/components/ui/dropdown-menu.tsx) utilizam slide direcional inteligente dependendo do lado em que o elemento foi ancorado (`data-side`):

```tsx
"duration-100 origin-(--transform-origin) " +
"data-[side=bottom]:slide-in-from-top-2 " +
"data-[side=top]:slide-in-from-bottom-2 " +
"data-[side=left]:slide-in-from-right-2 " +
"data-[side=right]:slide-in-from-left-2 " +
"data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 " +
"data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
```

- O elemento surge com leve deslocamento de `8px` (`slide-in-from-...-2`) em direção ao gatilho, conferindo ancoragem física.

---

## 5. Animações de Colapso e Expansão

Utilizadas em:
1. **Seção de Endereço em Clientes:** `isAddressExpanded`
2. **Seções de Configurações:** `isExpanded` em grupos
3. **Filtros Personalizados de Data:** `isCustomDate`

### Padrão de Classe de Entrada:
```tsx
<div className="space-y-3 pt-3 animate-in fade-in-50 duration-200">
  {/* Conteúdo revelado */}
</div>
```
- Não utiliza bibliotecas pesadas de animação de altura (como `framer-motion`), recorrendo à aceleração CSS de opacidade (`fade-in-50 duration-200`) para não comprometer o bundle nem travar celulares de entrada.

---

## 6. Transição de Tema com View Transitions API

O alternador de temas [AnimatedThemeToggler](file:///c:/projetos/zelo/src/components/ui/animated-theme-toggler.tsx) implementa a moderna **Document View Transitions API** (`document.startViewTransition`):

```tsx
// Disparo com fallback
if (!document.startViewTransition) {
  setTheme(newTheme);
  return;
}

const transition = document.startViewTransition(() => {
  flushSync(() => {
    setTheme(newTheme);
  });
});
```

### Clipping Path Circular
A transição expande uma máscara circular a partir do centro do botão de clique (`variant="circle"`):
```css
::view-transition-old(root),
::view-transition-new(root) {
  mix-blend-mode: normal;
  animation: none;
}

html[data-magicui-theme-vt="active"]::view-transition-group(root) {
  animation-duration: var(--magicui-theme-toggle-vt-duration, 500ms);
}

html[data-magicui-theme-vt="active"]::view-transition-new(root) {
  clip-path: var(--magicui-theme-vt-clip-from);
}
```
- Em navegadores sem suporte nativo à View Transitions API (ou quando a preferência do usuário solicita redução de movimento), a alternância ocorre de maneira instantânea sem falhas.

---

## 7. Estados Ativos e Feedback Tátil (Mobile & Desktop)

### 7.1. Botões e Ações
- **Hover:** `hover:bg-primary/90`, `hover:bg-accent`, `hover:text-foreground` acompanhados de `transition-colors`.
- **Active / Tap:** `active:scale-[0.98]` aplicado em botões interativos e no [MobileActionFab](file:///c:/projetos/zelo/src/components/ui/mobile-action-fab.tsx#L55). Essa micro-compressão gera sensação imediata de clique em telas touchscreen.
- **Transição Padrão:** `transition-all duration-200` em cards interativos e switches.

### 7.2. Bottom Navigation
- O ícone do item ativo recebe transição de cor imediata `text-primary` com indicador sutil.
- Feedback de toque instantâneo sem delay de 300ms graças ao viewport configurado.

---

## 8. Blindagem Tátil Mobile e Modo PWA

No arquivo [src/app/globals.css](file:///c:/projetos/zelo/src/app/globals.css#L248-L335), o Zelo implementa regras inegociáveis para garantir experiência de aplicativo nativo e impedir panes de usabilidade em celulares:

### 8.1. Remoção do "Touch to Search" e Destaque de Toque
```css
@media (pointer: coarse), ((display-mode: standalone) and (hover: none)) {
  body {
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }
}
```
- **Tap Highlight:** `-webkit-tap-highlight-color: transparent` remove o retângulo azul/cinza feio que o Android renderiza ao tocar em links e botões.
- **Touch Callout:** `-webkit-touch-callout: none` desativa a lupa de zoom do iOS ao tocar em textos da aplicação.

### 8.2. Proteção Irrestrita de Campos de Digitação
Para evitar que a regra de não seleção quebre os formulários, inputs e textareas possuem exceção mandatória:
```css
input,
textarea,
[contenteditable="true"],
[contenteditable],
[data-slot="input"],
[data-slot="textarea"],
.selectable,
.select-text,
pre,
code {
  -webkit-user-select: text !important;
  user-select: text !important;
  -webkit-touch-callout: default !important;
}
```

### 8.3. Prevenção de Menu Contextual em Imagens
```css
img {
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  user-select: none;
}
```
- Impede que segurar o dedo sobre a foto de um produto abra o menu do navegador "Salvar imagem como / Compartilhar".

---

## 9. Suporte a `prefers-reduced-motion`

Usuários que ativam a opção de redução de movimento no sistema operacional (Windows, macOS, iOS, Android) têm animações completamente desativadas por regra de acessibilidade:

```css
@media (prefers-reduced-motion: reduce) {
  [data-slot="drawer-popup"],
  [data-slot="drawer-overlay"] {
    transition: none !important;
    transition-duration: 0ms !important;
    animation: none !important;
    animation-duration: 0ms !important;
  }
}
```

> [!IMPORTANT]
> **DIRETRIZ PARA NOVOS COMPONENTES:**
> Sempre que criar animações com duração superior a 200ms em novos componentes, envolva-as com variantes Tailwind que respeitem a preferência do usuário ou use a classe utilitária `motion-reduce:transition-none motion-reduce:animate-none`.
