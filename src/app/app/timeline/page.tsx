"use client";

import { useMemo, useState } from "react";
import { Gantt, ViewMode, type Task as GanttTask } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Calendar, FolderKanban, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import Link from "next/link";
import { useData, type Project, type Task } from "@/lib/context/DataContext";

const VIEW_MODES = [
  { value: ViewMode.Day, label: "Dia" },
  { value: ViewMode.Week, label: "Semana" },
  { value: ViewMode.Month, label: "Mês" },
  { value: ViewMode.Year, label: "Ano" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "#94a3b8",
  medium: "#3b82f6",
  high: "#f59e0b",
  critical: "#ef4444",
};

export default function TimelinePage() {
  const { projects, getTasksByProject, loading } = useData();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

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

      // Nível 1: Projeto (parent)
      result.push({
        start: projectStart,
        end: projectEnd,
        name: project.name,
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

      // Nível 2: Tarefas
      const tasks = getTasksByProject(project.id);
      tasks.forEach((task: Task) => {
        const start = task.start_date
          ? new Date(task.start_date)
          : projectStart;
        const end = task.due_date
          ? new Date(task.due_date)
          : new Date(start.getTime() + 7 * 86400000);

        result.push({
          start,
          end,
          name: task.title,
          id: `task-${task.id}`,
          type: "task",
          progress: task.progress,
          project: `project-${project.id}`,
          styles: {
            backgroundColor: PRIORITY_COLORS[task.priority] || "#64748b",
            backgroundSelectedColor: PRIORITY_COLORS[task.priority] || "#64748b",
            progressColor: "#ffffff",
            progressSelectedColor: "#ffffff",
          },
        });
      });
    });

    return result;
  }, [projects, selectedProjectId, getTasksByProject]);

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
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calendar className="h-7 w-7" />
          Timeline
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize seus cronogramas em barras temporais com drag-and-drop
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Projetos</p>
                <p className="text-3xl font-bold mt-1">{stats.totalProjects}</p>
              </div>
              <FolderKanban className="h-8 w-8 text-orange-500" />
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
            <div className="overflow-x-auto">
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
                  listCellWidth="200px"
                  barBackgroundColor="#64748b"
                  barBackgroundSelectedColor="#fbbf24"
                  todayColor="rgba(239, 68, 68, 0.5)"
                  projectProgressColor="#fbbf24"
                  projectProgressSelectedColor="#fb923c"
                  projectBackgroundColor="#cbd5e1"
                  projectBackgroundSelectedColor="#94a3b8"
                  milestoneBackgroundColor="#ef4444"
                  milestoneBackgroundSelectedColor="#dc2626"
                  arrowColor="#64748b"
                  arrowIndent={20}
                  rowHeight={40}
                  headerHeight={50}
                  fontFamily="inherit"
                  fontSize="12px"
                  rtl={false}
                  handleWidth={8}
                  timeStep={300000}
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
              <div className="w-6 h-2 rounded bg-amber-500" />
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
    </div>
  );
}