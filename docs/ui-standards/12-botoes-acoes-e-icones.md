# 12 - Botões, Ações e Ícones

Este documento define os padrões, tamanhos, variantes visuais, estados e a biblioteca oficial de ícones adotada no ecossistema **Zelo**.

---

## 1. O Sistema de Botões (`<Button />`)

O botão do Zelo é implementado sobre o primitivo `@base-ui/react/button` (`src/components/ui/button.tsx`), garantindo acessibilidade nativa e renderização polimórfica via prop `render` (sem necessidade do `asChild` do Radix).

### 1.1. Variantes Visuais

| Variante | Classe Principal | Uso Recomendado no Zelo |
|---|---|---|
| **`default`** (Primário) | `bg-primary text-primary-foreground hover:bg-primary/80` | Ação principal da tela (ex.: "Adicionar", "Salvar", "Confirmar Venda") |
| **`outline`** (Secundário) | `border-border bg-background hover:bg-muted hover:text-foreground` | Ações de apoio (ex.: "Filtros", "Exportar", "Importar", "Cancelar") |
| **`secondary`** | `bg-secondary text-secondary-foreground hover:bg-secondary/80` | Ações terciárias ou badges neutros |
| **`ghost`** | `hover:bg-muted hover:text-foreground` | Menus de 3 pontos, botões de fechar, botões "Cancelar" no rodapé de Drawers |
| **`destructive`** | `bg-destructive/10 text-destructive hover:bg-destructive/20` | Ações irreversíveis (ex.: "Excluir produto", "Cancelar venda", "Limpar dados") |
| **`link`** | `text-primary underline-offset-4 hover:underline` | Links textuais inline |

### 1.2. Tamanhos e Dimensões

| Tamanho (`size`) | Altura / Padding | Uso Típico |
|---|---|---|
| **`sm`** | `h-7 px-2.5 text-[0.8rem]` | Botões de ação em tabelas e cabeçalhos desktop |
| **`default`** | `h-8 px-2.5 text-sm` | Botões padrão de diálogo e ações operacionais |
| **`lg`** | `h-9 px-2.5 text-sm` | Botões em cards de destaque ou checkout desktop |
| **`icon`** | `size-8` (32x32px) | Botões com apenas ícone (ex.: paginação, voltar) |
| **`icon-sm`** | `size-7` (28x28px) | Botão fechar em diálogos |
| **Customizado (`h-11`)** | `h-11 px-4` ou `w-full` | Botão de filtros, busca e rodapé de Drawers mobile |

### 1.3. Formatos de Borda: Pílula (`rounded-full`) vs. Arredondado (`rounded-xl`)
- **Pílula Total (`rounded-full`):**
  - Botões de cabeçalho de página desktop (`Adicionar`, `Exportar`, `Importar`).
  - Botões de rodapé em Drawers mobile (`Salvar`, `Cancelar`).
  - Ações flutuantes móveis (`MobileActionFab`).
- **Arredondado Médio (`rounded-xl`):**
  - Botões de filtro na barra de ferramentas (`rounded-xl h-11`).
  - Botões internos de formulários desktop e botões de paginação.

---

## 2. Botão com Estado de Carregamento (`<LoadingButton />`)

Localizado em `src/components/ui/loading-button.tsx`, estende o botão padrão para tratar requisições assíncronas:

```tsx
<LoadingButton
  loading={isSubmitting}
  onClick={handleSave}
  className="h-11 w-full rounded-full font-medium"
>
  Salvar
</LoadingButton>
```

- Quando `loading={true}`:
  - Desabilita automaticamente o botão para prevenir envios concorrentes (`disabled={loading || props.disabled}`).
  - Injeta o ícone BoxIcon com rotação contínua: `<BoxIcon name="loader-alt" className="mr-2 text-base bx-spin text-current" />`.
  - Preserva a largura do texto para evitar saltos no layout.

---

## 3. Botão Flutuante Mobile (`<MobileActionFab />`)

Localizado em `src/components/ui/mobile-action-fab.tsx`, é o disparador oficial de ações para telas menores que `768px`:

- **Posicionamento:** Fixo em `bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-50`.
- **Botão Principal:** Circular de 56px (`size-14 rounded-full bg-primary text-primary-foreground shadow-lg`).
- **Comportamento ao Tocar:**
  - O botão rotaciona 45 graus e assume cor vermelha (`bg-rose-500`), funcionando como botão de fechar.
  - As ações secundárias deslizam para cima em efeito cascata com botões pílula estilizados:
    - `Adicionar`: Ícone do módulo (`package` ou `user-plus`).
    - `Importar`: Ícone `upload`.
    - `Exportar`: Ícone `download` (ou spinner se estiver exportando).
    - `Configurações`: Ícone `cog`.

---

## 4. Biblioteca Oficial de Ícones: Boxicons

> [!IMPORTANT]
> **BOXICONS É A BIBLIOTECA PRIORITÁRIA DO ZELO**
>
> Embora o projeto possua `lucide-react` instalado para algumas utilidades residuais (como `ChevronLeft` e `ChevronRight`), **todos os novos ícones devem obrigatoriamente utilizar o componente `<BoxIcon />`** (`src/components/ui/box-icon.tsx`).

### 4.1. Sintaxe de Uso do Componente
```tsx
import { BoxIcon } from "@/components/ui/box-icon";

// Ícone linear padrão
<BoxIcon name="search" className="text-lg text-muted-foreground" />

// Ícone com preenchimento sólido
<BoxIcon name="check-circle" solid className="text-base text-emerald-500" />

// Ícone giratório para carregamento
<BoxIcon name="loader-alt" className="text-base bx-spin text-primary" />
```

### 4.2. Helper de Criação de Ícones (`createBoxIcon`)
Para itens de menu, navegação ou configurações:
```tsx
import { createBoxIcon } from "@/components/ui/box-icon";

export const NavItem = {
  label: "Produtos",
  icon: createBoxIcon("package"),
};
```

### 4.3. Mapeamento de Ícones por Contexto do Sistema

| Ação / Conceito | Nome do BoxIcon | Exemplo de Aplicação |
|---|---|---|
| **Adicionar / Criar** | `plus` | Botão Adicionar, botão flutuante |
| **Pesquisar** | `search` | Campo de busca em listagens e PDV |
| **Filtros Avançados** | `slider-alt` | Botão de filtros da barra superior |
| **Editar** | `pencil` ou `edit-alt` | Ações de tabela e detalhes |
| **Excluir / Lixeira** | `trash` | Confirmação de exclusão, limpar carrinho |
| **Ativar / Desativar** | `power-off` | Alternar status de cliente ou produto |
| **Visualizar** | `show` ou `show-alt` | Detalhes do registro, olho de senha aberta |
| **Ocultar Senha** | `hide` | Olho de senha fechada |
| **Importar (Planilha)** | `upload` | Importação CSV de clientes e produtos |
| **Exportar (PDF/CSV)** | `download` | Exportação de relatórios e cadastros |
| **Configurações** | `cog` | Telas e botões de configuração |
| **Movimentações / Troca** | `transfer` | Estoque e movimentações |
| **Comprovante / Recibo** | `receipt` | Histórico e comprovantes |
| **Carrinho / Venda** | `cart` | Nova venda e PDV |
| **WhatsApp / Conversa** | `message-rounded-dots` | Integração de contato com cliente |
| **Alerta / Erro** | `error-circle` | Mensagens de erro e confirmações destrutivas |
| **Sucesso / Concluído** | `check-circle` ou `check` | Toasts e indicadores de seleção |
| **Carregando** | `loader-alt` com `bx-spin` | Botões e indicadores de loading |
| **Menu 3 Pontos** | `dots-vertical-rounded` | Coluna de ações em tabelas e cards |
