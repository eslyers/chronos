// DEBUG: retorna o HTML do email SEM enviar
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://chronos-temp.vercel.app";

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const targetDateIso = now.toISOString().split("T")[0];

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(`
      id, title, due_date, priority, assignee_id, project_id,
      stages!inner(name),
      projects!inner(name, id)
    `)
    .eq("due_date", targetDateIso)
    .lt("progress", 100)
    .neq("status", "done");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const out: any[] = [];
  for (const task of (tasks || []) as any[]) {
    const taskUrl = `${APP_BASE_URL}/app/projects/${task.project_id}?task=${task.id}`;
    out.push({
      task_id: task.id,
      title: task.title,
      project_id: task.project_id,
      app_base_url: APP_BASE_URL,
      task_url: taskUrl,
      full_url: taskUrl,
    });
  }

  return new Response(JSON.stringify({
    debug: {
      now: now.toISOString(),
      target_date_iso: targetDateIso,
      app_base_url: APP_BASE_URL,
    },
    tasks: out,
  }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
