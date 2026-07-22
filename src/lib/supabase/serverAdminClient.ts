import { createServerClient } from '@supabase/ssr'
import {Database} from "@/lib/types";

// Server-side admin client — usa service_role key (bypassa RLS)
// Pra uso em API routes / server actions apenas — NUNCA importar em client
export async function createServerAdminClient() {

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.PRIVATE_SUPABASE_SERVICE_KEY!,
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
    )
}