"use client";

import { createPortal } from "react-dom";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import type { Task as GanttTask, ViewMode } from "gantt-task-react";
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
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useGlobalToast } from "@/components/ui/toast-notification";
import Link from "next/link";
import { useData, type Task } from "@/lib/context/DataContext";
import { useGlobal } from "@/lib/context/GlobalContext";
import { DependencyManager } from "@/components/DependencyManager";
import { TaskHierarchy } from "@/components/TaskHierarchy";
import { GanttTooltipPT } from "@/components/GanttTooltipPT";
import { TaskDialog } from "@/components/TaskDialog";
import { ImportDialog } from "@/components/ImportDialog";
import {
  GanttListContext,
  TimelineTaskListHeader,
  TimelineTaskListTable,
  type GanttListState,
} from "@/components/timeline/GanttListSlots";
import {
  buildGanttTasks,
  ganttDateChangeToPatch,
  ganttPalette,
  parseGanttId,
  GANTT_DAY_MS,
  type GanttSortField,
  type GanttSortDirection,
} from "@/lib/gantt-tasks";
import { isTaskDone, isTaskOverdue } from "@/lib/task-status";
import { todayDateOnly } from "@/lib/date-only";
import { PRIORITY_DOT_CLASS, PRIORITY_LABEL, PRIORITY_ORDER } from "@/lib/priority";

// gantt-task-react só no cliente e fora do bundle inicial da página
const Gantt = dynamic(() => import("gantt-task-react").then((m) => m.Gantt), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse bg-muted/30" />,
});

// O preview usa @/lib/gantt-export (xlsx): só carrega quando é aberto
const GanttPrintPreview = dynamic(
  () => import("@/components/GanttPrintPreview").then((m) => m.GanttPrintPreview),
  { ssr: false }
);

// Valores do enum ViewMode da lib (import só de tipo para não trazer a lib junto)
const VIEW_MODES: { value: ViewMode; label: string; columnWidth: number }[] = [
  { value: "Day" as ViewMode, label: "Dia", columnWidth: 55 },
  { value: "Week" as ViewMode, label: "Semana", columnWidth: 130 },
  { value: "Month" as ViewMode, label: "Mês", columnWidth: 210 },
  { value: "Year" as ViewMode, label: "Ano", columnWidth: 320 },
];

// Legenda da baixa para a crítica
const LEGEND_PRIORITIES = [...PRIORITY_ORDER].reverse();

function toggleInSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function TimelineContent() {
  const searchParams = useSearchParams();
  const projectParam = searchParams ? searchParams.get("project") : null;

  const {
    projects,
    tasks,
    getTasksByProject,
    dependencies,
    loading,
    loadProjectDetails,
    loadAllProjectsDetails,
    isProjectLoaded,
    updateTask,
  } = useData();
  const { workspaceRole } = useGlobal();
  const { addToast } = useGlobalToast();
  const readOnly = workspaceRole === "viewer";

  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES[1].value);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectParam || "all");
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (projectParam) {
      setSelectedProjectId(projectParam);
    }
  }, [projectParam]);

  useEffect(() => {
    // Só mostra o loader quando há algo a buscar: trocar o Gantt por um
    // spinner a cada edição fechava o TaskDialog e perdia o scroll
    const needsLoad =
      selectedProjectId === "all"
        ? projects.some((p) => !isProjectLoaded(p.id))
        : !isProjectLoaded(selectedProjectId);
    if (!needsLoad) return;
    let cancelled = false;
    async function fetchDetails() {
      setLoadingDetails(true);
      if (selectedProjectId === "all") {
        await loadAllProjectsDetails();
      } else {
        await loadProjectDetails(selectedProjectId);
      }
      if (!cancelled) setLoadingDetails(false);
    }
    fetchDetails();
    return () => {
      cancelled = true;
      setLoadingDetails(false);
    };
  }, [selectedProjectId, projects, isProjectLoaded, loadProjectDetails, loadAllProjectsDetails]);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printRoot, setPrintRoot] = useState<HTMLElement | null>(null);

  // Preview de impressão: nó próprio no body (o CSS de impressão isola
  // #gantt-print-root via body.gantt-print-mode), removido ao fechar
  useEffect(() => {
    if (!printPreviewOpen) return;
    const root = document.createElement("div");
    root.id = "gantt-print-root";
    document.body.appendChild(root);
    document.body.classList.add("gantt-print-mode");
    setPrintRoot(root);
    return () => {
      document.body.classList.remove("gantt-print-mode");
      root.remove();
      setPrintRoot(null);
    };
  }, [printPreviewOpen]);

  const [sort, setSort] = useState<{ field: GanttSortField | null; direction: GanttSortDirection }>({
    field: null,
    direction: "asc",
  });
  const [nameColumnWidth, setNameColumnWidth] = useState<number>(240);

  // asc → desc → sem ordenação
  const handleSort = useCallback((field: GanttSortField) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return { field: null, direction: "asc" };
    });
  }, []);

  // resolvedTheme cobre o tema "system" (OS escuro); o Gantt só renderiza no cliente
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const palette = useMemo(() => ganttPalette(isDark), [isDark]);

  const ganttTasks: GanttTask[] = useMemo(
    () =>
      buildGanttTasks({
        projects,
        getTasksByProject,
        dependencies,
        selectedProjectId,
        collapsedProjects,
        collapsedTasks,
        isDark,
        sortField: sort.field,
        sortDirection: sort.direction,
        readOnly,
      }),
    [projects, getTasksByProject, dependencies, selectedProjectId, collapsedProjects, collapsedTasks, isDark, sort, readOnly]
  );

  const ganttTaskById = useMemo(() => new Map(ganttTasks.map((t) => [t.id, t])), [ganttTasks]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const parentTaskIds = useMemo(
    () => new Set(tasks.map((t) => t.parent_task_id).filter((id): id is string => !!id)),
    [tasks]
  );

  const toggleRow = useCallback((ganttTask: GanttTask) => {
    const ref = parseGanttId(ganttTask.id);
    if (!ref) return;
    if (ref.kind === "project") setCollapsedProjects((prev) => toggleInSet(prev, ref.id));
    else setCollapsedTasks((prev) => toggleInSet(prev, ref.id));
  }, []);

  const openTask = useCallback(
    (ganttId: string) => {
      const ref = parseGanttId(ganttId);
      if (ref?.kind !== "task") return;
      const found = taskById.get(ref.id);
      if (found) {
        setEditingTask(found);
        setTaskDialogOpen(true);
      }
    },
    [taskById]
  );

  // Projeto e tarefa-pai: expande/recolhe. Tarefa folha: abre a edição
  const openTaskOrToggle = useCallback(
    (ganttId: string) => {
      const ref = parseGanttId(ganttId);
      if (!ref) return;
      if (ref.kind === "project" || parentTaskIds.has(ref.id)) {
        const row = ganttTaskById.get(ganttId);
        if (row) toggleRow(row);
        return;
      }
      openTask(ganttId);
    },
    [parentTaskIds, ganttTaskById, toggleRow, openTask]
  );

  // A lib dispara onClick no mouseup que encerra um drag: esse clique é ignorado
  const suppressBarClickUntil = useRef(0);

  // Drag/resize de barra → grava start_date/due_date. Retornar false faz a lib desfazer o movimento
  const handleDateChange = useCallback(
    async (changed: GanttTask): Promise<boolean> => {
      suppressBarClickUntil.current = Date.now() + 500;
      const ref = parseGanttId(changed.id);
      const original = ganttTaskById.get(changed.id);
      if (readOnly || ref?.kind !== "task" || !original) return false;

      const patch = ganttDateChangeToPatch(original, changed);
      if (!patch) {
        addToast({
          variant: "error",
          title: "Datas inválidas",
          description: "O prazo não pode ficar antes da data de início.",
        });
        return false;
      }
      if (Object.keys(patch).length === 0) return false;

      try {
        await updateTask(ref.id, patch);
        return true;
      } catch {
        // DataContext já exibiu o toast de erro
        return false;
      }
    },
    [ganttTaskById, readOnly, updateTask, addToast]
  );

  const listState = useMemo<GanttListState>(
    () => ({
      nameColumnWidth,
      sortField: sort.field,
      sortDirection: sort.direction,
      onSort: handleSort,
      onResizeNameColumn: setNameColumnWidth,
      onToggleRow: toggleRow,
      onTaskClick: (t) => openTaskOrToggle(t.id),
      onTaskEditClick: (t) => openTask(t.id),
    }),
    [nameColumnWidth, sort, handleSort, toggleRow, openTaskOrToggle, openTask]
  );

  const stats = useMemo(() => {
    const inScopeProjects =
      selectedProjectId === "all"
        ? projects
        : projects.filter((p) => p.id === selectedProjectId);

    const today = todayDateOnly();
    const inScopeTasks = inScopeProjects.flatMap((p) => getTasksByProject(p.id));
    const completed = inScopeTasks.filter((t) => isTaskDone(t)).length;
    const overdue = inScopeTasks.filter((t) => isTaskOverdue(t, today)).length;

    const completionRate = inScopeTasks.length > 0 ? Math.round((completed / inScopeTasks.length) * 100) : 0;

    return {
      totalProjects: inScopeProjects.length,
      totalTasks: inScopeTasks.length,
      completed,
      overdue,
      completionRate,
      isFiltered: selectedProjectId !== "all",
    };
  }, [projects, selectedProjectId, getTasksByProject]);

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

  const handleExportExcel = async () => {
    try {
      // xlsx (~400KB) só é baixado quando o usuário exporta
      const { exportGanttToExcel } = await import("@/lib/gantt-export");
      exportGanttToExcel(
        projects,
        getTasksByProject,
        selectedProjectId,
        `cronograma-${selectedProjectName.replace(/\s+/g, "-").toLowerCase()}`
      );
    } catch (err) {
      console.error("[Timeline] export error:", err);
      addToast({
        variant: "error",
        title: "Não foi possível exportar a planilha",
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const columnWidth = VIEW_MODES.find((m) => m.value === viewMode)?.columnWidth ?? 130;

  return (
    <>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrintPreviewOpen(true)}
              className="h-10 px-4 text-xs font-bold border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 gap-2"
            >
              <Printer className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-10 px-4 text-xs font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </Button>
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {stats.isFiltered ? "Projeto Selecionado" : "Projetos em Escopo"}
              </p>
              <p className="text-3xl font-extrabold mt-1.5">{stats.totalProjects}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 font-bold">
              <FolderKanban className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="truncate">{stats.isFiltered ? selectedProjectName : "Mapeamento Ativo"}</span>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {stats.isFiltered ? "Entregáveis do Projeto" : "Entregáveis Totais"}
              </p>
              <p className="text-3xl font-extrabold mt-1.5">{stats.totalTasks}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 font-bold">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span>Tarefas & Subtarefas</span>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {stats.isFiltered ? "Conclusão do Projeto" : "Conclusão Global"}
              </p>
              <p className="text-3xl font-extrabold text-emerald-500 mt-1.5">{stats.completionRate}%</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={stats.completionRate} className="h-1.5 bg-emerald-500/20" indicatorClassName="bg-emerald-500" />
            <p className="text-[10px] text-muted-foreground text-right">{stats.completed} de {stats.totalTasks} concluídas</p>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-red-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {stats.isFiltered ? "Atrasos no Projeto" : "Atrasos Críticos"}
              </p>
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
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger className="h-10 text-sm font-medium bg-background border-border/80">
                  <SelectValue placeholder="Filtrar por Projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <span>📊</span>
                      <span>Todos os Projetos ({projects.length})</span>
                    </div>
                  </SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-3.5 w-3.5 text-blue-400" />
                        <span className="truncate">{p.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
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

          <span className="hidden sm:inline text-[11px] text-muted-foreground">
            {readOnly ? "Somente leitura" : "Arraste ou redimensione as barras para reagendar"}
          </span>
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
                <GanttListContext.Provider value={listState}>
                  <Gantt
                    tasks={ganttTasks}
                    viewMode={viewMode}
                    locale="pt-BR"
                    columnWidth={columnWidth}
                    listCellWidth={`${nameColumnWidth + 290}px`}
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
                    // Drag em passos de 1 dia: as colunas do banco são DATE
                    timeStep={GANTT_DAY_MS}
                    TaskListHeader={TimelineTaskListHeader}
                    TaskListTable={TimelineTaskListTable}
                    TooltipContent={GanttTooltipPT}
                    // Sem onProgressChange: progresso é editado no TaskDialog (a alça de progresso fica oculta)
                    onDateChange={handleDateChange}
                    onClick={(ganttTask) => {
                      if (Date.now() < suppressBarClickUntil.current) return;
                      openTaskOrToggle(ganttTask.id);
                    }}
                    onDoubleClick={(ganttTask) => openTask(ganttTask.id)}
                  />
                </GanttListContext.Provider>
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
              <div className="w-5 h-2.5 rounded-sm bg-slate-600 dark:bg-slate-400" />
              <span>Projeto (Pai)</span>
            </div>
            {LEGEND_PRIORITIES.map((priority) => (
              <div key={priority} className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full ${PRIORITY_DOT_CLASS[priority]}`} />
                <span>{PRIORITY_LABEL[priority]}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
              <span>Concluída</span>
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

      {/* Portal do Preview de Impressão Gantt — isolado da UI */}
      {printPreviewOpen &&
        printRoot &&
        createPortal(
          <GanttPrintPreview
            projects={projects}
            getTasksByProject={getTasksByProject}
            selectedProjectId={selectedProjectId}
            selectedProjectName={selectedProjectName}
            onClose={() => setPrintPreviewOpen(false)}
          />,
          printRoot
        )}
    </>
  );
}

export default function TimelinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 animate-pulse">
            <Calendar className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            Carregando motor visual de cronograma...
          </p>
        </div>
      }
    >
      <TimelineContent />
    </Suspense>
  );
}
