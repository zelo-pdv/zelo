# 07. Formulários, Validação Zod e Máscaras de Entrada

Este documento detalha o padrão de formulários, o tratamento de tipos no frontend e backend através do **Zod**, a sanitização de dados, as máscaras de campos brasileiros e as diretrizes de usabilidade para evitar perda de dados.

---

## 1. Padrão de Formulários no Zelo

Ao analisar o código-fonte do Zelo, constata-se uma característica importante sobre a implementação de formulários:

- **Abordagem Efetiva:** Os formulários são **controlados via estado local (`useState`)** integrado diretamente a componentes de interface do Shadcn/Base UI (`Input`, `Textarea`, `Combobox`, `Switch`).
- **Validação:** A validação formal ocorre no momento do envio (*submit*) tanto no cliente quanto no servidor via schemas **Zod**, com feedback de erro em tempo real via **Sonner Toasts**.

> [!WARNING]
> **AUDITORIA DE DEPENDÊNCIA: `@hookform/resolvers`**
>
> O arquivo `package.json` possui a dependência `@hookform/resolvers`, porém `react-hook-form` **não está instalado** e nenhum formulário utiliza o hook `useForm`. Trata-se de uma dependência residual/órfã. Para novos projetos, consulte a seção [Recomendações Futuras](#6-recomendações-futuras) deste documento.

---

## 2. Estrutura e Organização de Schemas Zod (`src/lib/validations/`)

Todos os schemas de validação residem centralizados em `src/lib/validations/<entidade>.ts`. Eles cumprem um papel duplo:
1. **Fonte Única de Tipagem:** Fornecem os tipos TypeScript do frontend através de `z.infer<typeof schema>`.
2. **Garantia de Integridade:** Validam os dados enviados nos endpoints de API no backend antes de qualquer persistência no Prisma.

```text
src/lib/validations/
├── auth.ts              # Validação de credenciais de login e cadastro
├── client.ts            # Validação de clientes e endereços
├── product.ts           # Validação de produtos, variações e preços
├── sale.ts              # Validação de itens, pagamentos e descontos
└── user.ts              # Validação de operadores e regras de acesso
```

---

## 3. Padrões Avançados de Validação com Zod

Devido ao comportamento do navegador e de inputs HTML, valores opcionais não preenchidos frequentemente chegam ao JavaScript como strings vazias (`""`) ou valores indefinidos (`undefined`), e valores numéricos são capturados inicialmente como strings.

Para solucionar essas fricções sem disparar falsos positivos de erro, o Zelo adota dois padrões técnicos mandatórios:

### Padrão A: Campos de Texto Opcionais com Tolerância a String Vazia
Se um campo for opcional (ex.: notas, e-mail secundário), o schema Zod deve aceitar `""`, `null` ou `undefined`:

```typescript
// src/lib/validations/client.ts
export const clientFormSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório (mínimo 2 caracteres)").max(100),
  phone: z
    .string()
    .min(10, "Telefone inválido (mínimo 10 dígitos)")
    .max(20, "Telefone muito longo")
    .or(z.literal(""))
    .nullable()
    .optional(),
  email: z
    .string()
    .email("E-mail inválido")
    .max(100)
    .or(z.literal(""))
    .nullable()
    .optional(),
  notes: z.string().max(500).or(z.literal("")).nullable().optional(),
});
```

### Padrão B: Preprocessing e Coerção em Campos Numéricos Opcionais
Inputs HTML do tipo `number` retornam strings vazias quando limpos pelo usuário. A função `z.coerce.number()` falha ou converte `""` em `0`, o que quebra limites onde `null` significa "sem limite configurado".

A solução canônica é o uso de **`z.preprocess()`**:

```typescript
// src/lib/validations/product.ts
const minStockValidation = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.coerce
    .number()
    .min(0, "O valor não pode ser negativo")
    .max(9999999, "Valor muito alto")
    .nullable()
    .optional()
);

export const productSchema = z.object({
  name: z.string().min(2).max(100),
  salePrice: z.coerce.number().min(0, "O preço de venda é obrigatório"),
  costPrice: z.coerce.number().min(0).optional().nullable(),
  stock: z.coerce.number().default(0),
  minStock: minStockValidation, // Converte "" para null com total segurança
});

export type ProductFormValues = z.infer<typeof productSchema>;
```

---

## 4. Máscaras Padrão Brasileiro (`src/lib/masks.ts`)

O arquivo `src/lib/masks.ts` provê funções puras de formatação e limpeza que devem ser aplicadas diretamente nos manipuladores `onChange` dos inputs:

```typescript
import { maskPhone, maskCpfCnpj, maskCep, unmask } from "@/lib/masks";

// Telefone dinâmico: formata fixo (10 dígitos) ou celular (11 dígitos)
// Ex.: "(11) 98765-4321" ou "(11) 3456-7890"
<Input
  value={maskPhone(form.phone)}
  onChange={(e) => setForm({ ...form, phone: e.target.value })}
  placeholder="(00) 00000-0000"
/>

// Documento dinâmico: CPF (11) ou CNPJ (14)
<Input
  value={maskCpfCnpj(form.document)}
  onChange={(e) => setForm({ ...form, document: e.target.value })}
  placeholder="000.000.000-00 ou 00.000.000/0000-00"
/>

// CEP: 8 dígitos com hífen
<Input
  value={maskCep(form.zipCode)}
  onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
  placeholder="00000-000"
/>
```

- **Envio para o Backend:** Ao persistir no banco, utilize `unmask(valor)` para remover caracteres especiais quando o campo exigir armazenamento exclusivamente numérico limpo.

---

## 5. Indicação de Campos Obrigatórios e Prevenção de Perda de Dados

### Asterisco Visual Acessível (`src/lib/forms.ts`)
Para garantir conformidade visual e acessibilidade a leitores de tela em labels obrigatórios:

```tsx
import { getRequiredAsteriskProps } from "@/lib/forms";

const asteriskProps = getRequiredAsteriskProps();

<Label htmlFor="name">
  Nome Completo
  <span {...asteriskProps}>{asteriskProps.symbol}</span>
</Label>
```

### Prevenção de Descarte Acidental em Modais
Formulários longos renderizados dentro de `Dialog` ou `Drawer` devem prevenir o fechamento acidental ao clicar fora do componente (*pointer dismissal*):
- No `Dialog`: Adicionar `onPointerDownOutside={(e) => e.preventDefault()}` se houver alterações não salvas (*dirty form*).
- No `Drawer`: Utilizar `dismissible={false}` durante o preenchimento ou exibir confirmação antes de descartar.

---

## 6. Recomendações Futuras para Novos Projetos

### Para Projetos com Formulários Simples (Até 5 campos por tela):
- O padrão atual do Zelo (`useState` + Zod schemas + Sonner) é enxuto, rápido e possui excelente legibilidade.

### Para Projetos com Formulários Extensos ou Complexos:
- **`[RECOMENDAÇÃO FUTURA]`:** Adotar formalmente **`react-hook-form`** em conjunto com **`@hookform/resolvers/zod`**.
- **Benefícios:**
  1. Elimina re-renderizações do componente a cada tecla digitada (performance superior no celular).
  2. Gerenciamento automático de estado "tocado/modificado" (`isDirty`).
  3. Validação por campo em tempo real sem código manual de erros.
