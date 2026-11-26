export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

/**
 * Resolve a URL base das APIs evitando bloqueios de CSP/CORS entre
 * `localhost`, `127.0.0.1` e IPs locais em rede quando executado no navegador.
 */
function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== "undefined") {
    if (!configured || configured.startsWith("/")) {
      return configured || "/api";
    }
    try {
      const parsed = new URL(configured);
      const isLocalLoopback =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (isLocalLoopback || parsed.origin === window.location.origin) {
        return "/api";
      }
      return configured.endsWith("/api")
        ? configured
        : `${configured.replace(/\/$/, "")}/api`;
    } catch {
      return "/api";
    }
  }

  return configured || "/api";
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const apiBase = resolveApiBaseUrl();
  const response = await fetch(`${apiBase}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = "Erro ao comunicar com o servidor.";
    try {
      const errorData = await response.json();
      if (errorData) {
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.details) {
          errorMessage += `\nDetalhes: ${errorData.details}`;
        }
      }
    } catch {
      // Falha ao fazer parse do JSON, mantem o erro padrão
    }
    throw new ApiRequestError(errorMessage, response.status);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}
