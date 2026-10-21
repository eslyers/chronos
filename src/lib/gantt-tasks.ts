// ─────────────────────────────────────────────────────────────
// CHRONOS — Montagem das linhas do Gantt (gantt-task-react) e conversão
// de datas entre o Gantt e as colunas DATE do banco.
//
// Convenção de datas: o gantt-task-react desenha a barra de `start` até
// `end`. Para a barra cobrir o dia do prazo, `end` é EXCLUSIVO: meia-noite
// local do dia seguinte ao due_date. Na volta (drag), due_date = end - 1 dia.
// ─────────────────────────────────────────────────────────────
import type { Task as GanttTask } from "gantt-task-react";
import type { Project, Task, TaskDependency } from "@/lib/context/DataContext";
import { compareTasksByDueDate } from "@/lib/task-sorting";
import { formatDateOnly, parseDateOnly, shiftDateOnly, toDateOnly } from "@/lib/date-only";
import { isTaskDone } from "@/lib/task-status";
import { PRIORITY_HEX, type Priority } from "@/lib/priority";

export type GanttSortField = "name" | "assignee" | "start" | "end";
export type GanttSortDirection = "asc" | "desc";

/** Linha do Gantt com os campos extras lidos pela tabela customizada. */
export type ChronosGanttTask = GanttTask & {
  assigneeId?: string | null;
  assigneeName?: string | null;
  workspaceId?: string;
  isDone?: boolean;
};

export const GANTT_DAY_MS = 86_400_000;
/** Duração assumida (dias) para tarefa sem prazo. */
const DEFAULT_TASK_DAYS = 7;
/** Duração assumida (dias, a partir de hoje) para projeto sem data-alvo. */
const DEFAULT_PROJECT_DAYS = 30;

const PROJECT_PREFIX = "project-";
const TASK_PREFIX = "task-";

export const ganttProjectId = (projectId: string) => `${PROJECT_PREFIX}${projectId}`;
export const ganttTaskId = (taskId: string) => `${TASK_PREFIX}${taskId}`;

/** "project-<id>" / "task-<id>" → tipo + id real; formato desconhecido → null. */
export function parseGanttId(ganttId: string): { kind: "project" | "task"; id: string } | null {
  if (ganttId.startsWith(PROJECT_PREFIX)) return { kind: "project", id: ganttId.slice(PROJECT_PREFIX.length) };
  if (ganttId.startsWith(TASK_PREFIX)) return { kind: "task", id: ganttId.slice(TASK_PREFIX.length) };
  return null;
}

// ── Conversão de datas ──────────────────────────────────────

/** Arredonda para a meia-noite local mais próxima (o drag pode deixar horas soltas). */
export function roundToLocalDay(date: Date): Date {
  const roundUp = date.getHours() >= 12 ? 1 : 0;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + roundUp);
}

/** Data de início (YYYY-MM-DD) → `start` do Gantt (meia-noite local). */
export function ganttStartFromDateOnly(value: string | null | undefined): Date | null {
  return parseDateOnly(value);
}

/** Prazo inclusivo (YYYY-MM-DD) → `end` exclusivo do Gantt (meia-noite do dia seguinte). */
export function ganttEndFromDueDate(value: string | null | undefined): Date | null {
  return parseDateOnly(shiftDateOnly(toDateOnly(value), 1));
}

/** `start` do Gantt → data de início YYYY-MM-DD. */
export function dateOnlyFromGanttStart(start: Date): string {
  return formatDateOnly(roundToLocalDay(start));
}

/** `end` exclusivo do Gantt → prazo inclusivo YYYY-MM-DD. */
export function dueDateFromGanttEnd(end: Date): string {
  return shiftDateOnly(formatDateOnly(roundToLocalDay(end)), -1) as string;
}

/** `end` exclusivo do Gantt → último dia coberto pela barra (para exibição). */
export function ganttEndToInclusiveDate(end: Date): Date {
  return parseDateOnly(dueDateFromGanttEnd(end)) as Date;
}

/** DD/MM/YY (compacto para tabela e tooltip do Gantt). */
export function formatGanttDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

/**
 * Converte um drag/resize do Gantt no patch de datas da tarefa. Só inclui a
 * data que realmente mudou (resize do fim não grava um início que era apenas
 * herdado do projeto). Retorna null se o resultado for inválido (prazo antes
 * do início) — o chamador deve rejeitar a operação.
 */
export function ganttDateChangeToPatch(
  original: Pick<GanttTask, "start" | "end">,
  changed: Pick<GanttTask, "start" | "end">
): { start_date?: string; due_date?: string } | null {
  const prevStart = dateOnlyFromGanttStart(original.start);
  const prevDue = dueDateFromGanttEnd(original.end);
  const nextStart = dateOnlyFromGanttStart(changed.start);
  const nextDue = dueDateFromGanttEnd(changed.end);

  if (nextDue < nextStart) return null;

  const patch: { start_date?: string; due_date?: string } = {};
  if (nextStart !== prevStart) patch.start_date = nextStart;
  if (nextDue !== prevDue) patch.due_date = nextDue;
  return patch;
}

// ── Paleta ──────────────────────────────────────────────────

export function ganttPalette(isDark: boolean) {
  return isDark
    ? {
        barBackground: "#3b82f6",
        barBackgroundSelected: "#2563eb",
        projectBackground: "#475569",
        projectBackgroundSelected: "#64748b",
        projectProgress: "#22c55e",
        projectProgressSelected: "#4ade80",
        arrowColor: "#94a3b8",
        milestoneBackground: "#f87171",
        milestoneSelected: "#ef4444",
        todayColor: "rgba(59, 130, 246, 0.4)",
        doneBar: "#059669",
        doneProgress: "#10b981",
      }
    : {
        barBackground: "#3b82f6",
        barBackgroundSelected: "#1d4ed8",
        projectBackground: "#64748b",
        projectBackgroundSelected: "#334155",
        projectProgress: "#16a34a",
        projectProgressSelected: "#22c55e",
        arrowColor: "#475569",
        milestoneBackground: "#ef4444",
        milestoneSelected: "#b91c1c",
        todayColor: "rgba(37, 99, 235, 0.4)",
        doneBar: "#10b981",
        doneProgress: "#34d399",
      };
}

// ── Montagem das linhas ─────────────────────────────────────

export interface BuildGanttTasksInput {
  projects: Project[];
  getTasksByProject: (projectId: string) => Task[];
  dependencies: TaskDependency[];
  /** "all" ou o id de um projeto. */
  selectedProjectId: string;
  collapsedProjects: ReadonlySet<string>;
  collapsedTasks: ReadonlySet<string>;
  isDark: boolean;
  sortField: GanttSortField | null;
  sortDirection: GanttSortDirection;
  /** Bloqueia drag/resize de todas as barras (ex.: papel "viewer"). */
  readOnly?: boolean;
  /** Referência de "hoje" (injetável nos testes). */
  now?: Date;
}

function compareForSort(a: Task, b: Task, field: GanttSortField): number {
  switch (field) {
    case "name":
      return (a.title || "").localeCompare(b.title || "", "pt-BR");
    case "assignee":
      return (a.assignee_name || "zzz").localeCompare(b.assignee_name || "zzz", "pt-BR");
    case "start":
      // Texto YYYY-MM-DD ordena cronologicamente; sem data vai para o início
      return (toDateOnly(a.start_date) ?? "").localeCompare(toDateOnly(b.start_date) ?? "");
    case "end":
      return (toDateOnly(a.due_date) ?? "").localeCompare(toDateOnly(b.due_date) ?? "");
  }
}

/** Função pura: projetos + tarefas → linhas do Gantt (hierarquia N-níveis com drill-down). */
export function buildGanttTasks(input: BuildGanttTasksInput): ChronosGanttTask[] {
  const {
    projects,
    getTasksByProject,
    dependencies,
    selectedProjectId,
    collapsedProjects,
    collapsedTasks,
    isDark,
    sortField,
    sortDirection,
    readOnly = false,
    now = new Date(),
  } = input;

  const palette = ganttPalette(isDark);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // As setas do Gantt ligam ids do próprio Gantt ("task-<id>"), não os ids do banco
  const dependsOnByTask = new Map<string, string[]>();
  for (const d of dependencies) {
    const list = dependsOnByTask.get(d.task_id) ?? [];
    list.push(ganttTaskId(d.depends_on_task_id));
    dependsOnByTask.set(d.task_id, list);
  }

  const filteredProjects =
    selectedProjectId === "all" ? projects : projects.filter((p) => p.id === selectedProjectId);

  const result: ChronosGanttTask[] = [];

  for (const project of filteredProjects) {
    const projectStart = ganttStartFromDateOnly(project.start_date) ?? today;
    const projectEnd =
      ganttEndFromDueDate(project.target_date) ??
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + DEFAULT_PROJECT_DAYS);

    const isCollapsed = collapsedProjects.has(project.id);

    result.push({
      start: projectStart,
      end: projectEnd,
      name: `${isCollapsed ? "▶" : "▼"} ${project.name}`,
      id: ganttProjectId(project.id),
      type: "project",
      progress: project.progress,
      styles: {
        backgroundColor: project.color || "#475569",
        backgroundSelectedColor: project.color || "#334155",
        progressColor: "#ffffff",
        progressSelectedColor: "#ffffff",
      },
      // Linha de projeto é só agregadora: datas vêm do cadastro do projeto
      isDisabled: true,
    });

    if (isCollapsed) continue;

    const tasks = getTasksByProject(project.id);
    const childrenByParent = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.parent_task_id) continue;
      const list = childrenByParent.get(t.parent_task_id) ?? [];
      list.push(t);
      childrenByParent.set(t.parent_task_id, list);
    }

    const addTasksRecursively = (parentList: Task[], depth: number) => {
      const sorted = [...parentList];
      if (sortField) {
        sorted.sort((a, b) => {
          const res = compareForSort(a, b, sortField);
          return sortDirection === "asc" ? res : -res;
        });
      } else {
        sorted.sort(compareTasksByDueDate);
      }

      for (const task of sorted) {
        const children = childrenByParent.get(task.id) ?? [];
        const hasChildren = children.length > 0;
        const isTaskCollapsed = collapsedTasks.has(task.id);

        const start = ganttStartFromDateOnly(task.start_date) ?? projectStart;
        const end =
          ganttEndFromDueDate(task.due_date) ??
          new Date(start.getFullYear(), start.getMonth(), start.getDate() + DEFAULT_TASK_DAYS);

        const isCompleted = isTaskDone(task);
        const priorityColor = PRIORITY_HEX[task.priority as Priority] as string | undefined;
        let barColor = priorityColor ?? (depth > 0 ? palette.projectBackground : palette.barBackground);
        let barProgressColor = "#ffffff";
        if (isCompleted) {
          barColor = palette.doneBar;
          barProgressColor = palette.doneProgress;
        }

        // Indentação e indicador de Drill-down (▶ se fechado, ▼ se aberto, ↳ se filha final)
        const indent = depth > 0 ? "  ".repeat(depth) : "";
        const expandIcon = hasChildren ? (isTaskCollapsed ? "▶ " : "▼ ") : depth > 0 ? "↳ " : "";

        result.push({
          start,
          end,
          name: `${indent}${expandIcon}${task.title}`,
          id: ganttTaskId(task.id),
          type: "task",
          progress: task.progress,
          project: task.parent_task_id ? ganttTaskId(task.parent_task_id) : ganttProjectId(project.id),
          dependencies: dependsOnByTask.get(task.id),
          hideChildren: isTaskCollapsed,
          isDisabled: readOnly,
          styles: {
            backgroundColor: barColor,
            backgroundSelectedColor: barColor,
            progressColor: barProgressColor,
            progressSelectedColor: barProgressColor,
          },
          assigneeId: task.assignee_id,
          assigneeName: task.assignee_name,
          workspaceId: project.workspace_id,
          isDone: isCompleted,
        });

        // Se a tarefa não estiver recolhida, renderiza as filhas de nível N+1 (drill-down)
        if (hasChildren && !isTaskCollapsed) {
          addTasksRecursively(children, depth + 1);
        }
      }
    };

    addTasksRecursively(
      tasks.filter((t) => !t.parent_task_id),
      0
    );
  }

  return result;
}
