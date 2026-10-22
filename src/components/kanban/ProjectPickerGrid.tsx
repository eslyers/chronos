"use client";

import { FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Project, Stage, Task } from "@/lib/context/DataContext";
import { isTaskDone as isTaskDoneStatus } from "@/lib/task-status";

/** Grade de seleção de projeto do Board Kanban (etapas, entregáveis e progresso). */
export function ProjectPickerGrid({
  projects,
  stages,
  tasks,
  onSelectProject,
}: {
  projects: Project[];
  stages: Stage[];
  tasks: Task[];
  onSelectProject: (projectId: string) => void;
}) {
  return (
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
            onClick={() => onSelectProject(project.id)}
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
  );
}
