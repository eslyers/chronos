"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  Gauge,
  Users,
  AlertTriangle,
  Clock,
  FolderKanban,
  Search,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useData, type Task } from "@/lib/context/DataContext";
import { TaskDialog } from "@/components/TaskDialog";
import {
  calculateWorkload,
  type WorkloadPeriod,
  type MemberWorkload,
  DEFAULT_WEEKLY_CAPACITY_HOURS,
} from "@/lib/workload";

function WorkloadContent() {
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("project") || "all";

  const {
    projects,
    tasks,
    loading,
    loadAllProjectsDetails,
  } = useData();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [period, setPeriod] = useState<WorkloadPeriod>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const weeklyCapacity = DEFAULT_WEEKLY_CAPACITY_HOURS;

  useEffect(() => {
    loadAllProjectsDetails();
  }, [loadAllProjectsDetails]);

  // Sincroniza se o parâmetro na URL mudar
  useEffect(() => {
    const p = searchParams.get("project");
    if (p) setSelectedProjectId(p);
  }, [searchParams]);

  // Filtra tarefas pelo projeto selecionado
  const scopedTasks = useMemo(() => {
    if (selectedProjectId === "all") return tasks;
    return tasks.filter((t) => t.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  // Calcula estatísticas de Workload
  const workload = useMemo(() => {
    return calculateWorkload(scopedTasks, {
      period,
      weeklyCapacityHours: weeklyCapacity,
    });
  }, [scopedTasks, period, weeklyCapacity]);

  // Filtra colaboradores pela barra de busca
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return workload.members;
    const q = searchQuery.toLowerCase();
    return workload.members.filter((m) =>
      m.memberName.toLowerCase().includes(q)
    );
  }, [workload.members, searchQuery]);

  // Dados formatados para o gráfico de barras
  const chartData = useMemo(() => {
    return workload.members.map((m) => ({
      name: m.memberName.length > 14 ? `${m.memberName.slice(0, 12)}...` : m.memberName,
      fullName: m.memberName,
      horas: m.pendingHours,
      capacidade: m.capacityHours,
      utilizacao: m.utilizationPercentage,
      status: m.status,
    }));
  }, [workload.members]);

  const getStatusColor = (status: "overload" | "optimal" | "under") => {
    switch (status) {
      case "overload":
        return "#ef4444"; // red-500
      case "optimal":
        return "#10b981"; // emerald-500
      case "under":
      default:
        return "#3b82f6"; // blue-500
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 animate-pulse">
          <Gauge className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">
          Carregando indicadores de carga de trabalho...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs font-semibold">
                MÓDULO EXECUTIVO DE CAPACIDADE
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
              <Gauge className="h-7 w-7 text-blue-500" />
              Carga de Trabalho & Alocação de Equipe
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Monitore a capacidade da equipe em tempo real, previna gargalos e sobrecarga (*burnout*), e redistribua tarefas com agilidade entre os projetos.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button asChild variant="outline" className="h-11 font-semibold border-border bg-card">
              <Link href="/app/projects">
                <FolderKanban className="h-4 w-4 mr-2 text-blue-500" />
                Ver Projetos
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 border-border/80 bg-card shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Seletor de Projeto e Período */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Projeto */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban className="h-3.5 w-3.5 text-blue-500" />
                Projeto:
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-9 px-3 rounded-xl border border-input bg-background text-foreground text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="all">🌐 Todos os Projetos ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Período */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/80">
              {[
                { id: "all", label: "Todas Tarefas" },
                { id: "this_week", label: "Esta Semana" },
                { id: "next_week", label: "Próx. Semana" },
                { id: "this_month", label: "Este Mês" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as WorkloadPeriod)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    period === p.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Busca por Colaborador */}
          <div className="relative w-full lg:w-72">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-3 w-full rounded-xl border border-input bg-background text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Horas Alocadas */}
        <Card className="p-5 border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Horas Pendentes</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold tracking-tight font-mono text-foreground">
              {workload.totalAllocatedHours}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Capacidade total estimada: <strong>{workload.totalCapacityHours}h</strong>
            </p>
          </div>
        </Card>

        {/* Taxa de Utilização Geral */}
        <Card className="p-5 border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Utilização Geral</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-3xl font-extrabold tracking-tight font-mono ${
              workload.overallUtilization > 100
                ? "text-red-500"
                : workload.overallUtilization >= 70
                ? "text-emerald-500"
                : "text-blue-500"
            }`}>
              {workload.overallUtilization}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {workload.totalMembers} colaboradores no escopo
            </p>
          </div>
        </Card>

        {/* Membros Sobrecarregados */}
        <Card className="p-5 border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Sobrecarregados</span>
            <div className={`p-2 rounded-xl ${
              workload.overloadedMembersCount > 0
                ? "bg-red-500/15 text-red-500 animate-pulse"
                : "bg-muted text-muted-foreground"
            }`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-3xl font-extrabold tracking-tight font-mono ${
              workload.overloadedMembersCount > 0 ? "text-red-500" : "text-foreground"
            }`}>
              {workload.overloadedMembersCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {workload.overloadedMembersCount > 0 ? "Requer redistribuição de tarefas" : "Nenhum membro em sobrecarga"}
            </p>
          </div>
        </Card>

        {/* Disponíveis para Alocação */}
        <Card className="p-5 border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Disponíveis</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold tracking-tight font-mono text-foreground">
              {workload.underallocatedMembersCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {workload.unassignedTasksCount > 0
                ? `${workload.unassignedTasksCount} tarefa(s) sem atribuição`
                : "Capacidade aberta para demandas"}
            </p>
          </div>
        </Card>
      </div>

      {/* Gráfico de Barras: Horas por Colaborador vs Limite */}
      {chartData.length > 0 && (
        <Card className="p-6 border-border/80 bg-card shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="font-bold text-base tracking-tight text-foreground flex items-center gap-2">
                <BarChart className="h-4 w-4 text-blue-500" />
                Comparativo de Carga Horária vs. Capacidade Padrão ({weeklyCapacity}h)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                A linha tracejada indica a meta semanal recomendada para prevenir esgotamento.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-xs bg-red-500" />
                <span>Sobrecarregado (&gt; 100%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-xs bg-emerald-500" />
                <span>Ideal (70-100%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-xs bg-blue-500" />
                <span>Disponível (&lt; 70%)</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  unit="h"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-foreground">{data.fullName}</p>
                          <p className="text-muted-foreground">
                            Horas Pendentes: <strong className="text-foreground">{data.horas}h</strong>
                          </p>
                          <p className="text-muted-foreground">
                            Utilização: <strong style={{ color: getStatusColor(data.status) }}>{data.utilizacao}%</strong>
                          </p>
                          <p className="text-muted-foreground">
                            Capacidade: <strong>{data.capacidade}h</strong>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={weeklyCapacity}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Capacidade (${weeklyCapacity}h)`,
                    position: "top",
                    fill: "#f59e0b",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
                <Bar dataKey="horas" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getStatusColor(entry.status)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Grid de Membros e Suas Tarefas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Detalhamento por Colaborador ({filteredMembers.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Clique em qualquer tarefa para ajustar prazos, horas ou reatribuir
          </span>
        </div>

        {filteredMembers.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="text-base font-bold">Nenhum membro encontrado</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Tente alterar o filtro de projetos ou a busca por colaborador.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member: MemberWorkload) => {
              const isOverload = member.status === "overload";
              const isOptimal = member.status === "optimal";

              return (
                <Card
                  key={member.memberKey}
                  className={`border-border/80 bg-card overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${
                    isOverload ? "border-l-4 border-l-red-500" : isOptimal ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-blue-500"
                  }`}
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Top Row: Avatar & Utilization */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm uppercase shrink-0 shadow-xs ${
                            isOverload
                              ? "bg-red-500/20 text-red-500 border border-red-500/30"
                              : isOptimal
                              ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                              : "bg-blue-500/20 text-blue-500 border border-blue-500/30"
                          }`}
                        >
                          {member.memberName.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-foreground truncate" title={member.memberName}>
                            {member.memberName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isOverload && (
                              <Badge className="bg-red-500/15 text-red-500 border-red-500/30 text-[10px] font-bold">
                                🔴 Sobrecarregado
                              </Badge>
                            )}
                            {isOptimal && (
                              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] font-bold">
                                🟢 Ideal ({member.utilizationPercentage}%)
                              </Badge>
                            )}
                            {!isOverload && !isOptimal && (
                              <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-[10px] font-bold">
                                🔵 Disponível ({member.utilizationPercentage}%)
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xl font-mono font-extrabold ${
                          isOverload ? "text-red-500" : isOptimal ? "text-emerald-500" : "text-foreground"
                        }`}>
                          {member.pendingHours}h
                        </span>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          de {member.capacityHours}h
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <Progress
                        value={Math.min(member.utilizationPercentage, 100)}
                        className="h-2 bg-muted/70"
                        indicatorClassName={
                          isOverload
                            ? "bg-red-500"
                            : isOptimal
                            ? "bg-emerald-500"
                            : "bg-blue-500"
                        }
                      />
                    </div>

                    {/* Metric Badges */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs py-2 bg-muted/20 rounded-xl border border-border/60">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Tarefas Ativas</span>
                        <div className="font-mono font-bold text-foreground text-sm">{member.activeTaskCount}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Concluídas</span>
                        <div className="font-mono font-bold text-emerald-500 text-sm">{member.completedTaskCount}</div>
                      </div>
                    </div>

                    {/* Task List */}
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Atividades Atribuídas ({member.tasks.length})
                      </div>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {member.tasks.map((t) => {
                          const projectOfTask = projects.find((p) => p.id === t.project_id);
                          const isTaskDone = t.status === "done" || t.progress === 100;

                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setEditingTask(t);
                                setTaskDialogOpen(true);
                              }}
                              className="w-full text-left p-2 rounded-lg bg-muted/40 hover:bg-muted border border-border/40 hover:border-blue-500/40 transition-all flex items-center justify-between gap-2 group/task"
                            >
                              <div className="min-w-0 flex-1">
                                <div className={`text-xs font-semibold truncate ${isTaskDone ? "line-through text-muted-foreground" : "text-foreground group-hover/task:text-blue-500"}`}>
                                  {t.title}
                                </div>
                                {projectOfTask && (
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    📁 {projectOfTask.name}
                                  </div>
                                )}
                              </div>

                              <div className="shrink-0 flex items-center gap-1.5 text-right font-mono text-[11px]">
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 font-bold">
                                  {t.estimated_hours || 8}h
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Dialog for editing / reassigning */}
      {editingTask && (
        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={(o) => {
            setTaskDialogOpen(o);
            if (!o) setEditingTask(null);
          }}
          task={editingTask}
          projectId={editingTask.project_id}
        />
      )}
    </div>
  );
}

export default function WorkloadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 animate-pulse">
            <Gauge className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            Carregando painel de carga de trabalho...
          </p>
        </div>
      }
    >
      <WorkloadContent />
    </Suspense>
  );
}
