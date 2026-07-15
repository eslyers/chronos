"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KanbanSquare, Clock, Flag, Plus, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/lib/context/DataContext";

const PRIORITY_COLORS = {
  critical: "border-red-500",
  high: "border-orange-500",
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

export default function KanbanPage() {
  const router = useRouter();
  const { projects, stages, tasks, loading } = useData();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Carregando kanban…
      </div>
    );
  }

  // Sem projetos: pedir pra criar
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

  // Sem projeto selecionado: lista de projetos
  if (!selectedProjectId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kanban</h1>
          <p className="text-muted-foreground">
            Escolha um projeto pra ver o board
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const projectStages = stages.filter((s) => s.project_id === project.id);
            const projectTasks = tasks.filter((t) => t.project_id === project.id);
            const doneCount = projectTasks.filter((t) => t.status === "done").length;

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
                    <span>{projectTasks.length} tarefas</span>
                    <span>{doneCount} concluídas</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${projectTasks.length ? (doneCount / projectTasks.length) * 100 : 0}%`,
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

  // Projeto selecionado: render board real
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
  const projectTasks = tasks.filter((t) => t.project_id === project.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => setSelectedProjectId(null)}
            className="text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            ← Trocar projeto
          </button>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground">
            {projectTasks.length} tarefas • {projectStages.length} etapas
          </p>
        </div>
      </div>

      {projectStages.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">
              Este projeto não tem etapas configuradas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {projectStages.map((stage) => {
            const stageTasks = projectTasks
              .filter((t) => t.stage_id === stage.id)
              .sort((a, b) => a.position - b.position);
            const isDone = stage.is_done;

            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-80 flex flex-col bg-muted/30 rounded-lg border"
              >
                <div
                  className="p-3 border-b flex items-center justify-between"
                  style={{ borderTopColor: stage.color, borderTopWidth: 3, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <h3 className="font-medium text-sm">{stage.name}</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {stageTasks.length}
                  </Badge>
                </div>

                <div className="p-3 space-y-2 flex-1 min-h-[200px] max-h-[600px] overflow-y-auto">
                  {stageTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Nenhuma tarefa
                    </p>
                  ) : (
                    stageTasks.map((task) => {
                      const days = daysUntil(task.due_date);
                      const overdue = days !== null && days < 0 && !isDone;
                      return (
                        <Card
                          key={task.id}
                          className={`border-l-4 ${PRIORITY_COLORS[task.priority]} cursor-pointer hover:shadow-md transition-all`}
                          onClick={() =>
                            router.push(`/app/projects/${project.id}?task=${task.id}`)
                          }
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-sm font-medium leading-tight">
                                {task.title}
                              </h4>
                              <Flag
                                className="h-3 w-3 flex-shrink-0 mt-0.5"
                                style={{
                                  color:
                                    task.priority === "critical"
                                      ? "#ef4444"
                                      : task.priority === "high"
                                        ? "#f97316"
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
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {PRIORITY_LABELS[task.priority]}
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
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        💡 Drag-and-drop entre colunas virá na próxima atualização. Por enquanto, edite
        tarefas no <Link href={`/app/projects/${project.id}`} className="text-primary-600 hover:underline">detalhe do projeto</Link>.
      </p>
    </div>
  );
}