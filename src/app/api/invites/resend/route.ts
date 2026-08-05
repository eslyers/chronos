// ─────────────────────────────────────────────────────────────
// CHRONOS API: POST /api/invites/resend
// Reenvia o email de convite para um token pendente via Brevo
// Auth: requer user autenticado + role owner/admin no workspace
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/brevo";
import { inviteEmailTemplate } from "@/lib/email/templates";
import { z } from "zod";

export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

const resendSchema = z.object({
  token: z.string().min(1, "Token inválido"),
});

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://chronos-temp.vercel.app";
const INVITE_EXPIRY_HOURS = 168; // 7 dias

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = resendSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }
    const { token } = parseResult.data;

    // ── Auth: pegar user logado ──
    const userClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const adminClient: AnyClient = await createServerAdminClient();

    // ── Buscar o convite ──
    const { data: invite, error: inviteErr } = await adminClient
      .from("invite_tokens")
      .select("token, email, role, workspace_id, expires_at, status")
      .eq("token", token)
      .maybeSingle();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
    }
    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: `Convite não está pendente (status: ${invite.status})` },
        { status: 409 }
      );
    }

    // ── Verificar que user é owner/admin do workspace ──
    const { data: membership } = await adminClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", invite.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Você precisa ser owner ou admin para reenviar convites" },
        { status: 403 }
      );
    }

    // ── Estender prazo de validade se expirado ──
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    let newExpiresAt = invite.expires_at;

    if (expiresAt <= now) {
      newExpiresAt = new Date(now.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
      await adminClient
        .from("invite_tokens")
        .update({ expires_at: newExpiresAt })
        .eq("token", token);
    }

    // ── Buscar info do workspace + perfil do remetente ──
    const [{ data: workspace }, { data: profile }] = await Promise.all([
      adminClient.from("workspaces").select("id, name").eq("id", invite.workspace_id).maybeSingle(),
      adminClient.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    ]);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    // ── Enviar email via Brevo ──
    const inviteUrl = `${APP_BASE_URL}/auth/invite/${token}`;
    const invitedByName = profile?.full_name || profile?.email?.split("@")[0] || "Alguém";
    const template = inviteEmailTemplate({
      inviteeEmail: invite.email,
      workspaceName: workspace.name,
      invitedByName,
      inviteUrl,
      role: invite.role,
      expiresInHours: INVITE_EXPIRY_HOURS,
    });

    const result = await sendEmail({
      to: invite.email,
      subject: `[Reenvio] ${template.subject}`,
      html: template.html,
      replyTo: user.email ?? undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Falha ao enviar email" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      email: invite.email,
      newExpiresAt,
    });
  } catch (err) {
    console.error("[api/invites/resend] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
