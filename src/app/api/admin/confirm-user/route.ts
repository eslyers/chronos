import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────
// CHRONOS — API: Confirmar usuário manualmente (dev only)
// Use POST /api/admin/confirm-user com body { email }
// A rota usa SERVICE_ROLE_KEY do server-side pra confirmar.
// ⚠️ Esta rota deve ser protegida em produção.
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: "Service role key não configurada" },
        { status: 500 }
      );
    }

    // 1. Buscar o usuário pelo email
    const listResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?per_page=100`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    if (!listResponse.ok) {
      return NextResponse.json(
        {
          error: "Falha ao listar usuários",
          status: listResponse.status,
        },
        { status: listResponse.status }
      );
    }

    const usersData = await listResponse.json();
    const user = usersData.users?.find(
      (u: { email?: string }) => u.email === email
    );

    if (!user) {
      return NextResponse.json(
        { error: `Usuário ${email} não encontrado` },
        { status: 404 }
      );
    }

    // 2. Confirmar o email via admin API
    const updateResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user.id}`,
      {
        method: "PUT",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_confirm: true,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      return NextResponse.json(
        {
          error: "Falha ao confirmar usuário",
          status: updateResponse.status,
          details: errorText,
        },
        { status: updateResponse.status }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Email confirmado para ${email}`,
      user_id: user.id,
    });
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