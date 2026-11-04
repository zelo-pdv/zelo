# 06. Banco de Dados, Prisma ORM e Estratégia de Dados

Este documento estabelece as diretrizes arquiteturais para modelagem relacional, estratégias de transação, controle de concorrência, migrações e o padrão avançado de soft delete utilizando **Prisma ORM** e **PostgreSQL**.

---

## 1. Conexão e Arquitetura do Prisma

O Zelo adota o Prisma ORM com o adaptador moderno **`@prisma/adapter-pg`**, utilizando um pool de conexões gerenciado via `pg.Pool`. Essa arquitetura oferece maior desempenho em ambientes de alta concorrência comparado ao driver nativo tradicional.

### Configuração do Singleton (`src/lib/prisma.ts`)
```typescript
import { PrismaClient } from "@/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
```

---

## 2. Configuração do Generator e Suporte a Containers

No arquivo `prisma/schema.prisma`, duas diretivas são fundamentais para garantir portabilidade entre sistemas operacionais de desenvolvimento (Windows/macOS) e a distribuição Alpine Linux utilizada no Docker:

```prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../src/prisma"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
}
```

- **`output: "../src/prisma"`:** Centraliza a geração do cliente tipado dentro da árvore de código-fonte versionada, viabilizando compilações consistentes em monorepos ou ambientes com Docker Standalone.
- **`binaryTargets`:** Garante que o motor Rust do Prisma compile binários tanto para o host local quanto para a libc Alpine Linux (`musl`).

---

## 3. Convenções de Modelagem e Nomenclatura

| Elemento | Convenção | Exemplo |
| :--- | :--- | :--- |
| **Modelos (Tabelas)** | PascalCase no singular | `model User`, `model Product`, `model AuditLog` |
| **Colunas (Campos)** | camelCase | `salePrice`, `createdAt`, `tenantId`, `deletedAt` |
| **Chave Primária** | String com CUID | `id String @id @default(cuid())` |
| **Enums** | UPPERCASE com snake_case | `enum SaleStatus { PAGO, PENDENTE, CANCELADO }` |
| **Tabelas de Junção** | PascalCase descritiva | `model SaleItem` vinculando `Sale` e `Product` |
| **Campos Monetários** | `Decimal` com precisão fixa | `Decimal @db.Decimal(10, 2)` |
| **Campos de Quantidade**| `Decimal` com precisão de fração | `Decimal @db.Decimal(10, 3)` (permite kg/metros) |

---

## 4. O Padrão de Soft Delete com Liberação de Índice Único

Um dos problemas mais comuns em bancos de dados relacionais ocorre quando uma tabela possui um índice único (ex.: código do produto ou slug por tenant) e o sistema adota exclusão lógica (`deletedAt: DateTime?`). Se um item for excluído, o usuário fica impedido de recadastrar outro item com o mesmo código devido ao conflito da constraint no banco.

### A Solução Implementada no Zelo `[PADRÃO EXISTENTE]`:
No momento do soft delete, a aplicação appenda um sufixo temporal único no campo restrito:

```typescript
// Exemplo real de src/app/api/products/[id]/route.ts
const suffix = `_del_${Date.now()}`;

await prisma.product.update({
  where: { id },
  data: {
    deletedAt: new Date(),
    active: false,
    // Libera o código e código de barras para que novos produtos possam reusá-los
    code: existingProduct.code ? `${existingProduct.code}${suffix}` : null,
    barcode: existingProduct.barcode ? `${existingProduct.barcode}${suffix}` : null,
  },
});
```

### Vantagens Desta Abordagem:
1. **Preserva a Integridade Histórica:** Vendas, relatórios e movimentações antigas continuam apontando com segurança para o `productId` original sem quebrar chaves estrangeiras.
2. **Libera a Restrição Única:** O índice `@@unique([tenantId, code])` não entra em conflito caso um novo registro seja criado com o código original limpo.
3. **Auditoria Clara:** O histórico do banco deixa explícito o instante exato em que o identificador foi descartado.

---

## 5. Transações Atômicas e Concorrência

Em operações críticas (como fechamento de pedidos ou transferências de saldo), todas as alterações devem ocorrer de forma atômica dentro de um bloco `prisma.$transaction(async (tx) => { ... })`.

### A. Prevenção de Conflitos em Numerações Sequenciais
Para garantir que duas transações simultâneas não recebam o mesmo número sequencial amigável (ex.: número do pedido), adota-se um **loop de retry com captura de conflito P2002**:

```typescript
let record;
let retries = 3;

while (retries > 0) {
  try {
    record = await prisma.$transaction(async (tx) => {
      const last = await tx.order.findFirst({
        where: { tenantId: user.tenantId, orderNumber: { not: null } },
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
      });

      const nextNumber = (last?.orderNumber ?? 0) + 1;

      return await tx.order.create({
        data: {
          tenantId: user.tenantId,
          orderNumber: nextNumber,
          // itens...
        },
      });
    });
    break; // Sucesso: encerra as tentativas
  } catch (err: any) {
    if (err?.code === "P2002" && retries > 1) {
      retries--; // Tenta novamente calculando o novo número
      continue;
    }
    throw err;
  }
}
```

### B. Decremento Atômico de Saldo/Estoque e Prevenção de Underflow
Para impedir que dois cliques simultâneos gerem saldo negativo:

```typescript
const updated = await tx.product.update({
  where: { id: item.productId },
  data: {
    stock: {
      decrement: item.quantity,
    },
  },
  select: { stock: true },
});

// Validação em memória após decremento atômico
if (updated.stock.toNumber() < 0) {
  // Lançar erro dentro do callback do $transaction força ROLLBACK total de todas as operações
  throw new Error(`Estoque insuficiente para o produto informado.`);
}
```

---

## 6. Governança de Migrações e Seeds

- **Ambiente de Desenvolvimento:**
  ```bash
  pnpm prisma migrate dev --name <descricao_da_migracao>
  ```
- **Ambiente de Produção (Container / Deploy):**
  ```bash
  docker compose exec app npx prisma migrate deploy
  ```
- **População de Dados Iniciais (Seed):**
  Definido no `package.json`:
  ```json
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
  ```
  O script `prisma/seed.ts` é idempotente: cria contas padrão, perfis de acesso essenciais (Administrador, Operador) e registros básicos sem duplicar dados caso já existam.

---

## 7. Auditoria de Fidelidade

- **Padrão Existente `[PADRÃO EXISTENTE]`:** Uso de `@prisma/adapter-pg`, soft delete com liberação de sufixo temporal, transações atômicas com verificação pós-decremento e retry loop em numerações sequenciais.
- **Inconsistência Identificada `[PARCIALMENTE ADOTADO]`:** Alguns modelos possuem arquivos de backup manuais no disco (`schema.prisma.bak`, `schema.prisma.with_variants`), demonstrando alterações feitas sem controle estrito de branches Git.
- **Recomendação Futura `[RECOMENDAÇÃO FUTURA]`:** Utilizar migrations pontuais versionadas no Git e automatizar o `prisma migrate deploy` como etapa no pipeline de inicialização do Dockerfile antes de disparar o comando final `node server.js`.
