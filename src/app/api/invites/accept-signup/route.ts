// ─────────────────────────────────────────────────────────────
// CHRONOS API: POST /api/invites/accept-signup
// Cria conta + aceita convite em uma única chamada server-side.
// Usa service_role para:
//   1. Criar o usuário via admin.createUser (email_confirm = false)
//   2. Fazer signIn automático (retorna session tokens)
//   3. Chamar RPC accept_invite_token(p_token, p_user_id)
// Isso resolve o problema de "email confirm" bloqueando o fluxo.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import { z } from "zod";

export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

const schema = z.object({
  token: z.string().min(1, "Token inválido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha muito curta"),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }
    const { token, email, password, name } = parseResult.data;

    const adminClient: AnyClient = await createServerAdminClient();

    // ── 1. Validar convite (token pendente + email bate) ──
    const { data: invite, error: inviteErr } = await adminClient
      .from("invite_tokens")
      .select("token, email, workspace_id, role, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
    }
    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: `Convite não está mais disponível (status: ${invite.status})` },
        { status: 409 }
      );
    }
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "O email não corresponde ao convite" },
        { status: 403 }
      );
    }
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Convite expirado" }, { status: 410 });
    }

    // ── 2. Verificar se usuário já existe ──
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = (existingUsers?.users ?? []).find(
      (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      // Usuário já tem conta: apenas usar o ID existente
      userId = existingUser.id;
    } else {
      // ── 3a. Criar usuário via admin API (sem confirmação de email) ──
      const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // confirma email automaticamente via admin
        user_metadata: name ? { full_name: name, name } : {},
      });

      if (createError) {
        // Erro específico de usuário duplicado (race condition)
        if (createError.message?.includes("already") || createError.status === 422) {
          return NextResponse.json(
            { error: "Este email já possui uma conta. Use 'Já tenho conta → Fazer login'." },
            { status: 409, headers: { "X-Existing-User": "true" } }
          );
        }
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      if (!createdUser?.user) {
        return NextResponse.json({ error: "Falha ao criar conta" }, { status: 500 });
      }
      userId = createdUser.user.id;

      // ── 3b. Atualizar perfil se tiver nome ──
      if (name) {
        await adminClient
          .from("profiles")
          .update({ full_name: name })
          .eq("id", userId);
      }
    }

    // ── 4. Aceitar convite via RPC (marca como accepted + adiciona ao workspace) ──
    const { error: rpcError } = await adminClient.rpc("accept_invite_token", {
      p_token: token,
      p_user_id: userId,
    });

    if (rpcError) {
      return NextResponse.json(
        { error: rpcError.message || "Falha ao aceitar convite" },
        { status: 400 }
      );
    }

    // ── 5. Retornar OK — o client vai fazer signIn com email+senha ──
    return NextResponse.json({
      success: true,
      user_id: userId,
      existed: !!existingUser,
    });
  } catch (err) {
    console.error("[api/invites/accept-signup] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
