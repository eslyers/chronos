"use client";

import React, { useMemo, useState, useEffect } from "react";
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
import {
  KanbanSquare,
  Clock,
  Flag,
  Plus,
  FolderOpen,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  GripVertical,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  critical: "border-l-red-500",
  high: "border-l-indigo-500",
  medium: "border-l-blue-500",
  low: "border-l-slate-400",
} as const;

const PRIORITY_LABELS = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
} as const;

const PRIORITY_FLAG_COLORS = {
  critical: "#ef4444",
  high: "#6366f1",
  medium: "#3b82f6",
  low: "#94a3b8",
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
    disabled: isOverlay,
  });

  const days = daysUntil(task.due_date);
  const overdue = days !== null && days < 0 && !isDone;

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`border-l-4 ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || "border-l-blue-500"} bg-card border-border/80 ${
        isDragging && !isOverlay ? "opacity-30 scale-95" : ""
      } ${
        isOverlay
          ? "shadow-2xl rotate-2 cursor-grabbing ring-2 ring-blue-500/50 scale-105"
          : "cursor-grab hover:shadow-md hover:border-border"
      } transition-all duration-200 group`}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          router.push(`/app/projects/${projectId}?task=${task.id}`);
        }
      }}
    >
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold leading-tight text-foreground group-hover:text-blue-500 transition-colors">
            {task.title}
          </h4>
          <div className="flex items-center gap-1 shrink-0">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            <Flag
              className="h-3.5 w-3.5"
              style={{
                color: PRIORITY_FLAG_COLORS[task.priority as keyof typeof PRIORITY_FLAG_COLORS] || "#3b82f6",
              }}
            />
          </div>
        </div>

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
              {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] || "Média"}
            </Badge>

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
          </div>

          {task.progress > 0 && (
            <span className="text-[10px] font-bold text-muted-foreground font-mono">
              {task.progress}%
            </span>
          )}
        </div>

        {task.assignee_id && (
          <div className="pt-2 border-t border-border/40 flex items-center justify-between">
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

function StageColumn({
  stage,
  tasks,
  projectId,
  isDone,
  router,
  onAddTask,
}: {
  stage: StageLike;
  tasks: TaskLike[];
  projectId: string;
  isDone: boolean;
  router: ReturnType<typeof useRouter>;
  onAddTask: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "stage", stageId: stage.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[85vw] sm:w-80 flex flex-col bg-muted/30 rounded-2xl border border-border/80 snap-center transition-all ${
        isOver ? "bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30" : ""
      }`}
    >
      {/* Column Header */}
      <div
        className="p-3.5 border-b border-border/60 flex items-center justify-between bg-card/60 rounded-t-2xl backdrop-blur-sm"
        style={{
          borderTopColor: stage.color || "#3b82f6",
          borderTopWidth: 3,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-3 h-3 rounded-full shadow-sm"
            style={{ backgroundColor: stage.color || "#3b82f6" }}
          />
          <h3 className="font-bold text-sm text-foreground">{stage.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs font-mono font-bold bg-background">
            {tasks.length}
          </Badge>
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
            className={`border-2 border-dashed rounded-xl py-12 px-4 text-center transition-colors ${
              isOver ? "border-blue-500 bg-blue-500/5 text-blue-500" : "border-border/60 text-muted-foreground"
            }`}
          >
            <p className="text-xs font-semibold">
              {isOver ? "Solte para mover aqui ✨" : "Nenhuma tarefa nesta etapa"}
            </p>
          </div>
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

export default function KanbanPage() {
  const router = useRouter();
  const {
    projects,
    stages,
    tasks,
    loading,
    updateTask,
    loadProjectDetails,
    isProjectLoaded,
  } = useData();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);

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

  const [activeTask, setActiveTask] = useState<TaskLike | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState<string | null>(null);

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

  if (loading || loadingProject) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 animate-pulse">
          <KanbanSquare className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">
          Carregando fluxo de execução do Kanban...
        </p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <KanbanSquare className="h-7 w-7 text-blue-500" />
            Board Kanban
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o fluxo de execução em colunas interativas
          </p>
        </div>
        <Card className="border-dashed border-2 p-8">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
              <KanbanSquare className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Nenhum projeto cadastrado</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Crie seu primeiro projeto no workspace para visualizar e gerenciar o Kanban.
            </p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              <Link href="/app/projects">
                <Plus className="mr-2 h-4 w-4" /> Ir para Projetos
              </Link>
            </Button>
          </CardContent>
        </Card>
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
                  KANBAN WORKSPACE ENGINE
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
                <KanbanSquare className="h-7 w-7 text-blue-500" />
                Board Kanban — Seleção de Projeto
              </h1>
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
            const projectTasksCount = tasks.filter((t) => t.project_id === project.id).length;
            const doneCount = tasks.filter(
              (t) => t.project_id === project.id && t.status === "done"
            ).length;
            const progress = projectTasksCount ? Math.round((doneCount / projectTasksCount) * 100) : 0;

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
                    <Progress value={progress} className="h-2 bg-emerald-500/20" />
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

  const projectStages = stages
    .filter((s) => s.project_id === project.id)
    .sort((a, b) => a.position - b.position);

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

      {/* Error Banner */}
      {moveError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-500 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{moveError}</span>
          </div>
          <button
            onClick={() => setMoveError(null)}
            className="text-xs underline hover:text-foreground"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Board DnD Columns */}
      {projectStages.length === 0 ? (
        <Card className="border-dashed border-2 p-8">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground font-semibold">
              Este projeto não tem etapas configuradas no momento.
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
          <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
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
                  onAddTask={() => {
                    setDefaultStageId(stage.id);
                    setCreateOpen(true);
                  }}
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

      {/* Footer Guidance */}
      <Card className="p-4 border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>
            💡 <strong>Interatividade Drag-and-Drop:</strong> Arraste os cards entre as colunas para atualizar a etapa. As transições são gravadas na trilha de auditoria e notificam os membros do projeto em tempo real.
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
    </div>
  );
}
