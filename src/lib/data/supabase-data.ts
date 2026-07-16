
// ─────────────────────────────────────────────────────────────
// CHRONOS — Supabase Data Layer
// Migra o DataContext do localStorage pro Postgres real do Supabase.
// Usa schemas snake_case (DB) e converte pra camelCase (UI).
// Tipos do Supabase estão como `never` porque não geramos `supabase gen types`
// ainda. Quando rodar `npx supabase gen types typescript`, regenerar.
// ─────────────────────────────────────────────────────────────

import { createSPAClient as createSPAClientRaw } from "@/lib/supabase/client";

interface SupabaseAny {
  from: (table: string) => any;
  auth: any;
}

function client(): SupabaseAny {
  return createSPAClientRaw() as any;
}

import type {
  Project,
  Stage,
  Task,
  TaskDependency,
} from "@/lib/context/DataContext";

// ─────────────────────────────────────────────────────────────
// CHRONOS — Supabase Data Layer
// Migra o DataContext do localStorage pro Postgres real do Supabase.
// Usa schemas snake_case (DB) e converte pra camelCase (UI).
// ─────────────────────────────────────────────────────────────

type DbProject = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  start_date: string | null;
  target_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type DbStage = {
  id: string;
  project_id: string;
  name: string;
  color: string;
  sort_order: number;
  wip_limit: number | null;
  is_done: boolean;
  created_at: string;
};

type DbTask = {
  id: string;
  stage_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  progress: number;
  estimated_hours: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type DbTaskDependency = {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: string;
  created_at: string;
};

function dbToProject(d: DbProject): Project {
  return {
    id: d.id,
    workspace_id: d.workspace_id,
    owner_id: d.created_by ?? "",
    name: d.name,
    description: d.description,
    color: d.color,
    status: d.status as Project["status"],
    start_date: d.start_date,
    target_date: d.target_date,
    progress: 0,
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

function dbToStage(d: DbStage): Stage {
  return {
    id: d.id,
    project_id: d.project_id,
    name: d.name,
    color: d.color,
    position: d.sort_order,
    is_done: d.is_done,
  };
}

function dbToTask(d: DbTask): Task {
  return {
    id: d.id,
    project_id: d.project_id,
    stage_id: d.stage_id,
    title: d.title,
    description: d.description,
    priority: d.priority as Task["priority"],
    status: d.status as Task["status"],
    progress: d.progress,
    start_date: d.start_date,
    due_date: d.due_date,
    assignee_id: d.assignee_id,
    position: 0,
    parent_task_id: (d as { parent_task_id?: string | null }).parent_task_id ?? null,
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

function dbToDependency(d: DbTaskDependency): TaskDependency {
  return {
    id: d.id,
    task_id: d.task_id,
    depends_on_task_id: d.depends_on_task_id,
    type: (d.dependency_type ?? "FS") as TaskDependency["type"],
  };
}

// ─────────────────────────────────────────────────────────────
// CRUD Operations via Supabase
// ─────────────────────────────────────────────────────────────

export async function fetchAllProjects(): Promise<Project[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[supabase-data] fetchAllProjects", error);
    return [];
  }
  return (data ?? []).map(dbToProject);
}

export async function fetchAllStages(projectIds: string[]): Promise<Stage[]> {
  if (projectIds.length === 0) return [];
  const supabase = client();
  const { data, error } = await supabase
    .from("stages")
    .select("*")
    .in("project_id", projectIds)
    .order("sort_order");
  if (error) {
    console.error("[supabase-data] fetchAllStages", error);
    return [];
  }
  return (data ?? []).map(dbToStage);
}

export async function fetchAllTasks(projectIds: string[]): Promise<Task[]> {
  if (projectIds.length === 0) return [];
  const supabase = client();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .in("project_id", projectIds);
  if (error) {
    console.error("[supabase-data] fetchAllTasks", error);
    return [];
  }
  return (data ?? []).map(dbToTask);
}

export async function fetchAllDependencies(taskIds: string[]): Promise<TaskDependency[]> {
  if (taskIds.length === 0) return [];
  const supabase = client();
  const { data, error } = await supabase
    .from("task_dependencies")
    .select("*")
    .in("task_id", taskIds);
  if (error) {
    console.error("[supabase-data] fetchAllDependencies", error);
    return [];
  }
  return (data ?? []).map(dbToDependency);
}

export async function createProject(input: {
  name: string;
  description?: string | null;
  color?: string;
  workspace_id: string;
  created_by: string;
}): Promise<Project | null> {
  const supabase = client();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: input.workspace_id,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? "#f97316",
      created_by: input.created_by,
    } as any)
    .select()
    .single();
  if (error) {
    console.error("[supabase-data] createProject", error);
    return null;
  }
  return dbToProject(data);
}

export async function createDefaultStages(projectId: string): Promise<Stage[]> {
  const supabase = client();
  const stages = [
    { name: "Backlog", color: "#94a3b8", sort_order: 0, is_done: false },
    { name: "A Fazer", color: "#3b82f6", sort_order: 1, is_done: false },
    { name: "Em Progresso", color: "#f59e0b", sort_order: 2, is_done: false },
    { name: "Em Revisão", color: "#a855f7", sort_order: 3, is_done: false },
    { name: "Concluído", color: "#10b981", sort_order: 4, is_done: true },
  ];
  const { data, error } = await supabase
    .from("stages")
    .insert(stages.map((s) => ({ ...s, project_id: projectId })) as any)
    .select();
  if (error) {
    console.error("[supabase-data] createDefaultStages", error);
    return [];
  }
  return (data ?? []).map(dbToStage);
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<void> {
  const supabase = client();
  const payload: any = {
    name: patch.name,
    description: patch.description,
    color: patch.color,
    status: patch.status,
    start_date: patch.start_date,
    target_date: patch.target_date,
  };
  const { error } = await supabase.from("projects").update(payload).eq("id", id);
  if (error) console.error("[supabase-data] updateProject", error);
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = client();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) console.error("[supabase-data] deleteProject", error);
}

export async function createTask(input: {
  project_id: string;
  stage_id: string;
  title: string;
  description?: string | null;
  status?: Task["status"];
  priority?: Task["priority"];
  due_date?: string | null;
  start_date?: string | null;
  parent_task_id?: string | null;
  created_by: string;
}): Promise<Task | null> {
  const supabase = client();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: input.project_id,
      stage_id: input.stage_id,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      due_date: input.due_date ?? null,
      start_date: input.start_date ?? null,
      parent_task_id: input.parent_task_id ?? null,
      created_by: input.created_by,
    } as any).select()
    .single();
  if (error) {
    console.error("[supabase-data] createTask", error);
    return null;
  }
  return dbToTask(data);
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const supabase = client();
  const payload: any = {
    title: patch.title,
    description: patch.description,
    status: patch.status,
    priority: patch.priority,
    stage_id: patch.stage_id,
    progress: patch.progress,
    due_date: patch.due_date,
    start_date: patch.start_date,
    parent_task_id: patch.parent_task_id,
    assignee_id: patch.assignee_id,
  };
  const { error } = await supabase.from("tasks").update(payload).eq("id", id);
  if (error) console.error("[supabase-data] updateTask", error);
}

export async function moveTaskToStage(taskId: string, stageId: string): Promise<void> {
  const supabase = client();
  const payload: any = { stage_id: stageId };
  const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
  if (error) console.error("[supabase-data] moveTaskToStage", error);
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = client();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) console.error("[supabase-data] deleteTask", error);
}

export async function createStage(input: {
  project_id: string;
  name: string;
  color?: string;
  sort_order: number;
  wip_limit?: number | null;
}): Promise<Stage | null> {
  const supabase = client();
  const payload: any = {
    project_id: input.project_id,
    name: input.name,
    color: input.color ?? "#f97316",
    sort_order: input.sort_order,
    wip_limit: input.wip_limit ?? null,
  };
  const { data, error } = await supabase.from("stages").insert(payload).select().single();
  if (error) {
    console.error("[supabase-data] createStage", error);
    return null;
  }
  return dbToStage(data);
}

export async function updateStage(id: string, patch: Partial<Stage>): Promise<void> {
  const supabase = client();
  const payload: any = {
    name: patch.name,
    color: patch.color,
    sort_order: patch.position,
    wip_limit: patch.is_done ?? undefined,
  };
  const { error } = await supabase.from("stages").update(payload).eq("id", id);
  if (error) console.error("[supabase-data] updateStage", error);
}

export async function deleteStage(id: string): Promise<void> {
  const supabase = client();
  const { error } = await supabase.from("stages").delete().eq("id", id);
  if (error) console.error("[supabase-data] deleteStage", error);
}

export async function getCurrentWorkspaceId(): Promise<string | null> {
  const supabase = client();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    console.error("[supabase-data] getCurrentUser", error);
    return null;
  }
  // Auto-criado pelo handle_new_user trigger
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", data.user.id)
    .limit(1)
    .single();
  return workspaces?.id ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// DEPENDENCIES — CRUD de dependências entre tasks
// ────────────────────────────────────────────────────────────────────────────

/** Busca todas as dependências das tasks de um projeto (otimizado) */
export async function fetchProjectDependencies(
  projectId: string
): Promise<TaskDependency[]> {
  const supabase = client();
  // 2 queries: tasks do projeto + deps onde task_id IN (tasks) OR depends_on_task_id IN (tasks)
  const { data: projectTasks, error: tasksErr } = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", projectId);
  if (tasksErr) {
    console.error("[supabase-data] fetchProjectDependencies (tasks)", tasksErr);
    return [];
  }
  const taskIds = (projectTasks ?? []).map((t: { id: string }) => t.id);
  if (taskIds.length === 0) return [];

  // Busca deps onde task_id está nas tasks do projeto OU depends_on_task_id está
  const { data, error } = await supabase
    .from("task_dependencies")
    .select("*")
    .or(`task_id.in.(${taskIds.join(",")}),depends_on_task_id.in.(${taskIds.join(",")})`);
  if (error) {
    console.error("[supabase-data] fetchProjectDependencies", error);
    return [];
  }
  return (data ?? []).map(dbToDependency);
}

/** Cria uma dependência (task A depende de task B) */
export async function createTaskDependency(input: {
  task_id: string;
  depends_on_task_id: string;
  type?: "FS" | "SS" | "FF" | "SF";
}): Promise<TaskDependency | null> {
  if (input.task_id === input.depends_on_task_id) {
    throw new Error("Uma tarefa não pode depender de si mesma");
  }
  const supabase = client();
  const { data, error } = await supabase
    .from("task_dependencies")
    .insert({
      task_id: input.task_id,
      depends_on_task_id: input.depends_on_task_id,
      dependency_type: input.type ?? "FS",
    })
    .select("*")
    .single();
  if (error) {
    console.error("[supabase-data] createTaskDependency", error);
    throw new Error(error.message);
  }
  return dbToDependency(data);
}

/** Remove uma dependência por id */
export async function deleteTaskDependency(id: string): Promise<void> {
  const supabase = client();
  const { error } = await supabase.from("task_dependencies").delete().eq("id", id);
  if (error) {
    console.error("[supabase-data] deleteTaskDependency", error);
    throw new Error(error.message);
  }
}

/** Detecta se adicionar a dep (taskId → dependsOnTaskId) criaria ciclo no DAG */
export function wouldCreateCycle(
  taskId: string,
  dependsOnTaskId: string,
  allDeps: TaskDependency[]
): boolean {
  // Constroi mapa: task → [depends_on_task_ids]
  const adj = new Map<string, string[]>();
  for (const d of allDeps) {
    if (!adj.has(d.task_id)) adj.set(d.task_id, []);
    adj.get(d.task_id)!.push(d.depends_on_task_id);
  }

  // BFS/DFS a partir de dependsOnTaskId; se chegar em taskId, há ciclo
  // (porque taskId passaria a depender transitivamente de si mesmo)
  const visited = new Set<string>();
  const stack = [dependsOnTaskId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === taskId) return true; // ciclo detectado
    if (visited.has(current)) continue;
    visited.add(current);
    const next = adj.get(current) ?? [];
    for (const n of next) stack.push(n);
  }
  return false;
}
