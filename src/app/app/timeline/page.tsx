"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Gantt, ViewMode, type Task as GanttTask } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Calendar, FolderKanban, Layers, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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

// Paleta adaptativa por tema (claro/escuro) — alinhada com o sistema CSS
// variables definidas em globals.css (--gantt-bar-*). Cores escolhidas
// para harmonizar com o resto do app (laranja queimado como accent).
function paletteFor(isDark: boolean) {
  return isDark
    ? {
        // Barras (task bars) — gradient sutil, contrast forte no dark
        barBackground: "#3b82f6",          // blue-500 (default p/ task sem priority)
        barBackgroundSelected: "#3b82f6",  // blue-400 (laranja-amarelado)
        // Project bars (linha pai) — mais neutra
        projectBackground: "#475569",      // slate-600
        projectBackgroundSelected: "#94a3b8", // slate-400
        // Progresso (parte preenchida da barra)
        projectProgress: "#22c55e",        // green-500
        projectProgressSelected: "#4ade80", // green-400
        // Setas de dependência
        arrowColor: "#94a3b8",              // slate-400 (visível no dark)
        // Milestones (diamantes)
        milestoneBackground: "#f87171",    // red-400
        milestoneSelected: "#ef4444",      // red-500
        // Linha "hoje"
        todayColor: "rgba(251, 146, 60, 0.7)", // blue-400
      }
    : {
        barBackground: "#3b82f6",          // blue-500
        barBackgroundSelected: "#1e40af",  // blue-500 (laranja queimado = accent)
        projectBackground: "#94a3b8",      // slate-400
        projectBackgroundSelected: "#475569", // slate-600
        projectProgress: "#16a34a",        // green-600
        projectProgressSelected: "#22c55e", // green-500
        arrowColor: "#475569",              // slate-600
        milestoneBackground: "#ef4444",     // red-500
        milestoneSelected: "#b91c1c",       // red-700
        todayColor: "rgba(37, 99, 235, 0.6)", // blue-600
      };
}

// Cores por prioridade (usado quando task.priority está setada)
const PRIORITY_PALETTE: Record<string, { light: string; dark: string }> = {
  low:      { light: "#0ea5e9", dark: "#38bdf8" },      // sky
  medium:   { light: "#3b82f6", dark: "#60a5fa" },      // blue
  high:     { light: "#1e40af", dark: "#3b82f6" },      // blue-700/500 (corporativo)
  critical: { light: "#ef4444", dark: "#f87171" },      // red
};

export default function TimelinePage() {
  const { projects, getTasksByProject, dependencies, loading } = useData();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  // Estado: projetos colapsados (sem drill-down)
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(
    new Set()
  );
  // Estado: edicao de task (clique na row ou na bar)
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const isDark = mounted && theme === "dark";
  const palette = paletteFor(isDark);

  // projectTasks: lista plana de tasks dos projetos visíveis
  const projectTasks = useMemo(() => {
    const visibleProjectIds =
      selectedProjectId === "all"
        ? new Set(projects.map((p) => p.id))
        : new Set([selectedProjectId]);
    return projects
      .filter((p) => visibleProjectIds.has(p.id))
      .flatMap((p) => getTasksByProject(p.id));
  }, [projects, selectedProjectId, getTasksByProject]);

  // Mapa de dependências: task_id → [depends_on_task_ids]
  // (gantt-task-react usa dependências POR task)
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

  // Converte dados do DataContext → formato Gantt
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

      // Nível 1: Projeto (parent)
      result.push({
        start: projectStart,
        end: projectEnd,
        name: `${isCollapsed ? "▶" : "▼"} ${project.name}`,
        id: `project-${project.id}`,
        type: "project",
        progress: project.progress,
        styles: {
          backgroundColor: project.color,
          backgroundSelectedColor: project.color,
          progressColor: "#ffffff",
          progressSelectedColor: "#ffffff",
        },
        isDisabled: true,
      });

      // Nível 2: Tarefas (escondidas se projeto colapsado)
      if (!isCollapsed) {
        const tasks = getTasksByProject(project.id);
        // Filtra apenas tasks raiz (sem parent) — sub-tasks são filhas
        const rootTasks = tasks.filter((t) => !t.parent_task_id);
        rootTasks.forEach((task: Task) => {
          const start = task.start_date
            ? new Date(task.start_date)
            : projectStart;
          const end = task.due_date
            ? new Date(task.due_date)
            : new Date(start.getTime() + 7 * 86400000);

          // Cor adaptativa ao tema: usa PRIORITY_PALETTE se tem priority setada,
          // senao cai pro barBackground default da palette
          const priority = task.priority as keyof typeof PRIORITY_PALETTE | undefined;
          const paletteForTask = priority && PRIORITY_PALETTE[priority]
            ? PRIORITY_PALETTE[priority]
            : null;
          const barColor = paletteForTask
            ? (isDark ? paletteForTask.dark : paletteForTask.light)
            : palette.barBackground;

          result.push({
            start,
            end,
            name: task.title,
            id: `task-${task.id}`,
            type: "task",
            progress: task.progress,
            project: `project-${project.id}`,
            dependencies: dependenciesByTask.get(task.id),
            hideChildren: false,
            styles: {
              backgroundColor: barColor,
              backgroundSelectedColor: barColor,
              progressColor: "#ffffff",
              progressSelectedColor: "#ffffff",
            },
          });
        });

        // Nível 3+: Sub-tasks (filhas das root tasks)
        rootTasks.forEach((parent: Task) => {
          const children = tasks.filter((t) => t.parent_task_id === parent.id);
          children.forEach((subtask: Task) => {
            const start = subtask.start_date
              ? new Date(subtask.start_date)
              : projectStart;
            const end = subtask.due_date
              ? new Date(subtask.due_date)
              : new Date(start.getTime() + 7 * 86400000);
            // Mesma lógica de cor adaptativa da root task
            const subPriority = subtask.priority as keyof typeof PRIORITY_PALETTE | undefined;
            const subPalette = subPriority && PRIORITY_PALETTE[subPriority]
              ? PRIORITY_PALETTE[subPriority]
              : null;
            const subBarColor = subPalette
              ? (isDark ? subPalette.dark : subPalette.light)
              : palette.projectBackground;
            result.push({
              start,
              end,
              name: `↳ ${subtask.title}`,
              id: `task-${subtask.id}`,
              type: "task",
              progress: subtask.progress,
              project: `task-${parent.id}`, // <- hierarquia: filho do parent
              dependencies: dependenciesByTask.get(subtask.id),
              hideChildren: false,
              styles: {
                backgroundColor: subBarColor,
                backgroundSelectedColor: subBarColor,
                progressColor: "#ffffff",
                progressSelectedColor: "#ffffff",
              },
            });
          });
        });
      }
    });

    return result;
  }, [projects, selectedProjectId, getTasksByProject, dependenciesByTask, collapsedProjects]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const allTasks = projects.flatMap((p) => getTasksByProject(p.id));
    const completed = allTasks.filter((t) => t.status === "done").length;
    const overdue = allTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done"
    ).length;

    return { totalProjects, totalTasks: allTasks.length, completed, overdue };
  }, [projects, getTasksByProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando timeline...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calendar className="h-6 w-6 sm:h-7 sm:w-7" />
          Timeline
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize seus cronogramas em barras temporais com drag-and-drop
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Projetos</p>
                <p className="text-3xl font-bold mt-1">{stats.totalProjects}</p>
              </div>
              <FolderKanban className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tarefas</p>
                <p className="text-3xl font-bold mt-1">{stats.totalTasks}</p>
              </div>
              <Layers className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Concluídas</p>
                <p className="text-3xl font-bold mt-1 text-emerald-500">
                  {stats.completed}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500">
                ✓
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Atrasadas</p>
                <p className="text-3xl font-bold mt-1 text-destructive">
                  {stats.overdue}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-destructive/15 flex items-center justify-center text-destructive">
                ⚠
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações de Visualização</CardTitle>
          <CardDescription>
            Escolha o projeto e a escala temporal
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Projeto</label>
            <Select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="all">📊 Todos os projetos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Escala</label>
            <div className="flex gap-1">
              {VIEW_MODES.map((mode) => (
                <Button
                  key={mode.value}
                  variant={viewMode === mode.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode(mode.value)}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>
          {selectedProjectId !== "all" && (
            <>
              <TaskHierarchy projectId={selectedProjectId} />
              <DependencyManager projectId={selectedProjectId} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportDialogOpen(true)}
                className="gap-2"
                title="Importar planilha Excel/CSV/ODS"
              >
                <Upload className="h-4 w-4" />
                Importar planilha
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Gantt Chart */}
      <Card>
        <CardContent className="p-0">
          {ganttTasks.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum cronograma ainda
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie projetos com data de início e prazo para visualizar no Gantt
              </p>
              <Button asChild>
                <Link href="/app/projects">Ver projetos</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto gantt-wrapper">
              <div className="min-w-[800px]">
                <Gantt
                  tasks={ganttTasks}
                  viewMode={viewMode}
                  locale="pt-BR"
                  columnWidth={
                    viewMode === ViewMode.Day
                      ? 50
                      : viewMode === ViewMode.Week
                      ? 120
                      : viewMode === ViewMode.Month
                      ? 200
                      : 300
                  }
                  listCellWidth="155px"
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
                  rowHeight={40}
                  headerHeight={50}
                  fontFamily="inherit"
                  fontSize="12px"
                  rtl={false}
                  handleWidth={8}
                  timeStep={300000}
                  TaskListHeader={GanttTaskListHeaderPT}
                  TaskListTable={(props) => (
                    <GanttTaskListTablePT
                      {...props}
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
                    // Drill-down: clicar no projeto expande/colapsa tasks
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
                    // Clique em task/sub-task: abre popup de edicao
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

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 rounded bg-slate-400" />
              <span>Projeto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 rounded bg-slate-500" />
              <span>Prioridade Baixa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 rounded bg-blue-500" />
              <span>Média</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 rounded bg-blue-500" />
              <span>Alta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 rounded bg-red-500" />
              <span>Crítica</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-red-500" />
              <span>Hoje</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task edit dialog (abre ao clicar em row ou em bar de task) */}
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

      {/* Import dialog de planilha */}
      {selectedProjectId !== "all" && (() => {
        const selProject = projects.find((p) => p.id === selectedProjectId);
        return selProject ? (
          <ImportDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
            projectId={selectedProjectId}
            workspaceId={selProject.workspace_id}
            onImported={() => {
              // Forçar reload das tasks via context — DataContext vai refazer fetch
              window.location.reload();
            }}
          />
        ) : null;
      })()}
    </div>
  );
}