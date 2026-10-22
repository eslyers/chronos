import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { DataProvider, useData, type Stage, type Task } from "../DataContext";

// Sem NEXT_PUBLIC_SUPABASE_* o DataProvider roda em modo demo (localStorage)
const wrapper = ({ children }: { children: React.ReactNode }) => <DataProvider>{children}</DataProvider>;

async function setup() {
  window.localStorage.clear();
  const hook = renderHook(() => useData(), { wrapper });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

async function createProjectWithStages(result: { current: ReturnType<typeof useData> }) {
  let project!: Awaited<ReturnType<ReturnType<typeof useData>["createProject"]>>;
  await act(async () => {
    project = await result.current.createProject({
      name: "Projeto Teste",
      start_date: "2026-10-01",
      customStages: [
        { name: "A Fazer", color: "#000", sort_order: 0 },
        { name: "Fazendo", color: "#000", sort_order: 1 },
        { name: "Concluído", color: "#000", sort_order: 2, is_done: true },
      ],
    });
  });
  const stages = (project as unknown as { stages: Stage[] }).stages;
  return { project, stages };
}

describe("DataContext (modo demo)", () => {
  it("moves a stage's tasks to the first remaining stage when deleting it", async () => {
    const { result } = await setup();
    const { project, stages } = await createProjectWithStages(result);
    let task!: Task;
    await act(async () => {
      task = await result.current.createTask({ project_id: project.id, stage_id: stages[1].id, title: "T" });
    });

    await act(async () => {
      await result.current.deleteStage(stages[1].id);
    });

    const moved = result.current.tasks.find((t) => t.id === task.id);
    expect(moved?.stage_id).toBe(stages[0].id);
    expect(result.current.stages.some((s) => s.id === stages[1].id)).toBe(false);
  });

  it("refuses to delete the only stage while it still has tasks", async () => {
    const { result } = await setup();
    let project!: Awaited<ReturnType<ReturnType<typeof useData>["createProject"]>>;
    await act(async () => {
      project = await result.current.createProject({
        name: "Uma etapa",
        customStages: [{ name: "Única", color: "#000", sort_order: 0 }],
      });
    });
    const [only] = (project as unknown as { stages: Stage[] }).stages;
    await act(async () => {
      await result.current.createTask({ project_id: project.id, stage_id: only.id, title: "T" });
    });

    await expect(result.current.deleteStage(only.id)).rejects.toThrow("Mova as tarefas");
    expect(result.current.stages.some((s) => s.id === only.id)).toBe(true);
  });

  it("removes subtasks and their dependencies when deleting a task", async () => {
    const { result } = await setup();
    const { project, stages } = await createProjectWithStages(result);
    const created: Task[] = [];
    await act(async () => {
      const parent = await result.current.createTask({ project_id: project.id, stage_id: stages[0].id, title: "Pai" });
      const child = await result.current.createTask({
        project_id: project.id,
        stage_id: stages[0].id,
        title: "Filho",
        parent_task_id: parent.id,
      });
      const other = await result.current.createTask({ project_id: project.id, stage_id: stages[0].id, title: "Outra" });
      created.push(parent, child, other);
    });
    const [parent, child, other] = created;
    await act(async () => {
      await result.current.addDependency(other.id, child.id);
    });

    await act(async () => {
      await result.current.deleteTask(parent.id);
    });

    const ids = result.current.tasks.map((t) => t.id);
    expect(ids).not.toContain(parent.id);
    expect(ids).not.toContain(child.id);
    expect(ids).toContain(other.id);
    expect(result.current.dependencies).toHaveLength(0);
  });

  it("completes a task moved into the done stage", async () => {
    const { result } = await setup();
    const { project, stages } = await createProjectWithStages(result);
    let task!: Task;
    await act(async () => {
      task = await result.current.createTask({ project_id: project.id, stage_id: stages[0].id, title: "T" });
    });

    await act(async () => {
      await result.current.moveTask(task.id, stages[2].id, 0);
    });

    const done = result.current.tasks.find((t) => t.id === task.id)!;
    expect(done.status).toBe("done");
    expect(done.progress).toBe(100);
  });

  it("stores task dates as YYYY-MM-DD", async () => {
    const { result } = await setup();
    const { project, stages } = await createProjectWithStages(result);
    let task!: Task;
    await act(async () => {
      task = await result.current.createTask({
        project_id: project.id,
        stage_id: stages[0].id,
        title: "T",
        due_date: "2026-10-21T00:00:00.000Z",
      });
    });
    expect(task.due_date).toBe("2026-10-21");

    await act(async () => {
      await result.current.updateTask(task.id, { start_date: "2026-10-15T00:00:00.000Z" });
    });
    expect(result.current.tasks.find((t) => t.id === task.id)?.start_date).toBe("2026-10-15");
  });

  it("clones a 3-level hierarchy, shifting dates", async () => {
    const { result } = await setup();
    const { project, stages } = await createProjectWithStages(result);
    await act(async () => {
      const root = await result.current.createTask({
        project_id: project.id,
        stage_id: stages[0].id,
        title: "Raiz",
        due_date: "2026-10-10",
      });
      // O neto vem ANTES do filho na lista de origem (caso que achatava a WBS)
      const grandchild = await result.current.createTask({
        project_id: project.id,
        stage_id: stages[0].id,
        title: "Neto",
      });
      const child = await result.current.createTask({
        project_id: project.id,
        stage_id: stages[0].id,
        title: "Filho",
        parent_task_id: root.id,
      });
      await result.current.updateTask(grandchild.id, { parent_task_id: child.id });
    });

    let clone!: Awaited<ReturnType<ReturnType<typeof useData>["cloneProject"]>>;
    await act(async () => {
      clone = await result.current.cloneProject(project.id, {
        name: "Clone",
        startDate: "2026-11-01",
        shiftDates: true,
      });
    });

    const cloned = result.current.tasks.filter((t) => t.project_id === clone.id);
    const byTitle = Object.fromEntries(cloned.map((t) => [t.title, t]));
    expect(cloned).toHaveLength(3);
    expect(byTitle["Filho"].parent_task_id).toBe(byTitle["Raiz"].id);
    expect(byTitle["Neto"].parent_task_id).toBe(byTitle["Filho"].id);
    // Projeto começa em 01/10 → clone em 01/11: +31 dias
    expect(byTitle["Raiz"].due_date).toBe("2026-11-10");
  });
});
