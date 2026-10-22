/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// Provider que delega CRUD entre Supabase e localStorage conforme mode.
import { isSupabaseConfigured } from "@/lib/supabase/mode";
import {
  fetchAllProjects,
  fetchProjectById,
  cloneProjectRpc,
  fetchAllStages,
  fetchAllTasks,
  fetchAllDependencies,
  fetchProjectsBatchDetails,
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
import type { Stage } from "@/lib/data/models";

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

  loadProjectsOnly: async () => {
    if (getDataLayer() !== "supabase") return null;
    const projects = await fetchAllProjects();
    return { projects };
  },

  cloneProjectRpc,

  getProjectById: async (id: string) => {
    if (getDataLayer() !== "supabase") return null;
    return await fetchProjectById(id);
  },

  loadProjectDetails: async (projectId: string) => {
    if (getDataLayer() !== "supabase") return null;
    const [stages, tasks] = await Promise.all([
      fetchAllStages([projectId]),
      fetchAllTasks([projectId]),
    ]);
    const taskIds = tasks.map((t) => t.id);
    const dependencies = await fetchAllDependencies(taskIds);
    return { stages, tasks, dependencies };
  },

  loadProjectsBatch: async (projectIds: string[]) => {
    if (getDataLayer() !== "supabase") return null;
    return await fetchProjectsBatchDetails(projectIds);
  },

  createProject: async (input: {
    name: string;
    description?: string;
    color?: string;
    start_date?: string;
    target_date?: string;
    templateId?: string;
    track_time?: boolean;
    customStages?: Array<{ name: string; color: string; sort_order: number; wip_limit?: number | null; is_done?: boolean }>;
    useDefaultStages?: boolean;
  }) => {
    if (getDataLayer() !== "supabase") return null;
    const { workspaceId, userId } = await loadWorkspaceContext();
    if (!workspaceId) {
      throw new Error("Nenhum workspace ativo encontrado para o usuário");
    }
    const project = await supabaseCreateProject({
      name: input.name,
      description: input.description,
      color: input.color,
      start_date: input.start_date,
      target_date: input.target_date,
      workspace_id: workspaceId,
      created_by: userId || null,
      track_time: input.track_time,
    });

    type StageInput = { name: string; color: string; sort_order: number; wip_limit?: number | null; is_done?: boolean };
    const createStages = async (list: StageInput[]) => {
      const created: Stage[] = [];
      for (const s of list) {
        created.push(
          await supabaseCreateStage({
            project_id: project.id,
            name: s.name,
            color: s.color,
            sort_order: s.sort_order,
            wip_limit: s.wip_limit ?? null,
            is_done: s.is_done ?? false,
          })
        );
      }
      return created;
    };

    // Sem transação no client: se as etapas falharem, desfaz o projeto em vez
    // de deixá-lo incompleto.
    try {
      // Caminho 1: customStages enviado (lista já customizada pelo user no editor)
      if (input.customStages && input.customStages.length > 0) {
        return { project, stages: await createStages(input.customStages) };
      }

      // Caminho 2: templateId — clona as stages do template
      if (input.templateId) {
        const { createSPAClient } = await import("@/lib/supabase/client");
        const supabase = createSPAClient();
        const { data: tpl, error: tplError } = await supabase
          .from("templates")
          .select("stages")
          .eq("id", input.templateId)
          .single();
        if (tplError) throw new Error(`Falha ao carregar template: ${tplError.message}`);
        const templateStages = ((tpl as { stages?: unknown } | null)?.stages as StageInput[]) ?? [];
        return { project, stages: await createStages(templateStages) };
      }

      // Caminho 3: useDefaultStages=false → projeto sem stages (user cria depois)
      if (input.useDefaultStages === false) {
        return { project, stages: [] };
      }

      // Caminho 4 (fallback): 5 stages padrão (backlog, a fazer, em progresso, em revisão, concluído)
      const stages = await createDefaultStages(project.id);
      return { project, stages };
    } catch (err) {
      await supabaseDeleteProject(project.id).catch((cleanupErr) =>
        console.error("[dataProvider.createProject] Falha ao desfazer projeto incompleto:", cleanupErr)
      );
      throw err;
    }
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

// ────────────────────────────────────────────────────────────────────────────
// DEPENDENCIES — exposto via dataProvider
// ────────────────────────────────────────────────────────────────────────────
import {
  fetchProjectDependencies,
  createTaskDependency as supabaseCreateDependency,
  deleteTaskDependency as supabaseDeleteDependency,
  wouldCreateCycle as checkCycle,
} from "./supabase-data";

export const dependencyProvider = {
  fetchProject: fetchProjectDependencies,
  create: supabaseCreateDependency,
  delete: supabaseDeleteDependency,
  wouldCreateCycle: checkCycle,
};
