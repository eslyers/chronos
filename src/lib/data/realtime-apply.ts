// ─────────────────────────────────────────────────────────────
// CHRONOS — Aplica eventos do Supabase Realtime ao estado local
// Função pura: recebe o estado e uma mudança (postgres_changes) e devolve o
// novo estado. A RLS já filtra o que o usuário pode receber; aqui só
// descartamos o que não interessa (projetos ainda não carregados) e
// evitamos que um evento atrasado sobrescreva um dado local mais novo.
// ─────────────────────────────────────────────────────────────
import type { Database } from "@/lib/types";
import type { DataState } from "@/lib/data/models";
import { dbToDependency, dbToProject, dbToStage, dbToTask } from "@/lib/data/supabase-data";

export type RealtimeTable = "projects" | "stages" | "tasks" | "task_dependencies";
export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE";

type Tables = Database["public"]["Tables"];

export type RealtimeChange = {
  table: RealtimeTable;
  eventType: RealtimeEventType;
  /** Linha nova (INSERT/UPDATE). */
  new: Record<string, unknown> | null;
  /** Linha antiga: no DELETE só garante a chave primária. */
  old: Record<string, unknown> | null;
};

export const REALTIME_TABLES: RealtimeTable[] = ["projects", "stages", "tasks", "task_dependencies"];

/** Mapa de projetos cujos detalhes (etapas/tarefas/dependências) estão em memória. */
export type LoadedProjects = Record<string, boolean | undefined>;

function isNewer(incoming: string | undefined, current: string | undefined): boolean {
  if (!incoming || !current) return true;
  // Eventos do próprio usuário voltam como eco: ignora só se o local for mais novo
  return incoming >= current;
}

function upsertById<T extends { id: string }>(list: T[], item: T, keepLocal?: (existing: T) => boolean): T[] {
  const index = list.findIndex((x) => x.id === item.id);
  if (index === -1) return [item, ...list.filter((x) => x.id !== item.id)];
  if (keepLocal?.(list[index])) return list;
  const next = list.slice();
  next[index] = item;
  return next;
}

export function applyRealtimeChange(
  state: DataState,
  change: RealtimeChange,
  loaded: LoadedProjects
): DataState {
  const { table, eventType } = change;
  const row = eventType === "DELETE" ? change.old : change.new;
  if (!row || typeof row.id !== "string") return state;

  if (table === "projects") {
    if (eventType === "DELETE") {
      const id = row.id as string;
      if (!state.projects.some((p) => p.id === id)) return state;
      const removedTasks = new Set(state.tasks.filter((t) => t.project_id === id).map((t) => t.id));
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== id),
        stages: state.stages.filter((s) => s.project_id !== id),
        tasks: state.tasks.filter((t) => t.project_id !== id),
        dependencies: state.dependencies.filter(
          (d) => !removedTasks.has(d.task_id) && !removedTasks.has(d.depends_on_task_id)
        ),
      };
    }
    const incoming = dbToProject(row as unknown as Tables["projects"]["Row"]);
    const existing = state.projects.find((p) => p.id === incoming.id);
    if (!existing) return { ...state, projects: [incoming, ...state.projects] };
    if (!isNewer(incoming.updated_at, existing.updated_at)) return state;
    // O progresso do projeto é calculado no client: preserva o valor local
    const merged = { ...incoming, progress: existing.progress };
    return { ...state, projects: state.projects.map((p) => (p.id === incoming.id ? merged : p)) };
  }

  if (table === "stages") {
    if (eventType === "DELETE") {
      const id = row.id as string;
      if (!state.stages.some((s) => s.id === id)) return state;
      return { ...state, stages: state.stages.filter((s) => s.id !== id) };
    }
    const projectId = row.project_id as string | undefined;
    if (!projectId || !loaded[projectId]) return state;
    return { ...state, stages: upsertById(state.stages, dbToStage(row as unknown as Tables["stages"]["Row"])) };
  }

  if (table === "tasks") {
    if (eventType === "DELETE") {
      const id = row.id as string;
      const target = state.tasks.find((t) => t.id === id);
      if (!target) return state;
      // O banco apaga subtarefas e dependências em cascata
      const removed = new Set<string>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const t of state.tasks) {
          if (t.parent_task_id && removed.has(t.parent_task_id) && !removed.has(t.id)) {
            removed.add(t.id);
            grew = true;
          }
        }
      }
      return {
        ...state,
        tasks: state.tasks.filter((t) => !removed.has(t.id)),
        dependencies: state.dependencies.filter((d) => !removed.has(d.task_id) && !removed.has(d.depends_on_task_id)),
      };
    }
    const projectId = row.project_id as string | undefined;
    if (!projectId || !loaded[projectId]) return state;
    const incoming = dbToTask(row as unknown as Tables["tasks"]["Row"]);
    const next = upsertById(state.tasks, incoming, (existing) => !isNewer(incoming.updated_at, existing.updated_at));
    return next === state.tasks ? state : { ...state, tasks: next };
  }

  // task_dependencies
  if (eventType === "DELETE") {
    const id = row.id as string;
    if (!state.dependencies.some((d) => d.id === id)) return state;
    return { ...state, dependencies: state.dependencies.filter((d) => d.id !== id) };
  }
  const incoming = dbToDependency(row as unknown as Tables["task_dependencies"]["Row"]);
  const known = new Set(state.tasks.map((t) => t.id));
  // Só interessa se uma das pontas é uma tarefa carregada
  if (!known.has(incoming.task_id) && !known.has(incoming.depends_on_task_id)) return state;
  return { ...state, dependencies: upsertById(state.dependencies, incoming) };
}
