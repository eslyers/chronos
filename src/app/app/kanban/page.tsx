"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { KanbanSquare, Clock, Flag, Plus, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/context/DataContext";
import { TaskAssignee } from "@/components/TaskAssignee";
import { TaskDialog } from "@/components/TaskDialog";
import { ImportProjectButton } from "@/components/ImportProjectButton";

type TaskLike = {
  id: string;
  title: string;
  description: string | null;
  stage_id: string | null;
  priority: keyof typeof PRIORITY_COLORS;
  due_date: string | null;
  progress: number;
  assignee_id: string | null;
};

type StageLike = {
  id: string;
  name: string;
  color: string;
  position: number;
  is_done: boolean;
  project_id: string;
};

const PRIORITY_COLORS = {
  critical: "border-red-500",
  high: "border-blue-500",
  medium: "border-blue-500",
  low: "border-slate-500",
} as const;

const PRIORITY_LABELS = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
} as const;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

// ────────────────────────────────────────────────────────────────────────────
// Task Card (draggable)
// ────────────────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  projectId,
  isDone,
  router,
  isOverlay = false,
}: {
  task: TaskLike;
  projectId: string;
  isDone: boolean;
  router: ReturnType<typeof useRouter>;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task", stageId: task.stage_id, taskId: task.id },
    disabled: isOverlay, // evita double bind quando em overlay
  });

  const days = daysUntil(task.due_date);
  const overdue = days !== null && days < 0 && !isDone;

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`border-l-4 ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]} ${
        isDragging && !isOverlay ? "opacity-30" : ""
      } ${isOverlay ? "shadow-2xl rotate-2 cursor-grabbing" : "cursor-grab hover:shadow-md"} transition-shadow`}
      onClick={(e) => {
        // Só navega se não estiver arrastando
        if (!isDragging) {
          e.stopPropagation();
          router.push(`/app/projects/${projectId}?task=${task.id}`);
        }
      }}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-medium leading-tight">{task.title}</h4>
          <Flag
            className="h-3 w-3 flex-shrink-0 mt-0.5"
            style={{
              color:
                task.priority === "critical"
                  ? "#ef4444"
                  : task.priority === "high"
                    ? "#3b82f6"
                    : task.priority === "medium"
                      ? "#3b82f6"
                      : "#64748b",
            }}
          />
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS]}
          </Badge>
          {task.due_date && (
            <span
              className={`text-[10px] inline-flex items-center gap-1 ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}
            >
              <Clock className="h-2.5 w-2.5" />
              {formatDate(task.due_date)}
              {overdue && " (atrasado)"}
            </span>
          )}
          {task.progress > 0 && task.progress < 100 && (
            <span className="text-[10px] text-muted-foreground">
              {task.progress}%
            </span>
          )}
        </div>
        {task.assignee_id && (
          <div className="mt-2 pt-2 border-t border-border/40">
            <TaskAssignee
              assigneeId={task.assignee_id}
              workspaceId={undefined as unknown as string}
              variant="badge"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Stage Column (droppable)
// ────────────────────────────────────────────────────────────────────────────
function StageColumn({
  stage,
  tasks,
  projectId,
  isDone,
  router,
}: {
  stage: StageLike;
  tasks: TaskLike[];
  projectId: string;
  isDone: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "stage", stageId: stage.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[85vw] sm:w-80 flex flex-col bg-muted/30 rounded-lg border snap-center transition-colors ${
        isOver ? "bg-primary/10 border-primary ring-2 ring-primary/30" : ""
      }`}
    >
      <div
        className="p-3 border-b flex items-center justify-between"
        style={{
          borderTopColor: stage.color,
          borderTopWidth: 3,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-medium text-sm">{stage.name}</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>

      <div className="p-3 space-y-2 flex-1 min-h-[200px] max-h-[600px] overflow-y-auto">
        {tasks.length === 0 ? (
          <p
            className={`text-xs text-center py-8 ${isOver ? "text-primary font-medium" : "text-muted-foreground"}`}
          >
            {isOver ? "Solte aqui ✨" : "Nenhuma tarefa"}
          </p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectId={projectId}
              isDone={isDone}
              router={router}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Página principal
// ────────────────────────────────────────────────────────────────────────────
export default function KanbanPage() {
  const router = useRouter();
  const { projects, stages, tasks, loading, updateTask } = useData();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<TaskLike | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState<string | null>(null);

  // Sensors: suportam mouse + touch + teclado (acessibilidade)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // evita clique acidental
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  // Tasks do projeto selecionado, memoizadas por performance
  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks.filter((t) => t.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const handleDragStart = (event: DragStartEvent) => {
    setMoveError(null);
    const task = projectTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overData = over.data.current as
      | { type: "stage"; stageId: string }
      | { type: "task"; stageId: string }
      | undefined;

    // Se soltou em outra task, usa o stage da task alvo
    // Se soltou direto na coluna, usa o stage da coluna
    const targetStageId =
      overData?.type === "task"
        ? overData.stageId
        : overData?.type === "stage"
          ? overData.stageId
          : null;

    if (!targetStageId) return;

    const movedTask = projectTasks.find((t) => t.id === taskId);
    if (!movedTask || movedTask.stage_id === targetStageId) return;

    try {
      await updateTask(taskId, { stage_id: targetStageId });
    } catch (err) {
      console.error("[Kanban] move error:", err);
      setMoveError(
        err instanceof Error ? err.message : "Falha ao mover tarefa"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Carregando kanban…
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kanban</h1>
          <p className="text-muted-foreground">
            Acompanhe o fluxo de execução em colunas
          </p>
        </div>
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-blue-500/10 mb-4">
              <KanbanSquare className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold">Nenhum projeto ainda</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Crie seu primeiro projeto (com ou sem template) pra ver o Kanban.
            </p>
            <Link
              href="/app/projects"
              className="mt-6 inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Ir para projetos
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedProjectId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kanban</h1>
          <p className="text-muted-foreground">
            Escolha um projeto pra ver o board
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const projectStages = stages.filter((s) => s.project_id === project.id);
            const projectTasksCount = tasks.filter((t) => t.project_id === project.id).length;
            const doneCount = tasks.filter(
              (t) => t.project_id === project.id && t.status === "done"
            ).length;
            return (
              <Card
                key={project.id}
                className="cursor-pointer hover:border-foreground/30 transition-all"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${project.color}20` }}
                    >
                      <FolderOpen
                        className="h-5 w-5"
                        style={{ color: project.color }}
                      />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {projectStages.length} etapas
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-lg">{project.name}</h3>
                  <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                    <span>{projectTasksCount} tarefas</span>
                    <span>{doneCount} concluídas</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${
                          projectTasksCount ? (doneCount / projectTasksCount) * 100 : 0
                        }%`,
                        backgroundColor: project.color,
                      }}
                    />
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
        <button
          onClick={() => setSelectedProjectId(null)}
          className="text-sm text-primary-600 hover:underline"
        >
          ← Voltar pra lista
        </button>
      </div>
    );
  }

  const projectStages = stages
    .filter((s) => s.project_id === project.id)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <button
            onClick={() => setSelectedProjectId(null)}
            className="text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            ← Trocar projeto
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {project.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {projectTasks.length} tarefas • {projectStages.length} etapas
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
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
              title={`Adicionar tarefa na etapa "${stage.name}"`}
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">em </span>
              {stage.name}
            </Button>
          ))}
        </div>
      </div>

      {moveError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          ❌ {moveError}
          <button
            onClick={() => setMoveError(null)}
            className="ml-2 text-xs underline"
          >
            fechar
          </button>
        </div>
      )}

      {projectStages.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">
              Este projeto não tem etapas configuradas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTask(null)}
        >
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
            {projectStages.map((stage) => {
              const stageTasks = projectTasks
                .filter((t) => t.stage_id === stage.id)
                .sort((a, b) => a.position - b.position);
              return (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  tasks={stageTasks}
                  projectId={project.id}
                  isDone={stage.is_done}
                  router={router}
                />
              );
            })}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                projectId={project.id}
                isDone={
                  projectStages.find((s) => s.id === activeTask.stage_id)?.is_done ?? false
                }
                router={router}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <p className="text-xs text-muted-foreground">
        💡 <strong>Arraste</strong> tarefas entre colunas pra mudar a etapa. O
        stage_transitions é gravado automaticamente e dispara notificação pra
        quem tiver inscrito no projeto.
      </p>

      <TaskDialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setDefaultStageId(null);
        }}
        projectId={project.id}
        defaultStageId={defaultStageId}
      />
    </div>
  );
}
