import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import {
  validateClientHeaders,
  validateClientRow,
  ValidatedClientRow,
} from "@/lib/validations/import";
import { checkEmailConflict, checkPhoneConflict } from "@/lib/validations/uniqueness";

export async function POST(request: Request) {
  const auth = await requirePermission("clientes", "Adicionar");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const textBody = await request.text();
    // Limita o tamanho do payload (5MB) para evitar DoS
    if (textBody.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "O arquivo de importação excede o tamanho máximo permitido (5MB).",
          errors: ["O arquivo de importação excede o tamanho máximo permitido (5MB)."],
        },
        { status: 413 }
      );
    }

    let body: any;
    try {
      body = JSON.parse(textBody);
    } catch {
      return NextResponse.json(
        {
          error: "Formato de payload inválido.",
          errors: ["Formato de payload inválido."],
        },
        { status: 400 }
      );
    }

    let items: any[] = [];
    let headers: string[] = [];

    if (Array.isArray(body)) {
      items = body;
      if (items.length > 0 && typeof items[0] === "object" && items[0] !== null) {
        headers = Object.keys(items[0]);
      }
    } else if (body && typeof body === "object") {
      items = Array.isArray(body.items)
        ? body.items
        : Array.isArray(body.clients)
        ? body.clients
        : [];
      if (Array.isArray(body.headers)) {
        headers = body.headers;
      } else if (items.length > 0 && typeof items[0] === "object" && items[0] !== null) {
        headers = Object.keys(items[0]);
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          error: "Nenhum cliente enviado para importação.",
          errors: ["Nenhum cliente enviado para importação."],
        },
        { status: 400 }
      );
    }

    if (items.length > 1000) {
      return NextResponse.json(
        {
          error: "A importação está limitada a 1000 itens por vez. Divida seu arquivo e tente novamente.",
          errors: ["A importação está limitada a 1000 itens por vez. Divida seu arquivo e tente novamente."],
        },
        { status: 413 }
      );
    }

    // Se headers não foram passados explicitamente, compõe a união das chaves de todos os registros
    if (headers.length === 0) {
      const headerSet = new Set<string>();
      for (const item of items) {
        if (item && typeof item === "object") {
          Object.keys(item).forEach((k) => headerSet.add(k));
        }
      }
      headers = Array.from(headerSet);
    }

    // 1. Validação estrita da estrutura e cabeçalhos do arquivo
    const headerValidation = validateClientHeaders(headers);
    if (!headerValidation.valid) {
      return NextResponse.json(
        {
          error: headerValidation.error,
          errors: [headerValidation.error || "Cabeçalhos inválidos."],
          importedCount: 0,
          totalReceived: items.length,
        },
        { status: 400 }
      );
    }

    // 2. Validação individual linha a linha com rastreio de duplicatas no lote
    const errors: string[] = [];
    const validatedRows: { rowNum: number; data: ValidatedClientRow }[] = [];
    const state = {
      batchPhones: new Set<string>(),
      batchEmails: new Set<string>(),
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowNum = i + 2; // Linha 1 é o cabeçalho no CSV
      const rowValidation = validateClientRow(
        item,
        rowNum,
        headerValidation.headerMap,
        state
      );

      if (!rowValidation.valid) {
        errors.push(...rowValidation.errors);
      } else if (rowValidation.data) {
        validatedRows.push({ rowNum, data: rowValidation.data });
      }
    }

    // 3. Validação de conflitos com registros já existentes no banco de dados (por loja)
    if (errors.length === 0) {
      for (const entry of validatedRows) {
        const { rowNum, data } = entry;
        const itemLabel = ` (${data.name})`;

        if (data.email) {
          const emailConflict = await checkEmailConflict({
            email: data.email,
            lojaId: auth.user.lojaId,
          });
          if (emailConflict) {
            errors.push(`Linha ${rowNum}${itemLabel}: ${emailConflict}`);
          }
        }

        if (data.phone) {
          const phoneConflict = await checkPhoneConflict({
            phone: data.phone,
            lojaId: auth.user.lojaId,
          });
          if (phoneConflict) {
            errors.push(`Linha ${rowNum}${itemLabel}: ${phoneConflict}`);
          }
        }
      }
    }

    // 4. Estratégia All-or-Nothing: se houver QUALQUER erro, nenhum registro é salvo!
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "O arquivo contém erros de validação e nenhum cliente foi importado.",
          importedCount: 0,
          totalReceived: items.length,
          errors,
        },
        { status: 400 }
      );
    }

    // 5. Persistência atômica com transação Prisma
    await prisma.$transaction(async (tx) => {
      for (const entry of validatedRows) {
        const c = entry.data;
        await tx.client.create({
          data: {
            name: c.name,
            phone: c.phone,
            email: c.email,
            notes: c.notes,
            active: true,
            lojaId: auth.user.lojaId,
            address: c.address
              ? {
                  create: {
                    zipCode: c.address.zipCode,
                    street: c.address.street,
                    number: c.address.number,
                    complement: c.address.complement,
                    neighborhood: c.address.neighborhood,
                    city: c.address.city,
                    state: c.address.state,
                    lojaId: auth.user.lojaId,
                  },
                }
              : undefined,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      importedCount: validatedRows.length,
      totalReceived: items.length,
      errors: [],
    });
  } catch (error: any) {
    console.error("Erro na importação de clientes:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao processar arquivo de clientes.",
        errors: [error.message || "Erro interno ao processar arquivo de clientes."],
      },
      { status: 500 }
    );
  }
}
