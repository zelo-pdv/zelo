import type { BrandExtractionProfile } from "./types";

const GENERIC_PROFILE: BrandExtractionProfile = {
  slug: "generic",
  name: "Genérico",
  skuRegexes: [
    /(?:c[oó]d\.?|ref\.?|sku)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{2,14})/gi,
    /\((\d{4,8})\)/g,
    /\b(\d{5,6})\b/g,
  ],
  skuMinDigits: 4,
  skuMaxDigits: 12,
  allowAlphanumericSku: true,
  numberedProductPrefixRegex: /^\s*(\d{1,2})\s*[-–.)]\s+(.+)/,
  colorPairRegex: /([A-Za-zÀ-ÿ0-9\s/-]{2,30}?)\s*\(([A-Za-z0-9]{1,4})\)/g,
  sizeHeaderRegex: /(?:tam(?:anhos?)?\.?|grade|medidas?|numera[cç][aã]o)\s*[:.]?\s*(.+)/i,
  promptHints:
    "Analise os blocos seguindo o layout específico desta marca. Códigos/SKUs podem ser numéricos ou alfanuméricos, precedidos por 'Cód.', 'Ref.', entre parênteses ou próximos ao título e preço. Não assuma padrão exclusivo de uma única fabricante.",
};

const DEMILLUS_PROFILE: BrandExtractionProfile = {
  slug: "demillus",
  name: "DeMillus",
  skuRegexes: [
    /\((\d{6})\)/g,
    /(?:c[oó]d\.?|ref\.?|sku)\s*[:#-]?\s*(\d{5,6})/gi,
    /\b(0\d{5}|[1-9]\d{5})\b/g,
  ],
  skuMinDigits: 5,
  skuMaxDigits: 6,
  allowAlphanumericSku: false,
  numberedProductPrefixRegex: /^\s*(\d{1,2})\s*[-–]\s+(.+)/,
  colorPairRegex: /([A-Za-zÀ-ÿ0-9\s/-]{2,30}?)\s*\(([A-Za-z0-9]{2})\)/g,
  sizeHeaderRegex: /(?:tam\.?|tamanhos?)\s*[:.]?\s*(.+)/i,
  promptHints:
    "Catálogo DeMillus frequentemente usa numeração sequencial ('1 - Nome', '2 - Nome'), SKU numérico de 6 dígitos entre parênteses logo abaixo do nome, cores no formato 'NomeCor(Código)' (2 dígitos/letras) e blocos 'Conjunto X' que compartilham descrição/cores com as peças numeradas logo abaixo. Selos de oferta ('1 por X ou 2/3 ou + por Y CADA') pertencem apenas ao produto nomeado no selo.",
};

const NATURA_PROFILE: BrandExtractionProfile = {
  slug: "natura",
  name: "Natura",
  skuRegexes: [
    /\((\d{4,6})\)/g,
    /(?:c[oó]d\.?|ref\.?)\s*[:#-]?\s*(\d{4,6})/gi,
    /\b(\d{5})\b/g,
  ],
  skuMinDigits: 4,
  skuMaxDigits: 6,
  allowAlphanumericSku: false,
  numberedProductPrefixRegex: /^\s*(\d{1,2})\s*[-–.]\s+(.+)/,
  colorPairRegex: /([A-Za-zÀ-ÿ0-9\s/-]{2,30}?)\s*\((\d{2,5})\)/g,
  sizeHeaderRegex: /(?:conte[uú]do|volume|peso|tam\.?)\s*[:.]?\s*(.+)/i,
  promptHints:
    "Catálogos Natura costumam exibir códigos de 4 a 6 dígitos (ex: '(12345)' ou 'Cód. 12345'), volumetrias em ml/g (ex: '100 ml', 'Refil 200 ml') e preços promocionais 'De R$ X por R$ Y' ou combos/presentes.",
};

const BOTICARIO_PROFILE: BrandExtractionProfile = {
  slug: "o-boticario",
  name: "O Boticário",
  skuRegexes: [
    /\((\d{4,6})\)/g,
    /(?:c[oó]d\.?|ref\.?)\s*[:#-]?\s*(\d{4,6})/gi,
    /\b(\d{5})\b/g,
  ],
  skuMinDigits: 4,
  skuMaxDigits: 6,
  allowAlphanumericSku: false,
  numberedProductPrefixRegex: /^\s*(\d{1,2})\s*[-–.]\s+(.+)/,
  colorPairRegex: /([A-Za-zÀ-ÿ0-9\s/-]{2,30}?)\s*\((\d{2,5})\)/g,
  sizeHeaderRegex: /(?:conte[uú]do|volume|peso|tam\.?)\s*[:.]?\s*(.+)/i,
  promptHints:
    "Catálogos O Boticário costumam trazer códigos de 5 dígitos próximos ao produto/preço, variações por volumetria/refil e descontos progressivos ou combos.",
};

const EUDORA_PROFILE: BrandExtractionProfile = {
  slug: "eudora",
  name: "Eudora",
  skuRegexes: [
    /\((\d{4,6})\)/g,
    /(?:c[oó]d\.?|ref\.?)\s*[:#-]?\s*(\d{4,6})/gi,
    /\b(\d{5})\b/g,
  ],
  skuMinDigits: 4,
  skuMaxDigits: 6,
  allowAlphanumericSku: false,
  numberedProductPrefixRegex: /^\s*(\d{1,2})\s*[-–.]\s+(.+)/,
  colorPairRegex: /([A-Za-zÀ-ÿ0-9\s/-]{2,30}?)\s*\((\d{2,5})\)/g,
  sizeHeaderRegex: /(?:conte[uú]do|volume|peso|tam\.?)\s*[:.]?\s*(.+)/i,
  promptHints:
    "Catálogos Eudora frequentemente trazem códigos de 4 a 6 dígitos, variações de tons de maquiagem/batom e preços 'De ... por ...'.",
};

const BRAND_PROFILES: Record<string, BrandExtractionProfile> = {
  demillus: DEMILLUS_PROFILE,
  natura: NATURA_PROFILE,
  "o-boticario": BOTICARIO_PROFILE,
  boticario: BOTICARIO_PROFILE,
  eudora: EUDORA_PROFILE,
};

/**
 * Resolve o perfil de extração adequado para a marca do catálogo,
 * retornando o perfil genérico quando não houver regra específica.
 */
export function getBrandExtractionProfile(
  brandSlug?: string | null,
  brandName?: string | null
): BrandExtractionProfile {
  const normalizedSlug = (brandSlug || "").toLowerCase().trim();
  if (normalizedSlug && BRAND_PROFILES[normalizedSlug]) {
    return BRAND_PROFILES[normalizedSlug];
  }

  const normalizedName = (brandName || "").toLowerCase().trim();
  if (normalizedName.includes("demillus")) return DEMILLUS_PROFILE;
  if (normalizedName.includes("natura")) return NATURA_PROFILE;
  if (normalizedName.includes("botic")) return BOTICARIO_PROFILE;
  if (normalizedName.includes("eudora")) return EUDORA_PROFILE;

  return {
    ...GENERIC_PROFILE,
    name: brandName?.trim() || GENERIC_PROFILE.name,
    slug: normalizedSlug || GENERIC_PROFILE.slug,
  };
}
