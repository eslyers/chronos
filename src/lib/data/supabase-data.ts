// ─────────────────────────────────────────────────────────────
// CHRONOS — Supabase Data Layer
// Migra o DataContext do localStorage pro Postgres real do Supabase.
// Usa schemas snake_case (DB) e converte pra camelCase (UI).
// ─────────────────────────────────────────────────────────────

import { createSPAClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types";
import type {
  Project,
  Stage,
  Task,
  TaskDependency,
} from "@/lib/context/DataContext";

function client() {
  return createSPAClient();
}

type DbProject = Database["public"]["Tables"]["projects"]["Row"];
type DbStage = Database["public"]["Tables"]["stages"]["Row"];
type DbTask = Database["public"]["Tables"]["tasks"]["Row"];
type DbTaskDependency = Database["public"]["Tables"]["task_dependencies"]["Row"];

function dbToProject(d: DbProject): Project {
  return {
    id: d.id,
    workspace_id: d.workspace_id,
    owner_id: d.created_by ?? "",
    name: d.name,
    description: d.description,
    color: d.color ?? "#3b82f6",
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
    color: d.color ?? "#3b82f6",
    position: d.sort_order,
    is_done: d.is_done,
    wip_limit: d.wip_limit,
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
    assignee_name: d.assignee_name ?? null,
    assignee_status: (d.assignee_status as Task["assignee_status"]) ?? null,
    position: d.position ?? 0,
    parent_task_id: d.parent_task_id ?? null,
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
  return ((data as DbProject[] | null) ?? []).map(dbToProject);
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
  return ((data as DbStage[] | null) ?? []).map(dbToStage);
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
  return ((data as DbTask[] | null) ?? []).map(dbToTask);
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
  return ((data as DbTaskDependency[] | null) ?? []).map(dbToDependency);
}

export async function createProject(input: {
  name: string;
  description?: string | null;
  color?: string;
  workspace_id: string;
  created_by: string;
}): Promise<Project | null> {
  const supabase = client();
  const payload: Database["public"]["Tables"]["projects"]["Insert"] = {
    workspace_id: input.workspace_id,
    name: input.name,
    description: input.description ?? null,
    color: input.color ?? "#3b82f6",
    created_by: input.created_by,
  };
  const { data, error } = await supabase
    .from("projects")
    .insert(payload as any)
    .select()
    .single();
  if (error) {
    console.error("[supabase-data] createProject", error);
    return null;
  }
  return dbToProject(data as DbProject);
}

export async function createDefaultStages(projectId: string): Promise<Stage[]> {
  const supabase = client();
  const stages: Database["public"]["Tables"]["stages"]["Insert"][] = [
    { project_id: projectId, name: "Backlog", color: "#94a3b8", sort_order: 0, is_done: false },
    { project_id: projectId, name: "A Fazer", color: "#3b82f6", sort_order: 1, is_done: false },
    { project_id: projectId, name: "Em Progresso", color: "#3b82f6", sort_order: 2, is_done: false },
    { project_id: projectId, name: "Em Revisão", color: "#a855f7", sort_order: 3, is_done: false },
    { project_id: projectId, name: "Concluído", color: "#10b981", sort_order: 4, is_done: true },
  ];
  const { data, error } = await supabase
    .from("stages")
    .insert(stages as any)
    .select();
  if (error) {
    console.error("[supabase-data] createDefaultStages", error);
    return [];
  }
  return ((data as DbStage[] | null) ?? []).map(dbToStage);
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<void> {
  const supabase = client();
  const payload: Database["public"]["Tables"]["projects"]["Update"] = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.color !== undefined) payload.color = patch.color;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.start_date !== undefined) payload.start_date = patch.start_date;
  if (patch.target_date !== undefined) payload.target_date = patch.target_date;

  const { error } = await (supabase.from("projects") as any).update(payload).eq("id", id);
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
  assignee_id?: string | null;
  assignee_name?: string | null;
  assignee_status?: Task["assignee_status"];
  created_by: string;
}): Promise<Task | null> {
  const supabase = client();
  const payload: Database["public"]["Tables"]["tasks"]["Insert"] = {
    project_id: input.project_id,
    stage_id: input.stage_id,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "todo",
    priority: input.priority ?? "medium",
    due_date: input.due_date ?? null,
    start_date: input.start_date ?? null,
    parent_task_id: input.parent_task_id ?? null,
    assignee_id: input.assignee_id ?? null,
    assignee_name: input.assignee_name ?? null,
    assignee_status: input.assignee_status ?? null,
    created_by: input.created_by,
  };
  const { data, error } = await (supabase.from("tasks") as any)
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("[supabase-data] createTask", error);
    return null;
  }
  return dbToTask(data as DbTask);
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const supabase = client();
  const payload: Database["public"]["Tables"]["tasks"]["Update"] = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.priority !== undefined) payload.priority = patch.priority;
  if (patch.stage_id !== undefined && patch.stage_id !== null) payload.stage_id = patch.stage_id;
  if (patch.progress !== undefined) payload.progress = patch.progress;
  if (patch.due_date !== undefined) payload.due_date = patch.due_date;
  if (patch.start_date !== undefined) payload.start_date = patch.start_date;
  if (patch.parent_task_id !== undefined) payload.parent_task_id = patch.parent_task_id;
  if (patch.assignee_id !== undefined) payload.assignee_id = patch.assignee_id;
  if (patch.assignee_name !== undefined) payload.assignee_name = patch.assignee_name;
  if (patch.assignee_status !== undefined) payload.assignee_status = patch.assignee_status;

  const { error } = await (supabase.from("tasks") as any).update(payload).eq("id", id);
  if (error) console.error("[supabase-data] updateTask", error);
}

export async function moveTaskToStage(taskId: string, stageId: string, position?: number): Promise<void> {
  const supabase = client();
  const payload: Database["public"]["Tables"]["tasks"]["Update"] = { stage_id: stageId };
  if (typeof position === "number") {
    payload.position = position;
  }
  const { error } = await (supabase.from("tasks") as any).update(payload).eq("id", taskId);
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
  const payload: Database["public"]["Tables"]["stages"]["Insert"] = {
    project_id: input.project_id,
    name: input.name,
    color: input.color ?? "#3b82f6",
    sort_order: input.sort_order,
    wip_limit: input.wip_limit ?? null,
  };
  const { data, error } = await (supabase.from("stages") as any).insert(payload).select().single();
  if (error) {
    console.error("[supabase-data] createStage", error);
    return null;
  }
  return dbToStage(data as DbStage);
}

export async function updateStage(id: string, patch: Partial<Stage>): Promise<void> {
  const supabase = client();
  const payload: Database["public"]["Tables"]["stages"]["Update"] = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.color !== undefined) payload.color = patch.color;
  if (patch.position !== undefined) payload.sort_order = patch.position;
  if (patch.is_done !== undefined) payload.is_done = patch.is_done;
  if (patch.wip_limit !== undefined) payload.wip_limit = patch.wip_limit;

  const { error } = await (supabase.from("stages") as any).update(payload).eq("id", id);
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
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", data.user.id)
    .limit(1)
    .single();
  return (workspaces as { id: string } | null)?.id ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// DEPENDENCIES — CRUD de dependências entre tasks
// ────────────────────────────────────────────────────────────────────────────

/** Busca todas as dependências das tasks de um projeto (otimizado) */
export async function fetchProjectDependencies(
  projectId: string
): Promise<TaskDependency[]> {
  const supabase = client();
  const { data: projectTasks, error: tasksErr } = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", projectId);
  if (tasksErr) {
    console.error("[supabase-data] fetchProjectDependencies (tasks)", tasksErr);
    return [];
  }
  const taskIds = ((projectTasks as { id: string }[] | null) ?? []).map((t) => t.id);
  if (taskIds.length === 0) return [];

  const { data, error } = await supabase
    .from("task_dependencies")
    .select("*")
    .or(`task_id.in.(${taskIds.join(",")}),depends_on_task_id.in.(${taskIds.join(",")})`);
  if (error) {
    console.error("[supabase-data] fetchProjectDependencies", error);
    return [];
  }
  return ((data as DbTaskDependency[] | null) ?? []).map(dbToDependency);
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
  const payload: Database["public"]["Tables"]["task_dependencies"]["Insert"] = {
    task_id: input.task_id,
    depends_on_task_id: input.depends_on_task_id,
    dependency_type: input.type ?? "FS",
  };
  const { data, error } = await supabase
    .from("task_dependencies")
    .insert(payload as any)
    .select("*")
    .single();
  if (error) {
    console.error("[supabase-data] createTaskDependency", error);
    throw new Error(error.message);
  }
  return dbToDependency(data as DbTaskDependency);
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
  const adj = new Map<string, string[]>();
  for (const d of allDeps) {
    if (!adj.has(d.task_id)) adj.set(d.task_id, []);
    adj.get(d.task_id)!.push(d.depends_on_task_id);
  }

  const visited = new Set<string>();
  const stack = [dependsOnTaskId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const next = adj.get(current) ?? [];
    for (const n of next) stack.push(n);
  }
  return false;
}
