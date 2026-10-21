"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import {
  KanbanSquare,
  Clock,
  Flag,
  Plus,
  FolderOpen,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  GripVertical,
  CornerDownRight,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useData } from "@/lib/context/DataContext";
import { TaskAssignee } from "@/components/TaskAssignee";
import { TaskDialog } from "@/components/TaskDialog";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import { TaskIndicators } from "@/components/TaskIndicators";
import { ImportProjectButton } from "@/components/ImportProjectButton";
import { ProjectAnalyticsDialog } from "@/components/ProjectAnalyticsDialog";
import { sortTasksWithHierarchy } from "@/lib/task-sorting";
import { KanbanSkeleton } from "@/components/skeletons/KanbanSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Task, Stage } from "@/lib/context/DataContext";
import { formatHoursBadge } from "@/lib/duration";
import { formatDateBR as formatDate } from "@/lib/utils";
import { PRIORITY_HEX, priorityLabel } from "@/lib/priority";
import { isTaskDone as isTaskDoneStatus, isTaskOverdue } from "@/lib/task-status";
import { planStageReorder, reopenPatchForStageChange, type StageReorderPlan } from "@/lib/board-moves";
import { useMediaQuery } from "@/lib/use-media-query";
import { BOARD_ACCESSIBILITY, pointerOnlyListeners } from "@/components/kanban/dnd-a11y";

function TaskCard({
  task,
  projectId,
  workspaceId,
  isDone,
  router,
  isOverlay = false,
  trackTime = true,
}: {
  task: Task;
  projectId: string;
  workspaceId: string;
  isDone: boolean;
  router: ReturnType<typeof useRouter>;
  isOverlay?: boolean;
  trackTime?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    setActivatorNodeRef,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { type: "task", stageId: task.stage_id, taskId: task.id, label: task.title },
    disabled: isOverlay,
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `droppable-task-${task.id}`,
    data: { type: "task", stageId: task.stage_id, taskId: task.id, label: `a tarefa "${task.title}"` },
    disabled: isOverlay,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const isTaskDone = isDone || isTaskDoneStatus(task);
  const overdue = !isTaskDone && isTaskOverdue(task);

  const openTask = () => {
    if (!isDragging) router.push(`/app/projects/${projectId}?task=${task.id}`);
  };

  return (
    <Card
      ref={setNodeRef}
      // Mouse/toque arrastam pelo card inteiro; o teclado usa só o botão de arrastar
      {...(isOverlay ? {} : pointerOnlyListeners(listeners))}
      className={`relative border-l-4 ${
        isTaskDone
          ? "border-l-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/10 border-border/80 shadow-xs"
          : "bg-card border-border/80"
      } ${
        isDragging && !isOverlay ? "opacity-30 scale-95" : ""
      } ${
        isOverlay
          ? "shadow-2xl rotate-2 cursor-grabbing ring-2 ring-blue-500/50 scale-105"
          : "cursor-grab hover:shadow-md hover:border-border"
      } transition-all duration-200 group`}
      style={isTaskDone ? undefined : { borderLeftColor: PRIORITY_HEX[task.priority] ?? PRIORITY_HEX.medium }}
    >
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold leading-tight text-foreground group-hover:text-blue-500 transition-colors flex items-start gap-1.5 flex-1">
            {isTaskDone && (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            )}
            {/* O botão se estende (after:inset-0) sobre o card: clique ou Enter abrem a tarefa */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openTask();
              }}
              tabIndex={isOverlay ? -1 : undefined}
              className={`text-left cursor-grab focus-visible:outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-blue-500 ${
                isTaskDone ? "text-foreground font-semibold" : ""
              }`}
            >
              {task.title}
            </button>
          </h4>
          <div className="relative z-10 flex items-center gap-1 shrink-0">
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...(isOverlay ? {} : attributes)}
              {...(isOverlay ? {} : listeners)}
              aria-label="Arrastar tarefa"
              tabIndex={isOverlay ? -1 : 0}
              className="rounded p-0.5 -m-0.5 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </button>
            <Flag
              className="h-3.5 w-3.5"
              aria-hidden="true"
              style={{
                color: isTaskDone ? "#10b981" : (PRIORITY_HEX[task.priority] ?? PRIORITY_HEX.medium),
              }}
            />
          </div>
        </div>

        {/* Sub-tarefa badge (se for filha) */}
        {task.parent_task_id && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[11px] font-medium text-blue-600 dark:text-blue-400">
            <CornerDownRight className="h-3 w-3 shrink-0" />
            <span>Sub-tarefa</span>
          </div>
        )}

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider bg-muted/40 border-border/60"
            >
              {priorityLabel(task.priority)}
            </Badge>

            {isTaskDone && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold">
                Concluída
              </Badge>
            )}

            {task.due_date && (
              <span
                className={`text-[11px] inline-flex items-center gap-1 font-medium ${
                  overdue ? "text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded" : "text-muted-foreground"
                }`}
              >
                <Clock className="h-3 w-3" />
                {formatDate(task.due_date)}
                {overdue && " (atrasado)"}
              </span>
            )}

            {trackTime && task.estimated_hours != null && (
              <span className="text-[11px] inline-flex items-center gap-1 text-muted-foreground font-mono" title={`Estimado: ${formatHoursBadge(task.estimated_hours)}`}>
                <Clock className="h-3 w-3 text-blue-500" />
                {formatHoursBadge(task.estimated_hours)}
              </span>
            )}

            {trackTime && isTaskDone && task.actual_hours != null && (
              <span className="text-[11px] inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold font-mono bg-emerald-500/15 px-1.5 py-0.5 rounded" title={`Executado: ${formatHoursBadge(task.actual_hours)} reais`}>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {formatHoursBadge(task.actual_hours)} real
              </span>
            )}
          </div>

          {task.progress > 0 && (
            <span className={`text-[10px] font-bold font-mono ${isTaskDone ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"}`}>
              {task.progress}%
            </span>
          )}
        </div>

        {task.progress > 0 && (
          <Progress
            value={task.progress}
            className="h-1"
            indicatorClassName={isTaskDone ? "bg-emerald-500" : undefined}
          />
        )}

        <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
          {(task.assignee_id || task.assignee_name) ? (
            <TaskAssignee
              assigneeId={task.assignee_id}
              assigneeName={task.assignee_name}
              workspaceId={workspaceId}
              variant="badge"
            />
          ) : <div />}
          {/* No overlay de arraste não busca contagens de novo */}
          {!isOverlay && <TaskIndicators taskId={task.id} />}
        </div>
      </CardContent>
    </Card>
  );
}

function StageColumn({
  stage,
  tasks,
  projectId,
  workspaceId,
  isDone,
  router,
  onAddTask,
  trackTime = true,
}: {
  stage: Stage;
  tasks: Task[];
  projectId: string;
  workspaceId: string;
  isDone: boolean;
  router: ReturnType<typeof useRouter>;
  onAddTask: () => void;
  trackTime?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "stage", stageId: stage.id, label: `a coluna "${stage.name}"` },
  });

  const wipLimit = stage.wip_limit ?? null;
  const hasWipLimit = wipLimit !== null && wipLimit > 0;
  const isWipExceeded = hasWipLimit && tasks.length > wipLimit;
  const isWipNear = hasWipLimit && tasks.length === wipLimit;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[85vw] sm:w-80 flex flex-col rounded-2xl border snap-center transition-all ${
        isWipExceeded
          ? "bg-red-500/5 border-red-500/80 ring-1 ring-red-500/20"
          : isWipNear
          ? "bg-amber-500/5 border-amber-500/60"
          : "bg-muted/30 border-border/80"
      } ${
        isOver ? "bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30" : ""
      }`}
    >
      {/* Column Header */}
      <div
        className={`p-3.5 border-b flex items-center justify-between rounded-t-2xl backdrop-blur-sm ${
          isWipExceeded
            ? "bg-red-500/15 border-red-500/30"
            : isWipNear
            ? "bg-amber-500/15 border-amber-500/30"
            : "bg-card/60 border-border/60"
        }`}
        style={{
          borderTopColor: isWipExceeded ? "#ef4444" : isWipNear ? "#f59e0b" : (stage.color || "#3b82f6"),
          borderTopWidth: 3,
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-3 h-3 rounded-full shadow-sm shrink-0"
            style={{ backgroundColor: stage.color || "#3b82f6" }}
          />
          <h3 className="font-bold text-sm text-foreground truncate">{stage.name}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isWipExceeded ? (
            <Badge
              variant="outline"
              className="text-[11px] font-mono font-bold bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40 motion-safe:animate-pulse px-2 py-0.5 inline-flex items-center gap-1"
              title={`Limite WIP excedido: ${tasks.length} tarefas para um limite de ${wipLimit}`}
            >
              <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
              <span>{tasks.length}/{wipLimit}</span>
            </Badge>
          ) : isWipNear ? (
            <Badge
              variant="outline"
              className="text-[11px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 px-2 py-0.5 inline-flex items-center gap-1"
              title={`No limite WIP: ${tasks.length} de ${wipLimit}`}
            >
              <AlertCircle className="h-3 w-3 shrink-0 text-amber-500" />
              <span>{tasks.length}/{wipLimit}</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs font-mono font-bold bg-background">
              {hasWipLimit ? `${tasks.length}/${wipLimit}` : tasks.length}
            </Badge>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:bg-muted"
            onClick={onAddTask}
            title={`Adicionar tarefa em "${stage.name}"`}
          >
            <Plus className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </Button>
        </div>
      </div>

      {/* Column Content / Droppable Area */}
      <div className="p-3 space-y-3 flex-1 min-h-[260px] max-h-[640px] overflow-y-auto">
        {tasks.length === 0 ? (
          <div
            className={`border-2 border-dashed rounded-xl py-10 px-4 text-center transition-colors flex flex-col items-center justify-center ${
              isOver ? "border-blue-500 bg-blue-500/5 text-blue-500" : "border-border/60 hover:border-border text-muted-foreground"
            }`}
          >
            <p className="text-xs font-semibold">
              {isOver ? "Solte para mover aqui ✨" : "Nenhuma tarefa nesta etapa"}
            </p>
            {!isOver && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddTask}
                className="mt-2 text-[11px] text-blue-500 hover:text-blue-400 font-semibold h-7 px-2.5 hover:bg-blue-500/10 gap-1"
              >
                <Plus className="h-3 w-3" /> Adicionar tarefa
              </Button>
            )}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectId={projectId}
              workspaceId={workspaceId}
              isDone={isDone}
              router={router}
              trackTime={trackTime}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const router = useRouter();
  const {
    projects,
    stages,
    tasks,
    loading,
    moveTask,
    updateTask,
    refresh,
    loadProjectDetails,
    loadAllProjectsDetails,
    isProjectLoaded,
  } = useData();
  // Só um layout montado por vez: mobile e desktop no mesmo DndContext
  // registrariam os mesmos ids de draggable/droppable duas vezes.
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  useEffect(() => {
    loadAllProjectsDetails();
  }, [loadAllProjectsDetails]);

  useEffect(() => {
    async function fetchDetails() {
      if (selectedProjectId && !isProjectLoaded(selectedProjectId)) {
        setLoadingProject(true);
        await loadProjectDetails(selectedProjectId);
        setLoadingProject(false);
      }
    }
    fetchDetails();
  }, [selectedProjectId, loadProjectDetails, isProjectLoaded]);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [wipWarning, setWipWarning] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState<string | null>(null);
  const [activeMobileStageId, setActiveMobileStageId] = useState<string | null>(null);
  // Movimento para etapa de conclusão aguardando o CompleteTaskDialog:
  // o card só sai da coluna de origem depois da confirmação.
  const [completingTask, setCompletingTask] = useState<{
    task: Task;
    targetStageId: string;
    targetStageName: string;
    plan: StageReorderPlan;
  } | null>(null);

  const projectStages = useMemo(() => {
    if (!selectedProjectId) return [];
    return stages
      .filter((s) => s.project_id === selectedProjectId)
      .sort((a, b) => a.position - b.position);
  }, [stages, selectedProjectId]);

  useEffect(() => {
    if (projectStages.length > 0) {
      if (!activeMobileStageId || !projectStages.some((s) => s.id === activeMobileStageId)) {
        setActiveMobileStageId(projectStages[0].id);
      }
    } else {
      setActiveMobileStageId(null);
    }
  }, [projectStages, activeMobileStageId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks.filter((t) => t.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const handleDragStart = (event: DragStartEvent) => {
    setWipWarning(null);
    const task = projectTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  // Aviso de WIP só quando o movimento entre etapas é de fato gravado
  const warnIfWipExceeded = (task: Task, targetStageId: string) => {
    if (task.stage_id === targetStageId) return;
    const targetStage = stages.find((s) => s.id === targetStageId);
    if (!targetStage?.wip_limit || targetStage.wip_limit <= 0) return;
    const currentTasksInTarget = projectTasks.filter((t) => t.stage_id === targetStageId).length;
    if (currentTasksInTarget >= targetStage.wip_limit) {
      setWipWarning(
        `⚠️ Atenção: O estágio "${targetStage.name}" ultrapassará o limite WIP de ${targetStage.wip_limit} tarefas (${currentTasksInTarget + 1}/${targetStage.wip_limit}).`
      );
    }
  };

  /**
   * Grava o movimento: o card movido numa única escrita (etapa + posição +
   * status) e os vizinhos que mudaram de posição em paralelo. Em caso de
   * falha o DataContext já mostrou o toast; recarregamos o estado para não
   * deixar posições pela metade e repassamos o erro.
   */
  const commitMove = async (
    task: Task,
    targetStageId: string,
    plan: StageReorderPlan,
    statusPatch?: Partial<Task> | null
  ) => {
    warnIfWipExceeded(task, targetStageId);
    const writes: Promise<void>[] = plan.updates.map((u) => updateTask(u.id, { position: u.position }));
    if (statusPatch) {
      writes.push(updateTask(task.id, { stage_id: targetStageId, position: plan.movedPosition, ...statusPatch }));
    } else if (plan.movedChanged) {
      // moveTask marca como concluída quando a etapa destino é is_done
      writes.push(moveTask(task.id, targetStageId, plan.movedPosition));
    }
    try {
      await Promise.all(writes);
    } catch (err) {
      console.error("[Kanban] move error:", err);
      await refresh().catch(() => {});
      throw err;
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overData = over.data.current as
      | { type: "stage"; stageId: string }
      | { type: "task"; stageId: string; taskId: string }
      | undefined;

    const targetStageId =
      overData?.type === "task"
        ? overData.stageId
        : overData?.type === "stage"
          ? overData.stageId
          : null;

    if (!targetStageId) return;

    const movedTask = projectTasks.find((t) => t.id === taskId);
    if (!movedTask) return;

    const targetTaskId = overData?.type === "task" ? overData.taskId : undefined;
    const plan = planStageReorder(projectTasks, movedTask, targetStageId, targetTaskId);
    if (!plan.movedChanged && plan.updates.length === 0) return;

    const sourceStage = stages.find((s) => s.id === movedTask.stage_id);
    const targetStage = stages.find((s) => s.id === targetStageId);

    // Entrando numa coluna concluída: pede as horas reais antes de mover
    if (movedTask.stage_id !== targetStageId && targetStage?.is_done) {
      const currentProject = projects.find((p) => p.id === selectedProjectId);
      const shouldTrackTime = currentProject ? currentProject.track_time !== false : true;
      if (shouldTrackTime && !movedTask.actual_hours) {
        setCompletingTask({ task: movedTask, targetStageId, targetStageName: targetStage.name, plan });
        return;
      }
    }

    try {
      await commitMove(
        movedTask,
        targetStageId,
        plan,
        reopenPatchForStageChange(movedTask, !!sourceStage?.is_done, !!targetStage?.is_done)
      );
    } catch {
      // Toast já exibido pelo DataContext e estado recarregado em commitMove
    }
  };

  if (loading || loadingProject) {
    return <KanbanSkeleton />;
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <KanbanSquare className="h-7 w-7 text-blue-500" />
            Board Kanban
          </h2>
          <p className="text-muted-foreground mt-1">
            Acompanhe o fluxo de execução em colunas interativas
          </p>
        </div>
        <EmptyState
          icon={KanbanSquare}
          title="Nenhum projeto cadastrado"
          description="Crie seu primeiro projeto no workspace para visualizar e gerenciar as etapas do Kanban em tempo real."
          actionLabel="Ir para Projetos"
          onAction={() => router.push("/app/projects")}
          actionIcon={Plus}
        />
      </div>
    );
  }

  if (!selectedProjectId) {
    return (
      <div className="space-y-8 animate-fadeIn pb-12">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs font-semibold">
                  QUADRO KANBAN
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
                <KanbanSquare className="h-7 w-7 text-blue-500" />
                Board Kanban — Seleção de Projeto
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Escolha o projeto corporativo para visualizar e interagir com o quadro de etapas em tempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Project Selection Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const projectStages = stages.filter((s) => s.project_id === project.id);
            const projectTasks = tasks.filter((t) => t.project_id === project.id);
            const projectTasksCount = projectTasks.length;
            const doneCount = projectTasks.filter(isTaskDoneStatus).length;
            const progress = projectTasksCount ? Math.round((doneCount / projectTasksCount) * 100) : (project.progress || 0);

            return (
              <Card
                key={project.id}
                className="cursor-pointer border-border/80 bg-card hover:border-blue-500/40 hover:shadow-lg transition-all duration-200 group"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="p-3 rounded-xl shadow-sm"
                      style={{ backgroundColor: `${project.color || "#3b82f6"}20` }}
                    >
                      <FolderOpen
                        className="h-6 w-6"
                        style={{ color: project.color || "#3b82f6" }}
                      />
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold bg-background">
                      {projectStages.length} Etapas
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-foreground group-hover:text-blue-500 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {project.description || "Projeto corporativo sem descrição."}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>{projectTasksCount} entregáveis</span>
                      <span className="text-emerald-500">{progress}% concluído</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-emerald-500/20" indicatorClassName={progress === 100 ? "bg-emerald-500" : undefined} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const project = projects.find((p) => p.id === selectedProjectId);
  if (!project) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Projeto não encontrado.</p>
        <Button variant="outline" onClick={() => setSelectedProjectId(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para a Lista
        </Button>
      </div>
    );
  }



  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Executive Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <button
              onClick={() => setSelectedProjectId(null)}
              className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Alternar Projeto
            </button>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <KanbanSquare className="h-7 w-7 text-blue-500" />
              {project.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              {projectTasks.length} tarefas cadastradas • {projectStages.length} colunas de etapas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnalyticsOpen(true)}
              className="h-10 px-4 text-xs font-semibold border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 gap-2"
            >
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span>Analytics & Desempenho</span>
            </Button>
            <ImportProjectButton mode="single" project={project} />
            {projectStages.map((stage) => (
              <Button
                key={stage.id}
                size="sm"
                variant="outline"
                onClick={() => {
                  setDefaultStageId(stage.id);
                  setCreateOpen(true);
                }}
                className="h-10 px-3 text-xs font-semibold border-border hover:bg-muted gap-1.5"
                title={`Adicionar tarefa na etapa "${stage.name}"`}
              >
                <Plus className="h-3.5 w-3.5 text-blue-500" />
                <span>+ {stage.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* WIP Warning Banner */}
      {wipWarning && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>{wipWarning}</span>
          </div>
          <button
            onClick={() => setWipWarning(null)}
            className="text-xs underline hover:text-foreground ml-4 shrink-0"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Board DnD Columns */}
      {projectStages.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="Nenhuma etapa configurada"
          description="Este projeto não possui colunas/etapas de fluxo de trabalho configuradas. Adicione etapas para habilitar o quadro."
          actionLabel="Gerenciar Etapas"
          onAction={() => router.push("/app/projects")}
          actionIcon={Plus}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTask(null)}
          accessibility={BOARD_ACCESSIBILITY}
        >
          {isMobile ? (
          /* Mobile View: Single Column with Segmented Tab Control */
          <div className="space-y-4">
            <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-border/40 scrollbar-none">
              {projectStages.map((stage) => {
                const isActive = activeMobileStageId === stage.id;
                const stageTasksCount = projectTasks.filter((t) => t.stage_id === stage.id).length;
                return (
                  <button
                    key={`tab-${stage.id}`}
                    onClick={() => setActiveMobileStageId(stage.id)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-lg border whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                      isActive
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm font-semibold"
                        : "bg-card border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stage.color || "#3b82f6" }}
                    />
                    <span>{stage.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono px-1.5 py-0 font-bold ${
                        isActive
                          ? "bg-blue-700/50 text-white border-blue-400/40"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {stageTasksCount}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {projectStages
              .filter((stage) => stage.id === activeMobileStageId)
              .map((stage) => {
                const stageTasks = sortTasksWithHierarchy(
                  projectTasks.filter((t) => t.stage_id === stage.id)
                );
                return (
                  <StageColumn
                    key={`mobile-${stage.id}`}
                    stage={stage}
                    tasks={stageTasks}
                    projectId={project.id}
                    workspaceId={project.workspace_id}
                    isDone={stage.is_done}
                    router={router}
                    trackTime={project.track_time !== false}
                    onAddTask={() => {
                      setDefaultStageId(stage.id);
                      setCreateOpen(true);
                    }}
                  />
                );
              })}
          </div>
          ) : (
          /* Desktop View: Multi-column horizontal scroll (Original Layout) */
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory">
            {projectStages.map((stage) => {
              const stageTasks = sortTasksWithHierarchy(
                projectTasks.filter((t) => t.stage_id === stage.id)
              );
              return (
                <StageColumn
                  key={`desktop-${stage.id}`}
                  stage={stage}
                  tasks={stageTasks}
                  projectId={project.id}
                  workspaceId={project.workspace_id}
                  isDone={stage.is_done}
                  router={router}
                  trackTime={project.track_time !== false}
                  onAddTask={() => {
                    setDefaultStageId(stage.id);
                    setCreateOpen(true);
                  }}
                />
              );
            })}
          </div>
          )}

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                projectId={project.id}
                workspaceId={project.workspace_id}
                isDone={
                  projectStages.find((s) => s.id === activeTask.stage_id)?.is_done ?? false
                }
                router={router}
                trackTime={project.track_time !== false}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Footer Guidance */}
      <Card className="p-4 border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>
            💡 <strong>Interatividade Drag-and-Drop:</strong> Arraste os cards entre as colunas para atualizar a etapa. Limites WIP destacam gargalos de execução automaticamente.
          </span>
        </div>
      </Card>

      <TaskDialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setDefaultStageId(null);
        }}
        projectId={project.id}
        defaultStageId={defaultStageId}
      />

      <ProjectAnalyticsDialog
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        projectId={project.id}
      />

      <CompleteTaskDialog
        open={!!completingTask}
        onOpenChange={(open) => {
          if (!open) setCompletingTask(null);
        }}
        task={completingTask?.task ?? null}
        targetStageName={completingTask?.targetStageName}
        onConfirm={async (actualHours) => {
          if (!completingTask) return;
          // Só agora o card entra na coluna concluída. Cancelar o diálogo
          // apenas limpa o estado: o card nunca saiu da coluna de origem.
          // Se a gravação falhar, o erro sobe e o diálogo continua aberto.
          await commitMove(completingTask.task, completingTask.targetStageId, completingTask.plan, {
            status: "done",
            progress: 100,
            ...(actualHours !== null ? { actual_hours: actualHours } : {}),
          });
          setCompletingTask(null);
        }}
      />
    </div>
  );
}
