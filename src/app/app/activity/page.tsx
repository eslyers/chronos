"use client";

import * as React from "react";
import Link from "next/link";
import { History, ArrowRight, User, Filter, Loader2 } from "lucide-react";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPAClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type Activity = {
  id: string;
  task_id: string;
  task_title: string;
  project_id: string;
  project_name: string;
  from_stage_name: string | null;
  to_stage_name: string;
  moved_by_email: string | null;
  moved_by_name: string | null;
  moved_at: string;
  note: string | null;
};

type RawTransition = {
  id: string;
  task_id: string;
  moved_by: string | null;
  moved_at: string;
  note: string | null;
  tasks: {
    id: string;
    title: string;
    project_id: string;
    projects: { id: string; name: string } | null;
  } | null;
  from_stage: { name: string } | null;
  to_stage: { name: string } | null;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
};

export default function ActivityPage() {
  const { user } = useGlobal();
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  const [projects, setProjects] = React.useState<{ id: string; name: string }[]>([]);

  const fetchActivity = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = createSPAClient();

    // Buscar projetos do user pra popular o filtro
    const { data: projData } = await supabase
      .from("projects")
      .select("id, name")
      .order("name");
    setProjects(projData || []);

    // Buscar transitions com joins
    let query = supabase
      .from("stage_transitions")
      .select(
        `
        id,
        task_id,
        moved_by,
        moved_at,
        note,
        tasks!inner(id, title, project_id, projects!inner(id, name)),
        from_stage:stages!stage_transitions_from_stage_id_fkey(name),
        to_stage:stages!stage_transitions_to_stage_id_fkey(name)
      `
      )
      .order("moved_at", { ascending: false })
      .limit(200);

    if (projectFilter !== "all") {
      query = query.eq("tasks.project_id", projectFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Activity fetch error:", error);
      setActivities([]);
    } else {
      const rawData = (data || []) as RawTransition[];

      // Enriquecer com profiles (movido_por)
      const movedByIds = Array.from(
        new Set(rawData.map((d) => d.moved_by).filter((id): id is string => Boolean(id)))
      );
      let profileMap: Record<string, { email: string; full_name: string | null }> = {};
      if (movedByIds.length) {
        const { data: profData } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", movedByIds);
        const profs = (profData || []) as ProfileRow[];
        profileMap = Object.fromEntries(
          profs.map((p) => [
            p.id,
            { email: p.email, full_name: p.full_name },
          ])
        );
      }

      const enriched: Activity[] = rawData.map((d) => ({
        id: d.id,
        task_id: d.task_id,
        task_title: d.tasks?.title ?? "(tarefa removida)",
        project_id: d.tasks?.project_id ?? "",
        project_name: d.tasks?.projects?.name ?? "?",
        from_stage_name: d.from_stage?.name ?? null,
        to_stage_name: d.to_stage?.name ?? "?",
        moved_by_email: d.moved_by ? profileMap[d.moved_by]?.email ?? null : null,
        moved_by_name: d.moved_by ? profileMap[d.moved_by]?.full_name ?? null : null,
        moved_at: d.moved_at,
        note: d.note,
      }));
      setActivities(enriched);
    }
    setLoading(false);
  }, [user, projectFilter]);

  React.useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `agora`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `há ${d}d`;
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6" />
            Activity Feed
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico de mudanças em todas as tarefas dos seus projetos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full sm:w-[200px]"
          >
            <option value="all">Todos os projetos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm">Carregando atividade...</p>
          </CardContent>
        </Card>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4">📜</div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma atividade ainda</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Quando alguém mover tarefas entre etapas (ex: Backlog → Em
              andamento), o evento aparece aqui em tempo real.
            </p>
            <Link href="/app/projects" className="mt-4">
              <Button variant="outline" size="sm">
                Ir para Projetos
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {activities.map((a) => (
                <li
                  key={a.id}
                  className="p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-medium text-sm">
                          {a.moved_by_name || a.moved_by_email || "Sistema"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          moveu
                        </span>
                        <span className="font-medium text-sm truncate">
                          {a.task_title}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {a.from_stage_name ? (
                          <>
                            <Badge variant="outline" className="text-xs">
                              {a.from_stage_name}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </>
                        ) : null}
                        <Badge variant="secondary" className="text-xs">
                          {a.to_stage_name}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          · {a.project_name}
                        </span>
                      </div>

                      {a.note && (
                        <p className="text-xs text-muted-foreground italic mt-2 border-l-2 border-border pl-2">
                          &ldquo;{a.note}&rdquo;
                        </p>
                      )}
                    </div>

                    <time className="text-xs text-muted-foreground shrink-0 mt-1">
                      {timeAgo(a.moved_at)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}