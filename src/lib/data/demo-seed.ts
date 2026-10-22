// ─────────────────────────────────────────────────────────────
// CHRONOS — Dados de demonstração (modo local, sem Supabase)
// ─────────────────────────────────────────────────────────────
import type { DataState, Project, Stage, Task } from "@/lib/data/models";

export const USER_ID = "local-user-esly"; // mock user id

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function defaultStagesForProject(projectId: string): Stage[] {
  return [
    { id: generateId("stage"), project_id: projectId, name: "Backlog", color: "#94a3b8", position: 0, is_done: false },
    { id: generateId("stage"), project_id: projectId, name: "A Fazer", color: "#3b82f6", position: 1, is_done: false },
    { id: generateId("stage"), project_id: projectId, name: "Em Progresso", color: "#3b82f6", position: 2, is_done: false },
    { id: generateId("stage"), project_id: projectId, name: "Em Revisão", color: "#a855f7", position: 3, is_done: false },
    { id: generateId("stage"), project_id: projectId, name: "Concluído", color: "#10b981", position: 4, is_done: true },
  ];
}

export function seedMockData(): DataState {
  const now = new Date();
  const projectId1 = generateId("project");
  const projectId2 = generateId("project");

  const stagesP1 = defaultStagesForProject(projectId1);
  const stagesP2 = defaultStagesForProject(projectId2);

  const project1: Project = {
    id: projectId1,
    workspace_id: "ws-local",
    owner_id: USER_ID,
    name: "CHRONOS MVP",
    description: "Sistema de gestão de cronograma — Sprint 2 em diante",
    color: "#3b82f6",
    status: "active",
    start_date: new Date(now.getTime() - 14 * 86400000).toISOString(),
    target_date: new Date(now.getTime() + 30 * 86400000).toISOString(),
    progress: 35,
    track_time: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const project2: Project = {
    id: projectId2,
    workspace_id: "ws-local",
    owner_id: USER_ID,
    name: "Lançamento Produto Q4",
    description: "Plano completo de lançamento com etapas, dependências e notificações",
    color: "#a855f7",
    status: "active",
    start_date: new Date(now.getTime() - 7 * 86400000).toISOString(),
    target_date: new Date(now.getTime() + 60 * 86400000).toISOString(),
    progress: 12,
    track_time: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const tasks: Task[] = [
    // CHRONOS MVP
    {
      id: generateId("task"),
      project_id: projectId1,
      stage_id: stagesP1[1].id, // A Fazer
      title: "Implementar CRUD de Projects",
      description: "Modal de criar/editar projeto, com validação de campos",
      priority: "high",
      status: "todo",
      progress: 0,
      start_date: new Date().toISOString(),
      due_date: new Date(now.getTime() + 2 * 86400000).toISOString(),
      assignee_id: USER_ID,
      assignee_name: null,
      assignee_status: null,
      position: 0,
      parent_task_id: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: generateId("task"),
      project_id: projectId1,
      stage_id: stagesP1[2].id, // Em Progresso
      title: "Schema DB aplicado no Supabase",
      description: "Rodar migration no Supabase production",
      priority: "critical",
      status: "in_progress",
      progress: 50,
      start_date: new Date(now.getTime() - 1 * 86400000).toISOString(),
      due_date: new Date(now.getTime() + 1 * 86400000).toISOString(),
      assignee_id: USER_ID,
      assignee_name: null,
      assignee_status: null,
      position: 0,
      parent_task_id: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: generateId("task"),
      project_id: projectId1,
      stage_id: stagesP1[4].id, // Concluído
      title: "Definir identidade visual",
      description: "Paleta azul corporativa + tipografia + logo conceitual",
      priority: "medium",
      status: "done",
      progress: 100,
      start_date: new Date(now.getTime() - 7 * 86400000).toISOString(),
      due_date: new Date(now.getTime() - 5 * 86400000).toISOString(),
      assignee_id: USER_ID,
      assignee_name: null,
      assignee_status: null,
      position: 0,
      parent_task_id: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    // Lançamento
    {
      id: generateId("task"),
      project_id: projectId2,
      stage_id: stagesP2[0].id, // Backlog
      title: "Pesquisa de mercado",
      description: "Levantar concorrentes e definir positioning",
      priority: "medium",
      status: "todo",
      progress: 0,
      start_date: new Date(now.getTime() + 5 * 86400000).toISOString(),
      due_date: new Date(now.getTime() + 14 * 86400000).toISOString(),
      assignee_id: USER_ID,
      assignee_name: null,
      assignee_status: null,
      position: 0,
      parent_task_id: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];

  return {
    projects: [project1, project2],
    stages: [...stagesP1, ...stagesP2],
    tasks,
    dependencies: [],
    loading: false,
  };
}
