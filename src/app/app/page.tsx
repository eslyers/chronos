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
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useGlobal } from "@/lib/context/GlobalContext";
import { useData } from "@/lib/context/DataContext";
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
  { label: string; variant: "default" | "secondary" | "warning" | "destructive" }
> = {
  low: { label: "Baixa", variant: "secondary" },
  medium: { label: "Média", variant: "default" },
  high: { label: "Alta", variant: "warning" },
  critical: { label: "Crítica", variant: "destructive" },
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

    // Carregar notificações recentes
    (async () => {
      const supabase = createSPAClient();
      const { data: notifs } = await supabase
        .from("notifications")
        .select("id, type, status, channels, payload, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentNotifications((notifs ?? []) as RecentNotification[]);
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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
    healthScore >= 80 ? "text-emerald-500" : healthScore >= 50 ? "text-blue-500" : "text-red-500";

  function formatDate(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  function daysUntil(iso: string | null) {
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
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
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Olá, {assigneeName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Card className="px-4 py-3 hidden md:block">
          <div className="flex items-center gap-3">
            <TrendingUp className={`h-5 w-5 ${healthColor}`} />
            <div>
              <p className="text-xs text-muted-foreground">Saúde do workspace</p>
              <p className={`text-lg font-bold ${healthColor}`}>{healthScore}/100</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Projetos Ativos</p>
                <p className="text-3xl font-bold mt-1">{activeProjects}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  de {totalProjects} total
                </p>
              </div>
              <FolderKanban className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tarefas Concluídas</p>
                <p className="text-3xl font-bold mt-1">{completedTasks}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {tasksProgress}% do total
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <Progress value={tasksProgress} className="mt-3" />
          </CardContent>
        </Card>

        <Card className={overdueTasks > 0 ? "border-red-500/30 bg-red-500/5" : ""}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tarefas Atrasadas</p>
                <p className={`text-3xl font-bold mt-1 ${overdueTasks > 0 ? "text-destructive" : ""}`}>
                  {overdueTasks}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dueSoonTasks} vencem em 3 dias
                </p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${overdueTasks > 0 ? "text-red-500" : "text-slate-300"}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Minhas Tarefas</p>
                <p className="text-3xl font-bold mt-1">{myTasks}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  atribuídas a mim
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Upcoming tasks */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Tarefas
            </CardTitle>
            <CardDescription>Tarefas com prazo mais próximo</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma tarefa pendente com prazo próximo. Tudo em dia! 🎉
                </p>
                <Link
                  href="/app/projects"
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  Ver todos os projetos →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((task) => {
                  const days = daysUntil(task.due_date);
                  const overdue = days !== null && days < 0;
                  const dueToday = days === 0;
                  const dueSoon = days !== null && days > 0 && days <= 2;

                  return (
                    <Link
                      key={task.id}
                      href={`/app/projects/${task.project_id}`}
                      className="flex items-center gap-3 p-3 rounded-md hover:bg-secondary/50 transition-colors"
                    >
                      <div
                        className="w-1.5 h-12 rounded-full flex-shrink-0"
                        style={{ backgroundColor: task.projects?.color || "#3b82f6" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{task.projects?.name}</span>
                          <span>•</span>
                          <Badge
                            variant={PRIORITY_LABELS[task.priority]?.variant ?? "default"}
                            className="text-xs"
                          >
                            {PRIORITY_LABELS[task.priority]?.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div
                          className={`text-xs font-semibold ${
                            overdue
                              ? "text-destructive"
                              : dueToday
                              ? "text-blue-600 dark:text-blue-400"
                              : dueSoon
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {overdue
                            ? `${Math.abs(days!)}d atrasado`
                            : dueToday
                            ? "Hoje!"
                            : `${days}d`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(task.due_date)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Projetos
              </span>
              <Link href="/app/projects" className="text-xs text-primary hover:underline">
                Ver todos
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.slice(0, 4).map((project) => {
              const projectTasks = getTasksByProject(project.id);
              const completed = projectTasks.filter((t) => t.status === "done").length;
              const pct =
                projectTasks.length > 0
                  ? Math.round((completed / projectTasks.length) * 100)
                  : 0;

              return (
                <Link
                  key={project.id}
                  href={`/app/projects/${project.id}`}
                  className="block p-3 rounded-md hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="h-8 w-8 rounded-md flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{project.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {completed}/{projectTasks.length} tarefas
                        </span>
                        <span className="text-xs font-semibold">{pct}%</span>
                      </div>
                      <Progress value={pct} className="mt-1 h-1" />
                    </div>
                  </div>
                </Link>
              );
            })}

            {projects.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Nenhum projeto ainda</p>
                <Link href="/app/projects" className="text-sm text-primary hover:underline">
                  Criar primeiro projeto →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notificações recentes */}
      {recentNotifications.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Atividade Recente
              </CardTitle>
              <CardDescription>Últimas notificações enviadas</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/notifications">Ver todas →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentNotifications.map((n) => {
              const p = n.payload as Record<string, string>;
              const title = p.title || p.task_title || "Notificação";
              const project = p.project || p.project_name;
              return (
                <div
                  key={n.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors text-sm"
                >
                  <span className="text-xs">
                    {n.channels.map((c) =>
                      c === "telegram" ? "📱" : c === "email" ? "📧" : "🔔"
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate">{title}</span>
                    {project && (
                      <span className="text-muted-foreground"> • {project}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(n.created_at)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
