# 17. Catálogo Completo de Componentes Compartilhados

Este documento centraliza a especificação técnica de **todos os componentes compartilhados** disponíveis no ecossistema Zelo. Sempre que uma nova funcionalidade for construída, os desenvolvedores devem obrigatoriamente reutilizar estes componentes em vez de criar novas tags primitivas HTML ou estilizações manuais ad-hoc.

---

## 1. Visão Geral e Convenção de Importação

A biblioteca de componentes é dividida em dois grupos principais:
1. **Componentes Primitivos de UI (`@/components/ui`):** Primitivas headless acessíveis fornecidas pelo `@base-ui/react` e estilizadas com Tailwind CSS v4.
2. **Componentes de Domínio / Regras de Negócio (`@/components/...`):** Componentes especializados que encapsulam regras de negócio, permissões ou entidades específicas do Zelo.

---

## 2. Catálogo de Componentes de Interface (`@/components/ui`)

---

### 2.1. Button & LoadingButton
* **Caminhos:** [src/components/ui/button.tsx](file:///c:/projetos/zelo/src/components/ui/button.tsx) e [src/components/ui/loading-button.tsx](file:///c:/projetos/zelo/src/components/ui/loading-button.tsx)
* **Finalidade:** Disparo de ações, submissão de formulários e navegações contextuais com suporte nativo a estado assíncrono.
* **Props Principais:**
  * `variant`: `"default"` | `"destructive"` | `"outline"` | `"secondary"` | `"ghost"` | `"link"`
  * `size`: `"default"` (`h-9 px-4`) | `"sm"` (`h-8 px-3`) | `"lg"` (`h-10 px-6`) | `"icon"` (`size-9`) | `"icon-sm"` (`size-8`) | `"icon-lg"` (`size-10`)
  * `loading`: `boolean` (específico do `LoadingButton` - exibe spinner e desabilita clique)
  * `loadingText`: `string` (substitui o texto original durante carregamento)
* **Exemplo de Uso:**
```tsx
import { LoadingButton } from "@/components/ui/loading-button";
import { BoxIcon } from "@/components/ui/box-icon";

<LoadingButton
  type="submit"
  variant="default"
  loading={isSubmitting}
  loadingText="Salvando..."
  className="rounded-xl h-11 px-7 shadow-xs font-semibold"
>
  <BoxIcon name="check" className="mr-2 text-lg" />
  Salvar Registro
</LoadingButton>
```
* **Anti-patterns / Erros Comuns:**
  * ❌ *Não faça:* Criar botões com `<button>` cru e adicionar manualmente um ícone de spinner com `animate-spin`. Use sempre `<LoadingButton />`.
  * ❌ *Não faça:* Esquecer `type="button"` em botões secundários dentro de formulários (isso causará submit acidental).

---

### 2.2. BoxIcon
* **Caminho:** [src/components/ui/box-icon.tsx](file:///c:/projetos/zelo/src/components/ui/box-icon.tsx)
* **Finalidade:** Mecanismo oficial de renderização de ícones vetoriais em todo o sistema.
* **Props Principais:**
  * `name`: Nome do ícone Boxicons (ex: `"plus"`, `"search"`, `"trash"`, `"edit-alt"`, `"slider-alt"`, `"chevron-left"`)
  * `solid`: `boolean` (quando `true`, utiliza o prefixo sólido `bxs-`; quando `false`, linear `bx-`)
  * `size`: `"xs"` | `"sm"` | `"md"` | `"lg"` (ou use utilitários `text-base`, `text-lg`, `text-xl`)
* **Exemplo de Uso:**
```tsx
import { BoxIcon } from "@/components/ui/box-icon";

<BoxIcon name="package" solid className="text-xl text-primary" />
```
* **Anti-patterns / Erros Comuns:**
  * ❌ *Não faça:* Importar ícones avulsos do Lucide React para novos módulos, a menos que o ícone inexista no Boxicons.
  * ❌ *Não faça:* Escrever tags HTML `<i className="bx bx-star"></i>` manualmente.

---

### 2.3. Input, Textarea & Label
* **Caminhos:**
  * [src/components/ui/input.tsx](file:///c:/projetos/zelo/src/components/ui/input.tsx)
  * [src/components/ui/textarea.tsx](file:///c:/projetos/zelo/src/components/ui/textarea.tsx)
  * [src/components/ui/label.tsx](file:///c:/projetos/zelo/src/components/ui/label.tsx)
* **Finalidade:** Coleta de dados com prevenção mandatória de zoom no iOS e indicação automática de campos obrigatórios.
* **Props & Classes Especiais:**
  * `<Label required>`: injeta automaticamente o asterisco vermelho com `aria-hidden="true"` e título de acessibilidade.
  * `requiredInputClass`: constante `"border-primary/50 focus:ring-primary/50 bg-primary/3"` aplicada em campos obrigatórios.
  * Tipografia base: `text-base md:text-sm` embutida no componente para evitar zoom no Safari Mobile.
* **Exemplo de Uso:**
```tsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { requiredInputClass } from "@/components/clients/client-form"; // ou lib/utils

<div className="space-y-2">
  <Label htmlFor="nome" required>Nome Completo</Label>
  <Input
    id="nome"
    placeholder="Ex: João da Silva"
    className={requiredInputClass}
    {...register("nome")}
  />
  {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
</div>
```

---

### 2.4. Drawer & Dialog (Padrão Híbrido)
* **Caminhos:**
  * [src/components/ui/drawer.tsx](file:///c:/projetos/zelo/src/components/ui/drawer.tsx)
  * [src/components/ui/dialog.tsx](file:///c:/projetos/zelo/src/components/ui/dialog.tsx)
* **Finalidade:** Overlays para criação, edição e visualização de registros com proteção contra descarte acidental.
* **Props Cruciais:**
  * `blur={true}`: Ativa o backdrop blur elegante de 4px (`backdrop-blur-sm`).
  * `isForm={true}`: Sinaliza que o conteúdo é editável; ativa proteções de descarte.
  * `disablePointerDismissal={true}`: Impede fechamento por clique fora do modal.
  * `preventEscapeClose={true}`: Impede fechamento pela tecla ESC.
* **Exemplo de Composição Híbrida:**
```tsx
const isMobile = useIsMobile();

if (isMobile) {
  return (
    <Drawer open={open} onOpenChange={setOpen} blur isForm>
      <DrawerContent className="h-[90vh] flex flex-col">
        <DrawerHeader>
          <DrawerTitle>Novo Registro</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4">{/* Formulario */}</div>
        <DrawerFooter className="flex-col gap-2">
          <Button className="h-11 w-full rounded-full">Salvar</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

return (
  <Dialog open={open} onOpenChange={setOpen} blur isForm>
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Novo Registro</DialogTitle>
      </DialogHeader>
      <div className="py-2">{/* Formulario */}</div>
      <DialogFooter className="justify-end gap-2">
        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
```

---

### 2.5. AlertDialog
* **Caminho:** [src/components/ui/alert-dialog.tsx](file:///c:/projetos/zelo/src/components/ui/alert-dialog.tsx)
* **Finalidade:** Modais de interrupção mandatória para confirmação de ações destrutivas (excluir cliente, cancelar venda, resetar banco).
* **Props e Slots:**
  * `AlertDialogAction`: Botão de confirmação (geralmente `variant="destructive"`).
  * `AlertDialogCancel`: Botão de desistência neutro.
* **Exemplo:**
```tsx
<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Deseja excluir este registro?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação não poderá ser desfeita.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Voltar</AlertDialogCancel>
      <AlertDialogAction variant="destructive" onClick={handleDelete}>
        Sim, Excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### 2.6. Select
* **Caminho:** [src/components/ui/select.tsx](file:///c:/projetos/zelo/src/components/ui/select.tsx)
* **Finalidade:** Seleção única entre opções predeterminadas baseada em `@base-ui/react/select`.
* **Slots:** `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectItem`, `SelectSeparator`.
* **Exemplo de Uso:**
```tsx
<Select value={role} onValueChange={setRole}>
  <SelectTrigger className="h-10 w-full rounded-xl">
    <SelectValue placeholder="Selecione um perfil" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="ADMIN">Administrador</SelectItem>
    <SelectItem value="OPERATOR">Operador</SelectItem>
  </SelectContent>
</Select>
```

---

### 2.7. Popover
* **Caminho:** [src/components/ui/popover.tsx](file:///c:/projetos/zelo/src/components/ui/popover.tsx)
* **Finalidade:** Janelas flutuantes compactas para menus de filtros avançados, datepickers e seletores rápidos.
* **Exemplo:** Painel de Filtro Padrão `w-80 p-4 rounded-xl shadow-xl`.

---

### 2.8. Switch & Checkbox
* **Caminhos:** [src/components/ui/switch.tsx](file:///c:/projetos/zelo/src/components/ui/switch.tsx) e [src/components/ui/checkbox.tsx](file:///c:/projetos/zelo/src/components/ui/checkbox.tsx)
* **Finalidade:** Alternância booleana instantânea (`Switch`) e seleção múltipla ou aceitação de termos (`Checkbox`).
* **Estilo do Switch:** `size="default"` (`h-5 w-9`) com thumb `size-4` animado suavemente.

---

### 2.9. Card
* **Caminho:** [src/components/ui/card.tsx](file:///c:/projetos/zelo/src/components/ui/card.tsx)
* **Finalidade:** Container estrutural primário para agrupamento de informações, KPIs e tabelas.
* **Variante Predominante:** `rounded-2xl border border-border/70 bg-card p-6 shadow-xs`.

---

### 2.10. Badge
* **Caminho:** [src/components/ui/badge.tsx](file:///c:/projetos/zelo/src/components/ui/badge.tsx)
* **Finalidade:** Rótulo compacto de status, contagem ou tag de categoria.
* **Variantes:** `"default"` | `"secondary"` | `"destructive"` | `"outline"` | `"success"` | `"warning"`.

---

### 2.11. Table & TablePagination
* **Caminhos:** [src/components/ui/table.tsx](file:///c:/projetos/zelo/src/components/ui/table.tsx) e [src/components/ui/table-pagination.tsx](file:///c:/projetos/zelo/src/components/ui/table-pagination.tsx)
* **Finalidade:** Renderização de tabelas de dados desktop e barra padronizada de controle de páginas.
* **Props do `TablePagination`:**
```tsx
interface TablePaginationProps {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[]; // Padrão: [10, 20, 30, 50]
}
```

---

### 2.12. MobileActionFab
* **Caminho:** [src/components/ui/mobile-action-fab.tsx](file:///c:/projetos/zelo/src/components/ui/mobile-action-fab.tsx)
* **Finalidade:** Botão de ação flutuante (`FAB`) exclusivo para mobile, fixado acima da navegação inferior (`bottom-[calc(80px+env(safe-area-inset-bottom))] right-4`).
* **Props:** `icon` (BoxIcon name), `label`, `onClick`, `badge`.

---

### 2.13. ActionTooltip & Tooltip
* **Caminhos:** [src/components/ui/action-tooltip.tsx](file:///c:/projetos/zelo/src/components/ui/action-tooltip.tsx) e [src/components/ui/tooltip.tsx](file:///c:/projetos/zelo/src/components/ui/tooltip.tsx)
* **Finalidade:** Balão informativo ao passar o cursor sobre botões de ação ou ícones condensados.
* **Recomendação:** Dê preferência ao `ActionTooltip` por aceitar diretamente a prop `label="Texto"` envolvendo o botão filho via slot `render`.

---

### 2.14. GlobalLoader & Skeleton
* **Caminhos:** [src/components/ui/global-loader.tsx](file:///c:/projetos/zelo/src/components/ui/global-loader.tsx) e [src/components/ui/skeleton.tsx](file:///c:/projetos/zelo/src/components/ui/skeleton.tsx)
* **Finalidade:** Feedback visual durante carregamento assíncrono.
  * `GlobalLoader`: Usado em transições globais de rota ou carregamento inicial de módulos.
  * `Skeleton`: Usado para placeholder anatômico de listas, cards e tabelas.

---

### 2.15. Sonner (Toaster)
* **Caminho:** [src/components/ui/sonner.tsx](file:///c:/projetos/zelo/src/components/ui/sonner.tsx)
* **Finalidade:** Emissão de notificações temporárias de feedback (`toast.success`, `toast.error`, `toast.warning`).
* **Configuração:** `position="top-right"` no desktop e `position="top-center"` no mobile.

---

### 2.16. ScrollArea
* **Caminho:** [src/components/ui/scroll-area.tsx](file:///c:/projetos/zelo/src/components/ui/scroll-area.tsx)
* **Finalidade:** Rolagem interna limpa em modais, drawers e painéis laterais.
* **Nota de Estilo:** Barras de rolagem visíveis são ocultadas globalmente via `[data-slot="scroll-area-scrollbar"] { display: none !important; }`.

---

### 2.17. Tabs
* **Caminho:** [src/components/ui/tabs.tsx](file:///c:/projetos/zelo/src/components/ui/tabs.tsx)
* **Finalidade:** Alternância de visões dentro de uma mesma página ou formulário longo.
* **Slots:** `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.

---

### 2.18. ScrollToTop
* **Caminho:** [src/components/ui/scroll-to-top.tsx](file:///c:/projetos/zelo/src/components/ui/scroll-to-top.tsx)
* **Finalidade:** Botão flutuante automático que surge após rolagem vertical (`threshold = 200px`) para retorno rápido ao topo.
* **Posicionamento:** `fixed right-4 bottom-[calc(80px+env(safe-area-inset-bottom))] md:right-6 md:bottom-6`.

---

## 3. Catálogo de Componentes de Domínio e Negócio (`@/components/...`)

---

### 3.1. Can (Controle de Acesso RBAC)
* **Caminho:** [src/components/can.tsx](file:///c:/projetos/zelo/src/components/can.tsx)
* **Finalidade:** Componente declarativo que oculta ou exibe trechos da interface de acordo com as permissões do usuário logado.
* **Props:**
  * `module`: `"dashboard"` | `"nova-venda"` | `"produtos"` | `"clientes"` | `"historico"` | `"usuarios"` | `"configuracoes"`
  * `action`: `"Visualizar"` | `"Adicionar"` | `"Editar"` | `"Excluir"`
  * `fallback?`: `ReactNode` (opcional, exibido se o usuário não tiver permissão; padrão `null`)
* **Exemplo de Uso:**
```tsx
import { Can } from "@/components/can";
import { Button } from "@/components/ui/button";

<Can module="produtos" action="Adicionar">
  <Button onClick={handleOpenCreate}>Novo Produto</Button>
</Can>
```

---

### 3.2. ProductThumb
* **Caminho:** [src/components/product-thumb.tsx](file:///c:/projetos/zelo/src/components/product-thumb.tsx)
* **Finalidade:** Renderização de foto miniatura de produto com tratamento de erro, placeholder visual elegante e respeito à preferência global da loja (`showProductImages`).
* **Props:** `name: string`, `image?: string | null`, `className?: string`, `forceShow?: boolean`.
* **Dimensão Padrão:** `size-12 rounded-xl border border-border/60 bg-muted/40 shadow-xs`.

---

### 3.3. SaleStatusBadge
* **Caminho:** [src/components/sale-status-badge.tsx](file:///c:/projetos/zelo/src/components/sale-status-badge.tsx)
* **Finalidade:** Renderização padronizada do status financeiro de vendas (`PAID`, `PENDING`, `CANCELED`).
* **Mapeamento:**
  * `PAID`: `variant="success"`, label `"Pago"`.
  * `PENDING`: `variant="warning"`, label `"Pendente"`.
  * `CANCELED`: `variant="destructive"`, label `"Cancelado"`.

---

### 3.4. SaleVoucher
* **Caminho:** [src/components/sale-voucher.tsx](file:///c:/projetos/zelo/src/components/sale-voucher.tsx)
* **Finalidade:** Comprovante térmico formatado (estilo cupom não fiscal) para visualização em tela, compartilhamento em PDF/WhatsApp e impressão direta em impressoras térmicas (58mm/80mm).

---

### 3.5. BarcodeScanner
* **Caminho:** [src/components/barcode-scanner.tsx](file:///c:/projetos/zelo/src/components/barcode-scanner.tsx)
* **Finalidade:** Leitor de código de barras e QR Code via câmera do dispositivo utilizando a biblioteca `html5-qrcode`. Integrado nativamente no PDV (`/nova-venda`) e nos cadastros de produtos.

---

## 4. Tabela Resumo para Desenvolvedores

| Componente | Localização | Quando Usar | O Que Evitar |
| :--- | :--- | :--- | :--- |
| **`Button`** | `@/components/ui/button` | Ações síncronas | Não usar para submits assíncronos (use `LoadingButton`) |
| **`LoadingButton`** | `@/components/ui/loading-button` | Submissão de forms e mutações de API | Não criar lógica manual de spinner |
| **`BoxIcon`** | `@/components/ui/box-icon` | Todos os ícones do sistema | Não importar bibliotecas externas de ícones aleatórias |
| **`Input` / `Textarea`** | `@/components/ui/input` | Entradas de texto | Não usar tags nativas sem a classe `text-base md:text-sm` |
| **`Label`** | `@/components/ui/label` | Rótulos de campos | Não colocar `*` manual no texto (use a prop `required`) |
| **`Drawer`** | `@/components/ui/drawer` | Modais e formulários no mobile | Não usar no desktop para formulários densos |
| **`Dialog`** | `@/components/ui/dialog` | Modais no desktop | Não abrir em telas < 768px sem wrapper responsivo |
| **`AlertDialog`** | `@/components/ui/alert-dialog` | Confirmações destrutivas | Não usar para simples mensagens informativas |
| **`Popover`** | `@/components/ui/popover` | Filtros e menus secundários | Não usar para formulários complexos inteiros |
| **`TablePagination`**| `@/components/ui/table-pagination` | Paginação em tabelas e listas | Não criar botões manuais de anterior/próximo avulsos |
| **`MobileActionFab`**| `@/components/ui/mobile-action-fab` | Ação primária no mobile | Não renderizar em telas desktop (`hidden md:flex`) |
| **`Can`** | `@/components/can` | Condicional de permissão RBAC | Não verificar permissão com condicionais manuais repetitivas |
| **`ProductThumb`** | `@/components/product-thumb` | Exibição de produtos | Não usar tags `<img>` puras sem placeholder e fallback |
