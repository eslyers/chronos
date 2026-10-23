// ─────────────────────────────────────────────────────────────
// CHRONOS API: POST /api/invites/accept-signup
// Cria conta + aceita convite em uma única chamada server-side.
// Usa service_role para:
//   1. Validar o token de convite
//   2. Criar o usuário com a senha definida (email_confirm = true).
//      Se o email já tiver conta, retorna 409 (code: "user_exists"): o usuário
//      deve fazer login e aceitar via /api/invites/accept.
//   3. Atualizar perfil com o nome (se fornecido)
//   4. Chamar RPC accept_invite_token(p_token, p_user_id)
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
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
    const limited = await enforceRateLimit(request, RATE_LIMITS.inviteAcceptSignup);
    if (limited) return limited;
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

    // ── 2. Criar a conta ──
    // Nunca altera a senha de uma conta existente: possuir o token não prova
    // que quem chama é dono da conta.
    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { full_name: name, name } : {},
    });

    if (createError) {
      const alreadyExists =
        createError.status === 422 ||
        createError.code === "email_exists" ||
        /already/i.test(createError.message ?? "");
      if (alreadyExists) {
        return NextResponse.json(
          {
            error: "Já existe uma conta com este email. Faça login para aceitar o convite.",
            code: "user_exists",
          },
          { status: 409 }
        );
      }
      console.error("[api/invites/accept-signup] createUser error:", createError);
      return NextResponse.json({ error: "Falha ao criar conta" }, { status: 400 });
    }

    const userId: string | null = createdUser?.user?.id ?? null;

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
      console.error("[api/invites/accept-signup] accept_invite_token error:", rpcError);
      return NextResponse.json({ error: "Falha ao aceitar convite" }, { status: 400 });
    }

    // ── 5. Retornar OK para o frontend efetuar o signInWithPassword ──
    return NextResponse.json({
      success: true,
      user_id: userId,
      email,
    });
  } catch (err) {
    console.error("[api/invites/accept-signup] error:", err);
    return NextResponse.json({ error: "Erro interno ao aceitar convite" }, { status: 500 });
  }
}
