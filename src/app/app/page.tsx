"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Clock,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Bell,
  TrendingUp,
  Loader2,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  KanbanSquare,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useGlobal } from "@/lib/context/GlobalContext";
import { useData, type Project, type Task } from "@/lib/context/DataContext";
import { createSPAClient } from "@/lib/supabase/client";

type UpcomingTask = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  project_id: string;
  projects: { name: string; color: string } | null;
};

type RecentNotification = {
  id: string;
  type: string;
  status: string;
  channels: string[];
  payload: Record<string, unknown>;
  created_at: string;
};

const PRIORITY_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "warning" | "destructive"; bg: string }
> = {
  low: { label: "Baixa", variant: "secondary", bg: "bg-slate-500/10 text-slate-500 border-slate-500/30" },
  medium: { label: "Média", variant: "default", bg: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  high: { label: "Alta", variant: "warning", bg: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
  critical: { label: "Crítica", variant: "destructive", bg: "bg-red-500/10 text-red-500 border-red-500/30 font-bold animate-pulse" },
};

export default function DashboardPage() {
  const { user, loading: userLoading } = useGlobal();
  const { projects, tasks, getTasksByProject, loading: dataLoading } = useData();
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([]);
  const [assigneeName, setAssigneeName] = useState<string>("Esly");

  useEffect(() => {
    if (!user) return;
    setAssigneeName(user.email?.split("@")[0] ?? "Esly");

    // Carregar notificações recentes do Supabase
    (async () => {
      try {
        const supabase = createSPAClient();
        const { data: notifs } = await supabase
          .from("notifications")
          .select("id, type, status, channels, payload, created_at")
          .order("created_at", { ascending: false })
          .limit(5);
        setRecentNotifications((notifs ?? []) as RecentNotification[]);
      } catch (err) {
        console.error("Erro ao carregar notificações", err);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    const upcoming = tasks
      .filter(
        (t) =>
          t.due_date &&
          t.status !== "done" &&
          new Date(t.due_date).getTime() > now - 86400000
      )
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5)
      .map((t) => {
        const p = projects.find((p) => p.id === t.project_id);
        return {
          id: t.id,
          title: t.title,
          due_date: t.due_date,
          priority: t.priority,
          status: t.status,
          project_id: t.project_id,
          projects: p ? { name: p.name, color: p.color } : null,
        };
      });
    setUpcomingTasks(upcoming);
  }, [user, tasks, projects]);

  if (userLoading || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium">Carregando indicadores do workspace...</p>
      </div>
    );
  }

  // Compute stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter(
    (t) =>
      t.due_date &&
      new Date(t.due_date).getTime() < Date.now() &&
      t.status !== "done"
  ).length;
  const dueSoonTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === "done") return false;
    const diff = new Date(t.due_date).getTime() - Date.now();
    return diff > 0 && diff <= 86400000 * 3; // 3 dias
  }).length;
  const myTasks = tasks.filter((t) => t.assignee_id === user?.id).length;
  const tasksProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Saúde do workspace (pontuação simples)
  const healthScore = (() => {
    if (totalTasks === 0) return 100;
    const overduePenalty = (overdueTasks / totalTasks) * 50;
    const inProgressBonus = Math.min(
      20,
      (tasks.filter((t) => t.status === "in_progress").length / totalTasks) * 20
    );
    return Math.max(0, Math.min(100, Math.round(100 - overduePenalty + inProgressBonus)));
  })();

  const healthColor =
    healthScore >= 80
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
      : healthScore >= 50
      ? "text-blue-500 bg-blue-500/10 border-blue-500/30"
      : "text-red-500 bg-red-500/10 border-red-500/30";

  const healthText =
    healthScore >= 80 ? "Excelente" : healthScore >= 50 ? "Estável" : "Atenção Crítica";

  function formatDate(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  function daysUntil(iso: string | null) {
    if (!iso) return null;
    const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
    if (days < 0) return "Atrasado";
    if (days === 0) return "Vence Hoje";
    if (days === 1) return "Amanhã";
    return `em ${days} dias`;
  }

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Executive Greeting Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs font-semibold">
                CHRONOS WORKSPACE
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2">
              Visão Geral Executiva, {assigneeName} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Acompanhe a saúde operacional do seu cronograma, monitore prazos e gerencie entregas em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Card className={`px-4 py-3 border ${healthColor} flex items-center gap-3 backdrop-blur shadow-sm`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-inner font-bold text-sm">
                {healthScore}
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Saúde do Workspace</p>
                <p className="text-sm font-bold">{healthText}</p>
              </div>
            </Card>

            <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20">
              <Link href="/app/projects">
                <Plus className="mr-1.5 h-4 w-4" />
                Novo Projeto
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Projects */}
        <Card className="relative overflow-hidden border border-border/80 bg-card p-5 shadow-sm hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projetos Ativos</p>
              <p className="text-3xl font-extrabold mt-1">{activeProjects}</p>
              <p className="text-xs text-muted-foreground mt-1">de {totalProjects} cadastrados</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
              <FolderKanban className="h-6 w-6" />
            </div>
          </div>
        </Card>

        {/* Completed Tasks */}
        <Card className="relative overflow-hidden border border-border/80 bg-card p-5 shadow-sm hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taxa de Conclusão</p>
              <p className="text-3xl font-extrabold mt-1 text-emerald-500">{tasksProgress}%</p>
              <p className="text-xs text-muted-foreground mt-1">{completedTasks} de {totalTasks} tarefas</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
          <Progress value={tasksProgress} className="mt-3 h-1.5" />
        </Card>

        {/* Overdue & Risk Radar */}
        <Card className={`relative overflow-hidden border border-border/80 bg-card p-5 shadow-sm transition-all ${overdueTasks > 0 ? "border-red-500/40 bg-red-500/5" : ""}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarefas em Risco</p>
              <p className={`text-3xl font-extrabold mt-1 ${overdueTasks > 0 ? "text-red-500" : "text-foreground"}`}>
                {overdueTasks}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{dueSoonTasks} vencem em 3 dias</p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${overdueTasks > 0 ? "bg-red-500/20 text-red-500" : "bg-muted text-muted-foreground"}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </Card>

        {/* My Workload */}
        <Card className="relative overflow-hidden border border-border/80 bg-card p-5 shadow-sm hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Minhas Atribuições</p>
              <p className="text-3xl font-extrabold mt-1 text-purple-500">{myTasks}</p>
              <p className="text-xs text-muted-foreground mt-1">tarefas vinculadas</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
              <Activity className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Projects Showcase (2 cols width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-blue-500" />
              Projetos em Andamento
            </h2>
            <Link href="/app/projects" className="text-xs font-semibold text-blue-500 hover:underline flex items-center gap-1">
              Ver Todos ({projects.length}) <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {projects.slice(0, 4).map((project: Project) => {
              const projectTasksList = getTasksByProject(project.id);
              const total = projectTasksList.length;
              const done = projectTasksList.filter((t) => t.status === "done").length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <Card
                  key={project.id}
                  className="group relative overflow-hidden border border-border/80 bg-card p-5 shadow-sm hover:shadow-md hover:border-blue-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3.5 w-3.5 rounded-full shadow-sm"
                          style={{ backgroundColor: project.color || "#3b82f6" }}
                        />
                        <h3 className="font-bold text-sm truncate group-hover:text-blue-500 transition-colors max-w-[160px]">
                          {project.name}
                        </h3>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {pct}%
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                      {project.description || "Sem descrição definida para este projeto."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>{done}/{total} entregáveis</span>
                      <span>{project.target_date ? formatDate(project.target_date) : "Sem prazo"}</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />

                    <div className="mt-4 flex items-center justify-between pt-1">
                      <Link
                        href={`/app/projects/${project.id}`}
                        className="text-xs font-semibold text-blue-500 hover:underline inline-flex items-center gap-1"
                      >
                        Abrir Kanban <ArrowUpRight className="h-3 w-3" />
                      </Link>
                      <Link
                        href={`/app/timeline?project=${project.id}`}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <Calendar className="h-3 w-3" /> Timeline
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {projects.length === 0 && (
            <Card className="p-8 text-center border-dashed border-border/80">
              <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-bold text-sm">Nenhum projeto encontrado</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Crie seu primeiro projeto para começar a monitorar o cronograma.</p>
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/app/projects">+ Criar Projeto</Link>
              </Button>
            </Card>
          )}
        </div>

        {/* Right Column: Upcoming Critical Tasks & Recent Notifications */}
        <div className="space-y-6">
          {/* Critical Tasks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Tarefas Prioritárias
              </h2>
              <Link href="/app/calendar" className="text-xs font-semibold text-blue-500 hover:underline">
                Ver Calendário
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingTasks.slice(0, 4).map((t) => {
                const priorityInfo = PRIORITY_LABELS[t.priority] ?? PRIORITY_LABELS.medium;
                const timeText = daysUntil(t.due_date);

                return (
                  <Card key={t.id} className="p-3.5 border border-border/80 bg-card shadow-sm hover:border-blue-500/40 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold leading-tight line-clamp-1">{t.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {t.projects?.name || "Projeto"}
                        </p>
                      </div>
                      <Badge className={`text-[10px] px-2 py-0.5 border ${priorityInfo.bg}`}>
                        {priorityInfo.label}
                      </Badge>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                      <span className="flex items-center gap-1 text-amber-500 font-medium">
                        <Clock className="h-3 w-3" /> {timeText}
                      </span>
                      <span className="capitalize">{t.status.replace("_", " ")}</span>
                    </div>
                  </Card>
                );
              })}

              {upcomingTasks.length === 0 && (
                <Card className="p-6 text-center text-xs text-muted-foreground border-dashed">
                  Nenhuma tarefa pendente com prazo definido para os próximos dias.
                </Card>
              )}
            </div>
          </div>

          {/* Activity / Notification Feed */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Bell className="h-5 w-5 text-sky-500" />
                Feed de Alertas
              </h2>
              <Link href="/app/notifications" className="text-xs font-semibold text-blue-500 hover:underline">
                Configurações
              </Link>
            </div>

            <Card className="p-4 border border-border/80 bg-card space-y-3 shadow-sm">
              {recentNotifications.slice(0, 3).map((n) => (
                <div key={n.id} className="flex items-start gap-3 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                  <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    🤖
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <p className="font-semibold text-foreground">
                      {(n.payload?.title as string) || "Notificação de Cronograma"}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {(n.payload?.message as string) || "Alerta emitido com sucesso."}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                </div>
              ))}

              {recentNotifications.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Nenhum alerta recente emitido pelo Telegram/E-mail.
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
