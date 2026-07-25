import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { Database } from "@/lib/types";

export function createSPAClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy-supabase-project.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key-placeholder";
  return createBrowserClient<Database>(url, key);
}

export { createServerClient };
