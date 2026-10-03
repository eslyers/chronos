// ─────────────────────────────────────────────────────────────
// CHRONOS API: POST /api/invites/accept-signup
// Cria conta ou atualiza credenciais + aceita convite em uma única chamada server-side.
// Usa service_role para:
//   1. Validar o token de convite
//   2. Criar ou atualizar o usuário com a nova senha definida (email_confirm = true)
//   3. Atualizar perfil com o nome (se fornecido)
//   4. Chamar RPC accept_invite_token(p_token, p_user_id)
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
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
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
    let userId: string | null = null;

    // Busca usuário existente via Supabase Auth Admin
    const { data: userList } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = (userList?.users ?? []).find(
      (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingAuthUser) {
      userId = existingAuthUser.id;
      // Atualizar a senha e confirmar email do usuário existente com a senha escolhida no convite
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: name
          ? { ...(existingAuthUser.user_metadata || {}), full_name: name, name }
          : existingAuthUser.user_metadata,
      });

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    } else {
      // Criar novo usuário com confirmação de email ativa
      const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: name ? { full_name: name, name } : {},
      });

      if (createError) {
        // Se já existia e não apareceu no listUsers inicial
        if (createError.message?.includes("already") || createError.status === 422) {
          const { data: retryList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
          const retryUser = (retryList?.users ?? []).find(
            (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
          );
          if (retryUser) {
            userId = retryUser.id;
            await adminClient.auth.admin.updateUserById(userId, {
              password,
              email_confirm: true,
              user_metadata: name ? { full_name: name, name } : undefined,
            });
          } else {
            return NextResponse.json({ error: createError.message }, { status: 400 });
          }
        } else {
          return NextResponse.json({ error: createError.message }, { status: 400 });
        }
      } else {
        if (!createdUser?.user) {
          return NextResponse.json({ error: "Falha ao criar conta" }, { status: 500 });
        }
        userId = createdUser.user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Identificador de usuário não localizado" }, { status: 500 });
    }

    // ── 3. Atualizar ou criar perfil ──
    if (name) {
      await adminClient
        .from("profiles")
        .upsert({ id: userId, email, full_name: name }, { onConflict: "id" });
    }

    // ── 4. Aceitar convite via RPC (marca status='accepted' + adiciona ao workspace_members) ──
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

    // ── 5. Retornar OK para o frontend efetuar o signInWithPassword ──
    return NextResponse.json({
      success: true,
      user_id: userId,
      email,
    });
  } catch (err) {
    console.error("[api/invites/accept-signup] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
