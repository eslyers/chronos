"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  dataProvider,
  dependencyProvider,
  loadWorkspaceContext,
  getDataLayer,
} from "@/lib/data/data-provider";
import { sortTasksWithHierarchy } from "@/lib/task-sorting";
import { orderTasksParentsFirst, collectDescendantIds } from "@/lib/task-hierarchy";
import { daysBetweenDateOnly, shiftDateOnly, toDateOnly } from "@/lib/date-only";
import { useGlobalToast } from "@/components/ui/toast-notification";
import type {
  CloneProjectOptions,
  DataState,
  Project,
  Stage,
  Task,
  TaskAttachment,
  TaskComment,
  TaskDependency,
} from "@/lib/data/models";
import { USER_ID, defaultStagesForProject, generateId, seedMockData } from "@/lib/data/demo-seed";
import { STORAGE_KEY, loadFromStorage, saveToStorage } from "@/lib/data/local-cache";
import { useTaskDiscussion } from "@/lib/context/useTaskDiscussion";
import { useRealtimeSync } from "@/lib/context/useRealtimeSync";
import { applyRealtimeChange } from "@/lib/data/realtime-apply";

// ─────────────────────────────────────────────────────────────
// CHRONOS — DataContext
// Dual mode: usa Supabase real se configurado, senão cai pro localStorage
// Sprint 3.C: persistência real no Postgres via Supabase
// Tipos em lib/data/models, dados demo em lib/data/demo-seed, cache local em
// lib/data/local-cache e comentários/anexos em useTaskDiscussion.
// ─────────────────────────────────────────────────────────────

// Reexporta os tipos: as telas importam de "@/lib/context/DataContext"
export type {
  Stage,
  Task,
  Project,
  TaskDependency,
  TaskComment,
  TaskAttachment,
  CloneProjectOptions,
};

type DataContextType = DataState & {
  // Projects
  createProject: (data: Partial<Project> & { templateId?: string; customStages?: Array<{ name: string; color: string; sort_order: number; wip_limit?: number | null; is_done?: boolean }> }) => Promise<Project>;
  cloneProject: (sourceProjectId: string, options: CloneProjectOptions) => Promise<Project>;
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


const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>({
    projects: [],
    stages: [],
    tasks: [],
    dependencies: [],
    loading: true,
  });
  const stateRef = useRef<DataState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [userId, setUserId] = useState<string>(USER_ID);
  const [workspaceId, setWorkspaceId] = useState<string>("ws-local");
  const [loadedProjects, setLoadedProjects] = useState<Record<string, boolean>>({});
  // Espelho síncrono de loadedProjects + requisições em andamento: mantém os
  // loaders estáveis (sem depender do state inteiro) e evita buscas duplicadas.
  const loadedRef = useRef<Record<string, boolean>>({});
  const inflightRef = useRef(new Map<string, Promise<void>>());
  const markLoaded = useCallback((ids: string[]) => {
    const next = { ...loadedRef.current };
    ids.forEach((id) => {
      next[id] = true;
    });
    loadedRef.current = next;
    setLoadedProjects(next);
  }, []);

  // Erros de persistência viram toast e são repassados ao chamador, que não
  // deve fechar o formulário como se tivesse salvo.
  const { addToast } = useGlobalToast();
  const reportError = useCallback(
    (title: string, err: unknown): never => {
      console.error(`[DataContext] ${title}:`, err);
      addToast({
        variant: "error",
        title,
        description: err instanceof Error ? err.message : undefined,
      });
      throw err;
    },
    [addToast]
  );

  // Load inicial — escolhe automaticamente entre Supabase e localStorage
  useEffect(() => {
    let cancelled = false;
    async function init() {
      // Modo PRODUÇÃO: Supabase real (inicialização rápida)
      if (getDataLayer() === "supabase") {
        const ctx = await loadWorkspaceContext();
        if (cancelled) return;
        setUserId(ctx.userId);
        setWorkspaceId(ctx.workspaceId ?? "ws-local");

        // Limpa a chave global (modo demo / versões antigas) para evitar vazamento
        // de projetos entre usuários no mesmo navegador
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }

        let data: Awaited<ReturnType<typeof dataProvider.loadProjectsOnly>> = null;
        try {
          data = await dataProvider.loadProjectsOnly();
        } catch (err) {
          console.error("[DataContext] Falha ao carregar projetos:", err);
          addToast({
            variant: "warning",
            title: "Não foi possível carregar os projetos",
            description: "Exibindo a última cópia salva neste navegador.",
          });
        }
        if (cancelled) return;

        if (data && data.projects) {
          // Em modo Supabase, a autoridade de acesso aos projetos é estritamente o Supabase (RLS).
          // Não mesclamos projetos locais não autorizados de outras sessões.
          setState({
            projects: data.projects,
            stages: [],
            tasks: [],
            dependencies: [],
            loading: false,
          });
          loadedRef.current = {};
          setLoadedProjects({});
          saveToStorage({
            projects: data.projects,
            stages: [],
            tasks: [],
            dependencies: [],
            loading: false,
          }, ctx.userId);
        } else {
          // Fallback resiliente apenas para o cache isolado deste usuário específico
          const userStored = loadFromStorage(ctx.userId);
          if (userStored) {
            setState({ ...userStored, loading: false });
          } else {
            setState((s) => ({ ...s, projects: [], loading: false }));
          }
        }
        return;
      }

      // Modo DEMO: localStorage (carrega tudo imediatamente)
      const stored = loadFromStorage();
      if (stored) {
        setState({ ...stored, loading: false });
        markLoaded(stored.projects.map((p) => p.id));
      } else {
        const seeded = seedMockData();
        saveToStorage(seeded);
        setState({ ...seeded, loading: false });
        markLoaded(seeded.projects.map((p) => p.id));
      }
    }
    init();
    return () => { cancelled = true; };
  }, [addToast, markLoaded]);

  // Persist (salva em localStorage como backup sempre que o state mudar e não estiver carregando)
  useEffect(() => {
    if (!state.loading) {
      saveToStorage(state, userId);
    }
  }, [state, userId]);

  const refresh = useCallback(async () => {
    if (getDataLayer() === "supabase") {
      let data: Awaited<ReturnType<typeof dataProvider.loadProjectsOnly>> = null;
      let details: Awaited<ReturnType<typeof dataProvider.loadProjectsBatch>> = null;
      const loadedIds = Object.keys(loadedRef.current).filter((id) => loadedRef.current[id]);
      try {
        data = await dataProvider.loadProjectsOnly();
        if (loadedIds.length > 0) details = await dataProvider.loadProjectsBatch(loadedIds);
      } catch (err) {
        reportError("Não foi possível atualizar os dados", err);
      }
      if (data) {
        setState((prev) => {
          const nextState: DataState = {
            ...prev,
            projects: data.projects,
          };
          return nextState;
        });

        if (loadedIds.length > 0) {
          if (details) {
            setState((prev) => {
              const filteredStages = prev.stages.filter((s) => !loadedIds.includes(s.project_id));
              const filteredTasks = prev.tasks.filter((t) => !loadedIds.includes(t.project_id));
              const detailTaskIds = new Set(details.tasks.map((t) => t.id));
              const filteredDeps = prev.dependencies.filter(
                (d) => !detailTaskIds.has(d.task_id)
              );

              const nextState: DataState = {
                ...prev,
                stages: [...filteredStages, ...details.stages],
                tasks: [...filteredTasks, ...details.tasks],
                dependencies: [...filteredDeps, ...details.dependencies],
              };
              return nextState;
            });
          }
        }
      }
      return;
    }
    const stored = loadFromStorage();
    if (stored) setState({ ...stored, loading: false });
  }, [reportError]);

  // ── Tempo real ──────────────────────────────────────────────
  // Só no modo Supabase e depois do carregamento inicial. Mudanças feitas por
  // outros usuários (e o eco das próprias) são mescladas sem recarregar tudo.
  useRealtimeSync({
    enabled: getDataLayer() === "supabase" && !state.loading,
    onChange: (change) => setState((prev) => applyRealtimeChange(prev, change, loadedRef.current)),
    onReconnect: refresh,
  });

  // ── Projects ────────────────────────────────────────────────
  const createProject = useCallback(async (
    data: Partial<Project> & {
      templateId?: string;
      customStages?: Array<{ name: string; color: string; sort_order: number; wip_limit?: number | null; is_done?: boolean }>;
    }
  ): Promise<Project> => {
    // Modo PRODUÇÃO: Supabase real
    if (getDataLayer() === "supabase") {
      let result: Awaited<ReturnType<typeof dataProvider.createProject>> = null;
      try {
        result = await dataProvider.createProject({
          name: data.name ?? "Novo Projeto",
          description: data.description ?? undefined,
          color: data.color,
          start_date: data.start_date ?? undefined,
          target_date: data.target_date ?? undefined,
          track_time: data.track_time !== false,
          templateId: data.templateId,
          customStages: data.customStages,
        });
      } catch (err) {
        reportError("Não foi possível criar o projeto", err);
      }
      if (!result) return reportError("Não foi possível criar o projeto", new Error("Resposta vazia do servidor"));
      const { project, stages } = result;
      setState((prev) => {
        const nextState: DataState = {
          ...prev,
          projects: [project, ...prev.projects.filter((p) => p.id !== project.id)],
          stages: [...prev.stages.filter((s) => s.project_id !== project.id), ...stages],
        };
        return nextState;
      });
      markLoaded([project.id]);
      return Object.assign(project, { stages });
    }

    // Modo DEMO
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
      track_time: data.track_time !== false,
      created_at: now,
      updated_at: now,
    };

    const stages: Stage[] =
      data.customStages && data.customStages.length > 0
        ? data.customStages.map((cs, idx) => ({
            id: generateId("stage"),
            project_id: project.id,
            name: cs.name,
            color: cs.color,
            position: cs.sort_order ?? idx,
            is_done: cs.is_done ?? false,
          }))
        : defaultStagesForProject(project.id);

    setState((prev) => {
      const nextState: DataState = {
        ...prev,
        projects: [project, ...prev.projects],
        stages: [...prev.stages, ...stages],
      };
      return nextState;
    });
    markLoaded([project.id]);
    return Object.assign(project, { stages });
  }, [userId, workspaceId, reportError, markLoaded]);

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
    if (getDataLayer() === "supabase") {
      try {
        await dataProvider.updateProject(id, data);
      } catch (err) {
        reportError("Não foi possível salvar o projeto", err);
      }
    }
    setState((prev) => {
      const nextProjects = prev.projects.map((p) =>
        p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p
      );
      const nextState: DataState = {
        ...prev,
        projects: nextProjects,
      };
      return nextState;
    });
  }, [reportError]);

  const deleteProject = useCallback(async (id: string) => {
    if (getDataLayer() === "supabase") {
      try {
        await dataProvider.deleteProject(id);
      } catch (err) {
        reportError("Não foi possível excluir o projeto", err);
      }
    }
    setState((prev) => {
      // O banco apaga etapas, tarefas e dependências em cascata
      const removedTaskIds = new Set(prev.tasks.filter((t) => t.project_id === id).map((t) => t.id));
      const nextState: DataState = {
        ...prev,
        projects: prev.projects.filter((p) => p.id !== id),
        stages: prev.stages.filter((s) => s.project_id !== id),
        tasks: prev.tasks.filter((t) => t.project_id !== id),
        dependencies: prev.dependencies.filter(
          (d) => !removedTaskIds.has(d.task_id) && !removedTaskIds.has(d.depends_on_task_id)
        ),
      };
      return nextState;
    });
  }, [reportError]);

  // ── Stages ──────────────────────────────────────────────────
  const createStage = useCallback(async (data: Partial<Stage>): Promise<Stage> => {
    if (getDataLayer() === "supabase") {
      if (!data.project_id) {
        return reportError("Não foi possível criar a etapa", new Error("Projeto não informado"));
      }
      let stage: Stage | null = null;
      try {
        stage = await dataProvider.createStage({
          project_id: data.project_id,
          name: data.name ?? "Nova Etapa",
          color: data.color,
          sort_order: data.position ?? 0,
          wip_limit: data.wip_limit ?? null,
          is_done: data.is_done ?? false,
        });
      } catch (err) {
        reportError("Não foi possível criar a etapa", err);
      }
      const result = stage as Stage;
      setState((prev) => ({ ...prev, stages: [...prev.stages, result] }));
      return result;
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
  }, [reportError]);

  const updateStage = useCallback(async (id: string, data: Partial<Stage>) => {
    if (getDataLayer() === "supabase") {
      try {
        await dataProvider.updateStage(id, data);
      } catch (err) {
        reportError("Não foi possível salvar a etapa", err);
      }
    }
    setState((prev) => ({
      ...prev,
      stages: prev.stages.map((s) => (s.id === id ? { ...s, ...data } : s)),
    }));
  }, [reportError]);

  const deleteStage = useCallback(async (id: string) => {
    const current = stateRef.current;
    const stage = current.stages.find((s) => s.id === id);
    const hasTasks = current.tasks.some((t) => t.stage_id === id);
    // tasks.stage_id é NOT NULL + ON DELETE CASCADE: as tarefas iriam junto
    // com a etapa. Elas vão para a primeira etapa restante do projeto.
    const fallbackStage = current.stages
      .filter((s) => s.project_id === stage?.project_id && s.id !== id)
      .sort((a, b) => a.position - b.position)[0];
    if (hasTasks && !fallbackStage) {
      return reportError(
        "Não foi possível excluir a etapa",
        new Error("Mova as tarefas para outra etapa antes de excluir a única etapa do projeto")
      );
    }

    if (getDataLayer() === "supabase") {
      try {
        await dataProvider.deleteStage(id, hasTasks ? fallbackStage?.id : undefined);
      } catch (err) {
        reportError("Não foi possível excluir a etapa", err);
      }
    }
    setState((prev) => ({
      ...prev,
      stages: prev.stages.filter((s) => s.id !== id),
      tasks: prev.tasks.map((t) =>
        t.stage_id === id && fallbackStage ? { ...t, stage_id: fallbackStage.id } : t
      ),
    }));
  }, [reportError]);

  // ── Tasks ───────────────────────────────────────────────────
  const createTask = useCallback(async (data: Partial<Task>): Promise<Task> => {
    const initialProgress = data.progress ?? 0;
    const initialStatus = data.status ?? (initialProgress === 100 ? "done" : "todo");
    const startDate = toDateOnly(data.start_date);
    const dueDate = toDateOnly(data.due_date);

    if (getDataLayer() === "supabase") {
      // stage_id é obrigatório no banco: sem etapa, usa a primeira do projeto
      const stageId =
        data.stage_id ||
        stateRef.current.stages
          .filter((s) => s.project_id === data.project_id)
          .sort((a, b) => a.position - b.position)[0]?.id;
      if (!data.project_id || !stageId) {
        return reportError(
          "Não foi possível criar a tarefa",
          new Error("O projeto precisa ter ao menos uma etapa")
        );
      }
      let task: Task | null = null;
      try {
        task = await dataProvider.createTask({
          project_id: data.project_id,
          stage_id: stageId,
          title: data.title ?? "Nova Tarefa",
          description: data.description ?? undefined,
          status: initialStatus,
          priority: data.priority ?? "medium",
          progress: initialProgress,
          position: data.position ?? 0,
          due_date: dueDate ?? undefined,
          start_date: startDate ?? undefined,
          estimated_hours: data.estimated_hours ?? undefined,
          actual_hours: data.actual_hours ?? undefined,
          parent_task_id: data.parent_task_id ?? undefined,
          assignee_id: data.assignee_id ?? undefined,
          assignee_name: data.assignee_name ?? undefined,
          assignee_status: data.assignee_status ?? undefined,
          created_by: userId,
        });
      } catch (err) {
        reportError("Não foi possível criar a tarefa", err);
      }
      const created = task as Task;
      setState((prev) => ({ ...prev, tasks: [...prev.tasks, created] }));
      return created;
    }
    const now = new Date().toISOString();

    const task: Task = {
      id: generateId("task"),
      project_id: data.project_id ?? "",
      stage_id: data.stage_id ?? null,
      title: data.title ?? "Nova Tarefa",
      description: data.description ?? null,
      priority: data.priority ?? "medium",
      status: initialStatus,
      progress: initialProgress,
      start_date: startDate,
      due_date: dueDate,
      estimated_hours: data.estimated_hours ?? null,
      actual_hours: data.actual_hours ?? null,
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
  }, [userId, reportError]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    const patch = { ...data };
    if (patch.progress === 100 && !patch.status) {
      patch.status = "done";
    } else if (patch.status === "done" && patch.progress === undefined) {
      patch.progress = 100;
    }
    // As colunas são DATE: guarda só YYYY-MM-DD para o state bater com o banco
    if (patch.start_date !== undefined) patch.start_date = toDateOnly(patch.start_date);
    if (patch.due_date !== undefined) patch.due_date = toDateOnly(patch.due_date);

    if (getDataLayer() === "supabase") {
      try {
        await dataProvider.updateTask(id, patch);
      } catch (err) {
        reportError("Não foi possível salvar a tarefa", err);
      }
    }
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, ...patch, updated_at: new Date().toISOString() } : t
      ),
    }));
  }, [reportError]);

  const deleteTask = useCallback(async (id: string) => {
    if (getDataLayer() === "supabase") {
      try {
        await dataProvider.deleteTask(id);
      } catch (err) {
        reportError("Não foi possível excluir a tarefa", err);
      }
    }
    setState((prev) => {
      // O banco apaga subtarefas (parent_task_id) e dependências em cascata
      const removed = collectDescendantIds(id, prev.tasks);
      return {
        ...prev,
        tasks: prev.tasks.filter((t) => !removed.has(t.id)),
        dependencies: prev.dependencies.filter(
          (d) => !removed.has(d.task_id) && !removed.has(d.depends_on_task_id)
        ),
      };
    });
  }, [reportError]);

  const moveTask = useCallback(async (id: string, stageId: string, position: number) => {
    const targetStage = stateRef.current.stages.find((s) => s.id === stageId);
    const updates: Partial<Task> = {
      stage_id: stageId,
      position,
    };
    if (targetStage?.is_done) {
      updates.status = "done";
      updates.progress = 100;
    }

    if (getDataLayer() === "supabase") {
      try {
        // Uma única escrita: etapa, posição e conclusão juntas
        await dataProvider.updateTask(id, updates);
      } catch (err) {
        reportError("Não foi possível mover a tarefa", err);
      }
    }
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
      ),
    }));
  }, [reportError]);

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
      try {
        await dependencyProvider.delete(id);
      } catch (err) {
        reportError("Não foi possível remover a dependência", err);
      }
    }
    setState((prev) => ({
      ...prev,
      dependencies: prev.dependencies.filter((d) => d.id !== id),
    }));
  }, [reportError]);

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

  // Busca etapas/tarefas/dependências dos projetos ainda não carregados.
  // Reaproveita requisições em andamento e só marca como carregado em caso
  // de sucesso (um erro não pode deixar o projeto "vazio" até o refresh).
  const loadDetails = useCallback(async (projectIds: string[]) => {
    const inflight = inflightRef.current;
    const pending = projectIds.filter((id) => !loadedRef.current[id] && !inflight.has(id));
    const waiting = projectIds.filter((id) => inflight.has(id)).map((id) => inflight.get(id)!);

    if (pending.length > 0) {
      const request = (async () => {
        try {
          const details = await dataProvider.loadProjectsBatch(pending);
          if (!details) return;
          const pendingSet = new Set(pending);
          setState((prev) => {
            const detailTaskIds = new Set(details.tasks.map((t) => t.id));
            return {
              ...prev,
              stages: [...prev.stages.filter((s) => !pendingSet.has(s.project_id)), ...details.stages],
              tasks: [...prev.tasks.filter((t) => !pendingSet.has(t.project_id)), ...details.tasks],
              dependencies: [
                ...prev.dependencies.filter((d) => !detailTaskIds.has(d.task_id)),
                ...details.dependencies,
              ],
            };
          });
          markLoaded(pending);
        } catch (err) {
          console.error("[DataContext] Erro ao carregar detalhes dos projetos:", err);
          addToast({
            variant: "error",
            title: "Não foi possível carregar as tarefas",
            description: err instanceof Error ? err.message : undefined,
          });
        } finally {
          pending.forEach((id) => inflight.delete(id));
        }
      })();
      pending.forEach((id) => inflight.set(id, request));
      waiting.push(request);
    }

    await Promise.all(waiting);
  }, [addToast, markLoaded]);

  const loadProjectDetails = useCallback(async (projectId: string) => {
    // 1. Se o projeto não estiver na lista de projetos em memória, busca ele no Supabase ou localStorage
    const existing = stateRef.current.projects.find((p) => p.id === projectId);
    if (!existing) {
      if (getDataLayer() === "supabase") {
        try {
          const single = await dataProvider.getProjectById(projectId);
          if (single) {
            setState((prev) => {
              const nextState: DataState = {
                ...prev,
                projects: [single, ...prev.projects.filter((p) => p.id !== projectId)],
              };
              return nextState;
            });
          }
        } catch (err) {
          console.error("[DataContext] Error fetching single project:", err);
        }
      }
      // Se ainda não achou e tem no localStorage, restaura apenas em modo demo
      if (getDataLayer() !== "supabase") {
        const stored = loadFromStorage();
        const localP = stored?.projects.find((p) => p.id === projectId);
        if (localP) {
          setState((prev) => {
            const nextState: DataState = {
              ...prev,
              projects: [localP, ...prev.projects.filter((p) => p.id !== projectId)],
            };
            return nextState;
          });
        }
      }
    }

    if (getDataLayer() !== "supabase") return;
    await loadDetails([projectId]);
  }, [loadDetails]);

  // Depende só da lista de projetos (não do state inteiro): páginas que
  // chamam este loader em efeitos não disparam novas buscas a cada edição.
  const loadAllProjectsDetails = useCallback(async () => {
    if (getDataLayer() !== "supabase") return;
    await loadDetails(state.projects.map((p) => p.id));
  }, [state.projects, loadDetails]);

  const isProjectLoaded = useCallback(
    (projectId: string) => {
      const p = state.projects.find((proj) => proj.id === projectId);
      if (!p) return false;
      return Boolean(loadedProjects[projectId] || getDataLayer() === "local");
    },
    [loadedProjects, state.projects]
  );

  const cloneProject = useCallback(
    async (sourceProjectId: string, options: CloneProjectOptions): Promise<Project> => {
      // 0. Caminho preferencial: RPC clone_project (uma transação no servidor)
      if (getDataLayer() === "supabase") {
        const source = stateRef.current.projects.find((p) => p.id === sourceProjectId);
        const sourceStart = toDateOnly(source?.start_date);
        const optionStart = toDateOnly(options.startDate);
        let newId: string | null = null;
        try {
          newId = await dataProvider.cloneProjectRpc(sourceProjectId, options.name, {
            workspace_id: workspaceId !== "ws-local" ? workspaceId : undefined,
            ...(options.description !== undefined ? { description: options.description } : {}),
            ...(options.color ? { color: options.color } : {}),
            ...(optionStart ? { start_date: optionStart } : {}),
            ...(toDateOnly(options.targetDate) ? { target_date: toDateOnly(options.targetDate) } : {}),
            ...(options.trackTime !== undefined ? { track_time: options.trackTime } : {}),
            clone_tasks: options.cloneTasks !== false,
            clone_dependencies: options.cloneDependencies !== false,
            reset_status: options.resetStatus === true,
            keep_assignees: options.keepAssignees === true,
            date_offset_days:
              options.shiftDates && optionStart && sourceStart
                ? daysBetweenDateOnly(sourceStart, optionStart)
                : 0,
          });
        } catch (err) {
          reportError("Não foi possível clonar o projeto", err);
        }
        if (newId) {
          let created: Project | null = null;
          try {
            created = await dataProvider.getProjectById(newId);
          } catch (err) {
            reportError("Projeto clonado, mas não foi possível carregá-lo", err);
          }
          if (!created) {
            return reportError("Projeto clonado, mas não foi possível carregá-lo", new Error("Projeto não encontrado"));
          }
          const project = created;
          setState((prev) => ({
            ...prev,
            projects: [project, ...prev.projects.filter((p) => p.id !== project.id)],
          }));
          await loadDetails([project.id]);
          return project;
        }
        // RPC ainda não existe no banco: segue o fluxo antigo (client-side)
      }

      // 1. Obter dados completos do projeto de origem (stages, tasks, dependencies)
      let sourceTasks: Task[] = [];
      let sourceStages: Stage[] = [];
      let sourceDeps: TaskDependency[] = [];

      if (getDataLayer() === "supabase") {
        try {
          const details = await dataProvider.loadProjectDetails(sourceProjectId);
          if (details) {
            sourceStages = details.stages;
            sourceTasks = details.tasks;
            sourceDeps = details.dependencies;

            // Sincroniza o state com os detalhes do projeto de origem
            setState((prev) => {
              const filteredStages = prev.stages.filter((s) => s.project_id !== sourceProjectId);
              const filteredTasks = prev.tasks.filter((t) => t.project_id !== sourceProjectId);
              const detailTaskIds = new Set(details.tasks.map((t) => t.id));
              const filteredDeps = prev.dependencies.filter((d) => !detailTaskIds.has(d.task_id));
              return {
                ...prev,
                stages: [...filteredStages, ...details.stages],
                tasks: [...filteredTasks, ...details.tasks],
                dependencies: [...filteredDeps, ...details.dependencies],
              };
            });
            markLoaded([sourceProjectId]);
          }
        } catch (err) {
          // Sem os dados de origem o clone sairia vazio/incompleto
          reportError("Não foi possível carregar o projeto de origem", err);
        }
      }

      const currentState = stateRef.current;

      // Fallback para state se não veio do Supabase
      if (sourceStages.length === 0) {
        sourceStages = currentState.stages
          .filter((s) => s.project_id === sourceProjectId)
          .sort((a, b) => a.position - b.position);
      }
      if (sourceTasks.length === 0) {
        sourceTasks = currentState.tasks.filter((t) => t.project_id === sourceProjectId);
      }
      if (sourceDeps.length === 0) {
        sourceDeps = currentState.dependencies.filter((d) =>
          sourceTasks.some((st) => st.id === d.task_id)
        );
      }

      const sourceProject = currentState.projects.find((p) => p.id === sourceProjectId);
      if (!sourceProject) throw new Error("Projeto de origem não encontrado");

      const sourceStartClean = toDateOnly(sourceProject.start_date);
      const sourceTargetClean = toDateOnly(sourceProject.target_date);
      const optionStartClean = toDateOnly(options.startDate);
      const optionTargetClean = toDateOnly(options.targetDate);

      const customStages = sourceStages.map((s) => ({
        name: s.name,
        color: s.color,
        sort_order: s.position,
        wip_limit: s.wip_limit,
        is_done: s.is_done,
      }));

      // 2. Criar novo projeto com os estágios correspondentes
      const newProject = await createProject({
        name: options.name,
        description:
          options.description !== undefined ? options.description : sourceProject.description ?? undefined,
        color: options.color || sourceProject.color || "#3b82f6",
        start_date: optionStartClean || (options.shiftDates ? optionStartClean : sourceStartClean) || undefined,
        target_date: optionTargetClean || (options.shiftDates ? optionTargetClean : sourceTargetClean) || undefined,
        track_time: options.trackTime !== undefined ? options.trackTime : (sourceProject.track_time !== false),
        customStages: customStages.length > 0 ? customStages : undefined,
      });

      // 3. Obter os novos estágios do novo projeto
      let newStages: Stage[] = ((newProject as unknown as { stages?: Stage[] }).stages) || [];
      if (newStages.length === 0 && getDataLayer() === "supabase") {
        const newDetails = await dataProvider.loadProjectDetails(newProject.id);
        if (newDetails && newDetails.stages.length > 0) {
          newStages = newDetails.stages;
        }
      }
      if (newStages.length === 0) {
        newStages = (stateRef.current?.stages || state.stages).filter(
          (s) => s.project_id === newProject.id
        );
      }

      // Mapeamento de estágios: antigo ID -> novo ID
      const stageIdMap = new Map<string, string>();
      sourceStages.forEach((oldStage, idx) => {
        const matchingNewStage =
          newStages.find((ns) => ns.name.trim().toLowerCase() === oldStage.name.trim().toLowerCase()) ||
          newStages[idx] ||
          newStages[0];
        if (matchingNewStage) {
          stageIdMap.set(oldStage.id, matchingNewStage.id);
        }
      });

      // 4. Clonar tarefas se solicitado
      const createdNewTasks: Task[] = [];
      const taskIdMap = new Map<string, string>();

      if (options.cloneTasks !== false && sourceTasks.length > 0) {
        const dateOffsetDays =
          options.shiftDates && optionStartClean && sourceStartClean
            ? daysBetweenDateOnly(sourceStartClean, optionStartClean)
            : 0;

        try {
          // Pais antes dos filhos, em qualquer profundidade, para que todo
          // parent_task_id já tenha sido mapeado quando o filho for criado
          for (const t of orderTasksParentsFirst(sourceTasks)) {
            const targetStageId =
              (t.stage_id ? stageIdMap.get(t.stage_id) : null) ||
              newStages[0]?.id ||
              null;
            const keepAssignee = options.keepAssignees === true;

            const created = await createTask({
              project_id: newProject.id,
              stage_id: targetStageId,
              title: t.title,
              description: t.description,
              priority: t.priority,
              status: options.resetStatus ? "todo" : t.status,
              progress: options.resetStatus ? 0 : t.progress,
              start_date: shiftDateOnly(t.start_date, dateOffsetDays),
              due_date: shiftDateOnly(t.due_date, dateOffsetDays),
              estimated_hours: t.estimated_hours,
              actual_hours: options.resetStatus ? null : (t.actual_hours ?? null),
              // chk_assignee_consistency: membro (id) OU convite pendente (nome + status)
              assignee_id: keepAssignee ? t.assignee_id : null,
              assignee_name: keepAssignee && !t.assignee_id ? t.assignee_name : null,
              assignee_status: keepAssignee && !t.assignee_id ? t.assignee_status : null,
              position: t.position,
              parent_task_id: t.parent_task_id ? taskIdMap.get(t.parent_task_id) ?? null : null,
            });

            taskIdMap.set(t.id, created.id);
            createdNewTasks.push(created);
          }

          // Clona dependências
          if (options.cloneDependencies !== false && sourceDeps.length > 0) {
            for (const dep of sourceDeps) {
              const newTaskId = taskIdMap.get(dep.task_id);
              const newDependsOnTaskId = taskIdMap.get(dep.depends_on_task_id);
              if (newTaskId && newDependsOnTaskId) {
                await addDependency(newTaskId, newDependsOnTaskId, dep.type);
              }
            }
          }
        } catch (err) {
          // Sem transação no client: desfaz o clone parcial
          if (getDataLayer() === "supabase") {
            await dataProvider.deleteProject(newProject.id).catch((cleanupErr) =>
              console.error("[cloneProject] Falha ao desfazer clone parcial:", cleanupErr)
            );
          }
          setState((prev) => ({
            ...prev,
            projects: prev.projects.filter((p) => p.id !== newProject.id),
            stages: prev.stages.filter((s) => s.project_id !== newProject.id),
            tasks: prev.tasks.filter((t) => t.project_id !== newProject.id),
          }));
          throw err;
        }
      }

      // 5. Consolidar o novo projeto, estágios e tarefas diretamente no state e storage
      setState((prev) => {
        const existingTaskIds = new Set(prev.tasks.map((t) => t.id));
        const missingTasks = createdNewTasks.filter((t) => !existingTaskIds.has(t.id));

        const existingStageIds = new Set(prev.stages.map((s) => s.id));
        const missingStages = newStages.filter((s) => !existingStageIds.has(s.id));

        const nextState: DataState = {
          ...prev,
          projects: prev.projects.some((p) => p.id === newProject.id)
            ? prev.projects
            : [newProject, ...prev.projects],
          stages: [...prev.stages, ...missingStages],
          tasks: [...prev.tasks, ...missingTasks],
        };


        return nextState;
      });

      markLoaded([newProject.id]);

      return newProject;
    },
    [
      state,
      createProject,
      createTask,
      addDependency,
      reportError,
      markLoaded,
      loadDetails,
      workspaceId,
    ]
  );

  // ── Comments & Attachments (Proposta 4) ─────────────────────
  const {
    getTaskComments,
    addTaskComment,
    deleteTaskComment,
    getTaskAttachments,
    addTaskAttachment,
    deleteTaskAttachment,
  } = useTaskDiscussion(userId, reportError);

  const value = useMemo<DataContextType>(
    () => ({
      ...state,
      createProject,
      cloneProject,
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
    }),
    [
      state,
      createProject,
      cloneProject,
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
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
