"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPAClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  FolderKanban,
  Plus,
  Clock,
  KanbanSquare,
  Bell,
  ArrowRight,
  Sparkles,
} from "lucide-react";

type ProjectCount = {
  total: number;
  active: number;
  completed: number;
};

type UpcomingTask = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  projects: { name: string; color: string } | null;
};

export default function DashboardPage() {
  const { loading, user } = useGlobal();
  const [projectCount, setProjectCount] = useState<ProjectCount>({
    total: 0,
    active: 0,
    completed: 0,
  });
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);

  useEffect(() => {
    async function loadStats() {
      if (loading || !user) return;
      const supabase = createSPAClient();

      const projectsRes = await supabase
        .from("projects")
        .select("id, status");
      const projects = (projectsRes.data ?? []) as Array<{ id: string; status: string }>;

      if (projects.length > 0) {
        setProjectCount({
          total: projects.length,
          active: projects.filter((p) => p.status === "active").length,
          completed: projects.filter((p) => p.status === "completed").length,
        });
      }

      const tasksRes = await supabase
        .from("tasks")
        .select("id, title, due_date, priority, status, projects!inner(name, color)")
        .neq("status", "done")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(5);
      const tasks = (tasksRes.data ?? []) as UpcomingTask[];

      if (tasks.length > 0) setUpcomingTasks(tasks);
    }
    loadStats();
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  const firstName = user?.email?.split("@")[0] || "amigo";

  return (
    <div className="space-y-6">
      {/* Hero / Saudação */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {firstName}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aqui está um resumo dos seus cronogramas.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              Projetos ativos
            </CardDescription>
            <CardTitle className="text-3xl">{projectCount.active}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {projectCount.total} projetos no total
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Próximos prazos
            </CardDescription>
            <CardTitle className="text-3xl">{upcomingTasks.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Tarefas com due_date definido
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Concluídos
            </CardDescription>
            <CardTitle className="text-3xl">{projectCount.completed}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Desde o início
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações rápidas</CardTitle>
          <CardDescription>Acesso direto às views principais</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/app/projects"
              className="group flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted hover:border-foreground/20 transition-all"
            >
              <div className="p-2 rounded-md bg-amber-500/10 text-amber-600">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Projetos</h3>
                <p className="text-xs text-muted-foreground">Gerenciar cronogramas</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/app/timeline"
              className="group flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted hover:border-foreground/20 transition-all"
            >
              <div className="p-2 rounded-md bg-blue-500/10 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Timeline</h3>
                <p className="text-xs text-muted-foreground">Visão Gantt</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/app/kanban"
              className="group flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted hover:border-foreground/20 transition-all"
            >
              <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600">
                <KanbanSquare className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Kanban</h3>
                <p className="text-xs text-muted-foreground">Execução em colunas</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Empty state quando não tem projetos */}
      {projectCount.total === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-5xl mb-4">🕐</div>
            <h3 className="text-xl font-semibold">Comece seu primeiro cronograma</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Crie um projeto do zero ou use um template pronto (12 semanas de body, lançamento, migração, sprint Scrum).
            </p>
            <div className="flex gap-2 mt-6">
              <Button asChild>
                <Link href="/app/projects">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar projeto
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/templates">
                  Ver templates
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming tasks preview */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Próximas tarefas
            </CardTitle>
            <CardDescription>Top 5 tarefas com prazo mais próximo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-8 rounded-full"
                      style={{
                        backgroundColor: task.projects?.color || "#f97316",
                      }}
                    />
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.projects?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        task.priority === "critical"
                          ? "bg-red-500/10 text-red-600"
                          : task.priority === "high"
                          ? "bg-orange-500/10 text-orange-600"
                          : task.priority === "medium"
                          ? "bg-yellow-500/10 text-yellow-600"
                          : "bg-gray-500/10 text-gray-600"
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      <CalendarDays className="inline h-3 w-3 mr-1" />
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString("pt-BR")
                        : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
