"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
  Layers,
  Hourglass,
} from "lucide-react";
import { useData, type Task, type Stage, type Project } from "@/lib/context/DataContext";

interface ProjectAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#6366f1",
  medium: "#3b82f6",
  low: "#94a3b8",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export function ProjectAnalyticsDialog({
  open,
  onOpenChange,
  projectId,
}: ProjectAnalyticsDialogProps) {
  const { getProject, getStagesByProject, getTasksByProject } = useData();

  const project = useMemo(() => getProject(projectId), [getProject, projectId]);
  const stages = useMemo(() => getStagesByProject(projectId), [getStagesByProject, projectId]);
  const tasks = useMemo(() => getTasksByProject(projectId), [getTasksByProject, projectId]);

  // ─── CÁLCULOS E MÉTRICAS KPI ───
  const metrics = useMemo<{
    total: number;
    completed: number;
    completionRate: number;
    overdue: number;
    onTime: number;
    totalEstimatedHours: number;
    bottleneckStage: { stage: Stage; count: number; isWipExceeded: boolean } | null;
  }>(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "done" || t.progress === 100).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const now = new Date();
    const overdue = tasks.filter((t) => {
      if (t.status === "done" || t.progress === 100 || !t.due_date) return false;
      return new Date(t.due_date) < now;
    }).length;

    const onTime = total - overdue;

    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);

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
      bottleneckStage,
    };
  }, [tasks, stages]);

  // ─── DADOS DO GRÁFICO 1: BURNDOWN & EVOLUÇÃO TEMPORAL ───
  const burndownData = useMemo(() => {
    if (!project || tasks.length === 0) return [];

    const startDate = project.start_date ? new Date(project.start_date) : new Date();
    const targetDate = project.target_date ? new Date(project.target_date) : new Date(startDate.getTime() + 30 * 86400000);

    const totalDays = Math.max(1, Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
    const totalTasks = tasks.length;

    const stepDays = Math.max(1, Math.floor(totalDays / 6));
    const points = [];

    for (let day = 0; day <= totalDays; day += stepDays) {
      const currentDate = new Date(startDate.getTime() + day * (1000 * 3600 * 24));
      const dateStr = currentDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

      const idealRemaining = Math.max(0, Math.round(totalTasks - (day / totalDays) * totalTasks));

      const tasksDoneByDate = tasks.filter((t) => {
        if (t.status !== "done" && t.progress !== 100) return false;
        const updatedDate = new Date(t.updated_at || t.created_at);
        return updatedDate <= currentDate;
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
  }, [project, tasks]);

  // ─── DADOS DO GRÁFICO 2: CARGA DE TRABALHO POR RESPONSÁVEL ───
  const assigneeData = useMemo(() => {
    const map: Record<
      string,
      { name: string; Concluídas: number; "Em Andamento": number; Pendentes: number; Atrasadas: number }
    > = {};

    tasks.forEach((t) => {
      const name = t.assignee_name || "Não atribuído";
      if (!map[name]) {
        map[name] = { name, Concluídas: 0, "Em Andamento": 0, Pendentes: 0, Atrasadas: 0 };
      }

      const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "done" && t.progress !== 100;

      if (t.status === "done" || t.progress === 100) {
        map[name]["Concluídas"]++;
      } else if (isOverdue) {
        map[name]["Atrasadas"]++;
      } else if (t.status === "in_progress" || t.progress > 0) {
        map[name]["Em Andamento"]++;
      } else {
        map[name]["Pendentes"]++;
      }
    });

    return Object.values(map);
  }, [tasks]);

  // ─── DADOS DO GRÁFICO 3: DISTRIBUIÇÃO POR PRIORIDADE ───
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };

    tasks.forEach((t) => {
      const p = t.priority || "medium";
      counts[p] = (counts[p] || 0) + 1;
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => ({
        name: PRIORITY_LABELS[key] || key,
        val: count,
        color: PRIORITY_COLORS[key] || "#3b82f6",
      }));
  }, [tasks]);

  // ─── DADOS DO GRÁFICO 4: DISTRIBUIÇÃO POR ESTÁGIO ───
  const stageData = useMemo(() => {
    return stages.map((s) => {
      const stageTasks = tasks.filter((t) => t.stage_id === s.id);
      return {
        name: s.name,
        Tarefas: stageTasks.length,
        wipLimit: s.wip_limit || 0,
        color: s.color || "#3b82f6",
      };
    });
  }, [stages, tasks]);

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
                  {metrics.totalEstimatedHours}h
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Carga total alocada no cronograma</p>
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

        {/* ─── TABS DE GRÁFICOS INTERATIVOS ─── */}
        <Tabs defaultValue="burndown" className="space-y-4 pt-2">
          <TabsList className="bg-muted p-1 w-full flex overflow-x-auto justify-start flex-nowrap scrollbar-none">
            <TabsTrigger value="burndown" className="text-xs font-semibold gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Burndown & Evolução</span>
            </TabsTrigger>
            <TabsTrigger value="workload" className="text-xs font-semibold gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>Carga de Trabalho</span>
            </TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs font-semibold gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              <span>Prioridades & Estágios</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: BURNDOWN CHART */}
          <TabsContent value="burndown" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-foreground">
                  <span>Gráfico de Burndown (Tarefas Pendentes x Linha Ideal)</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Meta vs Realizado ao longo do tempo
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {burndownData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                    Sem dados suficientes para gerar o gráfico de Burndown.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={burndownData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorIdeal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--background)",
                            borderColor: "var(--border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                        <Area
                          type="monotone"
                          dataKey="Ideal"
                          stroke="#6366f1"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          fillOpacity={1}
                          fill="url(#colorIdeal)"
                        />
                        <Area
                          type="monotone"
                          dataKey="Real"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorReal)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: CARGA DE TRABALHO POR RESPONSÁVEL */}
          <TabsContent value="workload" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-foreground">
                  <span>Distribuição de Tarefas por Responsável</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Comparativo de Concluídas, Em Andamento, Pendentes e Atrasadas
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {assigneeData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                    Nenhum responsável atribuído às tarefas deste projeto.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={assigneeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--background)",
                            borderColor: "var(--border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                        <Bar dataKey="Concluídas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Em Andamento" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Pendentes" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Atrasadas" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: PRIORIDADES E ESTÁGIOS */}
          <TabsContent value="distribution" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-foreground">
                    Distribuição por Prioridade
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="val"
                        >
                          {priorityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--background)",
                            borderColor: "var(--border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-foreground">
                    Tarefas por Estágio do Kanban
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={stageData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--background)",
                            borderColor: "var(--border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="Tarefas" radius={[0, 4, 4, 0]}>
                          {stageData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
