// Helper centralizado pra detectar se Supabase está configurado.
// Quando NÃO está → modo demo (auth local, dados em localStorage).
// Quando ESTÁ → modo produção (Supabase real).

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseMode(): "demo" | "production" {
  return isSupabaseConfigured() ? "production" : "demo";
}