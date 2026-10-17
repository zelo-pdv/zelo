/**
 * Helper com as propriedades padronizadas do asterisco de campos obrigatórios.
 * Garante consistência visual, acessibilidade e padronização em todos os formulários.
 */
export function getRequiredAsteriskProps() {
  return {
    symbol: "*",
    className: "text-destructive font-bold text-sm leading-none select-none ml-0.5",
    title: "Campo obrigatório",
    "aria-hidden": "true" as const,
  };
}
