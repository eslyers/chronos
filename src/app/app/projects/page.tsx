"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Calendar, Target, Trash2, Edit, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useData, type Project } from "@/lib/context/DataContext";
import { ProjectDialog } from "@/components/ProjectDialog";
import { ImportProjectButton } from "@/components/ImportProjectButton";
import { ConfirmDialog, useConfirmDialog } from "@/components/ConfirmDialog";

export default function ProjectsPage() {
  const { projects, tasks, getTasksByProject, deleteProject, loading } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "archived">("all");

  function openCreate() {
    setEditingProject(null);
    setDialogOpen(true);
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setDialogOpen(true);
  }

  async function handleDelete(project: Project) {
    await deleteProject(project.id);
  }

  const deleteConfirm = useConfirmDialog();
  function askDelete(project: Project) {
    deleteConfirm.confirm({
      title: `Excluir "${project.name}"?`,
      description: "Esta ação não pode ser desfeita. Todas as tasks, estágios e dependências do projeto serão removidos.",
      variant: "destructive",
      confirmText: "Excluir projeto",
      onConfirm: () => handleDelete(project),
    });
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  function daysUntil(iso: string | null): number | null {
    if (!iso) return null;
    const diff = new Date(iso).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  }

  const filteredProjects = projects.filter((p) => filter === "all" || p.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando projetos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length} projeto{projects.length !== 1 ? "s" : ""} • {tasks.length} tarefas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportProjectButton
            mode="select"
            projects={projects}
            size="lg"
            variant="outline"
          />
          <Button onClick={openCreate} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: "all", label: "Todos", count: projects.length },
          { value: "active", label: "🟢 Ativos", count: projects.filter((p) => p.status === "active").length },
          { value: "completed", label: "✅ Concluídos", count: projects.filter((p) => p.status === "completed").length },
          { value: "archived", label: "📦 Arquivados", count: projects.filter((p) => p.status === "archived").length },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as typeof filter)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className="ml-1.5 opacity-70">({f.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">
              {filter === "all" ? "Nenhum projeto ainda" : "Nenhum projeto neste filtro"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie seu primeiro projeto e comece a organizar tarefas.
            </p>
            {filter === "all" && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro projeto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const projectTasks = getTasksByProject(project.id);
            const days = daysUntil(project.target_date);
            const overdue = days !== null && days < 0 && project.status === "active";
            const dueSoon = days !== null && days >= 0 && days <= 3 && project.status === "active";

            return (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow group"
              >
                {/* Color stripe */}
                <div
                  className="h-1.5 rounded-t-lg"
                  style={{ backgroundColor: project.color }}
                />

                <CardContent className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <Link href={`/app/projects/${project.id}`} className="block">
                        <h3 className="font-semibold text-lg leading-tight hover:underline truncate">
                          {project.name}
                        </h3>
                      </Link>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(project)}
                        className="p-1.5 rounded-md hover:bg-accent"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => askDelete(project)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {project.status === "active" && (
                      <Badge variant="success">🟢 Ativo</Badge>
                    )}
                    {project.status === "completed" && (
                      <Badge variant="default">✅ Concluído</Badge>
                    )}
                    {project.status === "archived" && (
                      <Badge variant="secondary">📦 Arquivado</Badge>
                    )}
                    {overdue && <Badge variant="destructive">⚠️ Atrasado</Badge>}
                    {dueSoon && <Badge variant="warning">⏰ Vence em {days}d</Badge>}
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} />
                  </div>

                  {/* Stats + Dates */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      <span>{projectTasks.length} tarefas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(project.target_date)}</span>
                    </div>
                  </div>

                  <Link
                    href={`/app/projects/${project.id}`}
                    className="block w-full text-center text-sm font-medium text-primary hover:underline pt-1"
                  >
                    Abrir projeto →
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
      />
      {deleteConfirm.dialog}
    </div>
  );
}