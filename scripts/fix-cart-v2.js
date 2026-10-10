const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', '(auth)', 'nova-venda', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The target functions start at `const addProduct = (p: Product) => {` and end before `const clear = () => {`
const startIdx = content.indexOf('const addProduct = (p: Product) => {');
const endIdx = content.indexOf('const clear = () => {');

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `const addProduct = (p: any, variant?: any) => {
    if (p.variants && p.variants.length > 0 && !variant) {
      setVariantPickerProduct(p);
      return;
    }

    const cartItemId = variant ? \`\${p.id}-\${variant.id}\` : p.id;
    const stockToCheck = variant ? variant.stock : p.stock;
    const itemName = variant ? \`\${p.name} - \${variant.name}\` : p.name;
    const itemPrice = variant && variant.salePrice !== null ? Number(variant.salePrice) : Number(p.salePrice);
    
    const existing = items.find((i) => i.cartItemId === cartItemId);
    const currentQty = existing ? existing.quantity : 0;

    if (trackStock && salesSettings.blockOutOfStock && currentQty + 1 > stockToCheck) {
      toast.error(
        \`Venda bloqueada: Estoque insuficiente para \${itemName}. (Disponível: \${stockToCheck})\`,
        { id: \`stock-block-\${cartItemId}\`, duration: 3500 }
      );
      return;
    }

    if (trackStock && !salesSettings.blockOutOfStock && currentQty + 1 > stockToCheck && outOfStockWarning) {
      toast.warning(
        \`Aviso: Estoque insuficiente para \${itemName}. (Disponível: \${stockToCheck})\`,
        { id: \`stock-warn-\${cartItemId}\`, duration: 3000 }
      );
    }

    setItems((prev) => {
      const exists = prev.find((i) => i.cartItemId === cartItemId);
      if (exists) {
        return prev.map((i) =>
          i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          cartItemId,
          productId: p.id,
          variantId: variant?.id,
          productName: p.name,
          variantName: variant?.name,
          productImage: variant?.image || p.image,
          unitPrice: itemPrice,
          quantity: 1,
        },
      ];
    });
    setVariantPickerProduct(null);
  };

  const updateQty = (cartItemId: string, qty: number) => {
    if (qty < 1) return;

    const item = items.find((i) => i.cartItemId === cartItemId);
    if (!item) return;

    const product = products.find((p) => p.id === item.productId);
    const variant = (product as any)?.variants?.find((v: any) => v.id === item.variantId);
    const stockToCheck = variant ? variant.stock : (product ? product.stock : 0);
    const itemName = variant ? \`\${product?.name} - \${variant.name}\` : product?.name;

    if (trackStock && salesSettings.blockOutOfStock && product && qty > stockToCheck) {
      toast.error(
        \`Venda bloqueada: Estoque insuficiente para \${itemName}. (Disponível: \${stockToCheck})\`,
        { id: \`stock-block-\${cartItemId}\`, duration: 3500 }
      );
      return;
    }

    if (trackStock && !salesSettings.blockOutOfStock && product && qty > stockToCheck && outOfStockWarning) {
      toast.warning(
        \`Aviso: Estoque insuficiente para \${itemName}. (Disponível: \${stockToCheck})\`,
        { id: \`stock-warn-\${cartItemId}\`, duration: 3000 }
      );
    }

    setItems((prev) =>
      prev.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity: qty } : i)),
    );
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  `;

  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Success");
} else {
  console.log("Not found");
}
