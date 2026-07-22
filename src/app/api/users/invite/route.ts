// ─────────────────────────────────────────────────────────────
// CHRONOS API: POST /api/users/invite
// Gera invite_token, persiste em invite_tokens, dispara email via Brevo
// Auth: requer user autenticado + role owner/admin no workspace
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/brevo";
import { inviteEmailTemplate } from "@/lib/email/templates";

export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

interface InviteBody {
  email: string;
  role: "admin" | "member" | "viewer";
  workspace_id: string;
  send_email?: boolean;
}

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://chronos-temp.vercel.app";
const INVITE_EXPIRY_HOURS = 168; // 7 dias

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InviteBody;
    const { email, role, workspace_id, send_email = true } = body;

    // ── Validação ──
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (!workspace_id) {
      return NextResponse.json({ error: "workspace_id é obrigatório" }, { status: 400 });
    }
    if (!["admin", "member", "viewer"].includes(role)) {
      return NextResponse.json({ error: "role deve ser admin/member/viewer" }, { status: 400 });
    }

    // ── Auth: pegar user logado (cookies do Next) ──
    const userClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // ── Verificar que user é owner/admin do workspace ──
    const adminClient: AnyClient = await createServerAdminClient();
    const { data: membership, error: memberErr } = await adminClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberErr) {
      return NextResponse.json({ error: memberErr.message }, { status: 500 });
    }
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Você precisa ser owner ou admin do workspace para convidar" },
        { status: 403 }
      );
    }

    // ── Pegar info do workspace + user que convidou ──
    const [{ data: workspace }, { data: profile }] = await Promise.all([
      adminClient.from("workspaces").select("id, name").eq("id", workspace_id).maybeSingle(),
      adminClient.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    ]);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    // ── Criar invite_token ──
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
    const { data: invite, error: inviteErr } = await adminClient
      .from("invite_tokens")
      .insert({
        workspace_id,
        email: email.toLowerCase().trim(),
        role,
        invited_by: user.id,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("token, email, role, expires_at, status")
      .single();

    if (inviteErr) {
      // Unique constraint: já existe pending pra esse email+workspace
      if (inviteErr.code === "23505") {
        return NextResponse.json(
          { error: "Já existe um convite pendente para este email neste workspace" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: inviteErr.message }, { status: 500 });
    }

    // ── Enviar email se solicitado ──
    let emailSent = false;
    let emailError: string | undefined;

    if (send_email) {
      const inviteUrl = `${APP_BASE_URL}/auth/invite/${invite.token}`;
      const invitedByName = profile?.full_name || profile?.email?.split("@")[0] || "Alguém";
      const template = inviteEmailTemplate({
        inviteeEmail: invite.email,
        workspaceName: workspace.name,
        invitedByName,
        inviteUrl,
        role,
        expiresInHours: INVITE_EXPIRY_HOURS,
      });

      const result = await sendEmail({
        to: invite.email,
        subject: template.subject,
        html: template.html,
        replyTo: user.email ?? undefined,
      });

      emailSent = result.success;
      emailError = result.error;
    }

    return NextResponse.json({
      success: true,
      invite: {
        token: invite.token,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at,
        status: invite.status,
        invite_url: `${APP_BASE_URL}/auth/invite/${invite.token}`,
      },
      email: send_email
        ? { sent: emailSent, error: emailError }
        : { sent: false, note: "send_email era false — apenas token criado" },
    });
  } catch (err) {
    console.error("[api/users/invite] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
