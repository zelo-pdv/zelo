export interface UploadResponse {
  success?: boolean;
  importedCount?: number;
  totalReceived?: number;
  errors?: string[];
  error?: string;
}

export const uploadData = async (endpoint: string, data: any): Promise<UploadResponse> => {
  const response = await fetch(`/api/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: "Erro de comunicação com o servidor." };
    }
    const err: any = new Error(errorData.error || "Falha ao processar o arquivo.");
    err.errors = Array.isArray(errorData.errors) ? errorData.errors : undefined;
    err.status = response.status;
    err.errorData = errorData;
    throw err;
  }

  return response.json();
};
