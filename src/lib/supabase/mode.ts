// Helper centralizado pra detectar se Supabase está configurado.
// Quando NÃO está → modo demo (auth local, dados em localStorage).
// Quando ESTÁ → modo produção (Supabase real).
// Última atualização: 2026-07-15 03:25 GMT-3 (Sprint M4 rebuild trigger)

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseMode(): "demo" | "production" {
  return isSupabaseConfigured() ? "production" : "demo";
}