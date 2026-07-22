// ─────────────────────────────────────────────────────────────
// CHRONOS API: GET /api/invites/lookup?token=xxx
// Lookup público (server-side) do convite pelo token.
// Retorna email + workspace + role + status pra preencher o form
// de signup. Service role key no servidor garante que mesmo um user
// não-logado consiga carregar a página de convite pelo link do email.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";

export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Token ausente" }, { status: 400 });
    }

    const adminClient: AnyClient = await createServerAdminClient();

    // Busca convite pelo token (policy "Public token lookup" permite SELECT)
    const { data: invite, error: inviteErr } = await adminClient
      .from("invite_tokens")
      .select("email, workspace_id, role, status, expires_at, invited_by")
      .eq("token", token)
      .maybeSingle();

    if (inviteErr) {
      return NextResponse.json({ error: inviteErr.message }, { status: 500 });
    }
    if (!invite) {
      return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
    }

    // Pega nome do workspace + info de quem convidou (paralelo)
    const [{ data: workspace }, { data: inviterProfile }] = await Promise.all([
      adminClient.from("workspaces").select("name").eq("id", invite.workspace_id).maybeSingle(),
      adminClient.from("profiles").select("full_name, email").eq("id", invite.invited_by).maybeSingle(),
    ]);

    return NextResponse.json({
      invite: {
        email: invite.email,
        workspace_id: invite.workspace_id,
        workspace_name: workspace?.name ?? "Workspace",
        role: invite.role,
        status: invite.status,
        expires_at: invite.expires_at,
        invited_by_name: inviterProfile?.full_name ?? null,
        invited_by_email: inviterProfile?.email ?? "",
      },
    });
  } catch (err) {
    console.error("[api/invites/lookup] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}