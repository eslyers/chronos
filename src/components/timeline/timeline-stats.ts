import type { Project, Task } from "@/lib/context/DataContext";
import { isTaskDone, isTaskOverdue } from "@/lib/task-status";
import { todayDateOnly } from "@/lib/date-only";

export interface TimelineStats {
  totalProjects: number;
  totalTasks: number;
  completed: number;
  overdue: number;
  completionRate: number;
  isFiltered: boolean;
}

// KPIs do escopo atual da timeline ("all" = todos os projetos)
export function computeTimelineStats(
  projects: Project[],
  getTasksByProject: (projectId: string) => Task[],
  selectedProjectId: string,
  today: string = todayDateOnly()
): TimelineStats {
  const inScopeProjects =
    selectedProjectId === "all"
      ? projects
      : projects.filter((p) => p.id === selectedProjectId);

  const inScopeTasks = inScopeProjects.flatMap((p) => getTasksByProject(p.id));
  const completed = inScopeTasks.filter((t) => isTaskDone(t)).length;
  const overdue = inScopeTasks.filter((t) => isTaskOverdue(t, today)).length;

  const completionRate = inScopeTasks.length > 0 ? Math.round((completed / inScopeTasks.length) * 100) : 0;

  return {
    totalProjects: inScopeProjects.length,
    totalTasks: inScopeTasks.length,
    completed,
    overdue,
    completionRate,
    isFiltered: selectedProjectId !== "all",
  };
}
