/**
 * Utilitários centralizados para buscas insensíveis a acentos e maiúsculas/minúsculas.
 */

/**
 * Normaliza uma sequência de texto removendo diacríticos (acentos, cedilhas, etc.)
 * e convertendo para minúsculas.
 * 
 * Exemplos:
 * - "Calçado" -> "calcado"
 * - "Vestuário" -> "vestuario"
 * - "Óculos" -> "oculos"
 * - "Sabonete" -> "sabonete"
 * - "AÇÃO" -> "acao"
 */
export function normalizeText(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Verifica se o texto alvo contém o termo pesquisado, de forma insensível
 * a acentos, diacríticos e caixa alta/baixa.
 * 
 * Preserva correspondências parciais e retorna true se o termo estiver vazio.
 */
export function textIncludes(
  target: string | number | null | undefined,
  searchTerm: string | number | null | undefined,
): boolean {
  const normalizedSearch = normalizeText(searchTerm);
  if (!normalizedSearch) return true;
  const normalizedTarget = normalizeText(target);
  if (!normalizedTarget) return false;
  return normalizedTarget.includes(normalizedSearch);
}

/**
 * Compara se dois textos são idênticos ignorando acentuação e caixa.
 */
export function textEquals(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): boolean {
  return normalizeText(a) === normalizeText(b);
}
