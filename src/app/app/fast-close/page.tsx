"use client";

import React, { useState, useMemo, useEffect } from "react";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useData, type Task } from "@/lib/context/DataContext";
import { TaskDialog } from "@/components/TaskDialog";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import { CopyClosingDialog } from "@/components/CopyClosingDialog";
import { ImportClosingSpreadsheetDialog } from "@/components/ImportClosingSpreadsheetDialog";
import { WorkdayConfigDialog } from "@/components/WorkdayConfigDialog";
import { FastCloseSkeleton } from "@/components/skeletons/FastCloseSkeleton";
import { FastCloseListView } from "@/components/FastCloseListView";
import { FastCloseBoard } from "@/components/fast-close/FastCloseBoard";
import { FastCloseToolbar, type FastCloseViewMode } from "@/components/fast-close/FastCloseToolbar";
import { FastCloseSummaryCards } from "@/components/fast-close/FastCloseSummaryCards";
import { useFastCloseConfig } from "@/components/fast-close/use-fast-close-config";
import { useTasksByOffset } from "@/components/fast-close/use-tasks-by-offset";
import { useFastCloseBulkActions } from "@/components/fast-close/use-fast-close-bulk-actions";
import { getClosingD0Date, getCalculatedWorkdayDate, getWorkdayOffsets } from "@/lib/business-days";
import { formatDateOnly } from "@/lib/date-only";
import { isTaskDone } from "@/lib/task-status";
import { MONTH_NAMES, isClosingProject } from "@/lib/fast-close";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function FastCloseCockpitPage() {
  const {
    tasks,
    projects,
    loading,
    createTask,
    updateTask,
    deleteTask,
    createProject,
    loadProjectDetails,
    loadAllProjectsDetails,
    isProjectLoaded,
  } = useData();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const { useD0, customOffsets, offsetRange, changeOffsetRange, applyRulerConfig } =
    useFastCloseConfig(selectedProjectId);
  const [viewMode, setViewMode] = useState<FastCloseViewMode>("kanban");

  const [selectedEditTask, setSelectedEditTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [defaultTaskDueDate, setDefaultTaskDueDate] = useState<string | undefined>(undefined);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false);

  // Carregar detalhes das tarefas sob demanda com suporte a cache
  useEffect(() => {
    async function ensureProjectData() {
      if (selectedProjectId === "all") {
        await loadAllProjectsDetails();
      } else if (!isProjectLoaded(selectedProjectId)) {
        await loadProjectDetails(selectedProjectId);
      }
    }
    ensureProjectData();
  }, [selectedProjectId, isProjectLoaded, loadProjectDetails, loadAllProjectsDetails]);

  // Filtrar apenas projetos do escopo de Fechamento / Controladoria
  const closingProjects = useMemo(() => {
    return projects.filter(isClosingProject);
  }, [projects]);

  // Tarefas filtradas pelo projeto selecionado; "Todos" = só projetos de fechamento
  const scopedTasks = useMemo(() => {
    if (selectedProjectId === "all") {
      const closingIds = new Set(closingProjects.map((p) => p.id));
      return tasks.filter((t) => closingIds.has(t.project_id));
    }
    return tasks.filter((t) => t.project_id === selectedProjectId);
  }, [tasks, selectedProjectId, closingProjects]);

  const selectedProjectObj = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const getWorkspaceId = (projectId: string) => projects.find((p) => p.id === projectId)?.workspace_id;

  // Criar Projeto de Fechamento rápido
  const handleCreateFastCloseProject = async () => {
    const projName = `Fechamento Contábil ${selectedMonth}/${selectedYear}`;
    try {
      const newProj = await createProject({
        name: projName,
        description: "Projeto de Fechamento Contábil (Fast Close / Controladoria)",
        color: "#3b82f6",
      });
      if (newProj && newProj.id) {
        setSelectedProjectId(newProj.id);
      }
    } catch {
      // Toast já exibido pelo DataContext
    }
  };

  // Data do último dia útil do mês selecionado
  const lastDayOfMonth = useMemo(() => {
    return getClosingD0Date(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Lista de offsets visíveis (respeitando useD0!)
  const workdayOffsets = useMemo(() => {
    return getWorkdayOffsets(offsetRange, customOffsets, useD0);
  }, [offsetRange, customOffsets, useD0]);

  // Mapeia cada offset para sua data real de calendário (respeitando useD0!)
  const offsetDatesMap = useMemo(() => {
    const map = new Map<number, Date>();
    workdayOffsets.forEach((offset) => {
      map.set(offset, getCalculatedWorkdayDate(selectedYear, selectedMonth, offset, useD0));
    });
    return map;
  }, [selectedYear, selectedMonth, workdayOffsets, useD0]);

  // Agrupa tarefas por offset de dia útil
  const tasksByOffset = useTasksByOffset(scopedTasks, workdayOffsets, selectedYear, selectedMonth, useD0);

  // Rotinas padrão, cópia mês a mês e importação de planilha
  const {
    defaultRoutines,
    generating,
    handleGenerateDefaultClosingTasks,
    handleCopyTasksFromMonth,
    handleImportSpreadsheetSuccess,
  } = useFastCloseBulkActions({
    createTask,
    selectedProjectId,
    selectedYear,
    selectedMonth,
    useD0,
    scopedTasks,
    lastDayOfMonth,
  });

  // Abre o TaskDialog: nova rotina com prazo na data da coluna, ou edição
  const openNewTask = (date: Date) => {
    setDefaultTaskDueDate(formatDateOnly(date));
    setSelectedEditTask(null);
    setTaskDialogOpen(true);
  };

  const openEditTask = (task: Task) => {
    setSelectedEditTask(task);
    setTaskDialogOpen(true);
  };

  // Alternar conclusão rápida de tarefa
  const handleToggleTaskComplete = async (task: Task) => {
    try {
      if (isTaskDone(task)) {
        await updateTask(task.id, {
          status: "todo",
          progress: 0,
        });
      } else {
        const taskProject = projects.find((p) => p.id === task.project_id);
        if (taskProject?.track_time === false) {
          await updateTask(task.id, {
            status: "done",
            progress: 100,
          });
        } else {
          setCompletingTask(task);
        }
      }
    } catch {
      // Toast já exibido pelo DataContext
    }
  };

  // Excluir tarefa (confirmação via ConfirmDialog)
  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) setDeleteTarget(task);
  };

  if (loading) {
    return <FastCloseSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto">
      {/* Sleek Single-Line Executive Header */}
      <div className="bg-card border border-border/80 p-4 sm:p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Título & Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Cockpit de Fechamento Contábil
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  Fast Close
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Régua de dias úteis com suporte a D0 e sincronização por projeto
              </p>
            </div>
          </div>

          {/* Single-Line Executive Toolbar */}
          <FastCloseToolbar
            selectedProjectId={selectedProjectId}
            closingProjects={closingProjects}
            onSelectProject={setSelectedProjectId}
            onCreateProject={handleCreateFastCloseProject}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            offsetRange={offsetRange}
            onOffsetRangeChange={changeOffsetRange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenConfig={() => setConfigDialogOpen(true)}
            onOpenCopy={() => setCopyDialogOpen(true)}
            onOpenImport={() => setImportDialogOpen(true)}
            onOpenGenerate={() => setGenerateConfirmOpen(true)}
            generating={generating}
          />
        </div>
      </div>

      {/* Progress Bar & Summary Card */}
      <FastCloseSummaryCards
        projectName={selectedProjectObj?.name}
        tasksByOffset={tasksByOffset}
        selectedMonth={selectedMonth}
        useD0={useD0}
        lastDayOfMonth={lastDayOfMonth}
        columnsCount={workdayOffsets.length}
      />

      {/* Exibição: Kanban vs Lista Cronológica */}
      {viewMode === "kanban" ? (
        <FastCloseBoard
          tasks={tasks}
          workdayOffsets={workdayOffsets}
          offsetDatesMap={offsetDatesMap}
          tasksByOffset={tasksByOffset}
          lastDayOfMonth={lastDayOfMonth}
          useD0={useD0}
          getWorkspaceId={getWorkspaceId}
          updateTask={updateTask}
          onAddTask={openNewTask}
          onOpenEditTask={openEditTask}
        />
      ) : (
        <FastCloseListView
          workdayOffsets={workdayOffsets}
          offsetDatesMap={offsetDatesMap}
          tasksByOffset={tasksByOffset}
          useD0={useD0}
          onOpenEditTask={openEditTask}
          onToggleTaskComplete={handleToggleTaskComplete}
          onDeleteTask={handleDeleteTask}
          onAddTaskToOffset={openNewTask}
        />
      )}

      {/* Modal de Criação / Edição de Tarefa */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedEditTask}
        // Em "Todos", a edição usa o projeto da própria tarefa
        projectId={selectedEditTask?.project_id || (selectedProjectId !== "all" ? selectedProjectId : undefined)}
        defaultDueDate={defaultTaskDueDate}
      />

      {/* Confirmação de exclusão (substitui o confirm() nativo) */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Excluir "${deleteTarget?.title ?? "rotina"}"?`}
        description="Esta ação não pode ser desfeita."
        variant="destructive"
        confirmText="Excluir"
        onConfirm={async () => {
          if (deleteTarget) await deleteTask(deleteTarget.id);
        }}
      />

      {/* Confirmação de geração das rotinas padrão */}
      <ConfirmDialog
        open={generateConfirmOpen}
        onOpenChange={setGenerateConfirmOpen}
        title="Gerar rotinas padrão?"
        description={`Serão criadas ${defaultRoutines.length} rotinas de fechamento para ${MONTH_NAMES[selectedMonth - 1]}/${selectedYear} em "${selectedProjectObj?.name ?? "projeto selecionado"}".`}
        confirmText="Gerar rotinas"
        onConfirm={handleGenerateDefaultClosingTasks}
      />

      {/* Modal de Cópia Mês a Mês */}
      <CopyClosingDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        tasks={scopedTasks}
        onCopyTasks={handleCopyTasksFromMonth}
      />

      {/* Modal de Importação de Planilha */}
      <ImportClosingSpreadsheetDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        projectId={selectedProjectId !== "all" ? selectedProjectId : undefined}
        projectName={selectedProjectObj?.name}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onImportSuccess={handleImportSpreadsheetSuccess}
      />

      {/* Modal de Configuração de Dias Úteis & D0 (Salvamento Atômico) */}
      <WorkdayConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        useD0={useD0}
        workdayOffsets={workdayOffsets}
        onSaveConfig={applyRulerConfig}
      />

      {/* Modal de Conclusão de Tarefa: Registro de Horas Reais */}
      <CompleteTaskDialog
        open={!!completingTask}
        onOpenChange={(open) => {
          if (!open) setCompletingTask(null);
        }}
        task={completingTask}
        onConfirm={async (actualHours) => {
          if (completingTask) {
            await updateTask(completingTask.id, {
              status: "done",
              progress: 100,
              ...(actualHours !== null ? { actual_hours: actualHours } : {}),
            });
            setCompletingTask(null);
          }
        }}
      />
    </div>
  );
}
