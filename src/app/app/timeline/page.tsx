"use client";

import { createPortal } from "react-dom";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import type { Task as GanttTask, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Card, CardContent } from "@/components/ui/card";
import { useGlobalToast } from "@/components/ui/toast-notification";
import { useData, type Task } from "@/lib/context/DataContext";
import { useGlobal } from "@/lib/context/GlobalContext";
import { GanttTooltipPT } from "@/components/GanttTooltipPT";
import { TaskDialog } from "@/components/TaskDialog";
import { ImportDialog } from "@/components/ImportDialog";
import {
  GanttListContext,
  TimelineTaskListHeader,
  TimelineTaskListTable,
  type GanttListState,
} from "@/components/timeline/GanttListSlots";
import { TimelineHeader, TimelineLoading } from "@/components/timeline/TimelineHeader";
import { TimelineKpis } from "@/components/timeline/TimelineKpis";
import { TimelineToolbar, VIEW_MODES } from "@/components/timeline/TimelineToolbar";
import { GanttLegend } from "@/components/timeline/GanttLegend";
import { GanttEmptyState } from "@/components/timeline/GanttEmptyState";
import { usePrintRoot } from "@/components/timeline/usePrintRoot";
import { useGanttInteractions } from "@/components/timeline/useGanttInteractions";
import { computeTimelineStats } from "@/components/timeline/timeline-stats";
import {
  buildGanttTasks,
  ganttPalette,
  GANTT_DAY_MS,
  type GanttSortField,
  type GanttSortDirection,
} from "@/lib/gantt-tasks";

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
  const printRoot = usePrintRoot(printPreviewOpen);

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

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  }, []);

  const { toggleRow, openTask, openTaskOrToggle, handleDateChange, handleBarClick } = useGanttInteractions({
    ganttTasks,
    tasks,
    readOnly,
    updateTask,
    addToast,
    setCollapsedProjects,
    setCollapsedTasks,
    onEditTask: handleEditTask,
  });

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

  const stats = useMemo(
    () => computeTimelineStats(projects, getTasksByProject, selectedProjectId),
    [projects, selectedProjectId, getTasksByProject]
  );

  if (loading || loadingDetails) {
    return <TimelineLoading />;
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
      <TimelineHeader
        selectedProjectId={selectedProjectId}
        onPrint={() => setPrintPreviewOpen(true)}
        onExportExcel={handleExportExcel}
        onImport={() => setImportDialogOpen(true)}
      />

      {/* KPI Cards Grid */}
      <TimelineKpis stats={stats} selectedProjectName={selectedProjectName} />

      {/* Control Bar & Scale Filter */}
      <TimelineToolbar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

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
            <GanttEmptyState />
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
                    onClick={handleBarClick}
                    onDoubleClick={(ganttTask) => openTask(ganttTask.id)}
                  />
                </GanttListContext.Provider>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend Footer */}
      <GanttLegend />

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
    <Suspense fallback={<TimelineLoading />}>
      <TimelineContent />
    </Suspense>
  );
}
