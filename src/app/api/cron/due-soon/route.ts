// ─────────────────────────────────────────────────────────────
// CHRONOS — API Route: /api/cron/due-soon
// Atividade: Endpoint pra disparar a Edge Function due-soon-alert manualmente
// Uso: GET/POST /api/cron/due-soon (com Authorization: Bearer CRON_SECRET)
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Edge Function pode demorar

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const CRON_SECRET = process.env.CRON_SECRET ?? process.env.PRIVATE_SUPABASE_SERVICE_KEY!;

export async function GET(req: NextRequest) {
  return triggerDueSoon(req, "GET");
}

export async function POST(req: NextRequest) {
  return triggerDueSoon(req, "POST");
}

async function triggerDueSoon(req: NextRequest, method: string) {
  try {
    // 1) Autenticação: aceitar Bearer token (Vercel Cron envia header Authorization)
    //    OU query param ?secret=... (pra teste manual no browser)
    const authHeader = req.headers.get("authorization");
    const url = new URL(req.url);
    const querySecret = url.searchParams.get("secret");

    const providedSecret = authHeader?.replace(/^Bearer\s+/i, "") ?? querySecret;

    if (!providedSecret || providedSecret !== CRON_SECRET) {
      return NextResponse.json(
        { error: "Não autorizado. Use header Authorization: Bearer <CRON_SECRET> ou ?secret=<CRON_SECRET>" },
        { status: 401 }
      );
    }

    // 2) Chamar a Edge Function
    const edgeUrl = `${SUPABASE_URL}/functions/v1/due-soon-alert`;
    const start = Date.now();

    const edgeRes = await fetch(edgeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        triggered_by: method,
        triggered_at: new Date().toISOString(),
        source: "chronos-api",
      }),
    });

    const elapsed = Date.now() - start;

    if (!edgeRes.ok) {
      const errorBody = await edgeRes.text();
      return NextResponse.json(
        {
          success: false,
          error: `Edge function retornou HTTP ${edgeRes.status}`,
          details: errorBody.substring(0, 500),
          elapsed_ms: elapsed,
        },
        { status: 502 }
      );
    }

    const stats = await edgeRes.json();

    return NextResponse.json(
      {
        success: true,
        elapsed_ms: elapsed,
        triggered_by: method,
        stats,
      },
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
