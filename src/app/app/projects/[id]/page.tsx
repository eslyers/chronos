"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Calendar, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useData, type Task } from "@/lib/context/DataContext";
import { ProjectDialog } from "@/components/ProjectDialog";
import { TaskDialog } from "@/components/TaskDialog";
import { TaskAssignee } from "@/components/TaskAssignee";

const PRIORITY_COLORS = {
  low: { bg: "bg-slate-500/15", text: "text-slate-600 dark:text-slate-400", label: "Baixa" },
  medium: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", label: "Média" },
  high: { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", label: "Alta" },
  critical: { bg: "bg-red-500/15", text: "text-red-600 dark:text-red-400", label: "Crítica" },
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    getProject,
    getStagesByProject,
    getTasksByStage,
    getTasksByProject,
    moveTask,
    deleteTask,
    loading,
  } = useData();

  const project = getProject(id);
  const stages = getStagesByProject(id);
  const allTasks = getTasksByProject(id);
  const [editOpen, setEditOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Deep-link: se URL tem ?task=<id>, abre o dialog da task e scrolla ate ela
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("task");
    if (!taskId || loading) return;

    // Espera o DataContext terminar de carregar tasks
    const timer = setTimeout(() => {
      const found = allTasks.find((t) => t.id === taskId);
      if (found) {
        setEditingTask(found);
        setActiveStageId(found.stage_id);
        setTaskDialogOpen(true);
        // Scroll ate a task depois de o dialog abrir
        setTimeout(() => {
          const el = document.getElementById(`task-${taskId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            // Adiciona classe de highlight temporaria
            el.classList.add("task-highlight-flash");
            setTimeout(() => el.classList.remove("task-highlight-flash"), 2500);
          }
        }, 300);
      }
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, allTasks, setEditingTask, setActiveStageId, setTaskDialogOpen]);

  if (loading) {
    return <div className="p-8 text-muted-foreground">Carregando...</div>;
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Projeto não encontrado</h2>
        <Link href="/app/projects" className="text-primary hover:underline">
          ← Voltar para projetos
        </Link>
      </div>
    );
  }

  function openNewTask(stageId?: string) {
    setEditingTask(null);
    setActiveStageId(stageId ?? null);
    setTaskDialogOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setActiveStageId(task.stage_id);
    setTaskDialogOpen(true);
  }

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    if (!draggedTaskId) return;
    const stageTasks = getTasksByStage(stageId);
    await moveTask(draggedTaskId, stageId, stageTasks.length);
    setDraggedTaskId(null);
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  function daysUntil(iso: string | null): number | null {
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  }

  const completedTasks = allTasks.filter((t) => t.status === "done").length;
  const projectProgress = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/app/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Projetos
        </Link>

        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg" style={{ backgroundColor: project.color }} />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Editar projeto
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Progresso</div>
            <div className="text-2xl font-bold mt-1">{projectProgress}%</div>
            <Progress value={projectProgress} className="mt-2" />
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Tarefas</div>
            <div className="text-2xl font-bold mt-1">
              {completedTasks}/{allTasks.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">concluídas</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Início</div>
            <div className="text-lg font-semibold mt-1">{formatDate(project.start_date)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Prazo final</div>
            <div className="text-lg font-semibold mt-1">
              {formatDate(project.target_date)}
              {daysUntil(project.target_date) !== null && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({daysUntil(project.target_date)! >= 0
                    ? `${daysUntil(project.target_date)}d restantes`
                    : `${Math.abs(daysUntil(project.target_date)!)}d atrasado`})
                </span>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-fit">
          {stages.map((stage) => {
            const stageTasks = getTasksByStage(stage.id);
            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="w-80 flex-shrink-0"
              >
                <div
                  className="rounded-t-lg px-3 py-2 flex items-center justify-between"
                  style={{ backgroundColor: stage.color + "20" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <h3 className="font-semibold text-sm">{stage.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {stageTasks.length}
                    </Badge>
                  </div>
                  <button
                    onClick={() => openNewTask(stage.id)}
                    className="p-1 rounded hover:bg-background/50"
                    title="Adicionar tarefa"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="bg-secondary/30 rounded-b-lg p-2 space-y-2 min-h-[400px]">
                  {stageTasks.map((task) => {
                    const priority = PRIORITY_COLORS[task.priority];
                    const days = daysUntil(task.due_date);
                    const overdue = days !== null && days < 0 && task.status !== "done";
                    const dueSoon = days !== null && days >= 0 && days <= 2 && task.status !== "done";

                    return (
                      <div
                        key={task.id}
                        id={`task-${task.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => openEditTask(task)}
                        className="bg-card rounded-md p-3 border hover:border-primary cursor-pointer transition-all hover:shadow-md group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-sm leading-tight flex-1">
                            {task.title}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Excluir "${task.title}"?`)) deleteTask(task.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-destructive p-0.5"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2 mt-2">
                          <Badge className={`${priority.bg} ${priority.text} border-0`}>
                            {priority.label}
                          </Badge>
                          {task.due_date && (
                            <div
                              className={`text-xs flex items-center gap-1 ${
                                overdue
                                  ? "text-destructive font-semibold"
                                  : dueSoon
                                  ? "text-amber-600 dark:text-amber-400 font-medium"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <Calendar className="h-3 w-3" />
                              {formatDate(task.due_date)}
                            </div>
                          )}
                        </div>

                        {task.progress > 0 && (
                          <div className="mt-2">
                            <Progress value={task.progress} className="h-1" />
                            <div className="text-xs text-muted-foreground mt-1 text-right">
                              {task.progress}%
                            </div>
                          </div>
                        )}

                        {task.assignee_id && (
                          <div className="mt-2 pt-2 border-t border-border/40">
                            <TaskAssignee
                              assigneeId={task.assignee_id}
                              workspaceId={project.workspace_id}
                              variant="full"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {stageTasks.length === 0 && (
                    <button
                      onClick={() => openNewTask(stage.id)}
                      className="w-full p-4 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md border-2 border-dashed transition-colors"
                    >
                      + Adicionar tarefa
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ProjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
      />

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        defaultStageId={activeStageId}
        projectId={project.id}
      />
    </div>
  );
}