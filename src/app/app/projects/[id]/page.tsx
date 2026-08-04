"use client";

import { useState, use, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Calendar, MoreVertical, CornerDownRight, FolderTree, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useData, type Task } from "@/lib/context/DataContext";
import { ProjectDialog } from "@/components/ProjectDialog";
import { TaskDialog } from "@/components/TaskDialog";
import { TaskAssignee } from "@/components/TaskAssignee";
import { ImportProjectButton } from "@/components/ImportProjectButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProjectStatusReportPDF } from "@/components/ProjectStatusReportPDF";
import { TaskIndicators } from "@/components/TaskIndicators";
import { ProjectAnalyticsDialog } from "@/components/ProjectAnalyticsDialog";
import { formatDateBR, daysUntil } from "@/lib/utils";

const PRIORITY_COLORS = {
  low: { bg: "bg-slate-500/15", text: "text-slate-600 dark:text-slate-400", label: "Baixa" },
  medium: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", label: "Média" },
  high: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", label: "Alta" },
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
    updateTask,
    deleteTask,
    loading,
    loadProjectDetails,
    isProjectLoaded,
  } = useData();

  const [loadingProject, setLoadingProject] = useState(!isProjectLoaded(id));

  useEffect(() => {
    async function fetchDetails() {
      if (id && !isProjectLoaded(id)) {
        setLoadingProject(true);
        await loadProjectDetails(id);
        setLoadingProject(false);
      }
    }
    fetchDetails();
  }, [id, loadProjectDetails, isProjectLoaded]);

  const project = getProject(id);
  const stages = getStagesByProject(id);
  const allTasks = getTasksByProject(id);
  const [editOpen, setEditOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);
  const [showReportPDF, setShowReportPDF] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const processedTaskIdRef = useRef<string | null>(null);

  // Deep-link: se URL tem ?task=<id>, abre o dialog da task e scrolla ate ela sem travar
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("task");
    if (!taskId || loading) return;

    if (processedTaskIdRef.current === taskId) return;

    const found = allTasks.find((t) => t.id === taskId);
    if (found) {
      processedTaskIdRef.current = taskId;
      setEditingTask(found);
      setActiveStageId(found.stage_id);
      setTaskDialogOpen(true);

      // Limpa a query string da URL para permitir fechar suavemente
      const url = new URL(window.location.href);
      url.searchParams.delete("task");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));

      setTimeout(() => {
        const el = document.getElementById(`task-${taskId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("task-highlight-flash");
          setTimeout(() => el.classList.remove("task-highlight-flash"), 2500);
        }
      }, 300);
    }
  }, [loading, allTasks]);

  if (loading || loadingProject) {
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

  async function reorderTasksInStage(targetStageId: string, draggedId: string, targetTaskId?: string) {
    const stageTasks = getTasksByStage(targetStageId).sort((a, b) => a.position - b.position);
    const filtered = stageTasks.filter((t) => t.id !== draggedId);

    let targetIndex = filtered.length;
    if (targetTaskId) {
      const foundIdx = filtered.findIndex((t) => t.id === targetTaskId);
      if (foundIdx !== -1) {
        targetIndex = foundIdx;
      }
    }

    const draggedTaskObj = allTasks.find((t) => t.id === draggedId);
    if (!draggedTaskObj) return;

    filtered.splice(targetIndex, 0, draggedTaskObj);

    for (let i = 0; i < filtered.length; i++) {
      const task = filtered[i];
      if (task.id === draggedId) {
        await moveTask(draggedId, targetStageId, i);
      } else if (task.position !== i) {
        await updateTask(task.id, { position: i });
      }
    }
  }

  async function handleDropOnStage(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    if (!draggedTaskId) return;
    await reorderTasksInStage(stageId, draggedTaskId);
    setDraggedTaskId(null);
  }

  async function handleDropOnTask(e: React.DragEvent, targetTask: Task) {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedTaskId || draggedTaskId === targetTask.id) return;
    if (!targetTask.stage_id) return;
    await reorderTasksInStage(targetTask.stage_id, draggedTaskId, targetTask.id);
    setDraggedTaskId(null);
  }

  const formatDate = formatDateBR;

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
          <div className="flex flex-row items-center gap-3 shrink-0 flex-wrap">
            <Button
              onClick={() => setAnalyticsOpen(true)}
              variant="outline"
              className="h-10 px-3.5 text-xs font-bold border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 gap-2"
            >
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Analytics & Desempenho
            </Button>
            <Button
              onClick={() => setShowReportPDF(true)}
              variant="outline"
              className="h-10 px-3.5 text-xs font-bold border-border bg-background hover:bg-muted gap-2"
            >
              <FileText className="h-4 w-4" />
              Gerar Status Report (PDF)
            </Button>
            <ImportProjectButton mode="single" project={project} />
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Editar projeto
            </Button>
          </div>
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
                onDrop={(e) => handleDropOnStage(e, stage.id)}
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
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnTask(e, task)}
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
                              setDeleteTaskTarget(task);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-destructive p-0.5"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Sub-tarefa badge (se for filha) */}
                        {task.parent_task_id && (
                          (() => {
                            const parentTask = allTasks.find((t) => t.id === task.parent_task_id);
                            return parentTask ? (
                              <div className="mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                                <CornerDownRight className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[180px]">Sub-tarefa de: {parentTask.title}</span>
                              </div>
                            ) : null;
                          })()
                        )}

                        {/* Contagem de sub-tarefas filhas */}
                        {(() => {
                          const subtasks = allTasks.filter((t) => t.parent_task_id === task.id);
                          if (subtasks.length === 0) return null;
                          const completed = subtasks.filter((s) => s.status === "done" || s.progress === 100).length;
                          return (
                            <div className="mb-2 flex items-center justify-between px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                              <span className="flex items-center gap-1">
                                <FolderTree className="h-3 w-3" />
                                Sub-tarefas
                              </span>
                              <span>{completed}/{subtasks.length} ({Math.round((completed / subtasks.length) * 100)}%)</span>
                            </div>
                          );
                        })()}

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
                                  ? "text-blue-600 dark:text-blue-400 font-medium"
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

                        <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                          {(task.assignee_id || task.assignee_name) ? (
                            <TaskAssignee
                              assigneeId={task.assignee_id}
                              assigneeName={task.assignee_name}
                              workspaceId={project.workspace_id}
                              variant="full"
                            />
                          ) : <div />}
                          <TaskIndicators taskId={task.id} />
                        </div>
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
        onOpenChange={(o) => {
          setTaskDialogOpen(o);
          if (!o) {
            setEditingTask(null);
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              if (url.searchParams.has("task")) {
                url.searchParams.delete("task");
                window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
              }
            }
          }
        }}
        task={editingTask}
        defaultStageId={activeStageId}
        projectId={project.id}
      />

      <ConfirmDialog
        open={!!deleteTaskTarget}
        onOpenChange={(o) => !o && setDeleteTaskTarget(null)}
        title={`Excluir "${deleteTaskTarget?.title}"?`}
        description="Esta ação não pode ser desfeita."
        variant="destructive"
        confirmText="Excluir"
        onConfirm={async () => {
          if (deleteTaskTarget) await deleteTask(deleteTaskTarget.id);
        }}
      />

      {project && (
        <ProjectStatusReportPDF
          open={showReportPDF}
          onClose={() => setShowReportPDF(false)}
          project={project}
          tasks={allTasks}
          stages={stages}
        />
      )}

      {project && (
        <ProjectAnalyticsDialog
          open={analyticsOpen}
          onOpenChange={setAnalyticsOpen}
          projectId={project.id}
        />
      )}
    </div>
  );
}