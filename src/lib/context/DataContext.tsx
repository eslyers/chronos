"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  dataProvider,
  loadWorkspaceContext,
  getDataLayer,
} from "@/lib/data/data-provider";

// ─────────────────────────────────────────────────────────────
// CHRONOS — DataContext
// Dual mode: usa Supabase real se configurado, senão cai pro localStorage
// Sprint 3.C: persistência real no Postgres via Supabase
// ─────────────────────────────────────────────────────────────

export type Stage = {
  id: string;
  project_id: string;
  name: string;
  color: string;
  position: number;
  is_done: boolean;
};

export type Task = {
  id: string;
  project_id: string;
  stage_id: string | null;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in_progress" | "review" | "done" | "blocked";
  progress: number;
  start_date: string | null; // ISO
  due_date: string | null; // ISO
  assignee_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  workspace_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  color: string;
  status: "active" | "completed" | "archived";
  start_date: string | null;
  target_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
};

export type TaskDependency = {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  type: "FS" | "SS" | "FF" | "SF"; // Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish
};

type DataState = {
  projects: Project[];
  stages: Stage[];
  tasks: Task[];
  dependencies: TaskDependency[];
  loading: boolean;
};

type DataContextType = DataState & {
  // Projects
  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  // Stages
  createStage: (data: Partial<Stage>) => Promise<Stage>;
  updateStage: (id: string, data: Partial<Stage>) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  // Tasks
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, stageId: string, position: number) => Promise<void>;
  // Helpers
  getProject: (id: string) => Project | undefined;
  getStagesByProject: (projectId: string) => Stage[];
  getTasksByProject: (projectId: string) => Task[];
  getTasksByStage: (stageId: string) => Task[];
  refresh: () => void;
};

const STORAGE_KEY = "chronos:data:v1";
const USER_ID = "local-user-esly"; // mock user id

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function defaultStagesForProject(projectId: string): Stage[] {
  return [
    { id: generateId("stage"), project_id: projectId, name: "Backlog", color: "#94a3b8", position: 0, is_done: false },
    { id: generateId("stage"), project_id: projectId, name: "A Fazer", color: "#3b82f6", position: 1, is_done: false },
    { id: generateId("stage"), project_id: projectId, name: "Em Progresso", color: "#f59e0b", position: 2, is_done: false },
    { id: generateId("stage"), project_id: projectId, name: "Em Revisão", color: "#a855f7", position: 3, is_done: false },
    { id: generateId("stage"), project_id: projectId, name: "Concluído", color: "#10b981", position: 4, is_done: true },
  ];
}

function seedMockData(): DataState {
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
    color: "#f97316",
    status: "active",
    start_date: new Date(now.getTime() - 14 * 86400000).toISOString(),
    target_date: new Date(now.getTime() + 30 * 86400000).toISOString(),
    progress: 35,
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
      position: 0,
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
      position: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: generateId("task"),
      project_id: projectId1,
      stage_id: stagesP1[4].id, // Concluído
      title: "Definir identidade visual",
      description: "Paleta amber/orange + tipografia + logo conceitual",
      priority: "medium",
      status: "done",
      progress: 100,
      start_date: new Date(now.getTime() - 7 * 86400000).toISOString(),
      due_date: new Date(now.getTime() - 5 * 86400000).toISOString(),
      assignee_id: USER_ID,
      position: 0,
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
      position: 0,
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

function loadFromStorage(): DataState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DataState;
  } catch {
    return null;
  }
}

function saveToStorage(state: DataState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>({
    projects: [],
    stages: [],
    tasks: [],
    dependencies: [],
    loading: true,
  });
  const [userId, setUserId] = useState<string>(USER_ID);
  const [workspaceId, setWorkspaceId] = useState<string>("ws-local");

  // Load inicial — escolhe automaticamente entre Supabase e localStorage
  useEffect(() => {
    let cancelled = false;
    async function init() {
      // Modo PRODUÇÃO: Supabase real
      if (getDataLayer() === "supabase") {
        const ctx = await loadWorkspaceContext();
        if (cancelled) return;
        setUserId(ctx.userId);
        setWorkspaceId(ctx.workspaceId ?? "ws-local");
        const data = await dataProvider.load();
        if (cancelled) return;
        if (data) {
          setState({
            projects: data.projects,
            stages: data.stages,
            tasks: data.tasks,
            dependencies: data.dependencies,
            loading: false,
          });
        } else {
          setState((s) => ({ ...s, loading: false }));
        }
        return;
      }

      // Modo DEMO: localStorage
      const stored = loadFromStorage();
      if (stored) {
        setState({ ...stored, loading: false });
      } else {
        const seeded = seedMockData();
        saveToStorage(seeded);
        setState({ ...seeded, loading: false });
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // Persist (só em modo demo)
  useEffect(() => {
    if (!state.loading && getDataLayer() === "local") saveToStorage(state);
  }, [state]);

  const refresh = useCallback(async () => {
    if (getDataLayer() === "supabase") {
      const data = await dataProvider.load();
      if (data) {
        setState({
          projects: data.projects,
          stages: data.stages,
          tasks: data.tasks,
          dependencies: data.dependencies,
          loading: false,
        });
      }
      return;
    }
    const stored = loadFromStorage();
    if (stored) setState({ ...stored, loading: false });
  }, []);

  // ── Projects ────────────────────────────────────────────────
  const createProject = useCallback(async (data: Partial<Project>): Promise<Project> => {
    // Modo PRODUÇÃO: Supabase real
    if (getDataLayer() === "supabase") {
      const result = await dataProvider.createProject({
        name: data.name ?? "Novo Projeto",
        description: data.description ?? undefined,
        color: data.color,
      });
      if (result) {
        const { project, stages } = result;
        setState((prev) => ({
          ...prev,
          projects: [project, ...prev.projects],
          stages: [...prev.stages, ...stages],
        }));
        return project;
      }
    }

    // Modo DEMO ou fallback
    const now = new Date().toISOString();
    const project: Project = {
      id: generateId("project"),
      workspace_id: workspaceId,
      owner_id: userId,
      name: data.name ?? "Novo Projeto",
      description: data.description ?? null,
      color: data.color ?? "#f97316",
      status: data.status ?? "active",
      start_date: data.start_date ?? null,
      target_date: data.target_date ?? null,
      progress: 0,
      created_at: now,
      updated_at: now,
    };

    const stages = defaultStagesForProject(project.id);

    setState((prev) => ({
      ...prev,
      projects: [project, ...prev.projects],
      stages: [...prev.stages, ...stages],
    }));

    return project;
  }, [userId, workspaceId]);

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
    if (getDataLayer() === "supabase") {
      await dataProvider.updateProject(id, data);
    }
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p
      ),
    }));
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    if (getDataLayer() === "supabase") {
      await dataProvider.deleteProject(id);
    }
    setState((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
      stages: prev.stages.filter((s) => s.project_id !== id),
      tasks: prev.tasks.filter((t) => t.project_id !== id),
    }));
  }, []);

  // ── Stages ──────────────────────────────────────────────────
  const createStage = useCallback(async (data: Partial<Stage>): Promise<Stage> => {
    if (getDataLayer() === "supabase" && data.project_id) {
      const stage = await dataProvider.createStage({
        project_id: data.project_id,
        name: data.name ?? "Nova Etapa",
        color: data.color,
        sort_order: data.position ?? 0,
        wip_limit: null,
      });
      if (stage) {
        const result: Stage = {
          id: stage.id,
          project_id: stage.project_id,
          name: stage.name,
          color: stage.color,
          position: stage.position,
          is_done: stage.is_done,
        };
        setState((prev) => ({ ...prev, stages: [...prev.stages, result] }));
        return result;
      }
    }
    const stage: Stage = {
      id: generateId("stage"),
      project_id: data.project_id ?? "",
      name: data.name ?? "Nova Etapa",
      color: data.color ?? "#64748b",
      position: data.position ?? 0,
      is_done: data.is_done ?? false,
    };
    setState((prev) => ({ ...prev, stages: [...prev.stages, stage] }));
    return stage;
  }, []);

  const updateStage = useCallback(async (id: string, data: Partial<Stage>) => {
    if (getDataLayer() === "supabase") {
      await dataProvider.updateStage(id, data);
    }
    setState((prev) => ({
      ...prev,
      stages: prev.stages.map((s) => (s.id === id ? { ...s, ...data } : s)),
    }));
  }, []);

  const deleteStage = useCallback(async (id: string) => {
    if (getDataLayer() === "supabase") {
      await dataProvider.deleteStage(id);
    }
    setState((prev) => ({
      ...prev,
      stages: prev.stages.filter((s) => s.id !== id),
      tasks: prev.tasks.map((t) => (t.stage_id === id ? { ...t, stage_id: null } : t)),
    }));
  }, []);

  // ── Tasks ───────────────────────────────────────────────────
  const createTask = useCallback(async (data: Partial<Task>): Promise<Task> => {
    if (getDataLayer() === "supabase" && data.project_id && data.stage_id) {
      const task = await dataProvider.createTask({
        project_id: data.project_id,
        stage_id: data.stage_id,
        title: data.title ?? "Nova Tarefa",
        description: data.description ?? undefined,
        status: data.status ?? "todo",
        priority: data.priority ?? "medium",
        due_date: data.due_date ?? undefined,
        start_date: data.start_date ?? undefined,
        created_by: userId,
      });
      if (task) {
        setState((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
        return task;
      }
    }
    const now = new Date().toISOString();
    const task: Task = {
      id: generateId("task"),
      project_id: data.project_id ?? "",
      stage_id: data.stage_id ?? null,
      title: data.title ?? "Nova Tarefa",
      description: data.description ?? null,
      priority: data.priority ?? "medium",
      status: data.status ?? "todo",
      progress: data.progress ?? 0,
      start_date: data.start_date ?? null,
      due_date: data.due_date ?? null,
      assignee_id: data.assignee_id ?? userId,
      position: data.position ?? 0,
      created_at: now,
      updated_at: now,
    };
    setState((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
    return task;
  }, [userId]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    if (getDataLayer() === "supabase") {
      await dataProvider.updateTask(id, data);
    }
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t
      ),
    }));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    if (getDataLayer() === "supabase") {
      await dataProvider.deleteTask(id);
    }
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  }, []);

  const moveTask = useCallback(async (id: string, stageId: string, position: number) => {
    if (getDataLayer() === "supabase") {
      await dataProvider.moveTask(id, stageId);
    }
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, stage_id: stageId, position, updated_at: new Date().toISOString() } : t
      ),
    }));
  }, []);

  // ── Helpers ─────────────────────────────────────────────────
  const getProject = useCallback(
    (id: string) => state.projects.find((p) => p.id === id),
    [state.projects]
  );

  const getStagesByProject = useCallback(
    (projectId: string) =>
      state.stages
        .filter((s) => s.project_id === projectId)
        .sort((a, b) => a.position - b.position),
    [state.stages]
  );

  const getTasksByProject = useCallback(
    (projectId: string) =>
      state.tasks
        .filter((t) => t.project_id === projectId)
        .sort((a, b) => a.position - b.position),
    [state.tasks]
  );

  const getTasksByStage = useCallback(
    (stageId: string) =>
      state.tasks
        .filter((t) => t.stage_id === stageId)
        .sort((a, b) => a.position - b.position),
    [state.tasks]
  );

  return (
    <DataContext.Provider
      value={{
        ...state,
        createProject,
        updateProject,
        deleteProject,
        createStage,
        updateStage,
        deleteStage,
        createTask,
        updateTask,
        deleteTask,
        moveTask,
        getProject,
        getStagesByProject,
        getTasksByProject,
        getTasksByStage,
        refresh,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}