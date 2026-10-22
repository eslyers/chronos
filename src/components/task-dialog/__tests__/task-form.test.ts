import type { Stage, Task } from "@/lib/context/DataContext";
import {
  EMPTY_TASK_FORM,
  buildInitialTaskForm,
  buildTaskPayload,
  deriveTaskStatus,
  taskFormReducer,
  type TaskFormState,
} from "@/components/task-dialog/task-form";
import {
  computeHoursVariance,
  normalizeDurationOnBlur,
  sanitizeDurationInput,
} from "@/components/task-dialog/duration-input";
import { todayDateOnly } from "@/lib/date-only";

const stages = [{ id: "s1" }, { id: "s2", is_done: true }] as unknown as Stage[];

function task(extra: Partial<Task> & { assignee_id?: string | null } = {}): Task {
  return {
    id: "t1",
    project_id: "p1",
    title: "Fechar balancete",
    status: "todo",
    priority: "high",
    progress: 40,
    ...extra,
  } as unknown as Task;
}

describe("taskFormReducer", () => {
  it("patch altera só os campos informados", () => {
    const next = taskFormReducer(EMPTY_TASK_FORM, { type: "patch", patch: { title: "X" } });
    expect(next).toEqual({ ...EMPTY_TASK_FORM, title: "X" });
  });

  it("trocar o modo do responsável limpa id, nome e status", () => {
    const state: TaskFormState = { ...EMPTY_TASK_FORM, assigneeId: "u1", assigneeName: "a", assigneeStatus: "pending" };
    const next = taskFormReducer(state, { type: "toggleAssigneeMode" });
    expect(next).toMatchObject({ assigneeMode: "custom", assigneeId: "", assigneeName: null, assigneeStatus: null });
    expect(taskFormReducer(next, { type: "toggleAssigneeMode" }).assigneeMode).toBe("member");
  });

  it("membro grava só o id; externo grava nome e fica pendente", () => {
    const member = taskFormReducer(
      { ...EMPTY_TASK_FORM, assigneeName: "x", assigneeStatus: "invited" },
      { type: "selectMember", assigneeId: "u1" }
    );
    expect(member).toMatchObject({ assigneeId: "u1", assigneeName: null, assigneeStatus: null });

    const external = taskFormReducer(
      { ...EMPTY_TASK_FORM, assigneeMode: "custom", assigneeId: "u1" },
      { type: "typeExternalAssignee", assigneeName: "Roberto" }
    );
    expect(external).toMatchObject({ assigneeId: "", assigneeName: "Roberto", assigneeStatus: "pending" });
  });

  it("reset substitui o estado inteiro", () => {
    const fresh = { ...EMPTY_TASK_FORM, title: "novo" };
    expect(taskFormReducer({ ...EMPTY_TASK_FORM, error: "x" }, { type: "reset", state: fresh })).toBe(fresh);
  });
});

describe("buildInitialTaskForm", () => {
  it("criação usa etapa padrão, hoje como início e prazo padrão", () => {
    const form = buildInitialTaskForm(null, { defaultStageId: null, defaultDueDate: "2026-11-05", stages });
    expect(form).toEqual({
      ...EMPTY_TASK_FORM,
      stageId: "s1",
      startDate: todayDateOnly(),
      dueDate: "2026-11-05",
    });
    expect(buildInitialTaskForm(undefined, { defaultStageId: "s2", stages }).stageId).toBe("s2");
    expect(buildInitialTaskForm(undefined, { stages: [] }).stageId).toBe("");
  });

  it("edição carrega campos da tarefa e formata horas", () => {
    const form = buildInitialTaskForm(
      task({
        description: "desc",
        stage_id: "s2",
        start_date: "2026-10-01",
        due_date: "2026-10-21",
        estimated_hours: 8.5,
        actual_hours: null,
        assignee_id: "u1",
        assignee_status: "invited",
      } as Partial<Task>),
      { stages }
    );
    expect(form).toMatchObject({
      title: "Fechar balancete",
      description: "desc",
      stageId: "s2",
      priority: "high",
      progress: 40,
      startDate: "2026-10-01",
      dueDate: "2026-10-21",
      estimatedHours: "08h:30m",
      actualHours: "",
      assigneeMode: "member",
      assigneeId: "u1",
      assigneeName: null,
      assigneeStatus: "invited",
      error: "",
    });
  });

  it("responsável externo abre em modo custom", () => {
    const form = buildInitialTaskForm(task({ assignee_name: "Roberto", assignee_status: "pending" } as Partial<Task>), {
      stages,
    });
    expect(form).toMatchObject({ assigneeMode: "custom", assigneeId: "", assigneeName: "Roberto", assigneeStatus: "pending" });
  });
});

describe("deriveTaskStatus", () => {
  it("100% conclui; reabrir concluída volta para andamento ou a fazer", () => {
    expect(deriveTaskStatus("todo", 100)).toBe("done");
    expect(deriveTaskStatus("done", 50)).toBe("in_progress");
    expect(deriveTaskStatus("done", 0)).toBe("todo");
    expect(deriveTaskStatus("in_progress", 30)).toBe("in_progress");
    expect(deriveTaskStatus(undefined, 0)).toBe("todo");
  });
});

describe("buildTaskPayload", () => {
  const form: TaskFormState = {
    ...EMPTY_TASK_FORM,
    title: "  Conciliar  ",
    description: "   ",
    stageId: "s2",
    progress: 100,
    startDate: "2026-10-01",
    estimatedHours: "08:00",
    actualHours: "abc",
  };

  it("normaliza texto, status, datas e horas", () => {
    const payload = buildTaskPayload(form, { task: null, stages, trackTime: true });
    expect(payload).toMatchObject({
      title: "Conciliar",
      description: null,
      parent_task_id: null,
      priority: "medium",
      status: "done",
      progress: 100,
      start_date: "2026-10-01",
      due_date: null,
      estimated_hours: 8,
      actual_hours: null,
      stage_id: "s2",
    });
  });

  it("sem controle de horas não envia horas; etapa inexistente não é enviada", () => {
    const payload = buildTaskPayload({ ...form, stageId: "todo" }, { task: null, stages, trackTime: false });
    expect(payload.estimated_hours).toBeNull();
    expect(payload.actual_hours).toBeNull();
    expect("stage_id" in payload).toBe(false);
  });
});

describe("campos de duração", () => {
  it("sanitize remove caracteres inválidos", () => {
    expect(sanitizeDurationInput("36h:25m!x")).toBe("36h:25m");
    expect(sanitizeDurationInput("8,5 h")).toBe("8,5 h");
  });

  it("normalize no blur formata ou mantém", () => {
    expect(normalizeDurationOnBlur("36:25")).toBe("36h:25m");
    expect(normalizeDurationOnBlur("8")).toBe("08h:00m");
    expect(normalizeDurationOnBlur("   ")).toBeNull();
    expect(normalizeDurationOnBlur("hm")).toBeNull();
  });

  it("variação horas reais × estimadas", () => {
    expect(computeHoursVariance("08:00", "08:00")).toEqual({ kind: "exact" });
    expect(computeHoursVariance("10:00", "08:00")).toEqual({ kind: "under", diffFormatted: "2h", pct: -20 });
    expect(computeHoursVariance("08:00", "09:30")).toEqual({ kind: "over", diffFormatted: "1h:30m", pct: 19 });
    expect(computeHoursVariance("", "08:00")).toBeNull();
    expect(computeHoursVariance("0", "08:00")).toBeNull();
  });
});
