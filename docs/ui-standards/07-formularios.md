# 07 - Padrões de Formulários no Zelo

Este documento reúne as diretrizes arquiteturais e regras de desenvolvimento de formulários no **Zelo** (tendo como referências práticas `ProductForm`, `ClientForm`, `UserForm` e formulários de autenticação).

---

## 1. Princípios de Formulários no Zelo

1. **Mobile First:** Todo formulário deve caber perfeitamente no espaço útil de uma tela móvel de 360px a 390px sem quebras de layout, utilizando rolagem interna controlada com `ScrollArea`.
2. **Minimalismo e Carregamento Rápido:** Campos opcionais e configurações avançadas (como endereços secundários, notas e variações complexas) devem iniciar **recolhidos por padrão** para agilizar o preenchimento no balcão.
3. **Validação Clara e Tolerante:** A validação deve ocorrer no cliente via Zod v4 antes de acionar a rede, comunicando o primeiro erro de forma direta e compreensível via `toast.error()`.
4. **Resguardo de Dados:** Caso ocorra qualquer falha na API ou conexão, **o formulário nunca deve fechar nem limpar os dados**, permitindo que o usuário corrija ou tente novamente.

---

## 2. Validação com Zod no Cliente

Todos os formulários validam os dados antes do envio utilizando Zod:

```tsx
const clientFormSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  phone: z.string().optional().nullable(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  address: z.object({
    zipCode: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
  }).optional(),
  notes: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

const submit = async () => {
  const validation = clientFormSchema.safeParse(form);
  
  if (!validation.success) {
    // Exibe o primeiro erro amigável ao usuário
    const firstError = validation.error.issues[0]?.message || "Verifique os dados informados.";
    toast.error(firstError);
    return;
  }

  // Prossegue com o envio do payload seguro
};
```

---

## 3. Identificação de Campos Obrigatórios vs. Opcionais

O Zelo adota uma convenção consistente em todos os seus formulários:

### 3.1. Labels de Campos Obrigatórios
Utilizam a propriedade `required` no componente `<Label />` (`src/components/ui/label.tsx`), que injeta automaticamente o asterisco vermelho estilizado:

```tsx
<Label required>Nome do produto</Label>
```
*Visual renderizado:* `Nome do produto` `<span class="text-destructive font-bold text-sm leading-none ml-0.5" title="Campo obrigatório">*</span>`.

### 3.2. Destaque Visual em Inputs Obrigatórios
Nos formulários de usuários e dados da loja, inputs obrigatórios recebem um leve tom da cor primária para guiar a visão do usuário:

```tsx
const requiredInputClass = "border-primary/50 focus:ring-primary/50 bg-primary/3";

<Input
  className={requiredInputClass}
  value={form.name}
  onChange={(e) => setForm({ ...form, name: e.target.value })}
  placeholder="Ex.: Ana Silva"
/>
```

### 3.3. Campos Opcionais
Labels não recebem asterisco e, quando aplicável, exibem a indicação textual de apoio (ex.: `<Label>Telefone (opcional)</Label>`).

---

## 4. Seções Colapsáveis em Formulários

Campos que não são estritamente necessários na maioria dos cadastros rápidos devem permanecer minimizados:

- **Endereço do Cliente (`ClientForm`):** A seção de endereço inicia fechada (`isAddressOpen = false`), abrindo-se ao toque em um botão compacto com BoxIcon `chevron-down`. Na busca do CEP (8 dígitos), o sistema preenche rua, bairro, cidade e estado automaticamente via ViaCEP, movendo o foco para o campo "Número".
- **Dados Adicionais do Produto (`ProductForm`):** Campos como código de barras, código de referência, preço de custo e notas iniciam recolhidos em `"Mais Informações"`.
- **Variações de Produto (`ProductForm`):** A tabela de variações de cor/tamanho só é expandida se o interruptor `hasVariants` estiver ativo.

```tsx
<div className="rounded-xl border border-border/70 p-3 bg-muted/20">
  <button
    type="button"
    onClick={() => setIsAddressOpen((prev) => !prev)}
    className="flex w-full items-center justify-between text-left text-sm font-semibold cursor-pointer"
  >
    <span>Endereço de Entrega (Opcional)</span>
    <BoxIcon
      name="chevron-down"
      className={cn("text-base transition-transform", isAddressOpen && "rotate-180")}
    />
  </button>
  
  {isAddressOpen && (
    <div className="pt-3 space-y-3 animate-in fade-in-50 duration-150">
      {/* Inputs de CEP, Rua, Número, etc. */}
    </div>
  )}
</div>
```

---

## 5. Estados de Processamento e Prevenção de Envio Duplo

Para evitar cliques múltiplos durante chamadas de rede lentas:

1. **Estado `busy` / `isSubmitting`:** Variável de controle booleana ativada no início da função `submit` e desativada no bloco `finally`.
2. **Uso de `LoadingButton`:** Substitui o botão comum, desabilitando o clique e exibindo automaticamente o ícone de spinner animado:
```tsx
<LoadingButton
  type="submit"
  loading={isSubmitting}
  className="h-11 w-full rounded-full font-medium"
>
  Salvar
</LoadingButton>
```
3. **Inputs Desabilitados:** Em operações críticas, inputs recebem `disabled={isSubmitting}` para evitar edição concorrente.

---

## 6. Prevenção de Perda de Dados e Rascunhos (Drafts)

- Em formulários com risco de perda por fechamento acidental da aba (ex.: criação de operadores em `/usuarios` ou itens em `/nova-venda`), o formulário salva o rascunho em tempo real no `localStorage`.
- Quando o formulário é submetido com êxito, a chave do rascunho é limpa com `localStorage.removeItem(DRAFT_KEY)`.
- Se o usuário reabrir o formulário após recarregar a página, os dados digitados anteriormente são restaurados com notificação discreta via toast.
