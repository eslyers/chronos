/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// Provider que delega CRUD entre Supabase e localStorage conforme mode.
import { isSupabaseConfigured } from "@/lib/supabase/mode";
import {
  fetchAllProjects,
  fetchAllStages,
  fetchAllTasks,
  fetchAllDependencies,
  createProject as supabaseCreateProject,
  createDefaultStages,
  updateProject as supabaseUpdateProject,
  deleteProject as supabaseDeleteProject,
  createStage as supabaseCreateStage,
  updateStage as supabaseUpdateStage,
  deleteStage as supabaseDeleteStage,
  createTask as supabaseCreateTask,
  updateTask as supabaseUpdateTask,
  moveTaskToStage,
  deleteTask as supabaseDeleteTask,
  getCurrentWorkspaceId,
} from "@/lib/data/supabase-data";

// ─────────────────────────────────────────────────────────────
// CHRONOS — Data Provider
// Camada de abstração: usa Supabase se configurado,
// senão cai pro localStorage (mantém compatibilidade demo).
// ─────────────────────────────────────────────────────────────

export type DataLayer = "supabase" | "local";

export function getDataLayer(): DataLayer {
  return isSupabaseConfigured() ? "supabase" : "local";
}

export async function getCurrentUserId(): Promise<string> {
  if (getDataLayer() === "supabase") {
    const { createSPAClient } = await import("@/lib/supabase/client");
    const supabase = createSPAClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) return data.user.id;
  }
  return "local-user-esly";
}

export async function loadWorkspaceContext(): Promise<{ workspaceId: string | null; userId: string }> {
  if (getDataLayer() === "supabase") {
    const wsId = await getCurrentWorkspaceId();
    const { createSPAClient } = await import("@/lib/supabase/client");
    const supabase = createSPAClient();
    const { data } = await supabase.auth.getUser();
    return {
      workspaceId: wsId,
      userId: data?.user?.id ?? "",
    };
  }
  return {
    workspaceId: "ws-local",
    userId: "local-user-esly",
  };
}

export const dataProvider = {
  load: async () => {
    if (getDataLayer() !== "supabase") return null;
    const projects = await fetchAllProjects();
    const projectIds = projects.map((p) => p.id);
    const [stages, tasks] = await Promise.all([
      fetchAllStages(projectIds),
      fetchAllTasks(projectIds),
    ]);
    const taskIds = tasks.map((t) => t.id);
    const dependencies = await fetchAllDependencies(taskIds);
    return { projects, stages, tasks, dependencies };
  },

  createProject: async (input: { name: string; description?: string; color?: string }) => {
    if (getDataLayer() !== "supabase") return null;
    const { workspaceId, userId } = await loadWorkspaceContext();
    if (!workspaceId) return null;
    const project = await supabaseCreateProject({
      name: input.name,
      description: input.description,
      color: input.color,
      workspace_id: workspaceId,
      created_by: userId,
    });
    if (project) {
      const stages = await createDefaultStages(project.id);
      return { project, stages };
    }
    return null;
  },

  updateProject: supabaseUpdateProject,
  deleteProject: supabaseDeleteProject,
  createStage: supabaseCreateStage,
  updateStage: supabaseUpdateStage,
  deleteStage: supabaseDeleteStage,
  createTask: supabaseCreateTask,
  updateTask: supabaseUpdateTask,
  moveTask: moveTaskToStage,
  deleteTask: supabaseDeleteTask,
};
