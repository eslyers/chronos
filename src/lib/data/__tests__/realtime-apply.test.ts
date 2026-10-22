/**
 * @jest-environment node
 */
jest.mock("@/lib/supabase/client", () => ({ createSPAClient: () => ({}) }));

import { applyRealtimeChange, type RealtimeChange } from "../realtime-apply";
import type { DataState } from "../models";

const P1 = "p1";
const baseTask = {
  id: "t1", project_id: P1, stage_id: "s1", title: "Original", description: null, priority: "medium",
  status: "todo", progress: 0, start_date: null, due_date: null, assignee_id: null, assignee_name: null,
  assignee_status: null, position: 0, parent_task_id: null, estimated_hours: null, actual_hours: null,
  created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T10:00:00Z",
};
const baseProject = {
  id: P1, workspace_id: "w1", name: "Projeto", description: null, color: "#3b82f6", status: "active",
  start_date: null, target_date: null, track_time: true, created_by: "u1",
  created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T10:00:00Z",
};

function stateWith(overrides: Partial<DataState> = {}): DataState {
  return {
    projects: [{ id: P1, workspace_id: "w1", owner_id: "u1", name: "Projeto", description: null, color: "#3b82f6",
      status: "active", start_date: null, target_date: null, progress: 42, track_time: true,
      created_at: "", updated_at: "2026-10-01T10:00:00Z" }],
    stages: [{ id: "s1", project_id: P1, name: "A Fazer", color: "#000", position: 0, is_done: false }],
    tasks: [{ id: "t1", project_id: P1, stage_id: "s1", title: "Original", description: null, priority: "medium",
      status: "todo", progress: 0, start_date: null, due_date: null, assignee_id: null, assignee_name: null,
      assignee_status: null, position: 0, parent_task_id: null, created_at: "", updated_at: "2026-10-01T10:00:00Z" }],
    dependencies: [],
    loading: false,
    ...overrides,
  };
}

const change = (c: Partial<RealtimeChange> & Pick<RealtimeChange, "table" | "eventType">): RealtimeChange => ({
  new: null, old: null, ...c,
});

describe("applyRealtimeChange — tarefas", () => {
  it("atualiza uma tarefa existente com um evento mais novo", () => {
    const next = applyRealtimeChange(
      stateWith(),
      change({ table: "tasks", eventType: "UPDATE", new: { ...baseTask, title: "Editada", updated_at: "2026-10-01T11:00:00Z" } }),
      { [P1]: true }
    );
    expect(next.tasks[0].title).toBe("Editada");
  });

  it("ignora um evento atrasado (mais antigo que o dado local)", () => {
    const state = stateWith();
    const next = applyRealtimeChange(
      state,
      change({ table: "tasks", eventType: "UPDATE", new: { ...baseTask, title: "Antiga", updated_at: "2026-10-01T09:00:00Z" } }),
      { [P1]: true }
    );
    expect(next).toBe(state);
  });

  it("insere uma tarefa nova em projeto carregado", () => {
    const next = applyRealtimeChange(
      stateWith(),
      change({ table: "tasks", eventType: "INSERT", new: { ...baseTask, id: "t2", title: "Nova" } }),
      { [P1]: true }
    );
    expect(next.tasks.map((t) => t.id)).toContain("t2");
  });

  it("descarta eventos de projetos que ainda não foram carregados", () => {
    const state = stateWith();
    const next = applyRealtimeChange(
      state,
      change({ table: "tasks", eventType: "INSERT", new: { ...baseTask, id: "t9", project_id: "outro" } }),
      { [P1]: true }
    );
    expect(next).toBe(state);
  });

  it("remove a tarefa, as subtarefas e as dependências no DELETE", () => {
    const state = stateWith({
      tasks: [
        ...stateWith().tasks,
        { ...stateWith().tasks[0], id: "t2", parent_task_id: "t1" },
        { ...stateWith().tasks[0], id: "t3", parent_task_id: "t2" },
        { ...stateWith().tasks[0], id: "t4" },
      ],
      dependencies: [
        { id: "d1", task_id: "t4", depends_on_task_id: "t3", type: "FS" },
        { id: "d2", task_id: "t4", depends_on_task_id: "t4x", type: "FS" },
      ],
    });
    const next = applyRealtimeChange(state, change({ table: "tasks", eventType: "DELETE", old: { id: "t1" } }), { [P1]: true });
    expect(next.tasks.map((t) => t.id)).toEqual(["t4"]);
    expect(next.dependencies.map((d) => d.id)).toEqual(["d2"]);
  });

  it("DELETE de tarefa desconhecida não altera o estado", () => {
    const state = stateWith();
    expect(applyRealtimeChange(state, change({ table: "tasks", eventType: "DELETE", old: { id: "zzz" } }), {})).toBe(state);
  });
});

describe("applyRealtimeChange — projetos, etapas e dependências", () => {
  it("atualiza o projeto preservando o progresso calculado no client", () => {
    const next = applyRealtimeChange(
      stateWith(),
      change({ table: "projects", eventType: "UPDATE", new: { ...baseProject, name: "Renomeado", updated_at: "2026-10-01T12:00:00Z" } }),
      {}
    );
    expect(next.projects[0].name).toBe("Renomeado");
    expect(next.projects[0].progress).toBe(42);
  });

  it("remove o projeto e tudo que pertence a ele no DELETE", () => {
    const next = applyRealtimeChange(stateWith(), change({ table: "projects", eventType: "DELETE", old: { id: P1 } }), { [P1]: true });
    expect(next.projects).toHaveLength(0);
    expect(next.stages).toHaveLength(0);
    expect(next.tasks).toHaveLength(0);
  });

  it("insere uma etapa só se o projeto estiver carregado", () => {
    const row = { id: "s2", project_id: P1, name: "Fazendo", color: "#000", sort_order: 1, is_done: false, wip_limit: null };
    expect(applyRealtimeChange(stateWith(), change({ table: "stages", eventType: "INSERT", new: row }), { [P1]: true }).stages).toHaveLength(2);
    const state = stateWith();
    expect(applyRealtimeChange(state, change({ table: "stages", eventType: "INSERT", new: row }), {})).toBe(state);
  });

  it("aplica dependências só quando uma das pontas é uma tarefa conhecida", () => {
    const dep = { id: "d1", task_id: "t1", depends_on_task_id: "tx", dependency_type: "SS" };
    const next = applyRealtimeChange(stateWith(), change({ table: "task_dependencies", eventType: "INSERT", new: dep }), {});
    expect(next.dependencies).toEqual([{ id: "d1", task_id: "t1", depends_on_task_id: "tx", type: "SS" }]);

    const state = stateWith();
    const foreign = { id: "d2", task_id: "ta", depends_on_task_id: "tb", dependency_type: "FS" };
    expect(applyRealtimeChange(state, change({ table: "task_dependencies", eventType: "INSERT", new: foreign }), {})).toBe(state);
  });
});
