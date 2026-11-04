# 05. Backend e Arquitetura de APIs (Route Handlers)

Este documento descreve detalhadamente a arquitetura de backend implementada no Zelo através dos **Route Handlers do Next.js 15**, cobrindo o ciclo de requisição, validações com Zod, autorização RBAC, controle de erros, serialização e background jobs.

---

## 1. Princípios Arquiteturais da Camada de API

1. **RESTful Pragmático:** Recursos organizados em endpoints previsíveis (`/api/<recursos>` e `/api/<recursos>/[id]`).
2. **Segurança por Padrão (Secure by Default):** Nenhum handler executa lógica de negócio antes de validar autenticação e permissão de módulo.
3. **Isolamento de Tenant Obrigatório:** Toda leitura, gravação ou exclusão é vinculada ao `tenantId` / `lojaId` recuperado da sessão segura, nunca de parâmetros abertos no corpo da requisição.
4. **Respostas Padronizadas e Tipadas:** Erros sempre retornam JSON com a chave `{ error: string, details?: string }`.
5. **Serialização Numérica:** Campos do tipo `Decimal` do PostgreSQL/Prisma são explicitamente convertidos para `Number` antes do retorno.

---

## 2. Mapa de Verbos HTTP e Critérios de Aplicação

| Verbo HTTP | Aplicação no Projeto | Exemplo de Rota | Códigos de Retorno Esperados |
| :--- | :--- | :--- | :--- |
| **`GET`** | Leitura de lista ou busca de registro por ID | `/api/tasks` ou `/api/tasks?page=1` | `200 OK`, `401`, `403`, `500` |
| **`POST`** | Criação atômica de novos registros ou ações de comando | `/api/tasks` ou `/api/auth/login` | `201 Created`, `400`, `401`, `403`, `500` |
| **`PATCH`** | Atualização parcial ou alteração de atributos específicos | `/api/tasks/[id]` | `200 OK`, `400`, `404`, `500` |
| **`DELETE`** | Exclusão lógica (Soft Delete) de um recurso | `/api/tasks/[id]` | `200 OK` (com `{ success: true }`), `404`, `500` |

> [!NOTE]
> O projeto utiliza **`PATCH`** em vez de `PUT` para atualizações de entidades, pois a edição na interface costuma alterar apenas os campos preenchidos, preservando os demais sem exigir o envio de todo o payload do recurso.

---

## 3. Padrão Estrutural de um Route Handler

Abaixo está o padrão arquitetural de referência para criação de endpoints:

```typescript
// src/app/api/tarefas/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { taskSchema } from "@/lib/validations/task";
import { createAuditLog } from "@/lib/audit";

// 1. GET: Listagem com filtro de tenant e exclusão lógica
export async function GET(req: Request) {
  // 1.1 Verificação obrigatória de RBAC
  const auth = await requirePermission("tarefas" as any, "Visualizar");
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const tasks = await prisma.task.findMany({
      where: {
        tenantId: auth.user.lojaId,
        deletedAt: null, // Ignora registros excluídos logicamente
        ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Erro ao buscar tarefas:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar tarefas." },
      { status: 500 }
    );
  }
}

// 2. POST: Criação com validação Zod e Auditoria
export async function POST(req: Request) {
  const auth = await requirePermission("tarefas" as any, "Adicionar");
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();

    // 2.1 Validação com schema Zod
    const data = taskSchema.parse(body);

    // 2.2 Persistência no Prisma injetando o tenant da sessão
    const newTask = await prisma.task.create({
      data: {
        ...data,
        tenantId: auth.user.lojaId,
      },
    });

    // 2.3 Registro de Auditoria
    await createAuditLog({
      action: "CREATE_TASK",
      entity: "Task",
      entityId: newTask.id,
      details: { title: newTask.title },
      userId: auth.user.id,
      lojaId: auth.user.lojaId,
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error: any) {
    // 2.4 Tratamento estruturado de erros Zod
    if (error?.name === "ZodError" || error?.issues) {
      const details = error.issues
        ?.map((i: any) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json(
        { error: "Dados inválidos.", details },
        { status: 400 }
      );
    }

    // 2.5 Tratamento de violação de chave única no Prisma
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Conflito: Já existe um registro com este identificador." },
        { status: 400 }
      );
    }

    console.error("Erro ao criar tarefa:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar tarefa." },
      { status: 500 }
    );
  }
}
```

---

## 4. Endpoints com Parâmetros Dinâmicos (Next.js 15 Async Params)

> [!IMPORTANT]
> **COMPATIBILIDADE MANDATÓRIA COM NEXT.JS 15**
>
> No Next.js 15, a propriedade `params` recebida nos Route Handlers é uma **Promise**.
> O acesso direto a `params.id` dispara avisos no build e quebra em tempo de execução.
> **SEMPRE utilize:**
> ```typescript
> export async function PATCH(
>   request: Request,
>   { params }: { params: Promise<{ id: string }> }
> ) {
>   const { id } = await params;
>   // ...
> }
> ```

---

## 5. Serialização de Decimais do Prisma

O PostgreSQL armazena valores monetários ou fracionados como tipo `Decimal` ou `Numeric`. O Prisma Client mapeia esses tipos para instâncias da classe `Prisma.Decimal`.

Ao passar instâncias de `Decimal` para `NextResponse.json()`, o serializador JSON nativo do JavaScript pode converter o valor para uma string `"49.90"` ou falhar.

### Padrão de Serialização Obrigatório:
```typescript
const serializedProducts = products.map((product) => ({
  ...product,
  salePrice: Number(product.salePrice),
  costPrice: product.costPrice !== null ? Number(product.costPrice) : null,
  stock: Number(product.stock),
}));

return NextResponse.json(serializedProducts);
```

---

## 6. Processamento Assíncrono em Segundo Plano (Background Jobs)

Em operações de longa duração (como processamento de catálogos em lote ou extração via IA com Gemini), a requisição HTTP não deve ficar bloqueada aguardando o término.

### Padrão Existente no Zelo `[PADRÃO EXISTENTE]`:
O Zelo utiliza a função nativa do Node.js `setImmediate()` para desacoplar a tarefa do ciclo de requisição HTTP:

```typescript
// Inicia o job no banco
const job = await prisma.job.create({ data: { status: "QUEUED" } });

// Desacopla a execução do ciclo de vida da requisição HTTP
setImmediate(() => {
  runBackgroundWorker(job.id).catch((err) => {
    console.error(`Erro fatal no job ${job.id}:`, err);
  });
});

// Retorna imediatamente para o cliente com HTTP 200
return NextResponse.json({
  success: true,
  message: "Processamento iniciado em segundo plano.",
  jobId: job.id,
});
```

> [!WARNING]
> **RESSALVA DE INFRAESTRUTURA: NODE.JS vs. SERVERLESS**
>
> O padrão `setImmediate()` funciona com perfeição no ambiente de containers do Zelo (**Docker / Node.js Standalone**), pois o processo Node.js permanece ativo na porta 3000.
> Caso o projeto seja implantado em arquitetura Serverless pura (ex.: Vercel Functions / AWS Lambda), o encerramento da resposta HTTP congela a execução da função. Nesses casos, a recomendação futura é adotar filas de mensagens como **Vercel Queues**, **Inngest**, **Upstash QStash** ou **BullMQ com Redis**.

---

## 7. Rate Limiting em Rotas Críticas

Endpoints sensíveis a ataques de força bruta (como `/api/auth/login`) utilizam o helper `checkRateLimit(req)` em `src/lib/rate-limit.ts`:

- Monitora requisições por IP extraído de `x-forwarded-for` ou `x-real-ip`.
- Janela padrão de 10 requisições por minuto.
- Responde com `HTTP 429 Too Many Requests` caso o limite seja excedido.
- Executa limpeza automática probabilística para evitar consumo excessivo de memória em memória volátil.

---

## 8. Auditoria de Fidelidade

- **Padrão Existente `[PADRÃO EXISTENTE]`:** Uso rigoroso de `requirePermission` em rotas privadas, validação Zod com formatação de erros amigável, serialização explícita de `Decimal` para `Number`, isolamento por `tenantId` e captura de `P2002` do Prisma.
- **Inconsistência Identificada `[PARCIALMENTE ADOTADO]`:** Alguns endpoints antigos ainda possuem queries sem a trava explícita de `deletedAt: null`.
- **Recomendação Futura `[RECOMENDAÇÃO FUTURA]`:** Padronizar um Prisma Extension ou middleware do Prisma para aplicar automaticamente o filtro `deletedAt: null` e `lojaId: user.lojaId` em todas as operações de busca sem depender de digitação manual pelo desenvolvedor.
