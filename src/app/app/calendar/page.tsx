"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertCircle,
  Clock,
  Flag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/context/DataContext";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "border-l-red-500 bg-red-50/50",
  high: "border-l-orange-500 bg-orange-50/50",
  medium: "border-l-blue-500 bg-blue-50/50",
  low: "border-l-slate-500 bg-slate-50/30",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const STATUS_DONE_LABEL = "✓";

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
  const { tasks, projects, loading } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Agrupar tasks por dia (yyyy-mm-dd)
  const tasksByDay = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const task of tasks) {
      if (!task.due_date) continue;
      const day = task.due_date.slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(task);
      map.set(day, list);
    }
    return map;
  }, [tasks]);

  // Stats de resumo do mês
  const stats = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthTasks = tasks.filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      return d >= monthStart && d <= monthEnd;
    });
    const overdue = monthTasks.filter((t) => {
      if (!t.due_date || t.status === "done") return false;
      return new Date(t.due_date).getTime() < Date.now();
    }).length;
    const due = monthTasks.filter((t) => t.status !== "done").length;
    const done = monthTasks.filter((t) => t.status === "done").length;
    return { total: monthTasks.length, overdue, due, done };
  }, [tasks, currentDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Carregando…
      </div>
    );
  }

  // Construir grid do calendário
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startWeekday = monthStart.getDay(); // 0=domingo
  const daysInMonth = monthEnd.getDate();

  const calendarDays: Array<{ date: Date | null; tasks: typeof tasks }> = [];

  // Preencher dias vazios antes do início
  for (let i = 0; i < startWeekday; i++) {
    calendarDays.push({ date: null, tasks: [] });
  }
  // Preencher dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const key = date.toISOString().slice(0, 10);
    calendarDays.push({ date, tasks: tasksByDay.get(key) ?? [] });
  }
  // Completar grid pra ter múltiplos de 7
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push({ date: null, tasks: [] });
  }
  // Completar pra 6 linhas se precisar (visualmente mais consistente)
  while (calendarDays.length < 42) {
    calendarDays.push({ date: null, tasks: [] });
  }

  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>
          <p className="text-muted-foreground">
            Visão mensal das tarefas com prazo definido
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] text-center font-semibold">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Hoje
          </Button>
        </div>
      </div>

      {/* Stats do mês */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">No mês</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <CalendarIcon className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold mt-1">{stats.due}</p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Atrasadas</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{stats.overdue}</p>
              </div>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.done}</p>
              </div>
              <Flag className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {tasks.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-purple-500/10 mb-4">
              <CalendarIcon className="h-10 w-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-semibold">Nenhuma tarefa com prazo</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Crie tarefas com `due_date` definido no detalhe do projeto
              pra elas aparecerem aqui.
            </p>
            <Button asChild className="mt-6">
              <Link href="/app/projects">Ir para projetos</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            {/* Header dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell, idx) => {
                if (!cell.date) {
                  return <div key={idx} className="min-h-[100px] bg-muted/20 rounded-md" />;
                }

                const isToday = isSameDay(cell.date, today);
                const isCurrentMonth = isSameMonth(cell.date, currentDate);
                const dayTasks = cell.tasks;

                return (
                  <div
                    key={cell.date.toISOString()}
                    className={`min-h-[100px] border rounded-md p-1.5 ${
                      isToday
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : isCurrentMonth
                          ? "border-border bg-background"
                          : "border-border/50 bg-muted/30"
                    }`}
                  >
                    <div
                      className={`text-xs font-medium mb-1 ${
                        isToday
                          ? "text-primary"
                          : isCurrentMonth
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {cell.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => {
                        const isDone = task.status === "done";
                        const project = projects.find((p) => p.id === task.project_id);
                        return (
                          <div
                            key={task.id}
                            onClick={() => router.push(`/app/projects/${task.project_id}?task=${task.id}`)}
                            className={`text-[10px] px-1.5 py-1 rounded border-l-2 cursor-pointer hover:shadow-sm transition-all ${
                              PRIORITY_COLORS[task.priority] ?? "border-l-slate-500"
                            } ${isDone ? "opacity-50 line-through" : ""}`}
                            title={`${task.title}${project ? ` (${project.name})` : ""}`}
                          >
                            <div className="font-medium leading-tight line-clamp-1">
                              {isDone && <span className="mr-1">{STATUS_DONE_LABEL}</span>}
                              {task.title}
                            </div>
                            {project && (
                              <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">
                                {project.name}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <div className="text-[10px] text-muted-foreground text-center">
                          +{dayTasks.length - 3} mais
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

      {/* Legenda */}
      <div className="flex items-center gap-4 flex-wrap text-xs">
        <span className="text-muted-foreground">Legenda:</span>
        {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border-l-2 ${PRIORITY_COLORS[key] ?? ""}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}