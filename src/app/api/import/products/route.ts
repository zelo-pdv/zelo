import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import {
  validateProductHeaders,
  validateProductRow,
  ValidatedProductRow,
} from "@/lib/validations/import";

export async function POST(request: Request) {
  const auth = await requirePermission("produtos", "Adicionar");
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
        : Array.isArray(body.products)
        ? body.products
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
          error: "Nenhum produto enviado para importação.",
          errors: ["Nenhum produto enviado para importação."],
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
    const headerValidation = validateProductHeaders(headers);
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
    const validatedRows: { rowNum: number; data: ValidatedProductRow }[] = [];
    const state = {
      batchCodes: new Set<string>(),
      batchBarcodes: new Set<string>(),
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowNum = i + 2; // Linha 1 é o cabeçalho no CSV
      const rowValidation = validateProductRow(
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
      // Checa duplicidade de códigos no banco para a loja
      const codesToCheck = validatedRows
        .map((r) => r.data.code)
        .filter((c): c is string => Boolean(c));

      if (codesToCheck.length > 0) {
        const existingWithCode = await prisma.product.findMany({
          where: {
            lojaId: auth.user.lojaId,
            deletedAt: null,
            code: { in: codesToCheck },
          },
          select: { code: true, name: true },
        });

        for (const existing of existingWithCode) {
          const matchedEntry = validatedRows.find(
            (r) => r.data.code?.toLowerCase() === existing.code?.toLowerCase()
          );
          const line = matchedEntry ? matchedEntry.rowNum : 0;
          errors.push(
            `Linha ${line} (${existing.name}): O código interno '${existing.code}' já está cadastrado em outro produto desta loja.`
          );
        }
      }

      // Checa duplicidade de código de barras no banco para a loja
      const barcodesToCheck = validatedRows
        .map((r) => r.data.barcode)
        .filter((b): b is string => Boolean(b));

      if (barcodesToCheck.length > 0) {
        const existingWithBarcode = await prisma.product.findMany({
          where: {
            lojaId: auth.user.lojaId,
            deletedAt: null,
            barcode: { in: barcodesToCheck },
          },
          select: { barcode: true, name: true },
        });

        for (const existing of existingWithBarcode) {
          const matchedEntry = validatedRows.find(
            (r) => r.data.barcode === existing.barcode
          );
          const line = matchedEntry ? matchedEntry.rowNum : 0;
          errors.push(
            `Linha ${line} (${existing.name}): O código de barras '${existing.barcode}' já está cadastrado em outro produto desta loja.`
          );
        }
      }
    }

    // 4. Estratégia All-or-Nothing: se houver QUALQUER erro, nenhum registro é salvo!
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "O arquivo contém erros de validação e nenhum produto foi importado.",
          importedCount: 0,
          totalReceived: items.length,
          errors,
        },
        { status: 400 }
      );
    }

    // 5. Persistência atômica com transação Prisma
    await prisma.$transaction(async (tx) => {
      // Agrupa e garante as categorias necessárias da loja
      const uniqueCategoryNames = Array.from(
        new Set(validatedRows.map((r) => r.data.category || "Geral"))
      );

      const existingCategories = await tx.category.findMany({
        where: { lojaId: auth.user.lojaId },
      });

      const categoryMap = new Map<string, string>();
      for (const cat of existingCategories) {
        categoryMap.set(cat.name.toLowerCase(), cat.id);
      }

      for (const catName of uniqueCategoryNames) {
        const lower = catName.toLowerCase();
        if (!categoryMap.has(lower)) {
          const newCat = await tx.category.create({
            data: {
              name: catName,
              lojaId: auth.user.lojaId,
            },
          });
          categoryMap.set(lower, newCat.id);
        }
      }

      // Criação dos produtos simples (sem variações)
      for (const entry of validatedRows) {
        const p = entry.data;
        const catId = categoryMap.get((p.category || "Geral").toLowerCase()) || null;
        await tx.product.create({
          data: {
            name: p.name,
            salePrice: p.salePrice,
            costPrice: p.costPrice,
            stock: p.stock,
            minStock: p.minStock,
            code: p.code,
            barcode: p.barcode,
            description: p.description,
            categoryId: catId,
            active: true,
            lojaId: auth.user.lojaId,
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
    console.error("Erro na importação de produtos:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao processar arquivo de produtos.",
        errors: [error.message || "Erro interno ao processar arquivo de produtos."],
      },
      { status: 500 }
    );
  }
}
