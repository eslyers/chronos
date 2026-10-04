// ─────────────────────────────────────────────────────────────
// CHRONOS API: GET /api/users/members
// Retorna a lista de membros do workspace com perfis completos
// Segurança: requer autenticação + papel owner/admin ou Master Admin
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MASTER_ADMIN_EMAIL = "eslyers@gmail.com";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id é obrigatório" }, { status: 400 });
    }

    // ── 1. Autenticação do usuário solicitante ──
    const userClient = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const isMaster = user.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

    // ── 2. Admin client para consulta robusta ──
    let adminClient: AnyClient;
    try {
      adminClient = await createServerAdminClient();
    } catch {
      adminClient = userClient;
    }

    // ── 3. Verificar permissão de acesso (Master Admin ou Owner/Admin do Workspace) ──
    if (!isMaster) {
      const { data: membership, error: memErr } = await adminClient
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (memErr) {
        return NextResponse.json({ error: memErr.message }, { status: 500 });
      }

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return NextResponse.json(
          { error: "Acesso restrito: apenas administradores podem visualizar membros." },
          { status: 403 }
        );
      }
    }

    // ── 4. Buscar membros do workspace ──
    const { data: wmRows, error: wmErr } = await adminClient
      .from("workspace_members")
      .select("user_id, role, joined_at")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true });

    if (wmErr) {
      return NextResponse.json({ error: wmErr.message }, { status: 500 });
    }

    if (!wmRows || wmRows.length === 0) {
      return NextResponse.json({ members: [] });
    }

    // ── 5. Buscar perfis associados ──
    const userIds = wmRows.map((r: { user_id: string }) => r.user_id).filter(Boolean);
    const { data: profRows, error: profErr } = await adminClient
      .from("profiles")
      .select("id, email, full_name, avatar_url, updated_at")
      .in("id", userIds);

    if (profErr) {
      console.warn("[api/users/members] Erro ao buscar perfis:", profErr);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileMap = new Map<string, any>(
      (profRows || []).map((p: { id: string }) => [p.id, p])
    );

    // ── 6. Montar membros com fallback para auth.admin se necessário ──
    const members = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wmRows.map(async (row: any) => {
        const prof = profileMap.get(row.user_id);
        let email = prof?.email;
        let fullName = prof?.full_name;

        // Se email não veio do perfil, buscar no auth.users via admin client
        if (!email && adminClient?.auth?.admin?.getUserById) {
          try {
            const { data: authUserData } = await adminClient.auth.admin.getUserById(row.user_id);
            if (authUserData?.user) {
              email = authUserData.user.email;
              fullName = fullName || authUserData.user.user_metadata?.full_name || authUserData.user.user_metadata?.name;
            }
          } catch {
            // Continua com o que tem
          }
        }

        const isUserMaster = email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

        return {
          id: row.user_id,
          workspace_id: workspaceId,
          user_id: row.user_id,
          email: email || "(sem email)",
          full_name: fullName || null,
          role: isUserMaster ? "owner" : row.role,
          is_master_admin: isUserMaster,
          status: "active",
          invited_at: row.joined_at,
          avatar_url: prof?.avatar_url || null,
          last_active_at: prof?.updated_at || row.joined_at,
        };
      })
    );

    return NextResponse.json({ members });
  } catch (error) {
    console.error("[api/users/members] Erro interno:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
