"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Gantt, ViewMode, type Task as GanttTask } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import {
  Calendar,
  FolderKanban,
  Layers,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Sparkles,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { useData, type Project, type Task } from "@/lib/context/DataContext";
import { DependencyManager } from "@/components/DependencyManager";
import { TaskHierarchy } from "@/components/TaskHierarchy";
import { GanttTaskListHeaderPT } from "@/components/GanttTaskListHeader";
import { GanttTaskListTablePT } from "@/components/GanttTaskListTablePT";
import { GanttTooltipPT } from "@/components/GanttTooltipPT";
import { TaskDialog } from "@/components/TaskDialog";
import { ImportDialog } from "@/components/ImportDialog";

const VIEW_MODES = [
  { value: ViewMode.Day, label: "Dia" },
  { value: ViewMode.Week, label: "Semana" },
  { value: ViewMode.Month, label: "Mês" },
  { value: ViewMode.Year, label: "Ano" },
];

function paletteFor(isDark: boolean) {
  return isDark
    ? {
        barBackground: "#3b82f6",
        barBackgroundSelected: "#2563eb",
        projectBackground: "#475569",
        projectBackgroundSelected: "#64748b",
        projectProgress: "#22c55e",
        projectProgressSelected: "#4ade80",
        arrowColor: "#94a3b8",
        milestoneBackground: "#f87171",
        milestoneSelected: "#ef4444",
        todayColor: "rgba(59, 130, 246, 0.4)",
      }
    : {
        barBackground: "#3b82f6",
        barBackgroundSelected: "#1d4ed8",
        projectBackground: "#64748b",
        projectBackgroundSelected: "#334155",
        projectProgress: "#16a34a",
        projectProgressSelected: "#22c55e",
        arrowColor: "#475569",
        milestoneBackground: "#ef4444",
        milestoneSelected: "#b91c1c",
        todayColor: "rgba(37, 99, 235, 0.4)",
      };
}

const PRIORITY_PALETTE: Record<string, { light: string; dark: string }> = {
  low: { light: "#0ea5e9", dark: "#38bdf8" },
  medium: { light: "#3b82f6", dark: "#60a5fa" },
  high: { light: "#6366f1", dark: "#818cf8" },
  critical: { light: "#ef4444", dark: "#f87171" },
};

export default function TimelinePage() {
  const {
    projects,
    getTasksByProject,
    dependencies,
    loading,
    loadProjectDetails,
    loadAllProjectsDetails,
  } = useData();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    async function fetchDetails() {
      setLoadingDetails(true);
      if (selectedProjectId === "all") {
        await loadAllProjectsDetails();
      } else {
        await loadProjectDetails(selectedProjectId);
      }
      setLoadingDetails(false);
    }
    fetchDetails();
  }, [selectedProjectId, loadProjectDetails, loadAllProjectsDetails]);

  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const isDark = mounted && theme === "dark";

  const palette = useMemo(() => paletteFor(isDark), [isDark]);

  const projectTasks = useMemo(() => {
    const visibleProjectIds =
      selectedProjectId === "all"
        ? new Set(projects.map((p) => p.id))
        : new Set([selectedProjectId]);
    return projects
      .filter((p) => visibleProjectIds.has(p.id))
      .flatMap((p) => getTasksByProject(p.id));
  }, [projects, selectedProjectId, getTasksByProject]);

  const dependenciesByTask = useMemo(() => {
    const visibleProjectIds =
      selectedProjectId === "all"
        ? new Set(projects.map((p) => p.id))
        : new Set([selectedProjectId]);
    const projectIdByTaskId = new Map<string, string>();
    for (const t of projectTasks) projectIdByTaskId.set(t.id, t.project_id);

    const map = new Map<string, string[]>();
    for (const d of dependencies) {
      const targetProjectId = projectIdByTaskId.get(d.task_id);
      if (!targetProjectId || !visibleProjectIds.has(targetProjectId)) continue;
      if (!map.has(d.task_id)) map.set(d.task_id, []);
      map.get(d.task_id)!.push(d.depends_on_task_id);
    }
    return map;
  }, [dependencies, projectTasks, projects, selectedProjectId]);

  const ganttTasks: GanttTask[] = useMemo(() => {
    const filteredProjects =
      selectedProjectId === "all"
        ? projects
        : projects.filter((p) => p.id === selectedProjectId);

    const result: GanttTask[] = [];

    filteredProjects.forEach((project: Project) => {
      const projectStart = project.start_date
        ? new Date(project.start_date)
        : new Date();
      const projectEnd = project.target_date
        ? new Date(project.target_date)
        : new Date(Date.now() + 30 * 86400000);

      const isCollapsed = collapsedProjects.has(project.id);

      result.push({
        start: projectStart,
        end: projectEnd,
        name: `${isCollapsed ? "▶" : "▼"} ${project.name}`,
        id: `project-${project.id}`,
        type: "project",
        progress: project.progress,
        styles: {
          backgroundColor: project.color || "#475569",
          backgroundSelectedColor: project.color || "#334155",
          progressColor: "#ffffff",
          progressSelectedColor: "#ffffff",
        },
        isDisabled: true,
      });

      if (!isCollapsed) {
        const tasks = getTasksByProject(project.id);
        // Renderiza hierarquia N-níveis de forma recursiva (preserva níveis 1, 2, 3, 4+)
        const addTasksRecursively = (
          parentList: Task[],
          depth: number,
          pId: string,
          pStart: Date
        ) => {
          const sorted = [...parentList].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          sorted.forEach((task: Task) => {
            const start = task.start_date
              ? new Date(task.start_date)
              : pStart;
            const end = task.due_date
              ? new Date(task.due_date)
              : new Date(start.getTime() + 7 * 86400000);

            const priority = task.priority as keyof typeof PRIORITY_PALETTE | undefined;
            const paletteForTask = priority && PRIORITY_PALETTE[priority]
              ? PRIORITY_PALETTE[priority]
              : null;
            const barColor = paletteForTask
              ? (isDark ? paletteForTask.dark : paletteForTask.light)
              : (depth > 0 ? palette.projectBackground : palette.barBackground);

            // Indentação visual proporcional ao nível (Nível 1: Nome, Nível 2: ↳ Nome, Nível 3:   ↳ Nome)
            const indent = depth > 1 ? "  ".repeat(depth - 1) : "";
            const prefix = depth === 0 ? "" : `${indent}↳ `;

            result.push({
              start,
              end,
              name: `${prefix}${task.title}`,
              id: `task-${task.id}`,
              type: "task",
              progress: task.progress,
              project: task.parent_task_id ? `task-${task.parent_task_id}` : `project-${pId}`,
              dependencies: dependenciesByTask.get(task.id),
              hideChildren: false,
              styles: {
                backgroundColor: barColor,
                backgroundSelectedColor: barColor,
                progressColor: "#ffffff",
                progressSelectedColor: "#ffffff",
              },
            });

            // Processa filhas de nível N+1
            const children = tasks.filter((t) => t.parent_task_id === task.id);
            if (children.length > 0) {
              addTasksRecursively(children, depth + 1, pId, pStart);
            }
          });
        };

        const rootTasks = tasks.filter((t) => !t.parent_task_id);
        addTasksRecursively(rootTasks, 0, project.id, projectStart);
      }
    });

    return result;
  }, [projects, selectedProjectId, getTasksByProject, dependenciesByTask, collapsedProjects, isDark, palette]);

  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const allTasks = projects.flatMap((p) => getTasksByProject(p.id));
    const completed = allTasks.filter((t) => t.status === "done").length;
    const overdue = allTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done"
    ).length;

    const completionRate = allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0;

    return { totalProjects, totalTasks: allTasks.length, completed, overdue, completionRate };
  }, [projects, getTasksByProject]);

  if (loading || loadingDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 animate-pulse">
          <Calendar className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">
          Carregando motor visual de cronograma...
        </p>
      </div>
    );
  }

  const selectedProjectName =
    selectedProjectId === "all"
      ? "Todos os Projetos"
      : projects.find((p) => p.id === selectedProjectId)?.name || "Projeto Selecionado";

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs font-semibold">
                CRONOGRAMA & TIMELINE
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
              <Calendar className="h-7 w-7 text-blue-500" />
              Cronograma & Timeline Visual
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Acompanhe a dependência temporal de cada entregável, interaja via drag-and-drop e garanta previsibilidade operacional.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {selectedProjectId !== "all" && (
              <>
                <TaskHierarchy projectId={selectedProjectId} />
                <DependencyManager projectId={selectedProjectId} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportDialogOpen(true)}
                  className="h-10 px-4 text-xs font-semibold border-border hover:bg-muted gap-2"
                >
                  <Upload className="h-4 w-4 text-blue-500" />
                  Importar Planilha
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projetos em Escopo</p>
              <p className="text-3xl font-extrabold mt-1.5">{stats.totalProjects}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 font-bold">
              <FolderKanban className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            <span>Mapeamento Ativo</span>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entregáveis Totais</p>
              <p className="text-3xl font-extrabold mt-1.5">{stats.totalTasks}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 font-bold">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
            <span>Tarefas & Subtarefas</span>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conclusão Global</p>
              <p className="text-3xl font-extrabold text-emerald-500 mt-1.5">{stats.completionRate}%</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={stats.completionRate} className="h-1.5 bg-emerald-500/20" />
            <p className="text-[10px] text-muted-foreground text-right">{stats.completed} de {stats.totalTasks} concluídas</p>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-red-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atrasos Críticos</p>
              <p className={`text-3xl font-extrabold mt-1.5 ${stats.overdue > 0 ? "text-destructive" : "text-emerald-500"}`}>
                {stats.overdue}
              </p>
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold ${
              stats.overdue > 0 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {stats.overdue > 0 ? (
              <span className="text-destructive font-semibold">Atenção requerida nos prazos</span>
            ) : (
              <span className="text-emerald-500 font-semibold">100% de prazos em dia</span>
            )}
          </div>
        </Card>
      </div>

      {/* Control Bar & Scale Filter */}
      <Card className="p-4 sm:p-5 border-border/80 bg-card shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Project Selector */}
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Filter className="h-4 w-4" />
            </div>
            <div className="w-full max-w-xs">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Filtrar por Projeto
              </label>
              <Select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-10 text-sm font-medium bg-background border-border/80"
              >
                <option value="all">📊 Todos os Projetos ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Center/Right: View Scale Toggle Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2 hidden sm:inline">
              Escala Temporal:
            </span>
            <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border/60">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setViewMode(mode.value)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === mode.value
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Gantt Canvas Card */}
      <Card className="border-border/80 bg-card shadow-xl overflow-hidden">
        {/* Card Header Bar */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-xs font-bold text-foreground font-mono">
              Chronos Workspace / {selectedProjectName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs">
              ● Live Sync Active
            </Badge>
          </div>
        </div>

        {/* Gantt Viewport */}
        <CardContent className="p-0">
          {ganttTasks.length === 0 ? (
            <div className="text-center py-20 px-4 space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 mx-auto">
                <Calendar className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Nenhum cronograma nesta visualização</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Cadastre tarefas com data de início e prazo ou importe uma planilha para visualizar o mapa temporal no Gantt.
              </p>
              <div className="pt-2">
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  <Link href="/app/projects">Gerenciar Projetos</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto gantt-wrapper border-t border-border/40">
              <div className="min-w-[800px]">
                <Gantt
                  tasks={ganttTasks}
                  viewMode={viewMode}
                  locale="pt-BR"
                  columnWidth={
                    viewMode === ViewMode.Day
                      ? 55
                      : viewMode === ViewMode.Week
                      ? 130
                      : viewMode === ViewMode.Month
                      ? 210
                      : 320
                  }
                  listCellWidth="165px"
                  barBackgroundColor={palette.barBackground}
                  barBackgroundSelectedColor={palette.barBackgroundSelected}
                  todayColor={palette.todayColor}
                  projectProgressColor={palette.projectProgress}
                  projectProgressSelectedColor={palette.projectProgressSelected}
                  projectBackgroundColor={palette.projectBackground}
                  projectBackgroundSelectedColor={palette.projectBackgroundSelected}
                  milestoneBackgroundColor={palette.milestoneBackground}
                  milestoneBackgroundSelectedColor={palette.milestoneSelected}
                  arrowColor={palette.arrowColor}
                  arrowIndent={20}
                  rowHeight={44}
                  headerHeight={54}
                  fontFamily="inherit"
                  fontSize="12px"
                  rtl={false}
                  handleWidth={8}
                  timeStep={300000}
                  TaskListHeader={GanttTaskListHeaderPT}
                  TaskListTable={(props) => (
                    <GanttTaskListTablePT
                      {...props}
                      onExpanderClick={(ganttTask) => {
                        if (ganttTask.type === "project") {
                          const projectId = String(ganttTask.id).replace(/^project-/, "");
                          setCollapsedProjects((prev) => {
                            const next = new Set(prev);
                            if (next.has(projectId)) next.delete(projectId);
                            else next.add(projectId);
                            return next;
                          });
                        } else {
                          props.onExpanderClick(ganttTask);
                        }
                      }}
                      onTaskClick={(ganttTask) => {
                        if (ganttTask.type === "task") {
                          const realId = String(ganttTask.id).replace(/^task-/, "");
                          const found = projectTasks.find((t) => t.id === realId);
                          if (found) {
                            setEditingTask(found);
                            setTaskDialogOpen(true);
                          }
                        }
                      }}
                    />
                  )}
                  TooltipContent={GanttTooltipPT}
                  onClick={(task) => {
                    if (task.type === "project") {
                      const projectId = String(task.id).replace(/^project-/, "");
                      setCollapsedProjects((prev) => {
                        const next = new Set(prev);
                        if (next.has(projectId)) next.delete(projectId);
                        else next.add(projectId);
                        return next;
                      });
                      return;
                    }
                    if (task.type === "task") {
                      const realId = String(task.id).replace(/^task-/, "");
                      const found = projectTasks.find((t) => t.id === realId);
                      if (found) {
                        setEditingTask(found);
                        setTaskDialogOpen(true);
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend Footer */}
      <Card className="p-5 border-border/80 bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Legenda de Prioridades & Governança</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-500" />
              <span>Projeto (Pai)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-sky-500" />
              <span>Prioridade Baixa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />
              <span>Média</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-indigo-500" />
              <span>Alta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-red-500" />
              <span>Crítica</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500 font-bold" />
              <span>Linha do Dia Atual</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Task Edit Dialog */}
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

      {/* Import Dialog */}
      {selectedProjectId !== "all" && (() => {
        const selProject = projects.find((p) => p.id === selectedProjectId);
        return selProject ? (
          <ImportDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
            projectId={selectedProjectId}
            workspaceId={selProject.workspace_id}
            onImported={() => {
              window.location.reload();
            }}
          />
        ) : null;
      })()}
    </div>
  );
}