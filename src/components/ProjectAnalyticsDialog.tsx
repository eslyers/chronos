"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Hourglass,
} from "lucide-react";
import { useData, type Stage } from "@/lib/context/DataContext";
import { formatHoursBadge } from "@/lib/duration";
import { formatDateOnly, parseDateOnly, todayDateOnly, daysBetweenDateOnly } from "@/lib/date-only";
import { isTaskDone, isTaskOverdue } from "@/lib/task-status";
import { PRIORITY_HEX, PRIORITY_LABEL, PRIORITY_ORDER, type Priority } from "@/lib/priority";
import { getTaskAssigneeKey } from "@/lib/workload";
import { useWorkspaceMemberNames } from "@/hooks/useWorkspaceMemberNames";
import type {
  AssigneePoint,
  BurndownPoint,
  PriorityPoint,
  StagePoint,
} from "@/components/dashboard/ProjectAnalyticsCharts";

// recharts só é baixado no cliente quando o diálogo abre (o conteúdo do
// Radix Dialog não é montado enquanto fechado)
const ProjectAnalyticsCharts = dynamic(
  () => import("@/components/dashboard/ProjectAnalyticsCharts"),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 w-full rounded-xl bg-muted/30 motion-safe:animate-pulse" aria-hidden="true" />
    ),
  }
);

interface ProjectAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ProjectAnalyticsDialog({
  open,
  onOpenChange,
  projectId,
}: ProjectAnalyticsDialogProps) {
  const { getProject, getStagesByProject, getTasksByProject } = useData();

  const project = useMemo(() => getProject(projectId), [getProject, projectId]);
  const stages = useMemo(() => getStagesByProject(projectId), [getStagesByProject, projectId]);
  const tasks = useMemo(() => getTasksByProject(projectId), [getTasksByProject, projectId]);
  const memberNames = useWorkspaceMemberNames(open);

  // ─── CÁLCULOS E MÉTRICAS KPI ───
  const metrics = useMemo<{
    total: number;
    completed: number;
    completionRate: number;
    overdue: number;
    onTime: number;
    totalEstimatedHours: number;
    totalActualHours: number;
    bottleneckStage: { stage: Stage; count: number; isWipExceeded: boolean } | null;
  }>(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => isTaskDone(t)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const today = todayDateOnly();
    const overdue = tasks.filter((t) => isTaskOverdue(t, today)).length;

    const onTime = total - overdue;

    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);

    // Gargalo (Estágio com mais tarefas acumuladas ou WIP excedido)
    type BottleneckInfo = { stage: Stage; count: number; isWipExceeded: boolean };
    let bottleneckStage: BottleneckInfo | null = null;
    let maxTasks = -1;

    stages.forEach((stage) => {
      const stageTasks = tasks.filter((t) => t.stage_id === stage.id);
      const count = stageTasks.length;
      const isWipExceeded = stage.wip_limit ? count > stage.wip_limit : false;

      if (count > maxTasks || isWipExceeded) {
        maxTasks = count;
        if (!bottleneckStage || isWipExceeded || count > bottleneckStage.count) {
          bottleneckStage = { stage, count, isWipExceeded };
        }
      }
    });

    return {
      total,
      completed,
      completionRate,
      overdue,
      onTime,
      totalEstimatedHours,
      totalActualHours,
      bottleneckStage,
    };
  }, [tasks, stages]);

  // ─── DADOS DO GRÁFICO 1: BURNDOWN & EVOLUÇÃO TEMPORAL ───
  const burndownData = useMemo<BurndownPoint[]>(() => {
    if (!open || !project || tasks.length === 0) return [];

    // start/target são DATE: meia-noite local, nunca new Date("YYYY-MM-DD") (UTC)
    const startDate = parseDateOnly(project.start_date) ?? parseDateOnly(todayDateOnly())!;
    const startStr = formatDateOnly(startDate);
    const targetStr = project.target_date
      ? formatDateOnly(parseDateOnly(project.target_date) ?? startDate)
      : formatDateOnly(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 30));

    const totalDays = Math.max(1, daysBetweenDateOnly(startStr, targetStr));
    const totalTasks = tasks.length;

    const stepDays = Math.max(1, Math.floor(totalDays / 6));
    const points: BurndownPoint[] = [];

    for (let day = 0; day <= totalDays; day += stepDays) {
      const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + day);
      const currentStr = formatDateOnly(currentDate);
      const dateStr = currentDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

      const idealRemaining = Math.max(0, Math.round(totalTasks - (day / totalDays) * totalTasks));

      // Concluída até o fim do dia (local) em que foi atualizada
      const tasksDoneByDate = tasks.filter((t) => {
        if (!isTaskDone(t)) return false;
        const updated = new Date(t.updated_at || t.created_at);
        if (Number.isNaN(updated.getTime())) return false;
        return formatDateOnly(updated) <= currentStr;
      }).length;

      const actualRemaining = Math.max(0, totalTasks - tasksDoneByDate);

      points.push({
        date: dateStr,
        Ideal: idealRemaining,
        Real: actualRemaining,
        Concluídas: tasksDoneByDate,
      });
    }

    return points;
  }, [open, project, tasks]);

  // ─── DADOS DO GRÁFICO 2: CARGA DE TRABALHO POR RESPONSÁVEL ───
  // Agrupa por assignee_id (membros têm assignee_name NULL) com nomes dos perfis
  const assigneeData = useMemo<AssigneePoint[]>(() => {
    if (!open) return [];
    const map: Record<string, AssigneePoint> = {};
    const today = todayDateOnly();

    tasks.forEach((t) => {
      const { key, name } = getTaskAssigneeKey(t, memberNames);
      if (!map[key]) {
        map[key] = { name, Concluídas: 0, "Em Andamento": 0, Pendentes: 0, Atrasadas: 0 };
      }

      if (isTaskDone(t)) {
        map[key]["Concluídas"]++;
      } else if (isTaskOverdue(t, today)) {
        map[key]["Atrasadas"]++;
      } else if (t.status === "in_progress" || t.progress > 0) {
        map[key]["Em Andamento"]++;
      } else {
        map[key]["Pendentes"]++;
      }
    });

    return Object.values(map);
  }, [open, tasks, memberNames]);

  // ─── DADOS DO GRÁFICO 3: DISTRIBUIÇÃO POR PRIORIDADE ───
  const priorityData = useMemo<PriorityPoint[]>(() => {
    if (!open) return [];
    const counts: Record<Priority, number> = { critical: 0, high: 0, medium: 0, low: 0 };

    tasks.forEach((t) => {
      const p = (t.priority in counts ? t.priority : "medium") as Priority;
      counts[p]++;
    });

    return PRIORITY_ORDER.filter((key) => counts[key] > 0).map((key) => ({
      name: PRIORITY_LABEL[key],
      val: counts[key],
      color: PRIORITY_HEX[key],
    }));
  }, [open, tasks]);

  // ─── DADOS DO GRÁFICO 4: DISTRIBUIÇÃO POR ESTÁGIO ───
  const stageData = useMemo<StagePoint[]>(() => {
    if (!open) return [];
    return stages.map((s) => {
      const stageTasks = tasks.filter((t) => t.stage_id === s.id);
      return {
        name: s.name,
        Tarefas: stageTasks.length,
        wipLimit: s.wip_limit || 0,
        color: s.color || "#3b82f6",
      };
    });
  }, [open, stages, tasks]);

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-5xl h-[92vh] sm:h-auto max-h-[92vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-background border-border rounded-t-2xl sm:rounded-2xl">
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <span>Analytics de Desempenho — {project.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Relatórios gráficos, velocidade de entregas (Burndown), distribuição de carga e limites WIP.
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className="text-xs font-mono font-semibold px-3 py-1 bg-muted/50"
              style={{ borderLeftColor: project.color, borderLeftWidth: 4 }}
            >
              {metrics.total} {metrics.total === 1 ? "tarefa" : "tarefas"} no total
            </Badge>
          </div>
        </DialogHeader>

        {/* ─── KPI CARDS ROW ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-4">
          <Card className="bg-card border-border/70 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Taxa de Conclusão</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {metrics.completionRate}%
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {metrics.completed}/{metrics.total}
                </span>
              </div>
              <Progress value={metrics.completionRate} className="h-1.5 bg-muted" />
            </CardContent>
          </Card>

          <Card className="bg-card border-border/70 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Cumprimento de Prazos</span>
                <Clock className={`h-4 w-4 ${metrics.overdue > 0 ? "text-red-500" : "text-emerald-500"}`} />
              </div>
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-2xl font-bold font-mono ${
                    metrics.overdue > 0 ? "text-red-500" : "text-emerald-500"
                  }`}
                >
                  {metrics.overdue > 0 ? `${metrics.overdue} Atrasadas` : "100% No Prazo"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {metrics.overdue > 0
                  ? "Exige atenção nos prazos vencidos"
                  : "Nenhuma tarefa em atraso no momento"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/70 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Horas Estimadas</span>
                <Hourglass className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {formatHoursBadge(metrics.totalEstimatedHours) || "0h"}
                </span>
                {metrics.totalActualHours > 0 && (
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatHoursBadge(metrics.totalActualHours)} real
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {metrics.totalActualHours > 0
                  ? `Previsto: ${formatHoursBadge(metrics.totalEstimatedHours)} • Real: ${formatHoursBadge(metrics.totalActualHours)}`
                  : "Carga total alocada no cronograma"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/70 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Estágio Gargalo</span>
                <AlertTriangle
                  className={`h-4 w-4 ${
                    metrics.bottleneckStage?.isWipExceeded ? "text-red-500" : "text-amber-500"
                  }`}
                />
              </div>
              <div className="truncate">
                <span className="text-base font-bold text-foreground block truncate">
                  {metrics.bottleneckStage ? metrics.bottleneckStage.stage.name : "Nenhum"}
                </span>
              </div>
              {metrics.bottleneckStage ? (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono font-bold ${
                    metrics.bottleneckStage.isWipExceeded
                      ? "bg-red-500/10 text-red-500 border-red-500/30"
                      : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                  }`}
                >
                  {metrics.bottleneckStage.isWipExceeded ? "🚨 WIP Excedido" : `${metrics.bottleneckStage.count} tarefas`}
                </Badge>
              ) : (
                <p className="text-[11px] text-muted-foreground">Fluxo equilibrado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── TABS DE GRÁFICOS INTERATIVOS (carregadas sob demanda) ─── */}
        <ProjectAnalyticsCharts
          burndownData={burndownData}
          assigneeData={assigneeData}
          priorityData={priorityData}
          stageData={stageData}
        />
      </DialogContent>
    </Dialog>
  );
}
