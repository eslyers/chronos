"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import {
  KanbanSquare,
  Plus,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useData, type Stage } from "@/lib/context/DataContext";
import { TaskDialog } from "@/components/TaskDialog";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import { ImportProjectButton } from "@/components/ImportProjectButton";
import { ProjectAnalyticsDialog } from "@/components/ProjectAnalyticsDialog";
import { sortTasksWithHierarchy } from "@/lib/task-sorting";
import { KanbanSkeleton } from "@/components/skeletons/KanbanSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useMediaQuery } from "@/lib/use-media-query";
import { BOARD_ACCESSIBILITY } from "@/components/kanban/dnd-a11y";
import { TaskCard } from "@/components/kanban/TaskCard";
import { StageColumn } from "@/components/kanban/StageColumn";
import { ProjectPickerGrid } from "@/components/kanban/ProjectPickerGrid";
import { MobileStageTabs } from "@/components/kanban/MobileStageTabs";
import { useKanbanDnd } from "@/components/kanban/use-kanban-dnd";

export default function KanbanPage() {
  const router = useRouter();
  const {
    projects,
    stages,
    tasks,
    loading,
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

  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState<string | null>(null);
  const [activeMobileStageId, setActiveMobileStageId] = useState<string | null>(null);

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

  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks.filter((t) => t.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  // Sensores, arraste, aviso de WIP e movimento pendente para etapa concluída
  const {
    sensors,
    activeTask,
    wipWarning,
    dismissWipWarning,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    completeDialogProps,
  } = useKanbanDnd(projectTasks, selectedProjectId);

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
        <ProjectPickerGrid projects={projects} stages={stages} tasks={tasks} onSelectProject={setSelectedProjectId} />
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

  // Mesma coluna nos dois layouts; só a key muda (só um layout é montado por vez)
  const renderStageColumn = (stage: Stage, layout: "mobile" | "desktop") => (
    <StageColumn
      key={`${layout}-${stage.id}`}
      stage={stage}
      tasks={sortTasksWithHierarchy(projectTasks.filter((t) => t.stage_id === stage.id))}
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
            onClick={dismissWipWarning}
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
          onDragCancel={handleDragCancel}
          accessibility={BOARD_ACCESSIBILITY}
        >
          {isMobile ? (
          /* Mobile View: Single Column with Segmented Tab Control */
          <div className="space-y-4">
            <MobileStageTabs
              stages={projectStages}
              projectTasks={projectTasks}
              activeStageId={activeMobileStageId}
              onSelectStage={setActiveMobileStageId}
            />

            {projectStages
              .filter((stage) => stage.id === activeMobileStageId)
              .map((stage) => renderStageColumn(stage, "mobile"))}
          </div>
          ) : (
          /* Desktop View: Multi-column horizontal scroll (Original Layout) */
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory">
            {projectStages.map((stage) => renderStageColumn(stage, "desktop"))}
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

      {/* Movimento pendente para etapa concluída: registro das horas reais */}
      <CompleteTaskDialog {...completeDialogProps} />
    </div>
  );
}
