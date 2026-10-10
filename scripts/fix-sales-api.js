const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'api', 'sales', 'route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. In `parsed.items` iteration, we need to map variants correctly
content = content.replace(
  /const productsInDb = await tx\.product\.findMany\(\{\n\s*where: \{ id: \{ in: productIds \}, lojaId: user\.lojaId \}\n\s*\}\);/m,
  `const productsInDb = await tx.product.findMany({
          where: { id: { in: productIds }, lojaId: user.lojaId },
          include: { variants: true }
        });`
);

content = content.replace(
  /saleItemsData\.push\(\{\n\s*productId: item\.productId,\n\s*productName: dbProduct\.name, \/\/ Usa o nome real do banco\n\s*quantity: item\.quantity,\n\s*unitPrice: unitPrice,\n\s*subtotal: subtotal,\n\s*\}\);/m,
  `saleItemsData.push({
            productId: item.productId,
            variantId: item.variantId,
            productName: dbProduct.name,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPrice: unitPrice,
            subtotal: subtotal,
          });`
);

content = content.replace(
  /for \(const item of parsed\.items\) \{[\s\S]*?calculatedTotal \+\= subtotal;\n\n\s*saleItemsData\.push/m,
  `for (const item of parsed.items) {
          if (item.quantity <= 0) {
            throw new Error("Quantidade inválida para o produto.");
          }
          const dbProduct = productMap.get(item.productId);
          if (!dbProduct) {
            throw new Error("Produto não encontrado.");
          }

          const dbVariant = item.variantId ? dbProduct.variants.find((v: any) => v.id === item.variantId) : null;
          const stockToCheck = dbVariant ? dbVariant.stock : dbProduct.stock;
          const priceToUse = dbVariant && dbVariant.salePrice !== null ? dbVariant.salePrice : dbProduct.salePrice;
          
          if (trackStock && blockOutOfStock && stockToCheck !== null && Number(stockToCheck) < item.quantity) {
            throw new Error(\`Estoque insuficiente para o produto \${dbProduct.name}\${dbVariant ? ' - ' + dbVariant.name : ''}.\`);
          }
  
          const isProductOpenPrice = openPriceEnabled && (
            openPriceMode === "ALL" ||
            (Array.isArray(openPriceProductIds) && openPriceProductIds.includes(item.productId))
          );
  
          const unitPrice = (isProductOpenPrice && item.unitPrice && item.unitPrice > 0)
            ? item.unitPrice
            : Number(priceToUse);
  
          const subtotal = item.quantity * unitPrice;
          calculatedTotal += subtotal;

          saleItemsData.push`
);

content = content.replace(
  /if \(trackStock\) \{[\s\S]*?\} else \{/m,
  `if (trackStock) {
          for (const item of saleItemsData) {
            if (item.variantId) {
               const updatedVariant = await tx.productVariant.update({
                 where: { id: item.variantId },
                 data: { stock: { decrement: item.quantity } },
                 select: { stock: true }
               });
               if (blockOutOfStock && updatedVariant.stock !== null && Number(updatedVariant.stock) < 0) {
                  throw new Error(\`Venda bloqueada: Estoque do produto ficou negativo (\${updatedVariant.stock}).\`);
               }
            } else {
              const dbProduct = productMap.get(item.productId);
              if (dbProduct && dbProduct.stock !== null) {
                const updatedProduct = await tx.product.update({
                  where: { id: item.productId },
                  data: { stock: { decrement: item.quantity } },
                  select: { stock: true }
                });
                if (blockOutOfStock && updatedProduct.stock !== null && Number(updatedProduct.stock) < 0) {
                  throw new Error(\`Venda bloqueada: Estoque do produto ficou negativo (\${updatedProduct.stock}).\`);
                }
              }
            }
          }
        }

        // 3. Registra movimentações
        if (trackStock) {`
);

fs.writeFileSync(filePath, content, 'utf8');
