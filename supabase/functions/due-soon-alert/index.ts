// ─────────────────────────────────────────────────────────────
// CHRONOS Edge Function: due-soon-alert
// Atividade: Cron job que alerta tarefas vencendo em 3/1/0 dias
// Canais: Email (via Resend) + Telegram (opt-in via flag)
// Deploy: supabase functions deploy due-soon-alert
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Env vars (configurar via `supabase secrets set ...`)
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
// Brevo (https://app.brevo.com/settings/keys/api) — transactional emails
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") ?? "";
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") ?? "eslyers@gmail.com";
const BREVO_SENDER_NAME = Deno.env.get("BREVO_SENDER_NAME") ?? "CHRONOS";
const APP_URL = Deno.env.get("APP_URL") ?? "https://chronos-temp.vercel.app";

// ── Interfaces ───────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  due_date: string;
  progress: number;
  priority: string;
  assignee_id: string | null;
  stage_id: string;
  project_id: string;
  stages: { name: string };
  projects: { name: string; id: string };
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  telegram_chat_id: string | null;
  email_enabled: boolean;
  telegram_enabled: boolean;
}

interface NotificationPrefs {
  user_id: string;
  project_id: string;
  notify_on_due_soon: boolean;
  telegram_enabled: boolean;
  email_enabled: boolean;
  telegram_chat_id: string | null;
}

// ── Helpers ─────────────────────────────────────────────────
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, "\\$&");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateBR(dateStr: string): string {
  // YYYY-MM-DD → DD/MM/YYYY
  const [y, m, d] = dateStr.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function priorityEmoji(p: string): string {
  switch ((p || "").toLowerCase()) {
    case "critical": return "🔴";
    case "high": return "🟠";
    case "medium": return "🟡";
    case "low": return "🟢";
    default: return "⚪";
  }
}

// ── Main handler ────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Aceitar GET (cron) e POST (teste manual)
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Config do job (3 janelas: vence em 3 dias, amanhã, hoje)
  const now = new Date();
  const targets = [
    { hours: 72, label: "🟡", verb: "vence em 3 dias" },
    { hours: 24, label: "🟠", verb: "vence amanhã" },
    { hours: 0,  label: "🔴", verb: "VENCE HOJE" },
  ];

  const stats = {
    alerts_sent: 0,
    emails_sent: 0,
    telegrams_sent: 0,
    tasks_processed: 0,
    errors: [] as string[],
    by_target: { "72h": 0, "24h": 0, "0h": 0 },
    timestamp: new Date().toISOString(),
  };

  for (const target of targets) {
    const targetDate = new Date(now.getTime() + target.hours * 60 * 60 * 1000);
    const targetDateIso = targetDate.toISOString().split("T")[0];

    // Buscar tasks que vencem nessa janela
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        due_date,
        progress,
        priority,
        assignee_id,
        stage_id,
        project_id,
        stages!inner(name),
        projects!inner(name, id)
      `)
      .eq("due_date", targetDateIso)
      .lt("progress", 100)
      .neq("status", "done");

    if (error) {
      stats.errors.push(`fetch ${target.verb}: ${error.message}`);
      continue;
    }

    for (const task of (tasks || []) as unknown as Task[]) {
      if (!task.assignee_id) continue;
      stats.tasks_processed++;

      // 1) Buscar perfil completo do assignee
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name, telegram_chat_id, email_enabled, telegram_enabled")
        .eq("id", task.assignee_id)
        .maybeSingle();

      if (!profile) continue;
      const p = profile as Profile;

      // 2) Buscar preferências por projeto
      const { data: prefs } = await supabase
        .from("notification_subscribers")
        .select("*")
        .eq("user_id", task.assignee_id)
        .eq("project_id", task.project_id)
        .eq("notify_on_due_soon", true)
        .maybeSingle();

      const pref = prefs as NotificationPrefs | null;

      // Se não tem prefs, pula (opt-out)
      if (!pref) continue;

      // 3) Decidir canais ativos
      const sendEmail = pref.email_enabled && p.email && BREVO_API_KEY;
      const sendTelegram = pref.telegram_enabled &&
        (p.telegram_chat_id || pref.telegram_chat_id) &&
        TELEGRAM_BOT_TOKEN;

      if (!sendEmail && !sendTelegram) continue;

      // 4) Montar conteúdo (compartilhado)
      const taskUrl = `${APP_URL}/app/projects/${task.project_id}`;
      const dueDateStr = formatDateBR(task.due_date);
      const emoji = priorityEmoji(task.priority);
      const displayName = p.full_name || "";
      const title = escapeMarkdown(task.title);
      const project = escapeMarkdown(task.projects.name);
      const stage = escapeMarkdown(task.stages.name);

      let sentAny = false;

      // ── TELEGRAM ──────────────────────────────────────────
      if (sendTelegram) {
        const chatId = p.telegram_chat_id || pref.telegram_chat_id;
        const message =
          `🕐 *CHRONOS* — ${target.label} *${target.verb}*\n\n` +
          `📋 *${title}*\n` +
          `${emoji} Prioridade: ${task.priority.toUpperCase()}\n` +
          `📁 ${project}\n` +
          `🎯 Etapa: ${stage}\n` +
          `📅 Vencimento: ${dueDateStr}\n` +
          `${task.progress > 0 ? `📊 Progresso: ${task.progress}%\n` : ""}` +
          `\n🔗 Abrir: ${taskUrl}`;

        try {
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

          await supabase.from("notifications").insert({
            user_id: task.assignee_id,
            project_id: task.project_id,
            task_id: task.id,
            type: target.hours === 0 ? "overdue" : "due_soon",
            payload: {
              title: task.title,
              project: task.projects.name,
              stage: task.stages.name,
              due_date: task.due_date,
              priority: task.priority,
              hours_until_due: target.hours,
            },
            channels: ["telegram"],
            status: tgRes.ok ? "sent" : "failed",
            sent_at: tgRes.ok ? new Date().toISOString() : null,
          });

          if (tgRes.ok) {
            stats.telegrams_sent++;
            sentAny = true;
          }
        } catch (err) {
          stats.errors.push(`telegram ${task.id}: ${(err as Error).message}`);
        }
      }

      // ── EMAIL ─────────────────────────────────────────────
      if (sendEmail) {
        const urgencyColor = target.hours <= 0 ? "#ef4444" : target.hours <= 24 ? "#f59e0b" : "#3b82f6";
        const urgencyBg = `${urgencyColor}20`;
        const urgencyLabel = target.hours <= 0 ? "VENCE HOJE!" : target.hours <= 24 ? "Vence em 24h" : `Vence em 3 dias`;

        const emailHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:linear-gradient(135deg,#f97316,#ea580c);border-radius:12px 12px 0 0;padding:32px;color:white">
      <div style="font-size:14px;opacity:0.9;margin-bottom:8px">🕐 CHRONOS</div>
      <h1 style="margin:0;font-size:24px;font-weight:700">Lembrete de Tarefa</h1>
    </div>
    <div style="background:white;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e2e8f0;border-top:none">
      <div style="display:inline-block;background:${urgencyBg};color:${urgencyColor};padding:6px 16px;border-radius:100px;font-size:14px;font-weight:600;margin-bottom:24px">
        ${urgencyLabel}
      </div>
      <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;font-weight:600">${emoji} ${escapeHtml(task.title)}</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px">
        ${displayName ? `Olá ${escapeHtml(displayName)}, ` : ""}esta tarefa precisa da sua atenção:
      </p>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="color:#64748b;padding:6px 0">📁 Projeto</td>
            <td style="color:#1e293b;font-weight:600;text-align:right">${escapeHtml(task.projects.name)}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:6px 0">🎯 Etapa</td>
            <td style="color:#1e293b;font-weight:600;text-align:right">${escapeHtml(task.stages.name)}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:6px 0">📅 Vencimento</td>
            <td style="color:#1e293b;font-weight:600;text-align:right">${dueDateStr}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:6px 0">⚡ Prioridade</td>
            <td style="color:#1e293b;font-weight:600;text-align:right;text-transform:uppercase">${task.priority}</td>
          </tr>
          ${task.progress > 0 ? `<tr>
            <td style="color:#64748b;padding:6px 0">📊 Progresso</td>
            <td style="color:#1e293b;font-weight:600;text-align:right">${task.progress}%</td>
          </tr>` : ""}
        </table>
      </div>
      <a href="${taskUrl}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:8px">Ver tarefa →</a>
      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">
        Você está recebendo este email porque é assignee desta tarefa.<br>
        <a href="${APP_URL}/app/settings" style="color:#94a3b8">Gerenciar preferências de notificação</a>
      </p>
    </div>
  </div>
</body>
</html>`;

        const subject = `🕐 ${urgencyLabel}: ${task.title}`;

        try {
          // Brevo API v3 — Transactional emails
          // Docs: https://developers.brevo.com/reference/sendtransacemail
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
              subject,
              htmlContent: emailHtml,
            }),
          });

          await supabase.from("notifications").insert({
            user_id: task.assignee_id,
            project_id: task.project_id,
            task_id: task.id,
            type: target.hours === 0 ? "overdue" : "due_soon",
            payload: {
              title: task.title,
              project: task.projects.name,
              stage: task.stages.name,
              due_date: task.due_date,
              priority: task.priority,
              hours_until_due: target.hours,
            },
            channels: ["email"],
            status: emailRes.ok ? "sent" : "failed",
            sent_at: emailRes.ok ? new Date().toISOString() : null,
          });

          if (emailRes.ok) {
            stats.emails_sent++;
            sentAny = true;
          } else {
            const errBody = await emailRes.text();
            stats.errors.push(`email ${task.id}: HTTP ${emailRes.status} ${errBody.substring(0, 100)}`);
          }
        } catch (err) {
          stats.errors.push(`email ${task.id}: ${(err as Error).message}`);
        }
      }

      if (sentAny) {
        stats.alerts_sent++;
        const key = target.hours === 0 ? "0h" : target.hours === 24 ? "24h" : "72h";
        stats.by_target[key as keyof typeof stats.by_target]++;
      }
    }
  }

  return new Response(JSON.stringify(stats, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
