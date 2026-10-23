import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

export const BUCKET_PRODUCTS = "products";
export const BUCKET_CATALOGS = "catalogs";

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl =
    process.env.SUPABASE_URL || "https://sohqgyizqddasvhgxhqa.supabase.co";

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    throw new Error(
      "Chave de acesso ao Supabase não configurada. Defina SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY no arquivo .env.",
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

export async function uploadImageToSupabase(
  fileBuffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
  contentType: string,
  bucket = BUCKET_PRODUCTS,
): Promise<{ url: string; path: string }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(
      `Falha no upload para o Supabase Storage: ${error.message}`,
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    url: publicUrlData.publicUrl,
    path: data.path,
  };
}

export async function uploadCatalogPdf(
  fileBuffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
): Promise<{ path: string }> {
  const supabase = getSupabaseClient();

  // Garante a existência do bucket privado se ainda não existir
  try {
    await supabase.storage.createBucket(BUCKET_CATALOGS, { public: false });
  } catch {
    // Ignora se o bucket já existir
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_CATALOGS)
    .upload(fileName, fileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(
      `Falha no upload do catálogo para o Supabase Storage: ${error.message}`,
    );
  }

  return {
    path: data.path,
  };
}

export async function getSignedCatalogUrl(
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_CATALOGS)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Falha ao gerar URL assinada para o catálogo: ${error?.message || "URL vazia"}`,
    );
  }

  return data.signedUrl;
}

export async function downloadCatalogPdf(path: string): Promise<Buffer> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_CATALOGS)
    .download(path);

  if (error || !data) {
    throw new Error(
      `Falha ao baixar o PDF do catálogo (${path}): ${error?.message || "Arquivo não encontrado"}`,
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
