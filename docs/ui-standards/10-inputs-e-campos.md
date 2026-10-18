# 10 - Inputs e Campos de Formulário

Este documento especifica a anatomia, dimensões, estados, máscaras e regras de usabilidade dos controles de entrada de dados no **Zelo**.

---

## 1. Catálogo de Controles de Formulário

### 1.1. Campo de Texto Padrão (`<Input />`)
- **Arquivo:** `src/components/ui/input.tsx` (baseado em `@base-ui/react/input`).
- **Dimensões Base:** Altura `h-8` (padrão compacto), cantos `rounded-lg`, padding `px-2.5 py-1`.
- **Prevenção de Zoom no iOS:** Aplica `text-base md:text-sm` (16px em telas móveis para impedir que o Safari amplie a tela ao focar no campo, e 14px no desktop).
- **Foco:** `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`.
- **Estados Desabilitados:** `disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50`.
- **Estados Inválidos:** `aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20`.
- **AutoFocus:** Configurado com `autoFocus={false}` por padrão para evitar disparar o teclado virtual sem intenção do usuário no mobile.

### 1.2. Campo de Busca Principal (`Search Input`)
Utilizado no topo de listagens e catálogos:
- **Classes Padrão:**
  ```tsx
  <div className="relative w-full sm:w-[40%] sm:max-w-[40%] min-w-0">
    <BoxIcon
      name="search"
      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-muted-foreground pointer-events-none"
    />
    <Input
      placeholder="Buscar..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="rounded-xl pl-10 h-11 bg-white dark:bg-card border-border/70 w-full text-sm shadow-xs"
    />
  </div>
  ```
- **Diferenciais:** Altura expandida de `h-11` (44px, facilitando o toque), cantos `rounded-xl`, fundo branco no light mode e sombra sutil `shadow-xs`.

### 1.3. Campo de Texto Longo (`<Textarea />`)
- **Arquivo:** `src/components/ui/textarea.tsx`.
- **Dimensões:** `min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base md:text-sm`.
- **Uso Típico:** Observações de clientes, notas de vendas e descrições de produtos com `rows={2}` ou `rows={3}`.

### 1.4. Interruptor de Alternância (`<Switch />`)
- **Arquivo:** `src/components/ui/switch.tsx` (baseado em `@base-ui/react/switch`).
- **Dimensões:** `h-[18.4px] w-8` com polegar circular de 16px (`size-4`).
- **Estados:** Ativo (`data-checked:bg-primary`), Inativo (`data-unchecked:bg-input`).
- **Aplicações:** Ativar/Desativar clientes ou produtos, controle de estoque nas configurações, permissões do grupo de acesso.
- **Acessibilidade:** Deve sempre ser associado a um label via `aria-labelledby` e `aria-describedby`.

```tsx
<div className="flex items-center justify-between rounded-xl border border-border/70 p-3">
  <div className="space-y-0.5">
    <Label id="client-active-label" className="text-sm font-medium">Cliente Ativo</Label>
    <p id="client-active-desc" className="text-xs text-muted-foreground">
      Clientes inativos não aparecerão na seleção de novas vendas.
    </p>
  </div>
  <Switch
    checked={active}
    onCheckedChange={setActive}
    aria-labelledby="client-active-label"
    aria-describedby="client-active-desc"
  />
</div>
```

### 1.5. Caixa de Seleção (`<Checkbox />`)
- **Arquivo:** `src/components/ui/checkbox.tsx`.
- **Dimensões:** `size-4 rounded-[4px] border border-input`.
- **Uso:** Seleção múltipla em tabelas e opção "Lembrar meu e-mail" na tela de login.

---

## 2. Tipos Especiais de Campos

### 2.1. Campo com Máscaras Nacionais (`src/lib/masks.ts`)
Todos os campos que recebem documentos ou dados sensíveis formatam a digitação em tempo real:
- **Telefone (`maskPhone`):** Formata automaticamente números fixos (10 dígitos: `(11) 3344-5566`) e celulares (11 dígitos: `(11) 98765-4321`), removendo o código de país `+55` na visualização para simplificar o preenchimento.
- **Documento (`maskCpfCnpj`):** Detecta dinamicamente a quantidade de dígitos digitados, alternando a máscara entre CPF (`000.000.000-00`) e CNPJ (`00.000.000/0000-00`).
- **CEP (`maskCep`):** Formata no padrão `00000-000` com consulta assíncrona ao atingir 8 dígitos.

### 2.2. Campo de Senha com Alternância de Visibilidade
Utilizado no login, cadastro e formulário de operadores:
```tsx
<div className="relative">
  <Input
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="pr-10"
    placeholder="Sua senha"
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
    tabIndex={-1}
    aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
  >
    <BoxIcon name={showPassword ? "hide" : "show"} className="text-lg" />
  </button>
</div>
```

### 2.3. Campo Monetário e Numérico
- **Moeda e Preço de Venda:** Inputs com `inputMode="decimal"` ou formatação com prefixo `"R$"`, admitindo vírgulas ou pontos e convertendo para número float seguro.
- **Ajuste Rápido de Quantidade:** Botões de incremento e decremento (`size="icon" variant="outline" className="h-8 w-8"`) posicionados ao lado do valor central tabular (`w-7 text-center font-medium tabular-nums`).

### 2.4. Campo com Leitor de Código de Barras (Câmera)
No cadastro de produtos e no PDV, o campo de código de barras possui um botão integrado que aciona o componente `<BarcodeScanner />`, abrindo a câmera traseira do smartphone via biblioteca `html5-qrcode` para captura óptica instantânea.
