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
} from "@/lib/data/models";

function client() {
  return createSPAClient();
}

type DbProject = Database["public"]["Tables"]["projects"]["Row"];
type DbStage = Database["public"]["Tables"]["stages"]["Row"];
type DbTask = Database["public"]["Tables"]["tasks"]["Row"];
type DbTaskDependency = Database["public"]["Tables"]["task_dependencies"]["Row"];

export function dbToProject(d: DbProject): Project {
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
    track_time: (d as unknown as { track_time?: boolean }).track_time !== false,
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
    estimated_hours: (d as any).estimated_hours ?? null,
    actual_hours: (d as any).actual_hours ?? null,
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
// Erros e paginação
// Todas as operações lançam DataLayerError em caso de falha: um erro de
// leitura não pode virar "lista vazia" e um erro de escrita não pode ser
// tratado como salvo.
// ─────────────────────────────────────────────────────────────

type PostgrestErrorLike = { message?: string; code?: string; details?: string | null };

export class DataLayerError extends Error {
  readonly operation: string;
  readonly code?: string;

  constructor(operation: string, error: PostgrestErrorLike) {
    super(error.message || "Erro desconhecido no banco de dados");
    this.name = "DataLayerError";
    this.operation = operation;
    this.code = error.code;
  }
}

function fail(operation: string, error: PostgrestErrorLike): never {
  console.error(`[supabase-data] ${operation}`, error);
  throw new DataLayerError(operation, error);
}

// PostgREST limita cada resposta (max-rows, padrão 1000) sem avisar
const PAGE_SIZE = 1000;
// Listas longas em .in() estouram o limite de tamanho da URL
const IN_CHUNK_SIZE = 100;

type PagedQuery = (
  from: number,
  to: number
) => PromiseLike<{ data: unknown[] | null; error: PostgrestErrorLike | null }>;

async function fetchAllPages<T>(operation: string, query: PagedQuery): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error) fail(operation, error);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function chunk<T>(items: T[], size = IN_CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// ─────────────────────────────────────────────────────────────
// CRUD Operations via Supabase
// ─────────────────────────────────────────────────────────────

export async function fetchAllProjects(): Promise<Project[]> {
  const supabase = client();
  const rows = await fetchAllPages<DbProject>("fetchAllProjects", (from, to) =>
    supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to)
  );
  return rows.map(dbToProject);
}

export async function fetchProjectById(id: string): Promise<Project | null> {
  const supabase = client();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .limit(1);
  if (error) fail("fetchProjectById", error);
  if (!data || data.length === 0) return null;
  return dbToProject(data[0] as DbProject);
}

export async function fetchAllStages(projectIds: string[]): Promise<Stage[]> {
  const supabase = client();
  const rows: DbStage[] = [];
  for (const ids of chunk(projectIds)) {
    rows.push(
      ...(await fetchAllPages<DbStage>("fetchAllStages", (from, to) =>
        supabase
          .from("stages")
          .select("*")
          .in("project_id", ids)
          .order("sort_order")
          .order("id")
          .range(from, to)
      ))
    );
  }
  return rows.map(dbToStage);
}

export async function fetchAllTasks(projectIds: string[]): Promise<Task[]> {
  const supabase = client();
  const rows: DbTask[] = [];
  for (const ids of chunk(projectIds)) {
    rows.push(
      ...(await fetchAllPages<DbTask>("fetchAllTasks", (from, to) =>
        supabase.from("tasks").select("*").in("project_id", ids).order("id").range(from, to)
      ))
    );
  }
  return rows.map(dbToTask);
}

export async function fetchAllDependencies(taskIds: string[]): Promise<TaskDependency[]> {
  const supabase = client();
  const rows: DbTaskDependency[] = [];
  for (const ids of chunk(taskIds)) {
    rows.push(
      ...(await fetchAllPages<DbTaskDependency>("fetchAllDependencies", (from, to) =>
        supabase.from("task_dependencies").select("*").in("task_id", ids).order("id").range(from, to)
      ))
    );
  }
  return rows.map(dbToDependency);
}

export async function fetchProjectsBatchDetails(projectIds: string[]): Promise<{
  stages: Stage[];
  tasks: Task[];
  dependencies: TaskDependency[];
}> {
  if (projectIds.length === 0) {
    return { stages: [], tasks: [], dependencies: [] };
  }
  const [stages, tasks] = await Promise.all([
    fetchAllStages(projectIds),
    fetchAllTasks(projectIds),
  ]);
  const taskIds = tasks.map((t) => t.id);
  const dependencies = await fetchAllDependencies(taskIds);
  return { stages, tasks, dependencies };
}

export async function createProject(input: {
  name: string;
  description?: string | null;
  color?: string;
  start_date?: string | null;
  target_date?: string | null;
  workspace_id: string;
  created_by?: string | null;
  track_time?: boolean;
}): Promise<Project> {
  const supabase = client();
  const payload: Record<string, any> = {
    workspace_id: input.workspace_id,
    name: input.name,
    description: input.description ?? null,
    color: input.color ?? "#3b82f6",
  };

  if (input.created_by) {
    payload.created_by = input.created_by;
  }
  if (input.start_date) {
    payload.start_date = input.start_date.split("T")[0];
  }
  if (input.target_date) {
    payload.target_date = input.target_date.split("T")[0];
  }
  if (input.track_time !== undefined) {
    payload.track_time = input.track_time !== false;
  }

  let { data, error } = await (supabase.from("projects") as any)
    .insert(payload)
    .select()
    .single();

  // Se a coluna track_time não existe no Postgres remoto do Supabase:
  if (error && (error.message?.includes("track_time") || error.code === "42703" || error.code === "PGRST204")) {
    console.warn("[supabase-data] createProject: coluna track_time ausente no banco, retentando sem track_time");
    delete payload.track_time;
    const retry = await (supabase.from("projects") as any)
      .insert(payload)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  // Se falhou por conta do created_by (ex: FK constraint para auth.users):
  if (error && (error.message?.includes("created_by") || error.code === "23503")) {
    console.warn("[supabase-data] createProject: erro em created_by, retentando sem created_by");
    delete payload.created_by;
    const retry = await (supabase.from("projects") as any)
      .insert(payload)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) fail("createProject", error);
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
  if (error) fail("createDefaultStages", error);
  return ((data as DbStage[] | null) ?? []).map(dbToStage);
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<void> {
  const supabase = client();
  const payload: Record<string, any> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.color !== undefined) payload.color = patch.color;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.start_date !== undefined) {
    payload.start_date = patch.start_date ? patch.start_date.split("T")[0] : null;
  }
  if (patch.target_date !== undefined) {
    payload.target_date = patch.target_date ? patch.target_date.split("T")[0] : null;
  }
  if (patch.track_time !== undefined) payload.track_time = patch.track_time;

  const { error } = await (supabase.from("projects") as any).update(payload).eq("id", id);
  if (error) fail("updateProject", error);
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = client();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) fail("deleteProject", error);
}

export async function createTask(input: {
  project_id: string;
  stage_id: string;
  title: string;
  description?: string | null;
  status?: Task["status"];
  priority?: Task["priority"];
  progress?: number;
  position?: number;
  due_date?: string | null;
  start_date?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  parent_task_id?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  assignee_status?: Task["assignee_status"];
  created_by: string;
}): Promise<Task> {
  const supabase = client();
  const payload: Database["public"]["Tables"]["tasks"]["Insert"] = {
    project_id: input.project_id,
    stage_id: input.stage_id,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "todo",
    priority: input.priority ?? "medium",
    progress: input.progress ?? 0,
    position: input.position ?? 0,
    due_date: input.due_date ?? null,
    start_date: input.start_date ?? null,
    estimated_hours: input.estimated_hours ?? null,
    actual_hours: input.actual_hours ?? null,
    parent_task_id: input.parent_task_id ?? null,
    assignee_id: input.assignee_id ?? null,
    assignee_name: input.assignee_name ?? null,
    assignee_status: input.assignee_status ?? null,
    created_by: input.created_by,
  };
  let { data, error } = await (supabase.from("tasks") as any)
    .insert(payload)
    .select()
    .single();

  if (error && error.message?.includes("actual_hours")) {
    delete (payload as any).actual_hours;
    const retry = await (supabase.from("tasks") as any)
      .insert(payload)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  // Se falhou por conta do created_by (ex: FK constraint):
  if (error && (error.message?.includes("created_by") || error.code === "23503")) {
    console.warn("[supabase-data] createTask: erro em created_by, retentando sem created_by");
    delete (payload as any).created_by;
    const retry = await (supabase.from("tasks") as any)
      .insert(payload)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) fail("createTask", error);
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
  if (patch.position !== undefined) payload.position = patch.position;
  if (patch.due_date !== undefined) payload.due_date = patch.due_date;
  if (patch.start_date !== undefined) payload.start_date = patch.start_date;
  if (patch.estimated_hours !== undefined) payload.estimated_hours = patch.estimated_hours;
  if (patch.actual_hours !== undefined) payload.actual_hours = patch.actual_hours;
  if (patch.parent_task_id !== undefined) payload.parent_task_id = patch.parent_task_id;
  if (patch.assignee_id !== undefined) payload.assignee_id = patch.assignee_id;
  if (patch.assignee_name !== undefined) payload.assignee_name = patch.assignee_name;
  if (patch.assignee_status !== undefined) payload.assignee_status = patch.assignee_status;

  let { error } = await (supabase.from("tasks") as any).update(payload).eq("id", id);
  if (error && error.message?.includes("actual_hours")) {
    delete (payload as any).actual_hours;
    const retry = await (supabase.from("tasks") as any).update(payload).eq("id", id);
    error = retry.error;
  }
  if (error) fail("updateTask", error);
}

export async function moveTaskToStage(taskId: string, stageId: string, position?: number): Promise<void> {
  const supabase = client();
  const payload: Database["public"]["Tables"]["tasks"]["Update"] = { stage_id: stageId };
  if (typeof position === "number") {
    payload.position = position;
  }
  const { error } = await (supabase.from("tasks") as any).update(payload).eq("id", taskId);
  if (error) fail("moveTaskToStage", error);
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = client();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) fail("deleteTask", error);
}

export async function createStage(input: {
  project_id: string;
  name: string;
  color?: string;
  sort_order: number;
  wip_limit?: number | null;
  is_done?: boolean;
}): Promise<Stage> {
  const supabase = client();
  const payload: Database["public"]["Tables"]["stages"]["Insert"] = {
    project_id: input.project_id,
    name: input.name,
    color: input.color ?? "#3b82f6",
    sort_order: input.sort_order,
    wip_limit: input.wip_limit ?? null,
    is_done: input.is_done ?? false,
  };
  const { data, error } = await (supabase.from("stages") as any).insert(payload).select().single();
  if (error) fail("createStage", error);
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
  if (error) fail("updateStage", error);
}

/**
 * Exclui uma etapa. tasks.stage_id é NOT NULL com ON DELETE CASCADE, então as
 * tarefas da etapa seriam apagadas junto: elas são movidas para
 * `moveTasksToStageId` antes da exclusão.
 */
export async function deleteStage(id: string, moveTasksToStageId?: string): Promise<void> {
  const supabase = client();
  if (moveTasksToStageId) {
    const { error: moveError } = await (supabase.from("tasks") as any)
      .update({ stage_id: moveTasksToStageId })
      .eq("stage_id", id);
    if (moveError) fail("deleteStage (mover tarefas)", moveError);
  }
  const { error } = await supabase.from("stages").delete().eq("id", id);
  if (error) fail("deleteStage", error);
}

export async function getCurrentWorkspaceId(): Promise<string | null> {
  const supabase = client();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  // Só cria um workspace novo se TODAS as consultas responderam "nenhum":
  // um erro transitório não pode gerar workspaces duplicados.
  let lookupFailed = false;

  if (userId) {
    // 0. Preferência salva no localStorage para este usuário (se válida)
    if (typeof window !== "undefined") {
      const savedWs =
        window.localStorage.getItem(`chronos:active_workspace_id:${userId}`) ||
        window.localStorage.getItem("chronos:active_workspace_id");
      if (savedWs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: check } = await (supabase.from("workspace_members") as any)
          .select("workspace_id")
          .eq("workspace_id", savedWs)
          .eq("user_id", userId)
          .maybeSingle();
        if (check?.workspace_id) {
          return check.workspace_id;
        }
      }
    }

    // 1. Verificar se o usuário pertence a algum workspace via workspace_members (ordenado pelos mais recentes)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: memberRows, error: memberErr } = await (supabase.from("workspace_members") as any)
      .select("workspace_id, role, joined_at")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const members = memberRows as Array<{ workspace_id: string; role: string; joined_at: string }> | null;
    if (memberErr) lookupFailed = true;
    if (!memberErr && members && members.length > 0 && members[0]?.workspace_id) {
      const selected = members[0].workspace_id;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`chronos:active_workspace_id:${userId}`, selected);
        window.localStorage.setItem("chronos:active_workspace_id", selected);
      }
      return selected;
    }

    // 2. Se não estiver em workspace_members, verificar se é owner direto na tabela workspaces
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ownedWs, error: ownerErr } = await (supabase.from("workspaces") as any)
      .select("id")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const owned = ownedWs as Array<{ id: string }> | null;
    if (ownerErr) lookupFailed = true;
    if (!ownerErr && owned && owned.length > 0 && owned[0]?.id) {
      return owned[0].id;
    }
  }

  // 3. Fallback: buscar o primeiro workspace acessível pelo usuário via RLS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: anyWs, error: anyErr } = await (supabase.from("workspaces") as any)
    .select("id")
    .order("created_at")
    .limit(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyList = anyWs as Array<{ id: string }> | null;
  if (anyErr) lookupFailed = true;
  if (!anyErr && anyList && anyList.length > 0 && anyList[0]?.id) {
    return anyList[0].id;
  }

  // 4. Se o usuário estiver autenticado mas não tiver NENHUM workspace, criar um automaticamente!
  if (userId && !lookupFailed) {
    try {
      const email = authData?.user?.email || "user";
      const slug = `ws-${email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}-${userId.slice(0, 6)}`;
      const { data: createdWs, error: createWsErr } = await (supabase
        .from("workspaces") as any)
        .insert({
          name: "Workspace Principal",
          slug,
          owner_id: userId,
        })
        .select("id")
        .limit(1);

      if (!createWsErr && createdWs && createdWs.length > 0 && createdWs[0].id) {
        // Adiciona como membro owner
        const { error: memberInsertErr } = await (supabase.from("workspace_members") as any).insert({
          workspace_id: createdWs[0].id,
          user_id: userId,
          role: "owner",
        });
        if (memberInsertErr) {
          console.error("[supabase-data] Auto-create workspace: falha ao adicionar owner", memberInsertErr);
        }
        return createdWs[0].id;
      }
    } catch (createErr) {
      console.error("[supabase-data] Auto-create workspace failed:", createErr);
    }
  }

  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// DEPENDENCIES — CRUD de dependências entre tasks
// ────────────────────────────────────────────────────────────────────────────

/** Busca todas as dependências das tasks de um projeto (otimizado) */
export async function fetchProjectDependencies(
  projectId: string
): Promise<TaskDependency[]> {
  const supabase = client();
  const projectTasks = await fetchAllPages<{ id: string }>("fetchProjectDependencies (tasks)", (from, to) =>
    supabase.from("tasks").select("id").eq("project_id", projectId).order("id").range(from, to)
  );
  const taskIds = projectTasks.map((t) => t.id);

  const byId = new Map<string, DbTaskDependency>();
  for (const ids of chunk(taskIds)) {
    for (const column of ["task_id", "depends_on_task_id"] as const) {
      const rows = await fetchAllPages<DbTaskDependency>("fetchProjectDependencies", (from, to) =>
        supabase.from("task_dependencies").select("*").in(column, ids).order("id").range(from, to)
      );
      rows.forEach((r) => byId.set(r.id, r));
    }
  }
  return [...byId.values()].map(dbToDependency);
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

/**
 * Clona um projeto no servidor (RPC clone_project, transacional).
 * Retorna o id do novo projeto, ou null se a função ainda não existe no
 * banco (migration 20261022000000 não aplicada) — o chamador usa o fluxo antigo.
 */
export async function cloneProjectRpc(
  sourceProjectId: string,
  name: string,
  options: {
    workspace_id?: string;
    description?: string | null;
    color?: string;
    start_date?: string | null;
    target_date?: string | null;
    track_time?: boolean;
    clone_tasks?: boolean;
    clone_dependencies?: boolean;
    reset_status?: boolean;
    keep_assignees?: boolean;
    date_offset_days?: number;
  }
): Promise<string | null> {
  const supabase = client();
  const { data, error } = await (supabase as any).rpc("clone_project", {
    p_source_project_id: sourceProjectId,
    p_name: name,
    p_options: options,
  });
  if (error) {
    // PGRST202: função não encontrada no schema cache; 42883: undefined_function
    if (error.code === "PGRST202" || error.code === "42883") return null;
    fail("cloneProjectRpc", error);
  }
  return data as string;
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

// ── Project Members Access Control ──────────────────────────

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  created_at: string;
  email?: string;
  full_name?: string | null;
  avatar_color?: string;
}

export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const supabase: any = client();
  const { data, error } = await supabase
    .from("project_members")
    .select(`
      id,
      project_id,
      user_id,
      role,
      created_at,
      profiles:profiles (email, full_name)
    `)
    .eq("project_id", projectId);

  if (error) {
    console.error("[supabase-data] fetchProjectMembers error:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    project_id: row.project_id,
    user_id: row.user_id,
    role: row.role,
    created_at: row.created_at,
    email: row.profiles?.email ?? "",
    full_name: row.profiles?.full_name ?? null,
    // profiles não tem coluna avatar_color; cor padrão
    avatar_color: "#3b82f6",
  }));
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: "owner" | "admin" | "member" | "viewer" = "member"
): Promise<{ ok: boolean; error?: string }> {
  const supabase: any = client();
  const { error } = await supabase
    .from("project_members")
    .upsert(
      { project_id: projectId, user_id: userId, role },
      { onConflict: "project_id,user_id" }
    );

  if (error) {
    console.error("[supabase-data] addProjectMember error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase: any = client();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) {
    console.error("[supabase-data] removeProjectMember error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
