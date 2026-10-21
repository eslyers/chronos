import { NextRequest, NextResponse } from "next/server";
import { hasValidBearerSecret } from "@/lib/server-secret";

// ─────────────────────────────────────────────────────────────
// CHRONOS — API: Listar usuários (dev only)
// GET /api/admin/list-users
// ⚠️ Esta rota deve ser protegida em produção.
// ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Proteção: apenas em desenvolvimento ou com ADMIN_SECRET válido
    // (não reaproveita o CRON_SECRET, que é enviado a outros serviços)
    const isDev = process.env.NODE_ENV === "development";

    if (!isDev && !hasValidBearerSecret(request, process.env.ADMIN_SECRET)) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: "Service role key não configurada" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?per_page=100`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: "Falha ao listar", status: response.status, details: text },
        { status: response.status }
      );
    }

    const data = await response.json();
    const users = (data.users ?? []).map(
      (u: { id: string; email: string; email_confirmed_at: string | null; created_at: string }) => ({
        id: u.id,
        email: u.email,
        email_confirmed_at: u.email_confirmed_at,
        created_at: u.created_at,
      })
    );

    return NextResponse.json({ total: users.length, users });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro interno",
        details: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}