const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', '(auth)', 'nova-venda', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. cart functions
content = content.replace(
  /const addProduct = \(p: Product\) => \{[\s\S]*?\}\;\n\n  const updateQty/m,
  `const addProduct = (p: Product, variant?: any) => {
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

  const updateQty =`
);

content = content.replace(
  /const updateQty = \(id: string, qty: number\) => \{[\s\S]*?setItems\(\(prev\) =>\n      prev\.map\(\(i\) => \(i\.productId === id \? \{ \.\.\.i\, quantity\: qty \} \: i\)\),\n    \);\n  \};/m,
  `const updateQty = (cartItemId: string, qty: number) => {
    if (qty < 1) return;

    const item = items.find((i) => i.cartItemId === cartItemId);
    if (!item) return;

    const product = products.find((p) => p.id === item.productId);
    const variant = product?.variants?.find((v: any) => v.id === item.variantId);
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
  };`
);

content = content.replace(
  /const removeItem = \(id: string\) => \{\n    setItems\(\(prev\) => prev\.filter\(\(i\) => i\.productId !== id\)\);\n  \};/g,
  `const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };`
);

content = content.replace(
  /const updateItemPrice = \(id: string, newPrice: number\) => \{\n    if \(isNaN\(newPrice\) \|\| newPrice < 0\) return;\n    setItems\(\(prev\) =>\n      prev\.map\(\(i\) => \(i\.productId === id \? \{ \.\.\.i, unitPrice: newPrice \} : i\)\)\n    \);\n  \};/g,
  `const updateItemPrice = (cartItemId: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    setItems((prev) =>
      prev.map((i) => (i.cartItemId === cartItemId ? { ...i, unitPrice: newPrice } : i))
    );
  };`
);

content = content.replace(
  /type CartItem = \{\n  productId: string;\n  variantId\?: string \| null;\n  productName: string;\n  variantName\?: string \| null;\n  productImage\?: string \| null;\n  quantity: number;\n  unitPrice: number;\n\};/m,
  `type CartItem = {
  cartItemId: string; // productId ou productId-variantId
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  productImage?: string | null;
  quantity: number;
  unitPrice: number;
};`
);

// Map render usage
content = content.replace(
  /key=\{item\.productId\}/g,
  `key={item.cartItemId}`
);

content = content.replace(
  /onUpdateQty=\{\(qty\) => updateQty\(item\.productId, qty\)\}/g,
  `onUpdateQty={(qty) => updateQty(item.cartItemId, qty)}`
);

content = content.replace(
  /onRemove=\{\(\) => removeItem\(item\.productId\)\}/g,
  `onRemove={() => removeItem(item.cartItemId)}`
);

content = content.replace(
  /onUpdatePrice=\{\(val\) => updateItemPrice\(item\.productId, val\)\}/g,
  `onUpdatePrice={(val) => updateItemPrice(item.cartItemId, val)}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
