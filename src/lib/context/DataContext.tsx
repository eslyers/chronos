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
  dependencyProvider,
  loadWorkspaceContext,
  getDataLayer,
} from "@/lib/data/data-provider";
import { sortTasksWithHierarchy } from "@/lib/task-sorting";

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
  wip_limit?: number | null;
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
  estimated_hours?: number | null;
  assignee_id: string | null;
  assignee_name: string | null; // texto original quando assignee não é membro
  assignee_status: "pending" | "invited" | null;
  position: number;
  parent_task_id: string | null; // WBS hierarchy
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

export type TaskComment = {
  id: string;
  task_id: string;
  user_id: string | null;
  user_name: string;
  content: string;
  created_at: string;
};

export type TaskAttachment = {
  id: string;
  task_id: string;
  user_id: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  uploaded_at: string;
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
  createProject: (data: Partial<Project> & { templateId?: string; customStages?: Array<{ name: string; color: string; sort_order: number; wip_limit?: number | null; is_done?: boolean }> }) => Promise<Project>;
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
  // Dependencies (RF-06)
  addDependency: (
    taskId: string,
    dependsOnTaskId: string,
    type?: "FS" | "SS" | "FF" | "SF"
  ) => Promise<TaskDependency>;
  removeDependency: (id: string) => Promise<void>;
  // Comments & Attachments (Proposta 4)
  getTaskComments: (taskId: string) => Promise<TaskComment[]>;
  addTaskComment: (taskId: string, content: string, userName?: string) => Promise<TaskComment>;
  deleteTaskComment: (commentId: string) => Promise<void>;
  getTaskAttachments: (taskId: string) => Promise<TaskAttachment[]>;
  addTaskAttachment: (taskId: string, file: { name: string; size: number; type: string; url: string }) => Promise<TaskAttachment>;
  deleteTaskAttachment: (attachmentId: string) => Promise<void>;
  // Helpers
  getProject: (id: string) => Project | undefined;
  getStagesByProject: (projectId: string) => Stage[];
  getTasksByProject: (projectId: string) => Task[];
  getTasksByStage: (stageId: string) => Task[];
  getDependenciesForTask: (taskId: string) => TaskDependency[];
  getReverseDependenciesForTask: (taskId: string) => TaskDependency[];
  refresh: () => Promise<void>;
  loadProjectDetails: (projectId: string) => Promise<void>;
  loadAllProjectsDetails: () => Promise<void>;
  isProjectLoaded: (projectId: string) => boolean;
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
    { id: generateId("stage"), project_id: projectId, name: "Em Progresso", color: "#3b82f6", position: 2, is_done: false },
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
    color: "#3b82f6",
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
  const [loadedProjects, setLoadedProjects] = useState<Record<string, boolean>>({});

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
        const data = await dataProvider.loadProjectsOnly();
        if (cancelled) return;
        if (data) {
          setState({
            projects: data.projects,
            stages: [],
            tasks: [],
            dependencies: [],
            loading: false,
          });
        } else {
          setState((s) => ({ ...s, loading: false }));
        }
        return;
      }

      // Modo DEMO: localStorage (carrega tudo imediatamente)
      const stored = loadFromStorage();
      if (stored) {
        setState({ ...stored, loading: false });
        const loaded: Record<string, boolean> = {};
        stored.projects.forEach((p) => {
          loaded[p.id] = true;
        });
        setLoadedProjects(loaded);
      } else {
        const seeded = seedMockData();
        saveToStorage(seeded);
        setState({ ...seeded, loading: false });
        const loaded: Record<string, boolean> = {};
        seeded.projects.forEach((p) => {
          loaded[p.id] = true;
        });
        setLoadedProjects(loaded);
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
      const data = await dataProvider.loadProjectsOnly();
      if (data) {
        setState((prev) => ({
          ...prev,
          projects: data.projects,
        }));

        const loadedIds = Object.keys(loadedProjects).filter((id) => loadedProjects[id]);
        if (loadedIds.length > 0) {
          await Promise.all(
            loadedIds.map(async (projectId) => {
              const details = await dataProvider.loadProjectDetails(projectId);
              if (details) {
                setState((prev) => {
                  const filteredStages = prev.stages.filter((s) => s.project_id !== projectId);
                  const filteredTasks = prev.tasks.filter((t) => t.project_id !== projectId);
                  const detailTaskIds = details.tasks.map((t) => t.id);
                  const filteredDeps = prev.dependencies.filter(
                    (d) => !detailTaskIds.includes(d.task_id)
                  );

                  return {
                    ...prev,
                    stages: [...filteredStages, ...details.stages],
                    tasks: [...filteredTasks, ...details.tasks],
                    dependencies: [...filteredDeps, ...details.dependencies],
                  };
                });
              }
            })
          );
        }
      }
      return;
    }
    const stored = loadFromStorage();
    if (stored) setState({ ...stored, loading: false });
  }, [loadedProjects]);

  // ── Projects ────────────────────────────────────────────────
  const createProject = useCallback(async (
    data: Partial<Project> & {
      templateId?: string;
      customStages?: Array<{ name: string; color: string; sort_order: number; wip_limit?: number | null; is_done?: boolean }>;
    }
  ): Promise<Project> => {
    // Modo PRODUÇÃO: Supabase real
    if (getDataLayer() === "supabase") {
      const result = await dataProvider.createProject({
        name: data.name ?? "Novo Projeto",
        description: data.description ?? undefined,
        color: data.color,
        templateId: data.templateId,
        customStages: data.customStages,
      });
      if (result) {
        const { project, stages } = result;
        setState((prev) => ({
          ...prev,
          projects: [project, ...prev.projects],
          stages: [...prev.stages, ...stages],
        }));
        setLoadedProjects((prev) => ({ ...prev, [project.id]: true }));
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
      color: data.color ?? "#3b82f6",
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
    setLoadedProjects((prev) => ({ ...prev, [project.id]: true }));
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
        parent_task_id: data.parent_task_id ?? undefined,
        assignee_id: data.assignee_id ?? undefined,
        assignee_name: data.assignee_name ?? undefined,
        assignee_status: data.assignee_status ?? undefined,
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
      assignee_name: data.assignee_name ?? null,
      assignee_status: data.assignee_status ?? null,
      position: data.position ?? 0,
      parent_task_id: data.parent_task_id ?? null,
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
      await dataProvider.moveTask(id, stageId, position);
    }
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, stage_id: stageId, position, updated_at: new Date().toISOString() } : t
      ),
    }));
  }, []);

  // ── Dependencies (RF-06) ────────────────────────────────────
  const addDependency = useCallback(
    async (
      taskId: string,
      dependsOnTaskId: string,
      type: "FS" | "SS" | "FF" | "SF" = "FS"
    ): Promise<TaskDependency> => {
      if (taskId === dependsOnTaskId) {
        throw new Error("Uma tarefa não pode depender de si mesma");
      }
      // Detecção de ciclo client-side (rápida)
      if (dependencyProvider.wouldCreateCycle(taskId, dependsOnTaskId, state.dependencies)) {
        throw new Error("Esta dependência criaria um ciclo no grafo");
      }

      if (getDataLayer() === "supabase") {
        const dep = await dependencyProvider.create({
          task_id: taskId,
          depends_on_task_id: dependsOnTaskId,
          type,
        });
        if (!dep) throw new Error("Falha ao criar dependência");
        setState((prev) => ({ ...prev, dependencies: [...prev.dependencies, dep] }));
        return dep;
      }
      // Modo demo
      const dep: TaskDependency = {
        id: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
        type,
      };
      setState((prev) => ({ ...prev, dependencies: [...prev.dependencies, dep] }));
      return dep;
    },
    [state.dependencies]
  );

  const removeDependency = useCallback(async (id: string): Promise<void> => {
    if (getDataLayer() === "supabase") {
      await dependencyProvider.delete(id);
    }
    setState((prev) => ({
      ...prev,
      dependencies: prev.dependencies.filter((d) => d.id !== id),
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
      sortTasksWithHierarchy(state.tasks.filter((t) => t.project_id === projectId)),
    [state.tasks]
  );

  const getTasksByStage = useCallback(
    (stageId: string) =>
      sortTasksWithHierarchy(state.tasks.filter((t) => t.stage_id === stageId)),
    [state.tasks]
  );

  const getDependenciesForTask = useCallback(
    (taskId: string) => state.dependencies.filter((d) => d.task_id === taskId),
    [state.dependencies]
  );

  const getReverseDependenciesForTask = useCallback(
    (taskId: string) =>
      state.dependencies.filter((d) => d.depends_on_task_id === taskId),
    [state.dependencies]
  );

  const loadProjectDetails = useCallback(async (projectId: string) => {
    if (getDataLayer() !== "supabase") return;
    if (loadedProjects[projectId]) return;

    try {
      const details = await dataProvider.loadProjectDetails(projectId);
      if (details) {
        setState((prev) => {
          const filteredStages = prev.stages.filter((s) => s.project_id !== projectId);
          const filteredTasks = prev.tasks.filter((t) => t.project_id !== projectId);
          const detailTaskIds = details.tasks.map((t) => t.id);
          const filteredDeps = prev.dependencies.filter(
            (d) => !detailTaskIds.includes(d.task_id)
          );

          return {
            ...prev,
            stages: [...filteredStages, ...details.stages],
            tasks: [...filteredTasks, ...details.tasks],
            dependencies: [...filteredDeps, ...details.dependencies],
          };
        });
        setLoadedProjects((prev) => ({ ...prev, [projectId]: true }));
      }
    } catch (error) {
      console.error("[DataContext] Error loading project details:", error);
    }
  }, [loadedProjects]);

  const loadAllProjectsDetails = useCallback(async () => {
    if (getDataLayer() !== "supabase") return;
    const pendingIds = state.projects
      .map((p) => p.id)
      .filter((id) => !loadedProjects[id]);

    if (pendingIds.length === 0) return;

    try {
      await Promise.all(
        pendingIds.map(async (projectId) => {
          const details = await dataProvider.loadProjectDetails(projectId);
          if (details) {
            setState((prev) => {
              const filteredStages = prev.stages.filter((s) => s.project_id !== projectId);
              const filteredTasks = prev.tasks.filter((t) => t.project_id !== projectId);
              const detailTaskIds = details.tasks.map((t) => t.id);
              const filteredDeps = prev.dependencies.filter(
                (d) => !detailTaskIds.includes(d.task_id)
              );

              return {
                ...prev,
                stages: [...filteredStages, ...details.stages],
                tasks: [...filteredTasks, ...details.tasks],
                dependencies: [...filteredDeps, ...details.dependencies],
              };
            });
            setLoadedProjects((prev) => ({ ...prev, [projectId]: true }));
          }
        })
      );
    } catch (error) {
      console.error("[DataContext] Error loading all projects details:", error);
    }
  }, [state.projects, loadedProjects]);

  const isProjectLoaded = useCallback(
    (projectId: string) => {
      return Boolean(loadedProjects[projectId] || getDataLayer() === "local");
    },
    [loadedProjects]
  );

  // ── Comments & Attachments (Proposta 4) ─────────────────────
  const getTaskComments = useCallback(async (taskId: string): Promise<TaskComment[]> => {
    if (getDataLayer() === "supabase") {
      try {
        const { createSPAClient } = await import("@/lib/supabase/client");
        const supabase = createSPAClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = supabase.from("task_comments") as any;
        const { data, error } = await client
          .select("*")
          .eq("task_id", taskId)
          .order("created_at", { ascending: true });
        if (!error && data) return data as TaskComment[];
      } catch (err) {
        console.error("[DataContext] getTaskComments error:", err);
      }
    }
    const raw = typeof window !== "undefined" ? localStorage.getItem(`chronos:comments:${taskId}`) : null;
    return raw ? JSON.parse(raw) : [];
  }, []);

  const addTaskComment = useCallback(
    async (taskId: string, content: string, userName?: string): Promise<TaskComment> => {
      const now = new Date().toISOString();
      const commentObj: TaskComment = {
        id: generateId("comment"),
        task_id: taskId,
        user_id: userId || null,
        user_name: userName || "Usuário",
        content,
        created_at: now,
      };

      if (getDataLayer() === "supabase") {
        try {
          const { createSPAClient } = await import("@/lib/supabase/client");
          const supabase = createSPAClient();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const client = supabase.from("task_comments") as any;
          const { data, error } = await client
            .insert({
              task_id: taskId,
              user_id: userId || null,
              user_name: userName || "Usuário",
              content,
            })
            .select()
            .single();
          if (!error && data) return data as TaskComment;
        } catch (err) {
          console.error("[DataContext] addTaskComment error:", err);
        }
      }

      const current = await getTaskComments(taskId);
      const updated = [...current, commentObj];
      if (typeof window !== "undefined") {
        localStorage.setItem(`chronos:comments:${taskId}`, JSON.stringify(updated));
      }
      return commentObj;
    },
    [userId, getTaskComments]
  );

  const deleteTaskComment = useCallback(async (commentId: string) => {
    if (getDataLayer() === "supabase") {
      try {
        const { createSPAClient } = await import("@/lib/supabase/client");
        const supabase = createSPAClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = supabase.from("task_comments") as any;
        await client.delete().eq("id", commentId);
      } catch (err) {
        console.error("[DataContext] deleteTaskComment error:", err);
      }
    }
  }, []);

  const getTaskAttachments = useCallback(async (taskId: string): Promise<TaskAttachment[]> => {
    if (getDataLayer() === "supabase") {
      try {
        const { createSPAClient } = await import("@/lib/supabase/client");
        const supabase = createSPAClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = supabase.from("task_attachments") as any;
        const { data, error } = await client
          .select("*")
          .eq("task_id", taskId)
          .order("uploaded_at", { ascending: false });
        if (!error && data) return data as TaskAttachment[];
      } catch (err) {
        console.error("[DataContext] getTaskAttachments error:", err);
      }
    }
    const raw = typeof window !== "undefined" ? localStorage.getItem(`chronos:attachments:${taskId}`) : null;
    return raw ? JSON.parse(raw) : [];
  }, []);

  const addTaskAttachment = useCallback(
    async (
      taskId: string,
      file: { name: string; size: number; type: string; url: string }
    ): Promise<TaskAttachment> => {
      const now = new Date().toISOString();
      const attachmentObj: TaskAttachment = {
        id: generateId("attach"),
        task_id: taskId,
        user_id: userId || null,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        file_url: file.url,
        uploaded_at: now,
      };

      if (getDataLayer() === "supabase") {
        try {
          const { createSPAClient } = await import("@/lib/supabase/client");
          const supabase = createSPAClient();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const client = supabase.from("task_attachments") as any;
          const { data, error } = await client
            .insert({
              task_id: taskId,
              user_id: userId || null,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              file_url: file.url,
            })
            .select()
            .single();
          if (!error && data) return data as TaskAttachment;
        } catch (err) {
          console.error("[DataContext] addTaskAttachment error:", err);
        }
      }

      const current = await getTaskAttachments(taskId);
      const updated = [attachmentObj, ...current];
      if (typeof window !== "undefined") {
        localStorage.setItem(`chronos:attachments:${taskId}`, JSON.stringify(updated));
      }
      return attachmentObj;
    },
    [userId, getTaskAttachments]
  );

  const deleteTaskAttachment = useCallback(async (attachmentId: string) => {
    if (getDataLayer() === "supabase") {
      try {
        const { createSPAClient } = await import("@/lib/supabase/client");
        const supabase = createSPAClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = supabase.from("task_attachments") as any;
        await client.delete().eq("id", attachmentId);
      } catch (err) {
        console.error("[DataContext] deleteTaskAttachment error:", err);
      }
    }
  }, []);

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
        addDependency,
        removeDependency,
        getTaskComments,
        addTaskComment,
        deleteTaskComment,
        getTaskAttachments,
        addTaskAttachment,
        deleteTaskAttachment,
        getProject,
        getStagesByProject,
        getTasksByProject,
        getTasksByStage,
        getDependenciesForTask,
        getReverseDependenciesForTask,
        refresh,
        loadProjectDetails,
        loadAllProjectsDetails,
        isProjectLoaded,
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