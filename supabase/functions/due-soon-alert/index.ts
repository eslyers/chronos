// ─────────────────────────────────────────────────────────────
// CHRONOS Edge Function: due-soon-alert
// Atividade: Cron job que alerta tarefas vencendo em 3/1/0 dias
// Deploy: supabase functions deploy due-soon-alert
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

interface Task {
  id: string;
  title: string;
  due_date: string;
  progress: number;
  assignee_id: string | null;
  stages: { name: string };
  projects: { name: string; id: string };
}

interface Profile {
  telegram_chat_id: string | null;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const targets = [
    { hours: 72, label: "🟡", verb: "vence em 3 dias" },
    { hours: 24, label: "🟠", verb: "vence amanhã" },
    { hours: 0, label: "🔴", verb: "VENCE HOJE" },
  ];

  let totalAlerts = 0;

  for (const target of targets) {
    const targetDate = new Date(now.getTime() + target.hours * 60 * 60 * 1000);
    const targetDateIso = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(
        `
        id,
        title,
        due_date,
        progress,
        assignee_id,
        stages!inner(name),
        projects!inner(name, id)
      `
      )
      .eq("due_date", targetDateIso)
      .lt("progress", 100)
      .neq("status", "done");

    if (error) {
      console.error(`Error fetching tasks (${target.verb}):`, error);
      continue;
    }

    for (const task of (tasks || []) as unknown as Task[]) {
      if (!task.assignee_id) continue;

      // Buscar preferências de notificação do assignee
      const { data: prefs } = await supabase
        .from("notification_subscribers")
        .select("*")
        .eq("user_id", task.assignee_id)
        .eq("project_id", task.projects.id)
        .eq("notify_on_due_soon", true)
        .maybeSingle();

      if (!prefs || !prefs.telegram_enabled) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("telegram_chat_id")
        .eq("id", task.assignee_id)
        .maybeSingle();

      const chatId =
        (profile as Profile | null)?.telegram_chat_id ??
        (prefs as any).telegram_chat_id;
      if (!chatId) continue;

      const message =
        `🕐 *CHRONOS* — ${target.label} *${target.verb}*\n\n` +
        `📋 *${escapeMarkdown(task.title)}*\n` +
        `📁 ${escapeMarkdown(task.projects.name)}\n` +
        `🎯 Etapa: ${escapeMarkdown(task.stages.name)}\n` +
        `📅 Vencimento: ${new Date(task.due_date).toLocaleDateString("pt-BR")}\n` +
        `${task.progress > 0 ? `📊 Progresso: ${task.progress}%\n` : ""}` +
        `\n🔗 Abrir tarefa: https://chronos.app/app/projects/${task.projects.id}`;

      const telegramResponse = await fetch(
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

      // Salvar no histórico
      await supabase.from("notifications").insert({
        user_id: task.assignee_id,
        project_id: task.projects.id,
        task_id: task.id,
        type: target.hours === 0 ? "overdue" : "due_soon",
        payload: {
          title: task.title,
          project: task.projects.name,
          due_date: task.due_date,
          hours_until_due: target.hours,
        },
        channels: ["telegram"],
        status: telegramResponse.ok ? "sent" : "failed",
        sent_at: telegramResponse.ok ? new Date().toISOString() : null,
      });

      totalAlerts++;
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      alerts_sent: totalAlerts,
      timestamp: new Date().toISOString(),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, "\\$&");
}
