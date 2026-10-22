// ─────────────────────────────────────────────────────────────
// CHRONOS — Estado do formulário do TaskDialog
// Regras puras: estado inicial (criação/edição), reducer e montagem do
// payload enviado ao DataContext. Sem React aqui para facilitar os testes.
// ─────────────────────────────────────────────────────────────
import type { Stage, Task } from "@/lib/context/DataContext";
import { parseDurationToHours, formatHoursToHHMM } from "@/lib/duration";
import { toDateOnly, todayDateOnly } from "@/lib/date-only";
import type { Priority } from "@/lib/priority";
import { buildAssigneePayload } from "@/lib/task-assignee";

export type AssigneeMode = "member" | "custom";

export interface TaskFormState {
  title: string;
  description: string;
  stageId: string;
  parentTaskId: string;
  priority: Priority;
  progress: number;
  startDate: string;
  dueDate: string;
  estimatedHours: string;
  actualHours: string;
  assigneeMode: AssigneeMode;
  assigneeId: string;
  assigneeName: string | null;
  assigneeStatus: string | null;
  error: string;
}

export type TaskFormAction =
  | { type: "reset"; state: TaskFormState }
  | { type: "patch"; patch: Partial<TaskFormState> }
  // Troca de modo limpa o responsável anterior: membro e externo
  // são formas exclusivas no banco (chk_assignee_consistency)
  | { type: "toggleAssigneeMode" }
  // Membro: só o id é salvo; o nome exibido vem do perfil
  | { type: "selectMember"; assigneeId: string }
  | { type: "typeExternalAssignee"; assigneeName: string };

export const EMPTY_TASK_FORM: TaskFormState = {
  title: "",
  description: "",
  stageId: "",
  parentTaskId: "",
  priority: "medium",
  progress: 0,
  startDate: "",
  dueDate: "",
  estimatedHours: "",
  actualHours: "",
  assigneeMode: "member",
  assigneeId: "",
  assigneeName: null,
  assigneeStatus: null,
  error: "",
};

export function taskFormReducer(state: TaskFormState, action: TaskFormAction): TaskFormState {
  switch (action.type) {
    case "reset":
      return action.state;
    case "patch":
      return { ...state, ...action.patch };
    case "toggleAssigneeMode":
      return {
        ...state,
        assigneeMode: state.assigneeMode === "member" ? "custom" : "member",
        assigneeId: "",
        assigneeName: null,
        assigneeStatus: null,
      };
    case "selectMember":
      return { ...state, assigneeId: action.assigneeId, assigneeName: null, assigneeStatus: null };
    case "typeExternalAssignee":
      return { ...state, assigneeName: action.assigneeName, assigneeId: "", assigneeStatus: "pending" };
  }
}

/** Estado do formulário ao abrir: campos da tarefa (edição) ou padrões (criação). */
export function buildInitialTaskForm(
  task: Task | null | undefined,
  defaults: { defaultStageId?: string | null; defaultDueDate?: string | null; stages: Stage[] }
): TaskFormState {
  if (!task) {
    return {
      ...EMPTY_TASK_FORM,
      stageId: defaults.defaultStageId ?? defaults.stages[0]?.id ?? "",
      startDate: todayDateOnly(),
      dueDate: toDateOnly(defaults.defaultDueDate) ?? "",
    };
  }

  const currentAssigneeId = (task as unknown as { assignee_id?: string | null }).assignee_id ?? "";
  const currentAssigneeName = task.assignee_name ?? null;

  let assignee: Pick<TaskFormState, "assigneeMode" | "assigneeId" | "assigneeName">;
  if (currentAssigneeId) {
    // Membro: o nome exibido vem do perfil (assignee_name fica NULL no banco)
    assignee = { assigneeMode: "member", assigneeId: currentAssigneeId, assigneeName: null };
  } else if (currentAssigneeName) {
    assignee = { assigneeMode: "custom", assigneeId: "", assigneeName: currentAssigneeName };
  } else {
    assignee = { assigneeMode: "member", assigneeId: "", assigneeName: null };
  }

  return {
    title: task.title ?? "",
    description: task.description ?? "",
    stageId: task.stage_id ?? "",
    parentTaskId: task.parent_task_id ?? "",
    priority: task.priority ?? "medium",
    progress: task.progress ?? 0,
    startDate: toDateOnly(task.start_date) ?? "",
    dueDate: toDateOnly(task.due_date) ?? "",
    estimatedHours: task.estimated_hours != null ? formatHoursToHHMM(task.estimated_hours) : "",
    actualHours: task.actual_hours != null ? formatHoursToHHMM(task.actual_hours) : "",
    ...assignee,
    assigneeStatus: task.assignee_status ?? null,
    error: "",
  };
}

/** Status derivado do progresso: 100% conclui; reabrir uma concluída volta a andamento/a fazer. */
export function deriveTaskStatus(currentStatus: Task["status"] | undefined, progress: number): Task["status"] {
  let calculatedStatus: Task["status"] = currentStatus ?? "todo";
  if (progress === 100) {
    calculatedStatus = "done";
  } else if (calculatedStatus === "done") {
    calculatedStatus = progress > 0 ? "in_progress" : "todo";
  }
  return calculatedStatus;
}

/** Monta o Partial<Task> enviado para createTask/updateTask. */
export function buildTaskPayload(
  form: TaskFormState,
  ctx: { task?: Task | null; stages: Stage[]; trackTime: boolean }
): Partial<Task> {
  const parsedEst = parseDurationToHours(form.estimatedHours);
  const parsedAct = parseDurationToHours(form.actualHours);

  // Etapa só se for uma etapa real do projeto; senão mantém a atual (edição)
  // ou deixa o DataContext escolher a primeira (criação)
  const validStageId = ctx.stages.some((s) => s.id === form.stageId) ? form.stageId : null;

  const taskData: Partial<Task> = {
    title: form.title.trim(),
    description: form.description.trim() || null,
    parent_task_id: form.parentTaskId || null,
    priority: form.priority,
    status: deriveTaskStatus(ctx.task?.status, form.progress),
    progress: form.progress,
    // Colunas DATE: envia só "YYYY-MM-DD" (toISOString deslocaria o dia)
    start_date: toDateOnly(form.startDate),
    due_date: toDateOnly(form.dueDate),
    estimated_hours: ctx.trackTime && parsedEst !== null && !isNaN(parsedEst) ? parsedEst : null,
    actual_hours: ctx.trackTime && parsedAct !== null && !isNaN(parsedAct) ? parsedAct : null,
    ...buildAssigneePayload(form.assigneeMode, form.assigneeId, form.assigneeName),
  };
  if (validStageId) taskData.stage_id = validStageId;
  return taskData;
}
