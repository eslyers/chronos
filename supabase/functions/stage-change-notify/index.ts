// ─────────────────────────────────────────────────────────────
// CHRONOS Edge Function: stage-change-notify
// Atividade: Webhook chamado via trigger quando task muda de stage
// Notifica subscribers via Telegram + Email
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY"); // deprecated, kept for back-compat
// Brevo (https://app.brevo.com/settings/keys/api) — transactional emails
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") ?? RESEND_API_KEY ?? "";
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") ?? "eslyers@gmail.com";
const BREVO_SENDER_NAME = Deno.env.get("BREVO_SENDER_NAME") ?? "CHRONOS";

interface Payload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    title: string;
    stage_id: string;
    assignee_id: string | null;
    progress: number;
    due_date: string | null;
    project_id: string;
    priority: string;
  };
  old_record?: {
    id: string;
    stage_id: string;
  };
}

interface Task {
  id: string;
  title: string;
  stage_id: string;
  assignee_id: string | null;
  progress: number;
  due_date: string | null;
  project_id: string;
  priority: string;
  stages: { name: string };
  projects: { name: string; id: string };
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  telegram_chat_id: string | null;
}

interface Subscriber {
  user_id: string;
  telegram_chat_id: string | null;
  telegram_enabled: boolean;
  email_enabled: boolean;
  notify_on_stage_change: boolean;
  notify_on_assigned: boolean;
  notify_on_overdue: boolean;
  notify_on_due_soon: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

Deno.serve(async (req: Request) => {
  // Aceitar tanto POST (webhook) quanto GET (test)
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        message: "stage-change-notify is alive. POST a payload to trigger.",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = (await req.json()) as Payload;

    // Filtrar: só UPDATE em tasks com stage_id diferente do old
    if (
      payload.type !== "UPDATE" ||
      !payload.old_record ||
      payload.record.stage_id === payload.old_record.stage_id
    ) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no stage change" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Buscar task com stage + project
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        `
        id, title, stage_id, assignee_id, progress, due_date, project_id, priority,
        stages!inner(name),
        projects!inner(name, id)
      `
      )
      .eq("id", payload.record.id)
      .single();

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: `Task não encontrada: ${taskError?.message}` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const t = task as unknown as Task;

    // 2. Buscar nome da stage anterior
    const { data: oldStage } = await supabase
      .from("stages")
      .select("name")
      .eq("id", payload.old_record.stage_id)
      .maybeSingle();

    const newStageName = t.stages.name;
    const oldStageName = oldStage?.name ?? "?";

    // 3. Buscar subscribers do projeto
    const { data: subscribers } = await supabase
      .from("notification_subscribers")
      .select("*")
      .eq("project_id", t.project_id)
      .eq("notify_on_stage_change", true);

    const subs = (subscribers || []) as unknown as Subscriber[];

    let telegramSent = 0;
    let emailSent = 0;

    for (const sub of subs) {
      // Verificar quiet hours
      if (sub.quiet_hours_start && sub.quiet_hours_end) {
        const now = new Date();
        const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
        const [startH, startM] = sub.quiet_hours_start.split(":").map(Number);
        const [endH, endM] = sub.quiet_hours_end.split(":").map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;

        if (startMin < endMin) {
          if (currentMinutes >= startMin && currentMinutes < endMin) continue;
        } else {
          // Atravessa meia-noite
          if (currentMinutes >= startMin || currentMinutes < endMin) continue;
        }
      }

      // Buscar profile do subscriber
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name, telegram_chat_id")
        .eq("id", sub.user_id)
        .maybeSingle();

      if (!profile) continue;
      const p = profile as unknown as Profile;

      // Telegram
      if (sub.telegram_enabled && (sub.telegram_chat_id || p.telegram_chat_id)) {
        const chatId = sub.telegram_chat_id || p.telegram_chat_id;
        if (TELEGRAM_BOT_TOKEN && chatId) {
          const message =
            `🔄 *CHRONOS* — Mudança de etapa\n\n` +
            `📋 *${escapeMd(t.title)}*\n` +
            `📁 ${escapeMd(t.projects.name)}\n` +
            `🎯 *${escapeMd(oldStageName)}* → *${escapeMd(newStageName)}*\n` +
            `📊 Progresso: ${t.progress}%\n` +
            `${t.priority !== "medium" ? `⚡ Prioridade: ${t.priority}\n` : ""}` +
            `${t.due_date ? `📅 Vencimento: ${new Date(t.due_date).toLocaleDateString("pt-BR")}\n` : ""}` +
            `\n🔗 https://chronos.app/app/projects/${t.project_id}`;

          const tgRes = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: "Markdown",
              }),
            }
          );

          if (tgRes.ok) telegramSent++;

          // Log
          await supabase.from("notifications").insert({
            user_id: sub.user_id,
            project_id: t.project_id,
            task_id: t.id,
            type: "stage_change",
            payload: {
              title: t.title,
              project: t.projects.name,
              old_stage: oldStageName,
              new_stage: newStageName,
            },
            channels: ["telegram"],
            status: tgRes.ok ? "sent" : "failed",
            sent_at: tgRes.ok ? new Date().toISOString() : null,
          });
        }
      }

      // Email
      if (sub.email_enabled && p.email) {
        if (BREVO_API_KEY) {
          const emailHtml = `
            <h2 style="color:#1e293b">🔄 Mudança de etapa</h2>
            <p>Olá ${p.full_name || ""},</p>
            <p>A tarefa <strong>${escapeHtml(t.title)}</strong> mudou de etapa no projeto <strong>${escapeHtml(t.projects.name)}</strong>:</p>
            <table style="border-collapse:collapse;margin:16px 0">
              <tr>
                <td style="padding:8px;color:#64748b">Antes</td>
                <td style="padding:8px;font-weight:600">${escapeHtml(oldStageName)}</td>
              </tr>
              <tr>
                <td style="padding:8px;color:#64748b">Agora</td>
                <td style="padding:8px;font-weight:600;color:#10b981">${escapeHtml(newStageName)}</td>
              </tr>
            </table>
            <p>Progresso: <strong>${t.progress}%</strong></p>
            <a href="https://chronos.app/app/projects/${t.project_id}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:16px">Ver projeto →</a>
          `;

          const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": BREVO_API_KEY,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({
              sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
              to: [{ email: p.email, name: p.full_name || "Usuário CHRONOS" }],
              subject: `🔄 ${t.title} → ${newStageName}`,
              htmlContent: emailHtml,
            }),
          });

          if (emailRes.ok) emailSent++;

          // Log (separado pra email)
          await supabase.from("notifications").insert({
            user_id: sub.user_id,
            project_id: t.project_id,
            task_id: t.id,
            type: "stage_change",
            payload: {
              title: t.title,
              project: t.projects.name,
              old_stage: oldStageName,
              new_stage: newStageName,
            },
            channels: ["email"],
            status: emailRes.ok ? "sent" : "failed",
            sent_at: emailRes.ok ? new Date().toISOString() : null,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        task_id: t.id,
        old_stage: oldStageName,
        new_stage: newStageName,
        subscribers: subs.length,
        telegram_sent: telegramSent,
        email_sent: emailSent,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Erro desconhecido",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, "\\$&");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
