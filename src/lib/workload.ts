import type { Task } from "@/lib/context/DataContext";
import { todayDateOnly, toDateOnly, daysBetweenDateOnly } from "@/lib/date-only";
import { isTaskDone, isTaskOverdue } from "@/lib/task-status";

export type WorkloadStatus = "overload" | "optimal" | "under";

export type MemberWorkload = {
  memberKey: string; // user id or normalized name
  memberName: string;
  memberId: string | null;
  totalEstimatedHours: number;
  completedHours: number;
  pendingHours: number;
  overdueHours: number;
  taskCount: number;
  activeTaskCount: number;
  completedTaskCount: number;
  capacityHours: number; // e.g. 40h standard for weekly or 8h daily
  utilizationPercentage: number; // (pendingHours / capacityHours) * 100
  status: WorkloadStatus;
  tasks: Task[];
};

export type WorkloadPeriod = "all" | "this_week" | "next_week" | "this_month";

export type WorkloadSummary = {
  totalAllocatedHours: number;
  totalCapacityHours: number;
  overallUtilization: number;
  totalMembers: number;
  overloadedMembersCount: number;
  optimalMembersCount: number;
  underallocatedMembersCount: number;
  unassignedTasksCount: number;
  unassignedHours: number;
  members: MemberWorkload[];
};

/**
 * Standard capacity constants
 */
export const DEFAULT_WEEKLY_CAPACITY_HOURS = 40;
export const DEFAULT_DAILY_CAPACITY_HOURS = 8;
export const DEFAULT_TASK_ESTIMATED_HOURS = 8; // fallback when estimated_hours is not specified

/** Nomes dos membros do workspace por user id (profiles.full_name ou e-mail). */
export type MemberNames = Record<string, string>;

/** Rótulo de último recurso para um membro cujo perfil não foi carregado. */
export const UNKNOWN_MEMBER_LABEL = "Membro da Equipe";

/**
 * Normaliza o nome ou chave de identificação do colaborador.
 * Membros do workspace têm assignee_id com assignee_name NULL (constraint do
 * banco), então o nome vem de `memberNames`; convites pendentes têm só o nome.
 */
export function getTaskAssigneeKey(
  task: Task,
  memberNames?: MemberNames
): { key: string; name: string; id: string | null } {
  if (task.assignee_id) {
    return {
      key: task.assignee_id,
      name:
        memberNames?.[task.assignee_id]?.trim() ||
        task.assignee_name?.trim() ||
        UNKNOWN_MEMBER_LABEL,
      id: task.assignee_id,
    };
  }
  if (task.assignee_name && task.assignee_name.trim()) {
    return {
      key: task.assignee_name.trim().toLowerCase(),
      name: task.assignee_name.trim(),
      id: null,
    };
  }
  return {
    key: "unassigned",
    name: "Não Atribuído",
    id: null,
  };
}

/**
 * Determina as horas estimadas de uma tarefa, usando valor cadastrado ou fallback razoável
 */
export function getTaskEstimatedHours(task: Task): number {
  if (typeof task.estimated_hours === "number" && !isNaN(task.estimated_hours) && task.estimated_hours > 0) {
    return task.estimated_hours;
  }
  // Se não foi estipulado manualmente, podemos calcular com base na duração ou usar 8h padrão
  const start = toDateOnly(task.start_date);
  const due = toDateOnly(task.due_date);
  if (start && due) {
    const diffDays = Math.max(1, daysBetweenDateOnly(start, due) + 1);
    // Limite máximo sensato de fallback para não distorcer o gráfico
    return Math.min(diffDays * DEFAULT_DAILY_CAPACITY_HOURS, 80);
  }
  return DEFAULT_TASK_ESTIMATED_HOURS;
}

/**
 * Filtra tarefas por período de vencimento ou execução
 */
export function filterTasksByPeriod(tasks: Task[], period: WorkloadPeriod): Task[] {
  if (period === "all") return tasks;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return tasks.filter((task) => {
    const rawDate = task.due_date || task.start_date;
    if (!rawDate) return true; // Mantém tarefas sem data para não ocultar trabalho pendente

    const cleanDate = rawDate.split("T")[0].trim();
    const taskDate = new Date(cleanDate + "T00:00:00");
    if (isNaN(taskDate.getTime())) return true;

    if (period === "this_week") {
      // Início da semana (domingo/segunda) até fim da semana
      const currentDay = today.getDay();
      const firstDayOfWeek = new Date(today);
      firstDayOfWeek.setDate(today.getDate() - currentDay);
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
      return taskDate >= firstDayOfWeek && taskDate <= lastDayOfWeek;
    }

    if (period === "next_week") {
      const currentDay = today.getDay();
      const nextWeekStart = new Date(today);
      nextWeekStart.setDate(today.getDate() - currentDay + 7);
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
      return taskDate >= nextWeekStart && taskDate <= nextWeekEnd;
    }

    if (period === "this_month") {
      return (
        taskDate.getMonth() === today.getMonth() &&
        taskDate.getFullYear() === today.getFullYear()
      );
    }

    return true;
  });
}

/**
 * Calcula a carga de trabalho de todos os colaboradores a partir de uma lista de tarefas
 */
export function calculateWorkload(
  tasks: Task[],
  options?: {
    period?: WorkloadPeriod;
    weeklyCapacityHours?: number;
    includeCompleted?: boolean;
    memberNames?: MemberNames;
  }
): WorkloadSummary {
  const period = options?.period ?? "all";
  const capacity = options?.weeklyCapacityHours ?? DEFAULT_WEEKLY_CAPACITY_HOURS;
  const filteredTasks = filterTasksByPeriod(tasks, period);

  // Hoje no fuso local: toISOString() viraria o dia às 21h no Brasil
  const todayStr = todayDateOnly();

  const memberMap = new Map<string, MemberWorkload>();
  let unassignedTasksCount = 0;
  let unassignedHours = 0;

  for (const task of filteredTasks) {
    const { key, name, id } = getTaskAssigneeKey(task, options?.memberNames);
    const estHours = getTaskEstimatedHours(task);
    const isCompleted = isTaskDone(task);
    const isOverdue = isTaskOverdue(task, todayStr);

    if (key === "unassigned") {
      unassignedTasksCount++;
      unassignedHours += estHours;
      continue;
    }

    if (!memberMap.has(key)) {
      memberMap.set(key, {
        memberKey: key,
        memberName: name,
        memberId: id,
        totalEstimatedHours: 0,
        completedHours: 0,
        pendingHours: 0,
        overdueHours: 0,
        taskCount: 0,
        activeTaskCount: 0,
        completedTaskCount: 0,
        capacityHours: capacity,
        utilizationPercentage: 0,
        status: "under",
        tasks: [],
      });
    }

    const member = memberMap.get(key)!;
    member.tasks.push(task);
    member.taskCount++;
    member.totalEstimatedHours += estHours;

    if (isCompleted) {
      member.completedTaskCount++;
      member.completedHours += estHours;
    } else {
      member.activeTaskCount++;
      member.pendingHours += estHours;
      if (isOverdue) {
        member.overdueHours += estHours;
      }
    }
  }

  // Calcula taxas de utilização e status para cada colaborador
  const members = Array.from(memberMap.values()).map((m) => {
    // A carga em aberto determina a utilização
    const utilization = m.capacityHours > 0
      ? Math.round((m.pendingHours / m.capacityHours) * 100)
      : 0;

    let status: WorkloadStatus = "under";
    if (utilization > 100) {
      status = "overload";
    } else if (utilization >= 70) {
      status = "optimal";
    }

    return {
      ...m,
      utilizationPercentage: utilization,
      status,
    };
  });

  // Ordena por maior taxa de utilização (sobrecarregados primeiro)
  members.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);

  const totalAllocatedHours = members.reduce((acc, m) => acc + m.pendingHours, 0);
  const totalCapacityHours = members.length * capacity;
  const overallUtilization = totalCapacityHours > 0
    ? Math.round((totalAllocatedHours / totalCapacityHours) * 100)
    : 0;

  const overloadedMembersCount = members.filter((m) => m.status === "overload").length;
  const optimalMembersCount = members.filter((m) => m.status === "optimal").length;
  const underallocatedMembersCount = members.filter((m) => m.status === "under").length;

  return {
    totalAllocatedHours,
    totalCapacityHours,
    overallUtilization,
    totalMembers: members.length,
    overloadedMembersCount,
    optimalMembersCount,
    underallocatedMembersCount,
    unassignedTasksCount,
    unassignedHours,
    members,
  };
}
