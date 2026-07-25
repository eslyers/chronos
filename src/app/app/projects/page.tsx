"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Calendar, Target, Trash2, Edit, FolderOpen, FolderKanban, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useData, type Project } from "@/lib/context/DataContext";
import { ProjectDialog } from "@/components/ProjectDialog";
import { ImportProjectButton } from "@/components/ImportProjectButton";
import { useConfirmDialog } from "@/components/ConfirmDialog";

export default function ProjectsPage() {
  const { projects, getTasksByProject, deleteProject, loading } = useData();
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
      description: "Esta ação não pode ser desfeita. Todas as tarefas, estágios e dependências do projeto serão removidos.",
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
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 animate-pulse">
          <FolderKanban className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">
          Carregando portfólio de projetos...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs font-semibold">
                PROJECT PORTFOLIO ENGINE
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
              <FolderKanban className="h-7 w-7 text-blue-500" />
              Projetos & Portfólio Corporativo
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Gerencie seus projetos, acompanhe metas de conclusão, prazos estipulados e estruture novos fluxos de entregáveis.
            </p>
          </div>

          <div className="flex flex-row items-center gap-3 shrink-0">
            <ImportProjectButton
              mode="select"
              projects={projects}
              size="lg"
              variant="outline"
              className="h-11 font-semibold"
            />
            <Button onClick={openCreate} size="lg" className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20">
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3 sm:p-4 border-border/80 bg-card shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { value: "all", label: "Todos", count: projects.length },
              { value: "active", label: "🟢 Ativos", count: projects.filter((p) => p.status === "active").length },
              { value: "completed", label: "✅ Concluídos", count: projects.filter((p) => p.status === "completed").length },
              { value: "archived", label: "📦 Arquivados", count: projects.filter((p) => p.status === "archived").length },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as typeof filter)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  filter === f.value
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {f.label}
                {f.count > 0 && (
                  <span className="ml-1.5 opacity-80 font-mono">({f.count})</span>
                )}
              </button>
            ))}
          </div>

          <span className="text-xs text-muted-foreground font-semibold">
            Exibindo <strong className="text-foreground">{filteredProjects.length}</strong> de <strong className="text-foreground">{projects.length}</strong> projetos
          </span>
        </div>
      </Card>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="border-dashed border-2 p-8">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
              <FolderOpen className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">
              {filter === "all" ? "Nenhum projeto cadastrado" : "Nenhum projeto encontrado neste filtro"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Crie um novo projeto para começar a gerenciar tarefas, Gantt e Kanban.
            </p>
            {filter === "all" && (
              <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Projeto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const projectTasks = getTasksByProject(project.id);
            const days = daysUntil(project.target_date);
            const overdue = days !== null && days < 0 && project.status === "active";
            const dueSoon = days !== null && days >= 0 && days <= 3 && project.status === "active";

            return (
              <Card
                key={project.id}
                className="hover:shadow-xl hover:border-blue-500/40 transition-all duration-200 group border-border/80 bg-card overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Top Color Stripe */}
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: project.color || "#3b82f6" }}
                  />

                  <CardContent className="p-6 space-y-4">
                    {/* Title & Action Buttons */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="p-2.5 rounded-xl shrink-0 shadow-sm mt-0.5"
                          style={{ backgroundColor: `${project.color || "#3b82f6"}20` }}
                        >
                          <FolderOpen
                            className="h-5 w-5"
                            style={{ color: project.color || "#3b82f6" }}
                          />
                        </div>
                        <div className="min-w-0">
                          <Link href={`/app/projects/${project.id}`} className="block">
                            <h3 className="font-bold text-lg leading-tight text-foreground group-hover:text-blue-500 transition-colors truncate">
                              {project.name}
                            </h3>
                          </Link>
                          {project.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => openEdit(project)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar Projeto"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => askDelete(project)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Excluir Projeto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {project.status === "active" && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[11px] font-semibold">
                          🟢 Ativo
                        </Badge>
                      )}
                      {project.status === "completed" && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-[11px] font-semibold">
                          ✅ Concluído
                        </Badge>
                      )}
                      {project.status === "archived" && (
                        <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/30 text-[11px] font-semibold">
                          📦 Arquivado
                        </Badge>
                      )}
                      {overdue && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 text-[11px] font-semibold">
                          ⚠️ Atrasado
                        </Badge>
                      )}
                      {dueSoon && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[11px] font-semibold">
                          ⏰ Vence em {days}d
                        </Badge>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Progresso Global</span>
                        <span className="font-mono text-foreground">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2 bg-muted/60" />
                    </div>

                    {/* Task Stats & Target Date */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/40 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-blue-500" />
                        <span>{projectTasks.length} tarefas</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{formatDate(project.target_date)}</span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Footer Action */}
                <div className="px-6 pb-5 pt-0">
                  <Button asChild variant="outline" className="w-full h-9 text-xs font-semibold justify-between border-border/80 hover:bg-muted group/btn">
                    <Link href={`/app/projects/${project.id}`}>
                      <span>Acessar Painel do Projeto</span>
                      <ArrowRight className="h-3.5 w-3.5 text-blue-500 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Dialogs */}
      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
      />
      {deleteConfirm.dialog}
    </div>
  );
}