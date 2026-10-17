import { normalizePhone } from "@/lib/validations/uniqueness";

// Lista oficial das 27 Unidades Federativas do Brasil
export const VALID_UF_SET = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

// Normaliza cabeçalho removendo acentos, caracteres invisíveis e espaços extras para comparação
export function normalizeHeaderKey(str: string): string {
  return str
    .replace(/^\uFEFF/, "") // Remove BOM se presente
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove marcas de acentuação
}

// ============================================================================
// ESQUEMA DE PRODUTOS
// ============================================================================

export type ProductFieldKey =
  | "name"
  | "category"
  | "salePrice"
  | "costPrice"
  | "stock"
  | "minStock"
  | "code"
  | "barcode"
  | "description";

// Mapeamento de cabeçalhos permitidos (normalizados sem acento) para os campos de produto
export const PRODUCT_HEADER_MAPPING: Record<string, ProductFieldKey> = {
  // Nome
  nome: "name",
  "nome do produto": "name",
  produto: "name",
  name: "name",

  // Categoria
  categoria: "category",
  category: "category",
  "nome da categoria": "category",

  // Preço de Venda
  "preco de venda": "salePrice",
  preco: "salePrice",
  "valor de venda": "salePrice",
  saleprice: "salePrice",
  price: "salePrice",

  // Preço de Custo
  "preco de custo": "costPrice",
  custo: "costPrice",
  "valor de custo": "costPrice",
  costprice: "costPrice",

  // Estoque
  estoque: "stock",
  stock: "stock",
  qtd: "stock",
  quantidade: "stock",
  "quantidade em estoque": "stock",

  // Estoque Mínimo
  "estoque minimo": "minStock",
  estoque_minimo: "minStock",
  minstock: "minStock",
  "alerta estoque": "minStock",

  // Código
  codigo: "code",
  "codigo interno": "code",
  code: "code",
  sku: "code",

  // Código de Barras
  "codigo de barras": "barcode",
  barcode: "barcode",
  ean: "barcode",
  gtin: "barcode",

  // Descrição
  descricao: "description",
  description: "description",
  detalhes: "description",
};

// Colunas características de CLIENTES que NÃO devem estar em uma planilha de produtos
export const CLIENT_EXCLUSIVE_HEADERS = new Set([
  "telefone",
  "phone",
  "celular",
  "whatsapp",
  "e-mail",
  "email",
  "cep",
  "zipcode",
  "logradouro",
  "rua",
  "endereco",
  "bairro",
  "cidade",
  "municipio",
  "uf",
  "estado",
  "complemento",
  "numero",
]);

// ============================================================================
// ESQUEMA DE CLIENTES
// ============================================================================

export type ClientFieldKey =
  | "name"
  | "phone"
  | "email"
  | "zipCode"
  | "street"
  | "number"
  | "complement"
  | "neighborhood"
  | "city"
  | "state"
  | "notes";

// Mapeamento de cabeçalhos permitidos (normalizados sem acento) para os campos de cliente
export const CLIENT_HEADER_MAPPING: Record<string, ClientFieldKey> = {
  // Nome
  nome: "name",
  "nome do cliente": "name",
  cliente: "name",
  name: "name",

  // Telefone
  telefone: "phone",
  phone: "phone",
  celular: "phone",
  whatsapp: "phone",
  tel: "phone",

  // E-mail
  "e-mail": "email",
  email: "email",

  // CEP
  cep: "zipCode",
  zipcode: "zipCode",

  // Logradouro
  logradouro: "street",
  rua: "street",
  endereco: "street",
  street: "street",

  // Número
  numero: "number",
  number: "number",
  num: "number",
  "no": "number",

  // Complemento
  complemento: "complement",
  comp: "complement",
  complement: "complement",

  // Bairro
  bairro: "neighborhood",
  neighborhood: "neighborhood",

  // Cidade
  cidade: "city",
  municipio: "city",
  city: "city",

  // Estado / UF
  uf: "state",
  estado: "state",
  state: "state",

  // Observações
  observacoes: "notes",
  obs: "notes",
  notas: "notes",
  notes: "notes",
};

// Colunas características de PRODUTOS que NÃO devem estar em uma planilha de clientes
export const PRODUCT_EXCLUSIVE_HEADERS = new Set([
  "preco de venda",
  "preco de custo",
  "preco",
  "saleprice",
  "costprice",
  "estoque",
  "stock",
  "estoque minimo",
  "minstock",
  "codigo de barras",
  "barcode",
  "ean",
  "gtin",
]);

// ============================================================================
// PARSERS E UTILS
// ============================================================================

export function parseImportNumber(value: unknown): { value: number; valid: boolean } {
  if (value === undefined || value === null || value === "") {
    return { value: NaN, valid: false };
  }
  if (typeof value === "number") {
    return { value, valid: !isNaN(value) && isFinite(value) };
  }
  let str = String(value).trim();
  // Remove R$ ou outros prefixos de moeda e espaços
  str = str.replace(/^[R$\s]+/, "").trim();
  if (!str) return { value: NaN, valid: false };

  // Se contiver ponto e vírgula
  if (str.includes(".") && str.includes(",")) {
    const lastDot = str.lastIndexOf(".");
    const lastComma = str.lastIndexOf(",");
    if (lastComma > lastDot) {
      // Formato brasileiro: 1.250,50 -> 1250.50
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato americano: 1,250.50 -> 1250.50
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    // Formato apenas com vírgula: 49,90 -> 49.90
    str = str.replace(",", ".");
  }

  const num = Number(str);
  if (isNaN(num) || !isFinite(num)) {
    return { value: NaN, valid: false };
  }
  return { value: num, valid: true };
}

// ============================================================================
// VALIDAÇÃO DE CABEÇALHOS - PRODUTOS
// ============================================================================

export interface HeaderValidationResult<K extends string> {
  valid: boolean;
  error?: string;
  headerMap: Record<K, string>; // Mapeia chave interna para o nome original da coluna no CSV
}

export function validateProductHeaders(rawHeaders: string[]): HeaderValidationResult<ProductFieldKey> {
  const headerMap = {} as Record<ProductFieldKey, string>;

  if (!rawHeaders || rawHeaders.length === 0) {
    return {
      valid: false,
      error: "O arquivo CSV não possui cabeçalhos ou está vazio.",
      headerMap,
    };
  }

  // 1. Verifica cabeçalhos em branco ou vazios
  for (const h of rawHeaders) {
    if (!h || !h.trim()) {
      return {
        valid: false,
        error: "O arquivo contém cabeçalho vazio ou coluna sem nome. Verifique se há delimitadores duplicados.",
        headerMap,
      };
    }
  }

  // 2. Verifica colunas duplicadas no próprio arquivo
  const seenHeaders = new Set<string>();
  for (const h of rawHeaders) {
    const norm = normalizeHeaderKey(h);
    if (seenHeaders.has(norm)) {
      return {
        valid: false,
        error: `O arquivo contém colunas duplicadas: '${h.trim()}'.`,
        headerMap,
      };
    }
    seenHeaders.add(norm);
  }

  // 3. Verificação de incompatibilidade cruzada (Planilha de Clientes enviada para Produtos)
  for (const h of rawHeaders) {
    const norm = normalizeHeaderKey(h);
    if (CLIENT_EXCLUSIVE_HEADERS.has(norm)) {
      return {
        valid: false,
        error: `Arquivo incompatível: A coluna '${h.trim()}' pertence a uma planilha de clientes e não pode ser importada como produtos.`,
        headerMap,
      };
    }
  }

  // 4. Mapeia e valida cada coluna contra o dicionário de produtos
  for (const h of rawHeaders) {
    const norm = normalizeHeaderKey(h);
    const targetKey = PRODUCT_HEADER_MAPPING[norm];

    if (!targetKey) {
      return {
        valid: false,
        error: `Coluna não reconhecida no arquivo de produtos: '${h.trim()}'. Verifique o modelo oficial.`,
        headerMap,
      };
    }

    if (headerMap[targetKey]) {
      return {
        valid: false,
        error: `O arquivo contém colunas redundantes mapeadas para o mesmo campo: '${headerMap[targetKey]}' e '${h.trim()}'.`,
        headerMap,
      };
    }

    headerMap[targetKey] = h;
  }

  // 5. Valida colunas obrigatórias para produtos: Nome e Preço de Venda
  const missing: string[] = [];
  if (!headerMap.name) missing.push("Nome");
  if (!headerMap.salePrice) missing.push("Preço de Venda");

  if (missing.length > 0) {
    return {
      valid: false,
      error: `O arquivo de produtos deve conter obrigatoriamente as colunas: ${missing.join(" e ")}.`,
      headerMap,
    };
  }

  return { valid: true, headerMap };
}

// ============================================================================
// VALIDAÇÃO DE CABEÇALHOS - CLIENTES
// ============================================================================

export function validateClientHeaders(rawHeaders: string[]): HeaderValidationResult<ClientFieldKey> {
  const headerMap = {} as Record<ClientFieldKey, string>;

  if (!rawHeaders || rawHeaders.length === 0) {
    return {
      valid: false,
      error: "O arquivo CSV não possui cabeçalhos ou está vazio.",
      headerMap,
    };
  }

  // 1. Verifica cabeçalhos em branco ou vazios
  for (const h of rawHeaders) {
    if (!h || !h.trim()) {
      return {
        valid: false,
        error: "O arquivo contém cabeçalho vazio ou coluna sem nome. Verifique se há delimitadores duplicados.",
        headerMap,
      };
    }
  }

  // 2. Verifica colunas duplicadas
  const seenHeaders = new Set<string>();
  for (const h of rawHeaders) {
    const norm = normalizeHeaderKey(h);
    if (seenHeaders.has(norm)) {
      return {
        valid: false,
        error: `O arquivo contém colunas duplicadas: '${h.trim()}'.`,
        headerMap,
      };
    }
    seenHeaders.add(norm);
  }

  // 3. Verificação de incompatibilidade cruzada (Planilha de Produtos enviada para Clientes)
  for (const h of rawHeaders) {
    const norm = normalizeHeaderKey(h);
    if (PRODUCT_EXCLUSIVE_HEADERS.has(norm)) {
      return {
        valid: false,
        error: `Arquivo incompatível: A coluna '${h.trim()}' pertence a uma planilha de produtos e não pode ser importada como clientes.`,
        headerMap,
      };
    }
  }

  // 4. Mapeia e valida cada coluna contra o dicionário de clientes
  for (const h of rawHeaders) {
    const norm = normalizeHeaderKey(h);
    const targetKey = CLIENT_HEADER_MAPPING[norm];

    if (!targetKey) {
      return {
        valid: false,
        error: `Coluna não reconhecida no arquivo de clientes: '${h.trim()}'. Verifique o modelo oficial.`,
        headerMap,
      };
    }

    if (headerMap[targetKey]) {
      return {
        valid: false,
        error: `O arquivo contém colunas redundantes mapeadas para o mesmo campo: '${headerMap[targetKey]}' e '${h.trim()}'.`,
        headerMap,
      };
    }

    headerMap[targetKey] = h;
  }

  // 5. Valida coluna obrigatória Nome
  if (!headerMap.name) {
    return {
      valid: false,
      error: "O arquivo de clientes deve conter obrigatoriamente a coluna 'Nome'.",
      headerMap,
    };
  }

  // 6. Não aceita arquivo com apenas "Nome" (para evitar planilhas arbitrárias)
  const mappedKeys = Object.keys(headerMap);
  if (mappedKeys.length < 2) {
    return {
      valid: false,
      error: "Arquivo insuficiente: A planilha de clientes deve conter colunas adicionais de contato ou endereço (ex: 'Telefone', 'E-mail', 'CEP').",
      headerMap,
    };
  }

  return { valid: true, headerMap };
}

// ============================================================================
// VALIDAÇÃO DE LINHAS - PRODUTOS
// ============================================================================

export interface ValidatedProductRow {
  name: string;
  category: string;
  salePrice: number;
  costPrice: number | null;
  stock: number;
  minStock: number | null;
  code: string | null;
  barcode: string | null;
  description: string | null;
}

export function validateProductRow(
  row: Record<string, any>,
  rowNum: number,
  headerMap: Record<ProductFieldKey, string>,
  state: {
    batchCodes: Set<string>;
    batchBarcodes: Set<string>;
  }
): { valid: boolean; errors: string[]; data?: ValidatedProductRow } {
  const errors: string[] = [];

  // Nome (Obrigatório)
  const rawName = headerMap.name ? row[headerMap.name] : undefined;
  const name = rawName !== undefined && rawName !== null ? String(rawName).trim() : "";
  if (!name) {
    errors.push(`Linha ${rowNum}: Nome do produto é obrigatório.`);
  } else if (name.length < 2) {
    errors.push(`Linha ${rowNum}: Nome do produto deve ter pelo menos 2 caracteres.`);
  } else if (name.length > 100) {
    errors.push(`Linha ${rowNum}: Nome do produto é muito longo (máximo 100 caracteres).`);
  }

  const itemLabel = name ? ` (${name})` : "";

  // Preço de Venda (Obrigatório)
  const rawSalePrice = headerMap.salePrice ? row[headerMap.salePrice] : undefined;
  let salePrice = 0;
  if (rawSalePrice === undefined || rawSalePrice === null || String(rawSalePrice).trim() === "") {
    errors.push(`Linha ${rowNum}${itemLabel}: Preço de Venda é obrigatório.`);
  } else {
    const parsed = parseImportNumber(rawSalePrice);
    if (!parsed.valid) {
      errors.push(`Linha ${rowNum}${itemLabel}: Preço de Venda inválido ('${rawSalePrice}').`);
    } else if (parsed.value < 0) {
      errors.push(`Linha ${rowNum}${itemLabel}: Preço de Venda não pode ser negativo.`);
    } else if (parsed.value > 9999999) {
      errors.push(`Linha ${rowNum}${itemLabel}: Preço de Venda excede o limite máximo permitido (R$ 9.999.999,00).`);
    } else {
      salePrice = parsed.value;
    }
  }

  // Preço de Custo (Opcional)
  const rawCostPrice = headerMap.costPrice ? row[headerMap.costPrice] : undefined;
  let costPrice: number | null = null;
  if (rawCostPrice !== undefined && rawCostPrice !== null && String(rawCostPrice).trim() !== "") {
    const parsed = parseImportNumber(rawCostPrice);
    if (!parsed.valid) {
      errors.push(`Linha ${rowNum}${itemLabel}: Preço de Custo inválido ('${rawCostPrice}').`);
    } else if (parsed.value < 0) {
      errors.push(`Linha ${rowNum}${itemLabel}: Preço de Custo não pode ser negativo.`);
    } else if (parsed.value > 9999999) {
      errors.push(`Linha ${rowNum}${itemLabel}: Preço de Custo excede o limite máximo permitido (R$ 9.999.999,00).`);
    } else {
      costPrice = parsed.value;
    }
  }

  // Estoque (Opcional, padrão 0)
  const rawStock = headerMap.stock ? row[headerMap.stock] : undefined;
  let stock = 0;
  if (rawStock !== undefined && rawStock !== null && String(rawStock).trim() !== "") {
    const parsed = parseImportNumber(rawStock);
    if (!parsed.valid) {
      errors.push(`Linha ${rowNum}${itemLabel}: Estoque inválido ('${rawStock}').`);
    } else if (parsed.value < 0) {
      errors.push(`Linha ${rowNum}${itemLabel}: Estoque não pode ser negativo.`);
    } else if (parsed.value > 9999999) {
      errors.push(`Linha ${rowNum}${itemLabel}: Estoque excede o limite máximo permitido.`);
    } else {
      stock = parsed.value;
    }
  }

  // Estoque Mínimo (Opcional)
  const rawMinStock = headerMap.minStock ? row[headerMap.minStock] : undefined;
  let minStock: number | null = null;
  if (rawMinStock !== undefined && rawMinStock !== null && String(rawMinStock).trim() !== "") {
    const parsed = parseImportNumber(rawMinStock);
    if (!parsed.valid) {
      errors.push(`Linha ${rowNum}${itemLabel}: Estoque Mínimo inválido ('${rawMinStock}').`);
    } else if (parsed.value < 0) {
      errors.push(`Linha ${rowNum}${itemLabel}: Estoque Mínimo não pode ser negativo.`);
    } else if (parsed.value > 9999999) {
      errors.push(`Linha ${rowNum}${itemLabel}: Estoque Mínimo excede o limite máximo permitido.`);
    } else {
      minStock = parsed.value;
    }
  }

  // Categoria (Opcional, padrão "Geral")
  const rawCategory = headerMap.category ? row[headerMap.category] : undefined;
  let category = "Geral";
  if (rawCategory !== undefined && rawCategory !== null && String(rawCategory).trim() !== "") {
    const catStr = String(rawCategory).trim();
    if (catStr.length < 2) {
      errors.push(`Linha ${rowNum}${itemLabel}: Nome da categoria muito curto (mínimo 2 caracteres).`);
    } else if (catStr.length > 50) {
      errors.push(`Linha ${rowNum}${itemLabel}: Nome da categoria muito longo (máximo 50 caracteres).`);
    } else {
      category = catStr;
    }
  }

  // Código interno (Opcional)
  const rawCode = headerMap.code ? row[headerMap.code] : undefined;
  let code: string | null = null;
  if (rawCode !== undefined && rawCode !== null && String(rawCode).trim() !== "") {
    const codeStr = String(rawCode).trim();
    if (codeStr.length > 50) {
      errors.push(`Linha ${rowNum}${itemLabel}: Código interno muito longo (máximo 50 caracteres).`);
    } else {
      const lowerCode = codeStr.toLowerCase();
      if (state.batchCodes.has(lowerCode)) {
        errors.push(`Linha ${rowNum}${itemLabel}: Código interno '${codeStr}' duplicado no próprio arquivo.`);
      } else {
        state.batchCodes.add(lowerCode);
        code = codeStr;
      }
    }
  }

  // Código de Barras (Opcional)
  const rawBarcode = headerMap.barcode ? row[headerMap.barcode] : undefined;
  let barcode: string | null = null;
  if (rawBarcode !== undefined && rawBarcode !== null && String(rawBarcode).trim() !== "") {
    const barStr = String(rawBarcode).trim();
    if (barStr.length > 50) {
      errors.push(`Linha ${rowNum}${itemLabel}: Código de barras muito longo (máximo 50 caracteres).`);
    } else {
      const lowerBarcode = barStr.toLowerCase();
      if (state.batchBarcodes.has(lowerBarcode)) {
        errors.push(`Linha ${rowNum}${itemLabel}: Código de barras '${barStr}' duplicado no próprio arquivo.`);
      } else {
        state.batchBarcodes.add(lowerBarcode);
        barcode = barStr;
      }
    }
  }

  // Descrição (Opcional)
  const rawDesc = headerMap.description ? row[headerMap.description] : undefined;
  let description: string | null = null;
  if (rawDesc !== undefined && rawDesc !== null && String(rawDesc).trim() !== "") {
    const descStr = String(rawDesc).trim();
    if (descStr.length > 500) {
      errors.push(`Linha ${rowNum}${itemLabel}: Descrição muito longa (máximo 500 caracteres).`);
    } else {
      description = descStr;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      name,
      category,
      salePrice,
      costPrice,
      stock,
      minStock,
      code,
      barcode,
      description,
    },
  };
}

// ============================================================================
// VALIDAÇÃO DE LINHAS - CLIENTES
// ============================================================================

export interface ValidatedClientRow {
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  address?: {
    zipCode: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

export function validateClientRow(
  row: Record<string, any>,
  rowNum: number,
  headerMap: Record<ClientFieldKey, string>,
  state: {
    batchPhones: Set<string>;
    batchEmails: Set<string>;
  }
): { valid: boolean; errors: string[]; data?: ValidatedClientRow } {
  const errors: string[] = [];

  // Nome (Obrigatório)
  const rawName = headerMap.name ? row[headerMap.name] : undefined;
  const name = rawName !== undefined && rawName !== null ? String(rawName).trim() : "";
  if (!name) {
    errors.push(`Linha ${rowNum}: Nome do cliente é obrigatório.`);
  } else if (name.length < 2) {
    errors.push(`Linha ${rowNum}: Nome do cliente deve ter pelo menos 2 caracteres.`);
  } else if (name.length > 100) {
    errors.push(`Linha ${rowNum}: Nome do cliente é muito longo (máximo 100 caracteres).`);
  }

  const itemLabel = name ? ` (${name})` : "";

  // Telefone (Opcional, mas validado se preenchido)
  const rawPhone = headerMap.phone ? row[headerMap.phone] : undefined;
  let phone = "";
  if (rawPhone !== undefined && rawPhone !== null && String(rawPhone).trim() !== "") {
    const phoneStr = String(rawPhone).trim();
    const norm = normalizePhone(phoneStr);
    if (phoneStr.length > 20) {
      errors.push(`Linha ${rowNum}${itemLabel}: Telefone muito longo (máximo 20 caracteres).`);
    } else if (norm.length > 0 && norm.length < 10) {
      errors.push(`Linha ${rowNum}${itemLabel}: Telefone inválido ('${phoneStr}'). Deve conter DDD e número com no mínimo 10 dígitos.`);
    } else if (norm.length >= 10) {
      if (state.batchPhones.has(norm)) {
        errors.push(`Linha ${rowNum}${itemLabel}: Telefone '${phoneStr}' duplicado no próprio arquivo.`);
      } else {
        state.batchPhones.add(norm);
        phone = phoneStr;
      }
    } else {
      phone = phoneStr;
    }
  }

  // E-mail (Opcional, mas validado se preenchido)
  const rawEmail = headerMap.email ? row[headerMap.email] : undefined;
  let email: string | null = null;
  if (rawEmail !== undefined && rawEmail !== null && String(rawEmail).trim() !== "") {
    const emailStr = String(rawEmail).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailStr.length > 100) {
      errors.push(`Linha ${rowNum}${itemLabel}: E-mail muito longo (máximo 100 caracteres).`);
    } else if (!emailRegex.test(emailStr)) {
      errors.push(`Linha ${rowNum}${itemLabel}: E-mail com formato inválido ('${emailStr}').`);
    } else if (state.batchEmails.has(emailStr)) {
      errors.push(`Linha ${rowNum}${itemLabel}: E-mail '${emailStr}' duplicado no próprio arquivo.`);
    } else {
      state.batchEmails.add(emailStr);
      email = emailStr;
    }
  }

  // Endereço (Opcional)
  const rawZipCode = headerMap.zipCode ? row[headerMap.zipCode] : undefined;
  const rawStreet = headerMap.street ? row[headerMap.street] : undefined;
  const rawNumber = headerMap.number ? row[headerMap.number] : undefined;
  const rawComplement = headerMap.complement ? row[headerMap.complement] : undefined;
  const rawNeighborhood = headerMap.neighborhood ? row[headerMap.neighborhood] : undefined;
  const rawCity = headerMap.city ? row[headerMap.city] : undefined;
  const rawState = headerMap.state ? row[headerMap.state] : undefined;

  let zipCode = "";
  if (rawZipCode !== undefined && rawZipCode !== null && String(rawZipCode).trim() !== "") {
    zipCode = String(rawZipCode).trim();
    const cleanDigits = zipCode.replace(/\D/g, "");
    if (cleanDigits.length > 0 && cleanDigits.length !== 8) {
      errors.push(`Linha ${rowNum}${itemLabel}: CEP inválido ('${zipCode}'). O CEP deve conter 8 dígitos.`);
    }
  }

  let stateVal = "";
  if (rawState !== undefined && rawState !== null && String(rawState).trim() !== "") {
    stateVal = String(rawState).trim().toUpperCase();
    if (!VALID_UF_SET.has(stateVal)) {
      errors.push(`Linha ${rowNum}${itemLabel}: UF inválido ('${stateVal}'). Deve ser uma sigla válida de estado (ex: SP, RJ, MG).`);
    }
  }

  const street = rawStreet !== undefined && rawStreet !== null ? String(rawStreet).trim() : "";
  const number = rawNumber !== undefined && rawNumber !== null ? String(rawNumber).trim() : "";
  const complement = rawComplement !== undefined && rawComplement !== null ? String(rawComplement).trim() : "";
  const neighborhood = rawNeighborhood !== undefined && rawNeighborhood !== null ? String(rawNeighborhood).trim() : "";
  const city = rawCity !== undefined && rawCity !== null ? String(rawCity).trim() : "";

  if (street.length > 100) errors.push(`Linha ${rowNum}${itemLabel}: Logradouro muito longo (máximo 100 caracteres).`);
  if (number.length > 20) errors.push(`Linha ${rowNum}${itemLabel}: Número muito longo (máximo 20 caracteres).`);
  if (complement.length > 50) errors.push(`Linha ${rowNum}${itemLabel}: Complemento muito longo (máximo 50 caracteres).`);
  if (neighborhood.length > 50) errors.push(`Linha ${rowNum}${itemLabel}: Bairro muito longo (máximo 50 caracteres).`);
  if (city.length > 50) errors.push(`Linha ${rowNum}${itemLabel}: Cidade muito longa (máximo 50 caracteres).`);

  const hasAddress = Boolean(zipCode || street || number || complement || neighborhood || city || stateVal);

  // Observações (Opcional)
  const rawNotes = headerMap.notes ? row[headerMap.notes] : undefined;
  let notes: string | null = null;
  if (rawNotes !== undefined && rawNotes !== null && String(rawNotes).trim() !== "") {
    const notesStr = String(rawNotes).trim();
    if (notesStr.length > 500) {
      errors.push(`Linha ${rowNum}${itemLabel}: Observações muito longas (máximo 500 caracteres).`);
    } else {
      notes = notesStr;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      name,
      phone,
      email,
      notes,
      address: hasAddress
        ? {
            zipCode,
            street,
            number,
            complement,
            neighborhood,
            city,
            state: stateVal,
          }
        : undefined,
    },
  };
}
