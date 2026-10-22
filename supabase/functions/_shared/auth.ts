// ─────────────────────────────────────────────────────────────
// CHRONOS — Autenticação das Edge Functions
// As funções rodam com service_role e verify_jwt = false, então cada uma
// precisa validar quem chama. Aceita "Authorization: Bearer <segredo>" com:
//   • SUPABASE_SERVICE_ROLE_KEY — triggers pg_net e pg_cron
//     (app.service_role_key / app.settings.service_role_key no Postgres)
//   • CRON_SECRET — rota Next.js /api/cron/due-soon
// ─────────────────────────────────────────────────────────────

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isAuthorizedCaller(req: Request): boolean {
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!provided) return false;
  const accepted = [
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    Deno.env.get("CRON_SECRET"),
  ].filter((s): s is string => !!s);
  return accepted.some((secret) => safeEqual(provided, secret));
}

export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
