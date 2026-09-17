import type { Stage, Task, TaskDependency, Project } from "@/lib/context/DataContext";

describe("Project Cloning Logic", () => {
  const sourceProject: Project = {
    id: "proj-orig",
    workspace_id: "ws-1",
    owner_id: "user-1",
    name: "Implantação ERP",
    description: "Projeto de rollout corporativo",
    color: "#3b82f6",
    status: "active",
    start_date: "2026-09-01",
    target_date: "2026-09-30",
    progress: 45,
    track_time: true,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };

  const sourceStages: Stage[] = [
    { id: "stage-1", project_id: "proj-orig", name: "Planejamento", color: "#3b82f6", position: 0, is_done: false },
    { id: "stage-2", project_id: "proj-orig", name: "Execução", color: "#f59e0b", position: 1, is_done: false },
    { id: "stage-3", project_id: "proj-orig", name: "Concluído", color: "#10b981", position: 2, is_done: true },
  ];

  const sourceTasks: Task[] = [
    {
      id: "task-parent",
      project_id: "proj-orig",
      stage_id: "stage-1",
      title: "Mapeamento de Processos",
      description: "Levantamento AS-IS",
      priority: "high",
      status: "done",
      progress: 100,
      start_date: "2026-09-01",
      due_date: "2026-09-05",
      estimated_hours: 40,
      assignee_id: "user-ana",
      assignee_name: "Ana",
      assignee_status: null,
      position: 0,
      parent_task_id: null,
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    },
    {
      id: "task-child",
      project_id: "proj-orig",
      stage_id: "stage-2",
      title: "Entrevistas Setoriais",
      description: "Financeiro e Compras",
      priority: "medium",
      status: "in_progress",
      progress: 50,
      start_date: "2026-09-06",
      due_date: "2026-09-10",
      estimated_hours: 20,
      assignee_id: "user-bruno",
      assignee_name: "Bruno",
      assignee_status: null,
      position: 1,
      parent_task_id: "task-parent",
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    },
  ];

  const sourceDependencies: TaskDependency[] = [
    {
      id: "dep-1",
      task_id: "task-child",
      depends_on_task_id: "task-parent",
      type: "FS",
    },
  ];

  test("correctly maps stages, tasks and re-parents subtasks during clone simulation", () => {
    // Simulação do algoritmo de clonagem
    expect(sourceProject.name).toBe("Implantação ERP");
    const newProjectId = "proj-clone";
    const stageIdMap = new Map<string, string>();
    const newStages: Stage[] = sourceStages.map((s, idx) => {
      const newId = `new-stage-${idx}`;
      stageIdMap.set(s.id, newId);
      return {
        ...s,
        id: newId,
        project_id: newProjectId,
      };
    });
    expect(newStages.length).toBe(3);

    const taskIdMap = new Map<string, string>();
    const clonedTasks: Task[] = [];

    // Clona pai primeiro
    const rootTasks = sourceTasks.filter((t) => !t.parent_task_id);
    for (const root of rootTasks) {
      const newId = `cloned-${root.id}`;
      taskIdMap.set(root.id, newId);
      clonedTasks.push({
        ...root,
        id: newId,
        project_id: newProjectId,
        stage_id: stageIdMap.get(root.stage_id!) || null,
        status: "todo", // reset status
        progress: 0,
        parent_task_id: null,
      });
    }

    // Clona filhos
    const subtasks = sourceTasks.filter((t) => !!t.parent_task_id);
    for (const child of subtasks) {
      const newId = `cloned-${child.id}`;
      taskIdMap.set(child.id, newId);
      clonedTasks.push({
        ...child,
        id: newId,
        project_id: newProjectId,
        stage_id: stageIdMap.get(child.stage_id!) || null,
        status: "todo",
        progress: 0,
        parent_task_id: taskIdMap.get(child.parent_task_id!) || null,
      });
    }

    // Clona dependências
    const clonedDeps: TaskDependency[] = sourceDependencies.map((d, idx) => ({
      id: `cloned-dep-${idx}`,
      task_id: taskIdMap.get(d.task_id)!,
      depends_on_task_id: taskIdMap.get(d.depends_on_task_id)!,
      type: d.type,
    }));

    expect(clonedTasks.length).toBe(2);
    expect(clonedTasks[0].status).toBe("todo");
    expect(clonedTasks[0].progress).toBe(0);
    expect(clonedTasks[1].parent_task_id).toBe("cloned-task-parent");

    expect(clonedDeps.length).toBe(1);
    expect(clonedDeps[0].task_id).toBe("cloned-task-child");
    expect(clonedDeps[0].depends_on_task_id).toBe("cloned-task-parent");
  });

  test("handles date shifting safely with full ISO strings and YYYY-MM-DD", () => {
    const normalizeDateOnly = (dateStr: string | null | undefined): string | null => {
      if (!dateStr) return null;
      const clean = dateStr.split("T")[0].trim();
      if (!clean || !/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
      return clean;
    };

    const sourceStartRaw = "2026-07-14T00:00:00.000Z";
    const optionStartRaw = "2026-09-03";

    const cleanSourceStart = normalizeDateOnly(sourceStartRaw);
    const cleanOptionStart = normalizeDateOnly(optionStartRaw);

    expect(cleanSourceStart).toBe("2026-07-14");
    expect(cleanOptionStart).toBe("2026-09-03");

    const oldStart = new Date(cleanSourceStart! + "T00:00:00").getTime();
    const newStart = new Date(cleanOptionStart! + "T00:00:00").getTime();
    const dateOffsetDays = Math.round((newStart - oldStart) / (1000 * 60 * 60 * 24));

    expect(dateOffsetDays).toBe(51);

    const shiftDateString = (dateStr: string | null | undefined): string | undefined => {
      if (!dateStr) return undefined;
      const clean = normalizeDateOnly(dateStr);
      if (!clean) return undefined;
      if (!dateOffsetDays || dateOffsetDays === 0) return clean;
      const d = new Date(clean + "T00:00:00");
      if (isNaN(d.getTime())) return clean;
      d.setDate(d.getDate() + dateOffsetDays);
      if (isNaN(d.getTime())) return clean;
      return d.toISOString().split("T")[0];
    };

    // Shifting an ISO task start date
    const shifted = shiftDateString("2026-07-14T15:30:00.000Z");
    expect(shifted).toBe("2026-09-03");

    // Shifting a regular YYYY-MM-DD date
    const shifted2 = shiftDateString("2026-07-20");
    expect(shifted2).toBe("2026-09-09");

    // Handling null or invalid safely
    expect(shiftDateString(null)).toBeUndefined();
    expect(shiftDateString("not-a-date")).toBeUndefined();
  });
});

