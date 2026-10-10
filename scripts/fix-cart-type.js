const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', '(auth)', 'nova-venda', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/type CartItem = \{\s*productId: string;\s*variantId\?: string \| null;\s*productName: string;\s*variantName\?: string \| null;\s*productImage\?: string \| null;\s*quantity: number;\s*unitPrice: number;\s*\};/m,
`type CartItem = {
  cartItemId: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  productImage?: string | null;
  quantity: number;
  unitPrice: number;
};`);

fs.writeFileSync(filePath, content, 'utf8');

const variantPickerPath = path.join(__dirname, '..', 'src', 'components', 'nova-venda', 'variant-picker.tsx');
let vpContent = fs.readFileSync(variantPickerPath, 'utf8');
vpContent = vpContent.replace('import { currency } from "@/lib/utils";', 'const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);');
fs.writeFileSync(variantPickerPath, vpContent, 'utf8');
