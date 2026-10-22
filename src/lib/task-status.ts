// ─────────────────────────────────────────────────────────────
// CHRONOS — Regras de status de tarefa (fonte única)
// Datas comparadas como texto YYYY-MM-DD no fuso local: nunca usar
// `new Date(task.due_date) < new Date()`, que no Brasil marca a tarefa como
// atrasada desde as 21h da véspera.
// ─────────────────────────────────────────────────────────────
import type { Task } from "@/lib/context/DataContext";
import { toDateOnly, todayDateOnly, daysBetweenDateOnly } from "@/lib/date-only";

type StatusFields = Pick<Task, "status" | "progress" | "due_date">;

export function isTaskDone(task: Pick<Task, "status" | "progress">): boolean {
  return task.status === "done" || task.progress === 100;
}

/** Vencida antes de hoje e ainda não concluída. */
export function isTaskOverdue(task: StatusFields, today: string = todayDateOnly()): boolean {
  const due = toDateOnly(task.due_date);
  return !!due && !isTaskDone(task) && due < today;
}

/** Vence hoje e ainda não concluída. */
export function isTaskDueToday(task: StatusFields, today: string = todayDateOnly()): boolean {
  return toDateOnly(task.due_date) === today && !isTaskDone(task);
}

/** Dias até o vencimento (negativo = atrasada); null sem data. */
export function daysUntilDue(task: Pick<Task, "due_date">, today: string = todayDateOnly()): number | null {
  const due = toDateOnly(task.due_date);
  return due ? daysBetweenDateOnly(today, due) : null;
}
