// ─────────────────────────────────────────────────────────────
// CHRONOS API: POST /api/invites/accept
// Chama RPC accept_invite_token(p_token, p_user_id) no Supabase.
// Server-side: requer user_id (vindo do client após signUp).
// A RPC é SECURITY DEFINER e faz:
//   1. Marca token como accepted
//   2. Adiciona user em workspace_members (INSERT com ON CONFLICT UPDATE)
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";

export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

interface AcceptBody {
  token: string;
  user_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AcceptBody;
    const { token, user_id } = body;

    if (!token || !user_id) {
      return NextResponse.json(
        { error: "token e user_id são obrigatórios" },
        { status: 400 }
      );
    }

    const adminClient: AnyClient = await createServerAdminClient();

    // Chama a função SQL criada na migration invite_tokens
    // Ela valida token, expiração, status e adiciona o user ao workspace
    const { data, error } = await adminClient.rpc("accept_invite_token", {
      p_token: token,
      p_user_id: user_id,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao aceitar convite" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      workspace: data?.[0] ?? null,
    });
  } catch (err) {
    console.error("[api/invites/accept] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}