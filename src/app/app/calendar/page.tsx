"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertCircle,
  Clock,
  Flag,
  CheckCircle2,
  ShieldCheck,
  Filter,
  UserCheck,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/lib/context/DataContext";
import { TaskAssignee } from "@/components/TaskAssignee";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "border-l-red-500 bg-red-500/10 text-foreground",
  high: "border-l-indigo-500 bg-indigo-500/10 text-foreground",
  medium: "border-l-blue-500 bg-blue-500/10 text-foreground",
  low: "border-l-slate-400 bg-slate-500/10 text-foreground",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export default function CalendarPage() {
  const router = useRouter();
  const { tasks, projects, loading, loadAllProjectsDetails } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Usuário e permissões para filtro de visibilidade do calendário
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  const [viewFilter, setViewFilter] = useState<"all" | "mine">("all");

  useEffect(() => {
    async function loadUser() {
      try {
        const isSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
        if (isSupabase) {
          const { createSPAClient } = await import("@/lib/supabase/client");
          const supabase = createSPAClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setCurrentUserId(user.id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const memberClient = supabase.from("workspace_members") as any;
            const { data: member } = await memberClient
              .select("role")
              .eq("user_id", user.id)
              .maybeSingle();
            if (member?.role) {
              setCurrentUserRole(member.role);
            }
          }
        } else {
          const { demoGetSession } = await import("@/lib/auth/demo-auth");
          const session = demoGetSession();
          if (session?.user) {
            setCurrentUserId(session.user.id);
            setCurrentUserRole("owner");
          }
        }
      } catch (err) {
        console.error("[Calendar] loadUser error:", err);
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function fetchDetails() {
      setLoadingDetails(true);
      await loadAllProjectsDetails();
      setLoadingDetails(false);
    }
    fetchDetails();
  }, [loadAllProjectsDetails]);

  // Filtro de Tarefas por Usuário / Permissões
  // Donos do Projeto / Workspace vêm TODAS as tarefas com indicativo visual de quem é o responsável.
  // Membros normais vêm apenas as SUAS PRÓPRIAS tarefas atribuídas.
  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.due_date) return false;

      // Se o usuário alternar para "Apenas Minhas Tarefas"
      if (viewFilter === "mine") {
        return task.assignee_id === currentUserId;
      }

      // Se for Owner ou Admin do Workspace
      if (currentUserRole === "owner" || currentUserRole === "admin") {
        return true;
      }

      // Se for o Dono/Criador do projeto desta tarefa
      const project = projects.find((p) => p.id === task.project_id);
      if (project && (project.owner_id === currentUserId || !currentUserId)) {
        return true;
      }

      // Membros comuns vêm apenas as tarefas atribuídas a eles
      return task.assignee_id === currentUserId;
    });
  }, [tasks, projects, currentUserId, currentUserRole, viewFilter]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, typeof visibleTasks>();
    for (const task of visibleTasks) {
      if (!task.due_date) continue;
      const day = task.due_date.slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(task);
      map.set(day, list);
    }
    return map;
  }, [visibleTasks]);

  const stats = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthTasks = visibleTasks.filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      return d >= monthStart && d <= monthEnd;
    });
    const overdue = monthTasks.filter((t) => {
      if (!t.due_date || t.status === "done" || t.progress === 100) return false;
      return new Date(t.due_date).getTime() < Date.now();
    }).length;
    const due = monthTasks.filter((t) => t.status !== "done" && t.progress !== 100).length;
    const done = monthTasks.filter((t) => t.status === "done" || t.progress === 100).length;
    return { total: monthTasks.length, overdue, due, done };
  }, [visibleTasks, currentDate]);

  if (loading || loadingDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 animate-pulse">
          <CalendarIcon className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">
          Carregando calendário corporativo de entregas...
        </p>
      </div>
    );
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const calendarDays: Array<{ date: Date | null; tasks: typeof visibleTasks }> = [];

  for (let i = 0; i < startWeekday; i++) {
    calendarDays.push({ date: null, tasks: [] });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const key = date.toISOString().slice(0, 10);
    calendarDays.push({ date, tasks: tasksByDay.get(key) ?? [] });
  }
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push({ date: null, tasks: [] });
  }
  while (calendarDays.length < 42) {
    calendarDays.push({ date: null, tasks: [] });
  }

  const today = new Date();
  const isManager = currentUserRole === "owner" || currentUserRole === "admin";

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs font-semibold">
                CALENDÁRIO MENSAL
              </Badge>
              {isManager && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                  👑 Visão Geral do Gestor
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
              <CalendarIcon className="h-7 w-7 text-blue-500" />
              Calendário de Entregáveis
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              {isManager
                ? "Visão executiva completa de todas as entregas do projeto com identificativo dos responsáveis."
                : "Visão focada nas suas tarefas e prazos individuais de execução."}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-border/80"
              onClick={() => setCurrentDate(addMonths(currentDate, -1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[160px] text-center font-extrabold text-lg text-foreground font-mono">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-border/80"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4 text-xs font-bold border-border/80 hover:bg-muted"
              onClick={() => setCurrentDate(new Date())}
            >
              Hoje
            </Button>
          </div>
        </div>
      </div>

      {/* Control & Permisson Filter Bar */}
      <Card className="p-4 sm:p-5 border-border/80 bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-4 w-4 text-blue-500" />
            <span>Filtro de Exibição do Calendário:</span>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border/60">
            <button
              onClick={() => setViewFilter("all")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewFilter === "all"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              {isManager ? "📊 Todas as Tarefas do Projeto" : "👥 Tarefas do Time"}
            </button>
            <button
              onClick={() => setViewFilter("mine")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewFilter === "mine"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              👤 Apenas Minhas Tarefas
            </button>
          </div>
        </div>
      </Card>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entregas no Mês</p>
              <p className="text-3xl font-extrabold mt-1.5">{stats.total}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 font-bold">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pendentes</p>
              <p className="text-3xl font-extrabold mt-1.5">{stats.due}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 font-bold">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-red-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atrasadas</p>
              <p className={`text-3xl font-extrabold mt-1.5 ${stats.overdue > 0 ? "text-destructive" : "text-emerald-500"}`}>
                {stats.overdue}
              </p>
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold ${
              stats.overdue > 0 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"
            }`}>
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Concluídas</p>
              <p className="text-3xl font-extrabold text-emerald-500 mt-1.5">{stats.done}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 font-bold">
              <Flag className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Calendar Card */}
      {visibleTasks.length === 0 ? (
        <Card className="border-dashed border-2 p-8">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
              <CalendarIcon className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Nenhuma tarefa encontrada</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Não há tarefas no calendário correspondentes ao filtro atual.
            </p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              <Link href="/app/projects">Ir para Projetos</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/80 bg-card shadow-xl overflow-hidden">
          <CardContent className="p-4 sm:p-6 space-y-3">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {WEEKDAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-2 bg-muted/40 rounded-lg"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((cell, idx) => {
                if (!cell.date) {
                  return <div key={idx} className="min-h-[120px] bg-muted/20 rounded-xl border border-border/30" />;
                }

                const isToday = isSameDay(cell.date, today);
                const isCurrentMonth = isSameMonth(cell.date, currentDate);
                const dayTasks = cell.tasks;

                return (
                  <div
                    key={cell.date.toISOString()}
                    className={`min-h-[120px] border rounded-xl p-2 transition-all flex flex-col justify-between ${
                      isToday
                        ? "border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/30"
                        : isCurrentMonth
                          ? "border-border/80 bg-card hover:border-border"
                          : "border-border/40 bg-muted/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                          isToday
                            ? "bg-blue-600 text-white"
                            : isCurrentMonth
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>

                      {dayTasks.length > 0 && (
                        <span className="text-[10px] font-bold text-muted-foreground font-mono">
                          {dayTasks.length} {dayTasks.length === 1 ? "item" : "itens"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      {dayTasks.slice(0, 3).map((task) => {
                        const isDone = task.status === "done" || task.progress === 100;
                        const project = projects.find((p) => p.id === task.project_id);
                        return (
                          <div
                            key={task.id}
                            onClick={() => router.push(`/app/projects/${task.project_id}?task=${task.id}`)}
                            className={`text-[10px] p-2 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all space-y-1 ${
                              isDone
                                ? "border-l-emerald-500 bg-emerald-500/10 text-foreground"
                                : (PRIORITY_COLORS[task.priority] ?? "border-l-slate-400 bg-muted/40")
                            }`}
                            title={`${task.title}${project ? ` (${project.name})` : ""}`}
                          >
                            <div className="font-semibold leading-tight line-clamp-1 flex items-center gap-1">
                              {isDone && <CheckCircle2 className="h-3 w-3 text-emerald-500 inline shrink-0" />}
                              <span className={isDone ? "text-foreground font-semibold" : ""}>{task.title}</span>
                            </div>

                            {/* Badge do Responsável + Nome do Projeto */}
                            <div className="flex items-center justify-between gap-1 text-[9px] pt-0.5 border-t border-border/30">
                              {project && (
                                <span className="text-muted-foreground font-mono truncate max-w-[65px]">
                                  {project.name}
                                </span>
                              )}
                              <TaskAssignee
                                assigneeId={task.assignee_id}
                                assigneeName={task.assignee_name}
                                workspaceId={project?.workspace_id}
                                variant="badge"
                              />
                            </div>
                          </div>
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <div className="text-[10px] font-bold text-blue-500 text-center pt-1 hover:underline cursor-pointer">
                          +{dayTasks.length - 3} mais tarefas
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend Footer */}
      <Card className="p-5 border-border/80 bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Legenda de Prioridades & Governança</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
            {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded border-l-4 ${PRIORITY_COLORS[key] ?? ""}`} />
                <span className="font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
