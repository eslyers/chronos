import { createServerClient } from '@supabase/ssr'
import {Database} from "@/lib/types";

// Server-side admin client — usa service_role key (bypassa RLS)
// Pra uso em API routes / server actions apenas — NUNCA importar em client
export async function createServerAdminClient() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.PRIVATE_SUPABASE_SERVICE_KEY;

  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel. Adicione a chave service_role do Supabase nas variáveis de ambiente."
    );
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public'
      },
    }
  );
}