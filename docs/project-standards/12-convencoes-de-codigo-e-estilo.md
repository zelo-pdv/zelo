# 12. Convenções de Código, Nomenclatura e Tipagem

Este documento estabelece as convenções de escrita de código, nomenclaturas, organização de imports/exports e diretrizes de tipagem TypeScript consolidadas a partir da análise técnica do ecossistema Zelo.

---

## 1. Guia Canônico de Nomenclaturas

Para manter a consistência e a legibilidade em todo o projeto, adote as seguintes regras de nomenclatura:

| Padrão | Onde Aplicar | Exemplos Reais |
| :--- | :--- | :--- |
| **PascalCase** | Componentes React | `ProductForm`, `BoxIcon`, `MobileActionFab`, `AuthLayout` |
| | Tipos e Interfaces TypeScript | `UserContextData`, `ClientWithAddress`, `SaleItem` |
| | Modelos do Prisma ORM | `model Product`, `model AccessGroup`, `model AuditLog` |
| **camelCase** | Funções e Métodos Utilitários | `requirePermission()`, `maskPhone()`, `textIncludes()` |
| | Variáveis e Parâmetros | `currentUser`, `isMobile`, `activeTab`, `searchParams` |
| | Propriedades de Objetos | `salePrice`, `createdAt`, `onboardingCompleted` |
| | Hooks Personalizados | `useIsMobile`, `useDataSync`, `usePermissions` |
| | Serviços Client-side | `productsService`, `settingsService`, `authService` |
| **kebab-case** | Arquivos de Componentes | `product-form.tsx`, `box-icon.tsx`, `loading-button.tsx` |
| | Arquivos Utilitários e Schemas | `jwt-auth.ts`, `rate-limit.ts`, `product.ts` |
| | Pastas de Rotas e URLs | `nova-venda`, `produtos-globais`, `configuracoes` |
| | Endpoints de API | `/api/access-groups`, `/api/stock-movements` |
| **UPPER_SNAKE_CASE**| Constantes Globais Imutáveis | `JWT_SECRET`, `BUCKET_PRODUCTS`, `TOKEN_MAX_AGE` |
| | Valores de Enums | `SaleStatus.PAGO`, `AdminRole.SUPERADMIN` |

---

## 2. Regra de Exportação: Named Exports vs. Default Exports

- **`export default`:** Permitido e reservado **exclusivamente** para arquivos exigidos pelo Next.js App Router:
  - `page.tsx` (ex.: `export default function ProdutosPage()`)
  - `layout.tsx` (ex.: `export default function RootLayout()`)
  - `next.config.ts`
- **`export const / export function` (Named Exports):** **Mandatório** para todos os demais arquivos do projeto:
  - Componentes de UI e de domínio.
  - Funções de serviço (`export const productsService = { ... }`).
  - Funções utilitárias e schemas Zod.
  - **Motivo Técnico:** Facilita a renomeação em massa por ferramentas de refatoração, assegura consistência nas importações e ativa o auto-complete instantâneo da IDE.

---

## 3. Organização Padronizada de Imports

Para evitar importações confusas e ciclos de dependência, ordene os blocos de import da seguinte forma:

```typescript
// 1. Módulos externos e do framework
import { useEffect, useState } from "react";
import { NextResponse } from "next/server";
import { toast } from "sonner";

// 2. Componentes visuais e de design system
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BoxIcon } from "@/components/ui/box-icon";

// 3. Camadas de lógica, serviços e infraestrutura
import { productsService } from "@/services/products.service";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

// 4. Schemas Zod, máscaras e utilitários
import { productSchema, type ProductFormValues } from "@/lib/validations/product";
import { maskPhone } from "@/lib/masks";
import { cn } from "@/lib/utils";

// 5. Tipagens TypeScript
import type { Product, Sale } from "@/types";
```

- **Uso do Alias `@/*`:** O projeto adota `@/` mapeando diretamente para `./src/*`. Nunca utilize caminhos relativos profundos como `../../../../components/ui/button`.

---

## 4. Tipagem TypeScript e Auditoria do Débito de `any`

### O Débito Técnico Identificado no Zelo `[PARCIALMENTE ADOTADO]`:
No arquivo `eslint.config.mjs`, a regra `@typescript-eslint/no-explicit-any` está configurada como `"off"`.
Como resultado, partes do código utilizam `any` para contornar tipagens complexas, especialmente em:
- Colunas JSON do Prisma: `(user.loja?.settings?.config as any)`
- Variações e atributos dinâmicos: `(v.attributes ?? {}) as any`
- Respostas de serviços: `const config: any = await settingsService.get()`

### A Recomendação Mandatória para Novos Projetos `[RECOMENDAÇÃO FUTURA]`:
Em projetos futuros, **nunca desative a regra `no-explicit-any`**. Adote as seguintes soluções type-safe:

1. **Para colunas JSON do Prisma:** Defina um schema Zod correspondente e realize parse tipado:
   ```typescript
   export const storeConfigSchema = z.object({
     trackStock: z.boolean().default(true),
     notifications: z.object({ enableToasts: z.boolean() }),
   });
   export type StoreConfig = z.infer<typeof storeConfigSchema>;

   // No código:
   const config = storeConfigSchema.parse(user.loja?.settings?.config ?? {});
   // config agora é 100% tipado sem nenhum 'any'!
   ```
2. **Para serviços de API:** Utilize funções genéricas com tipagem de retorno estrita:
   ```typescript
   export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> { ... }
   ```

---

## 5. Boas Práticas de Comentários e Documentação de Código

- **Comentários de Regra de Negócio e Segurança:** Devem explicar **o porquê** e não o que o código está fazendo.
  - Exemplo excelente encontrado em `src/app/api/auth/login/route.ts`:
    ```typescript
    // Dummy hash comparison to mitigate timing attacks for non-existent users
    await bcrypt.compare(password, "$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa");
    ```
- **Evite Comentários Óbvios:** Não escreva comentários redundantes como `// incrementa o contador` antes de `count++`.
