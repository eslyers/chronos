"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Clock,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useGlobal } from "@/lib/context/GlobalContext";
import { useData } from "@/lib/context/DataContext";

type UpcomingTask = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  projects: { name: string; color: string } | null;
  stages: { name: string; color: string } | null;
};

const PRIORITY_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "warning" | "destructive" }> = {
  low: { label: "Baixa", variant: "secondary" },
  medium: { label: "Média", variant: "default" },
  high: { label: "Alta", variant: "warning" },
  critical: { label: "Crítica", variant: "destructive" },
};

export default function DashboardPage() {
  const { user, loading: userLoading } = useGlobal();
  const { projects, tasks, getTasksByProject, loading: dataLoading } = useData();
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    const upcoming = tasks
      .filter((t) => t.due_date && t.status !== "done" && new Date(t.due_date).getTime() > now - 86400000)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        priority: t.priority,
        status: t.status,
        projects: projects.find((p) => p.id === t.project_id)
          ? { name: projects.find((p) => p.id === t.project_id)!.name, color: projects.find((p) => p.id === t.project_id)!.color }
          : null,
        stages: null,
      }));
    setUpcomingTasks(upcoming);
  }, [user, tasks, projects]);

  if (userLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando dashboard...</div>
      </div>
    );
  }

  // Compute stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date).getTime() < Date.now() && t.status !== "done"
  ).length;
  const tasksProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  function formatDate(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  function daysUntil(iso: string | null) {
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {user?.email?.split("@")[0] ?? "Esly"} 👋
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              <FolderKanban className="h-8 w-8 text-orange-500" />
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

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tarefas Atrasadas</p>
                <p className="text-3xl font-bold mt-1 text-destructive">{overdueTasks}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  precisam atenção
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Próximas Tarefas</p>
                <p className="text-3xl font-bold mt-1">{upcomingTasks.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  nos próximos dias
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-md hover:bg-secondary/50 transition-colors"
                    >
                      <div
                        className="w-1.5 h-12 rounded-full flex-shrink-0"
                        style={{ backgroundColor: task.projects?.color || "#f97316" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{task.projects?.name}</span>
                          <span>•</span>
                          <Badge variant={PRIORITY_LABELS[task.priority]?.variant ?? "default"} className="text-xs">
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
                              ? "text-amber-600 dark:text-amber-400"
                              : dueSoon
                              ? "text-amber-600 dark:text-amber-400"
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
                    </div>
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
              const pct = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;

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
    </div>
  );
}