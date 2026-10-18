# 02 - Identidade Visual, Cores e Tipografia do Zelo

Este documento reúne os padrões visuais fundamentais do **Zelo**, incluindo o sistema de cores em espaço de cor moderno (OKLCH), variáveis de tema (Light e Dark), tipografia, escalas de arredondamento, espessuras de borda, sombras e superfícies.

---

## 1. Sistema de Cores e Tokens CSS

O Zelo adota Tailwind CSS v4 com tokens definidos no espaço de cor **OKLCH**, garantindo uniformidade perceptual de luminosidade e contraste tanto no tema claro quanto no tema escuro.

Os tokens globais estão mapeados em `src/app/globals.css`.

### 1.1. Tabela de Correspondência entre Temas

| Token | Finalidade | Tema Claro (`:root`) | Tema Escuro (`.dark`) |
|---|---|---|---|
| `--background` | Fundo principal da página | `oklch(1 0 0)` *(Branco puro)* | `oklch(0.145 0.008 326)` *(Grafite quase preto)* |
| `--foreground` | Texto e elementos primários | `oklch(0.145 0.008 326)` *(Grafite escuro)* | `oklch(0.985 0 0)` *(Branco suave)* |
| `--card` | Fundo de superfícies elevadas (Cards, Modais) | `oklch(1 0 0)` *(Branco puro)* | `oklch(0.212 0.019 322.12)` *(Cinza carvão)* |
| `--card-foreground` | Texto sobre cards | `oklch(0.145 0.008 326)` | `oklch(0.985 0 0)` |
| `--popover` | Menus suspensos, dropdowns e popovers | `oklch(1 0 0)` | `oklch(0.212 0.019 322.12)` |
| `--popover-foreground` | Texto dentro de popovers | `oklch(0.145 0.008 326)` | `oklch(0.985 0 0)` |
| `--primary` | Cor de destaque da marca (Ações principais) | `oklch(0.52 0.105 223.128)` *(Azul Zelo vibrante)* | `oklch(0.45 0.085 224.283)` *(Azul profundo)* |
| `--primary-foreground` | Texto sobre botão primário | `oklch(0.984 0.019 200.873)` *(Azul claríssimo)* | `oklch(0.984 0.019 200.873)` |
| `--secondary` | Ações secundárias e badges neutros | `oklch(0.967 0.001 286.375)` *(Cinza gelo)* | `oklch(0.274 0.006 286.033)` *(Cinza escuro)* |
| `--secondary-foreground`| Texto sobre elementos secundários | `oklch(0.21 0.006 285.885)` | `oklch(0.985 0 0)` |
| `--muted` | Fundos terciários, hover de linhas e badges | `oklch(0.96 0.003 325.6)` *(Cinza suave)* | `oklch(0.263 0.024 320.12)` *(Cinza ardósia)* |
| `--muted-foreground` | Textos de apoio, legendas e subtítulos | `oklch(0.542 0.034 322.5)` *(Cinza médio)* | `oklch(0.711 0.019 323.02)` *(Cinza claro)* |
| `--accent` | Destaques de foco e itens ativos | `oklch(0.96 0.003 325.6)` | `oklch(0.263 0.024 320.12)` |
| `--accent-foreground` | Texto sobre destaques de foco | `oklch(0.212 0.019 322.12)` | `oklch(0.985 0 0)` |
| `--destructive` | Ações destrutivas, exclusões e erros | `oklch(0.577 0.245 27.325)` *(Vermelho coral)* | `oklch(0.704 0.191 22.216)` *(Vermelho vivo)* |
| `--border` | Bordas de cards, tabelas e separadores | `oklch(0.922 0.005 325.62)` *(Cinza borda sutil)* | `oklch(1 0 0 / 10%)` *(Branco 10% translúcido)* |
| `--input` | Bordas e preenchimentos de inputs | `oklch(0.922 0.005 325.62)` | `oklch(1 0 0 / 15%)` *(Branco 15% translúcido)* |
| `--ring` | Anel de foco visual de acessibilidade | `oklch(0.711 0.019 323.02)` | `oklch(0.542 0.034 322.5)` |

---

## 2. Cores Semânticas de Domínio e Status

No ecossistema Zelo, estados operacionais e de negócio utilizam combinações de cores bem definidas:

### 2.1. Sucesso e Pago (`emerald`)
- **Aplicações:** Vendas com status "PAGO", produtos com estoque regular, badges de itens ativos, confirmações.
- **Classes Padrão:**
  - Fundo suave: `bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400`
  - Borda e badge: `border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`
  - Indicador circular: `bg-emerald-500`

### 2.2. Atenção, Alerta e Pendência (`amber`)
- **Aplicações:** Vendas com status "PENDENTE", fiado, estoque baixo próximo do limite mínimo, banners informativos de configuração.
- **Classes Padrão:**
  - Fundo suave: `bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400`
  - Borda e badge: `border-amber-500/40 bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400`
  - Banner de aviso: `border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300`
  - Indicador circular: `bg-amber-500`

### 2.3. Erro, Estoque Negativo e Exclusão (`rose` / `destructive`)
- **Aplicações:** Vendas com status "CANCELADO", estoque negativo, botões de exclusão, erros de validação, modal de confirmação aberto.
- **Classes Padrão:**
  - Fundo suave: `bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400`
  - Badge destrutivo: `variant="destructive"` (`bg-destructive/10 text-destructive dark:bg-destructive/20`)
  - Indicador circular: `bg-rose-500`

### 2.4. Informação e Ajustes (`sky` / `blue`)
- **Aplicações:** Movimentações de ajuste de estoque, dicas e tooltips informativos.
- **Classes Padrão:** `border-sky-500/40 text-sky-700 bg-sky-500/10`

---

## 3. Tipografia

O Zelo utiliza uma hierarquia tipográfica configurada em `src/app/layout.tsx` através do pacote `next/font/google`:

### 3.1. Famílias Tipográficas
- **Fonte Principal (Corpo e Interface):** **`Outfit`** (`subsets: ["latin"]`, variável CSS `--font-sans`).
- **Fonte de Títulos e Cabeçalhos:** **`Noto_Sans`** (`subsets: ["latin"]`, variável CSS `--font-heading`).
- **Fonte Complementar:** **`Montserrat`** (variável `--font-montserrat`).

### 3.2. Escala Tipográfica Recomendada

| Nível / Elemento | Classes Tailwind | Tamanho Real | Aplicação Típica |
|---|---|---|---|
| **Título de Página (Desktop)** | `text-2xl font-bold tracking-tight` | 24px (1.5rem) | Topo do Dashboard e cabeçalho de telas |
| **Título de Página (Header Contexto)** | `text-base font-medium text-foreground` | 16px (1rem) | Título central no `SiteHeader` no desktop |
| **Título de Página (Header Mobile)** | `text-2xl font-bold tracking-tight` | 24px (1.5rem) | Título central no `SiteHeader` no mobile |
| **Título de Seção / Card** | `text-base font-semibold text-foreground` | 16px (1rem) | `CardTitle`, títulos de seções expansíveis |
| **Subtítulo / Descrição** | `text-sm text-muted-foreground` | 14px (0.875rem) | `CardDescription`, orientações de cabeçalho |
| **Labels de Formulário** | `text-sm font-medium text-foreground` | 14px (0.875rem) | Labels dos inputs (`<Label />`) |
| **Labels Auxiliares / Headers de Tabela** | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` | 12px (0.75rem) | Cabeçalho de filtros, rótulos de mini cards |
| **Texto de Célula de Tabela** | `text-sm font-normal text-foreground` | 14px (0.875rem) | `TableCell` padrão |
| **Valores Numéricos e Moedas** | `font-semibold tabular-nums text-foreground` | 14px a 24px | Moeda (`currency()`), saldo e quantidades |
| **Badges e Micro-indicadores** | `text-[10px] or text-[11px] font-semibold` | 10px a 11px | Contadores, tags de filtros, status |

> [!TIP]
> **REQUISITO MOBILE: `tabular-nums` e `text-base md:text-sm`**
>
> - Todos os valores monetários e numéricos **devem obrigatoriamente** receber a classe `tabular-nums` para evitar que números com larguras diferentes façam a interface tremer ou desalinharem colunas.
> - Todos os inputs de formulário adotam `text-base md:text-sm` para garantir que o iOS Safari não dê zoom automático no foco em telas pequenas.

---

## 4. Bordas e Raios de Arredondamento

O Zelo adota um sistema com raio base de **`0.625rem` (10px)**.

### 4.1. Tokens de Raio
```css
--radius: 0.625rem; /* 10px */
--radius-sm: calc(var(--radius) * 0.6); /* 6px */
--radius-md: calc(var(--radius) * 0.8); /* 8px */
--radius-lg: var(--radius); /* 10px */
--radius-xl: calc(var(--radius) * 1.4); /* 14px */
--radius-2xl: calc(var(--radius) * 1.8); /* 18px */
--radius-3xl: calc(var(--radius) * 2.2); /* 22px */
--radius-4xl: calc(var(--radius) * 2.6); /* 26px */
```

### 4.2. Aplicação Efetiva nos Componentes
- **`rounded-full` (Pílula Total):**
  - Botões de ação em cabeçalho desktop (`Adicionar`, `Importar`, `Exportar`).
  - Botão flutuante mobile (`MobileActionFab`).
  - Barra de navegação inferior mobile (`BottomNavigation`).
  - Botões de ação em Drawers mobile (`Salvar`, `Cancelar`).
- **`rounded-2xl` (Grandes Superfícies):**
  - Contêiner de listas mobile agrupadas com `divide-y`.
  - Cards de etapas do Onboarding.
  - Thumbnails de produtos em listagens mobile.
- **`rounded-xl` (Componentes Médios):**
  - Inputs de busca (`rounded-xl h-11`).
  - Botão de filtro (`rounded-xl h-11`).
  - Cards de conteúdo (`Card rounded-xl`).
  - Diálogos desktop (`DialogContent rounded-xl`).
  - Thumbnails de produtos padrão (`ProductThumb h-12 w-12 rounded-xl`).
- **`rounded-lg` / `rounded-md` (Micro-componentes):**
  - Inputs padrão de formulário (`rounded-lg`).
  - Botões internos de paginação (`rounded-md` ou `rounded-xl`).
  - Itens de select e botões em segmented control.

---

## 5. Sombras e Elevação

O sistema evita sombras excessivamente pesadas, preferindo bordas suaves (`border-border/70`) associadas a micro-sombras:

- **`shadow-xs` / `shadow-sm`:** Utilizado na maioria dos cards, inputs de busca e botões em outline.
- **`shadow-md`:** Utilizado no botão primário de Nova Venda na BottomNavigation (`shadow-primary/25`) e em popovers suspensos.
- **`shadow-[0_12px_40px_rgba(0,0,0,0.12)]`:** Utilizado exclusivamente na ilha flutuante da barra de navegação inferior mobile (`BottomNavigation`), criando um efeito flutuante destacado sobre a rolagem.
