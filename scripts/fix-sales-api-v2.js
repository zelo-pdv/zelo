const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'api', 'sales', 'route.ts');
let content = fs.readFileSync(filePath, 'utf8');

const s1 = `const productsInDb = await tx.product.findMany({
        where: { id: { in: productIds }, lojaId: user.lojaId }
      });`;
const r1 = `const productsInDb = await tx.product.findMany({
        where: { id: { in: productIds }, lojaId: user.lojaId },
        include: { variants: true }
      });`;
content = content.replace(s1, r1);

const startIdx = content.indexOf('for (const item of parsed.items) {');
const endIdx = content.indexOf('const discount = parsed.discount ?? 0;');

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `for (const item of parsed.items) {
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

        saleItemsData.push({
          productId: item.productId,
          variantId: item.variantId,
          productName: dbProduct.name,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: unitPrice,
          subtotal: subtotal,
        });
      }

      `;
  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
}

const s2 = `      // 2. Decrementa o estoque atomicamente e valida sob underflow somente se o controle de estoque estiver ativo
      if (trackStock) {
        for (const item of saleItemsData) {
          const dbProduct = productMap.get(item.productId);
          if (dbProduct && dbProduct.stock !== null) {
            const updatedProduct = await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
              select: { stock: true }
            });
            
            if (blockOutOfStock && updatedProduct.stock !== null && updatedProduct.stock.toNumber() < 0) {
              throw new Error(\`Estoque insuficiente para o produto \${item.productName}.\`);
            }
          }
        }
      }`;

const r2 = `      // 2. Decrementa o estoque atomicamente
      if (trackStock) {
        for (const item of saleItemsData) {
          if (item.variantId) {
             const updatedVariant = await tx.productVariant.update({
               where: { id: item.variantId },
               data: { stock: { decrement: item.quantity } },
               select: { stock: true }
             });
             if (blockOutOfStock && updatedVariant.stock !== null && Number(updatedVariant.stock) < 0) {
                throw new Error(\`Estoque insuficiente para o produto \${item.productName}.\`);
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
                throw new Error(\`Estoque insuficiente para o produto \${item.productName}.\`);
              }
            }
          }
        }
      }`;

content = content.replace(s2, r2);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
