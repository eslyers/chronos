// ─────────────────────────────────────────────────────────────
// CHRONOS Edge Function: task-assigned-notify
// Atividade: Webhook chamado via trigger quando task é atribuída
// Notifica o assignee via Telegram + Email
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "CHRONOS <noreply@resend.dev>";

interface Payload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    title: string;
    assignee_id: string | null;
    due_date: string | null;
    priority: string;
    project_id: string;
  };
  old_record?: {
    id: string;
    assignee_id: string | null;
  };
}

interface Task {
  id: string;
  title: string;
  assignee_id: string | null;
  due_date: string | null;
  priority: string;
  project_id: string;
  projects: { name: string; id: string };
  stages: { name: string };
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
  notify_on_assigned: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const PRIORITY_EMOJI: Record<string, string> = {
  low: "🟢",
  medium: "🟡",
  high: "🟠",
  critical: "🔴",
};

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        message: "task-assigned-notify is alive. POST a payload to trigger.",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = (await req.json()) as Payload;

    // Filtrar: só UPDATE em tasks com assignee_id diferente do old (e novo não-nulo)
    if (
      payload.type !== "UPDATE" ||
      !payload.old_record ||
      !payload.record.assignee_id ||
      payload.record.assignee_id === payload.old_record.assignee_id
    ) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no assignment change" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Buscar task completa
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        `
        id, title, assignee_id, due_date, priority, project_id,
        projects!inner(name, id),
        stages!inner(name)
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

    // 2. Buscar profile do assignee
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, telegram_chat_id")
      .eq("id", t.assignee_id!)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "assignee profile not found" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const p = profile as unknown as Profile;

    // 3. Buscar preferências do assignee
    const { data: subData } = await supabase
      .from("notification_subscribers")
      .select("*")
      .eq("user_id", t.assignee_id!)
      .eq("project_id", t.project_id)
      .maybeSingle();

    const sub = subData as unknown as Subscriber | null;
    // Se não tem prefs salvas, default = permitir tudo
    const telegramEnabled = sub?.telegram_enabled ?? true;
    const emailEnabled = sub?.email_enabled ?? true;
    const notifyOnAssigned = sub?.notify_on_assigned ?? true;

    if (!notifyOnAssigned) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "user disabled assignment notifications" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Quiet hours check
    if (sub?.quiet_hours_start && sub?.quiet_hours_end) {
      const now = new Date();
      const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      const [startH, startM] = sub.quiet_hours_start.split(":").map(Number);
      const [endH, endM] = sub.quiet_hours_end.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      if (startMin < endMin) {
        if (currentMinutes >= startMin && currentMinutes < endMin) {
          return new Response(
            JSON.stringify({ skipped: true, reason: "quiet hours" }),
            { headers: { "Content-Type": "application/json" } }
          );
        }
      } else {
        if (currentMinutes >= startMin || currentMinutes < endMin) {
          return new Response(
            JSON.stringify({ skipped: true, reason: "quiet hours" }),
            { headers: { "Content-Type": "application/json" } }
          );
        }
      }
    }

    const priorityEmoji = PRIORITY_EMOJI[t.priority] || "🟡";
    const dueDateStr = t.due_date
      ? new Date(t.due_date).toLocaleDateString("pt-BR")
      : "Sem prazo definido";

    let telegramSent = false;
    let emailSent = false;

    // Telegram
    const chatId = sub?.telegram_chat_id || p.telegram_chat_id;
    if (telegramEnabled && chatId && TELEGRAM_BOT_TOKEN) {
      const message =
        `📥 *CHRONOS* — Nova tarefa atribuída!\n\n` +
        `${priorityEmoji} *${escapeMd(t.title)}*\n` +
        `📁 ${escapeMd(t.projects.name)}\n` +
        `🎯 Etapa: ${escapeMd(t.stages.name)}\n` +
        `📅 Vencimento: ${dueDateStr}\n` +
        `⚡ Prioridade: ${t.priority}\n\n` +
        `🔗 https://chronos.app/app/projects/${t.project_id}`;

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

      telegramSent = tgRes.ok;

      await supabase.from("notifications").insert({
        user_id: t.assignee_id!,
        project_id: t.project_id,
        task_id: t.id,
        type: "assigned",
        payload: {
          title: t.title,
          project: t.projects.name,
          stage: t.stages.name,
          due_date: t.due_date,
          priority: t.priority,
        },
        channels: ["telegram"],
        status: tgRes.ok ? "sent" : "failed",
        sent_at: tgRes.ok ? new Date().toISOString() : null,
      });
    }

    // Email
    if (emailEnabled && p.email && RESEND_API_KEY) {
      const emailHtml = `
        <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:24px;border-radius:12px 12px 0 0;color:white">
          <h1 style="margin:0;font-size:22px">📥 Nova tarefa atribuída!</h1>
        </div>
        <div style="padding:24px;background:white;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <p>Olá ${escapeHtml(p.full_name || "")},</p>
          <p>Você foi atribuído(a) a uma nova tarefa:</p>
          <h2 style="color:#1e293b;margin:16px 0 8px">${priorityEmoji} ${escapeHtml(t.title)}</h2>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr>
              <td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">📁 Projeto</td>
              <td style="padding:8px;border-bottom:1px solid #f1f5f9;font-weight:600">${escapeHtml(t.projects.name)}</td>
            </tr>
            <tr>
              <td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">🎯 Etapa</td>
              <td style="padding:8px;border-bottom:1px solid #f1f5f9;font-weight:600">${escapeHtml(t.stages.name)}</td>
            </tr>
            <tr>
              <td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">📅 Vencimento</td>
              <td style="padding:8px;border-bottom:1px solid #f1f5f9;font-weight:600">${dueDateStr}</td>
            </tr>
            <tr>
              <td style="padding:8px;color:#64748b">⚡ Prioridade</td>
              <td style="padding:8px;font-weight:600;text-transform:uppercase">${t.priority}</td>
            </tr>
          </table>
          <a href="https://chronos.app/app/projects/${t.project_id}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:16px">Ver projeto →</a>
        </div>
      `;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [p.email],
          subject: `📥 Nova tarefa: ${t.title}`,
          html: emailHtml,
        }),
      });

      emailSent = emailRes.ok;

      await supabase.from("notifications").insert({
        user_id: t.assignee_id!,
        project_id: t.project_id,
        task_id: t.id,
        type: "assigned",
        payload: {
          title: t.title,
          project: t.projects.name,
          stage: t.stages.name,
          due_date: t.due_date,
          priority: t.priority,
        },
        channels: ["email"],
        status: emailRes.ok ? "sent" : "failed",
        sent_at: emailRes.ok ? new Date().toISOString() : null,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        task_id: t.id,
        assignee_id: t.assignee_id,
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
