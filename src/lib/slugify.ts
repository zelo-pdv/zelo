/**
 * Utilitário para gerar slugs limpos e seguros para URLs
 * Ex: "O Boticário" -> "o-boticario", "Cuidados Diários" -> "cuidados-diarios"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD") // Separa caracteres dos acentos
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres não alfanuméricos
    .trim()
    .replace(/\s+/g, "-") // Substitui espaços por hífen
    .replace(/-+/g, "-"); // Remove múltiplos hifens consecutivos
}
