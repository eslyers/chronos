// ─────────────────────────────────────────────────────────────
// CHRONOS — Limite de requisições das rotas /api
// Contadores no Postgres (public.rate_limit_hit, só service_role): funciona
// entre instâncias serverless, ao contrário de um contador em memória.
// Falha aberta: se o banco não responder, a requisição segue (melhor do que
// derrubar convites/importações por causa do limitador).
// ─────────────────────────────────────────────────────────────
import { NextResponse, type NextRequest } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";

export interface RateLimitRule {
  /** Nome da regra (ex.: "invite"). */
  scope: string;
  /** Máximo de chamadas por janela. */
  limit: number;
  /** Tamanho da janela, em segundos. */
  windowSeconds: number;
}

/** IP do cliente atrás do proxy da Vercel. */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Registra a chamada e devolve uma resposta 429 se o limite estourou, ou
 * null para seguir. `identity` é o id do usuário; sem ele, usa o IP.
 */
export async function enforceRateLimit(
  request: NextRequest,
  rule: RateLimitRule,
  identity?: string | null
): Promise<NextResponse | null> {
  const key = `${rule.scope}:${identity ? `user:${identity}` : `ip:${clientIp(request)}`}`;
  try {
    const admin = await createServerAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any).rpc("rate_limit_hit", {
      p_key: key,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] falha ao registrar chamada (seguindo sem limite):", error.message);
      return null;
    }
    if (data === false) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
        { status: 429, headers: { "Retry-After": String(rule.windowSeconds) } }
      );
    }
    return null;
  } catch (err) {
    console.error("[rate-limit] erro inesperado (seguindo sem limite):", err);
    return null;
  }
}

/** Regras por rota (ajuste aqui). */
export const RATE_LIMITS = {
  invite: { scope: "invite", limit: 20, windowSeconds: 3600 },
  inviteResend: { scope: "invite-resend", limit: 20, windowSeconds: 3600 },
  inviteLookup: { scope: "invite-lookup", limit: 60, windowSeconds: 600 },
  inviteAccept: { scope: "invite-accept", limit: 20, windowSeconds: 600 },
  inviteAcceptSignup: { scope: "invite-accept-signup", limit: 10, windowSeconds: 600 },
  telegramTest: { scope: "telegram-test", limit: 10, windowSeconds: 3600 },
  tasksImport: { scope: "tasks-import", limit: 30, windowSeconds: 3600 },
} satisfies Record<string, RateLimitRule>;
