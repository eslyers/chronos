"use client";

import * as React from "react";
import Link from "next/link";
import { History, ArrowRight, User, Filter, ShieldCheck, Clock } from "lucide-react";
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

    const { data: projData } = await supabase
      .from("projects")
      .select("id, name")
      .order("name");
    setProjects(projData || []);

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
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs font-semibold">
                TRILHA DE AUDITORIA & ATIVIDADES
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
              <History className="h-7 w-7 text-blue-500" />
              Feed de Atividades & Trilha de Auditoria
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Registro histórico em tempo real das movimentações de etapas, alterações de responsável e auditoria de fluxo.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border/80 shadow-sm">
              <Filter className="h-4 w-4 text-blue-500 ml-1" />
              <Select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full sm:w-[220px] h-9 text-xs font-semibold border-none bg-transparent focus:ring-0"
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
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 animate-pulse">
            <History className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            Carregando registros de auditoria...
          </p>
        </div>
      ) : activities.length === 0 ? (
        <Card className="border-dashed border-2 p-8">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">Nenhuma atividade registrada</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Quando tarefas forem movidas entre etapas no Kanban, a trilha de auditoria será exibida aqui em tempo real.
            </p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              <Link href="/app/projects">Ir para Projetos</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/80 bg-card shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {activities.map((a) => (
                <li
                  key={a.id}
                  className="p-5 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/20 font-bold">
                      <User className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-bold text-sm text-foreground">
                          {a.moved_by_name || a.moved_by_email || "Sistema Chronos"}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          alterou a etapa da tarefa
                        </span>
                        <span className="font-bold text-sm text-blue-500 hover:underline cursor-pointer">
                          &ldquo;{a.task_title}&rdquo;
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {a.from_stage_name ? (
                          <>
                            <Badge variant="outline" className="text-xs font-semibold bg-muted/40">
                              {a.from_stage_name}
                            </Badge>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </>
                        ) : null}
                        <Badge variant="outline" className="text-xs font-semibold bg-blue-500/10 text-blue-500 border-blue-500/30">
                          {a.to_stage_name}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          · Projeto: <strong className="text-foreground">{a.project_name}</strong>
                        </span>
                      </div>

                      {a.note && (
                        <p className="text-xs text-muted-foreground italic mt-2.5 border-l-2 border-blue-500/40 pl-3 py-0.5">
                          &ldquo;{a.note}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 font-mono bg-muted/40 px-2.5 py-1 rounded-lg">
                      <Clock className="h-3 w-3" />
                      <span>{timeAgo(a.moved_at)}</span>
                    </div>
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