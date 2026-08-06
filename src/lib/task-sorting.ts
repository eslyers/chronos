import type { Task } from "./types";

/**
 * Safely parses any date representation (ISO, YYYY-MM-DD, DD/MM/YYYY, Date object)
 * into an epoch timestamp for accurate numerical comparison.
 * Returns Number.MAX_SAFE_INTEGER for missing or unparseable dates (placing them at the end).
 */
export function getTaskTimestamp(isoOrDate: string | Date | null | undefined): number {
  if (!isoOrDate) return Number.MAX_SAFE_INTEGER;

  if (typeof isoOrDate === "object" && isoOrDate !== null && "getTime" in isoOrDate) {
    const t = (isoOrDate as Date).getTime();
    return isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
  }

  const str = String(isoOrDate).trim();
  if (!str) return Number.MAX_SAFE_INTEGER;

  // 1. Try ISO / YYYY-MM-DD format (e.g. "2026-08-07" or "2026-08-07T00:00:00.000Z")
  const dateOnly = str.split("T")[0];
  const ymdParts = dateOnly.split("-");
  if (ymdParts.length === 3) {
    const y = parseInt(ymdParts[0], 10);
    const m = parseInt(ymdParts[1], 10) - 1;
    const d = parseInt(ymdParts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y > 1900 && m >= 0 && m < 12 && d >= 1 && d <= 31) {
      return new Date(y, m, d, 12, 0, 0).getTime();
    }
  }

  // 2. Try Brazilian DD/MM/YYYY format (e.g. "07/08/2026")
  const dmyParts = dateOnly.split("/");
  if (dmyParts.length === 3) {
    const d = parseInt(dmyParts[0], 10);
    const m = parseInt(dmyParts[1], 10) - 1;
    const y = parseInt(dmyParts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y > 1900 && m >= 0 && m < 12 && d >= 1 && d <= 31) {
      return new Date(y, m, d, 12, 0, 0).getTime();
    }
  }

  // 3. Fallback to standard JS Date parsing
  const parsed = new Date(str);
  const time = parsed.getTime();
  return isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

/**
 * Compare two individual tasks by due_date ascending using getTaskTimestamp.
 */
export function compareTasksByDueDate<
  T extends {
    due_date?: string | null;
    position?: number;
    created_at?: string;
    title?: string;
  }
>(a: T, b: T): number {
  const timeA = getTaskTimestamp(a.due_date);
  const timeB = getTaskTimestamp(b.due_date);

  if (timeA !== timeB) {
    return timeA - timeB;
  }

  const posA = a.position ?? Number.MAX_SAFE_INTEGER;
  const posB = b.position ?? Number.MAX_SAFE_INTEGER;
  if (posA !== posB) {
    return posA - posB;
  }

  if (a.created_at && b.created_at) {
    return a.created_at.localeCompare(b.created_at);
  }

  return (a.title || "").localeCompare(b.title || "", "pt-BR");
}

/**
 * Sorts a list of tasks respecting the hierarchy (sub-tasks under parent tasks)
 * AND ordering by delivery date (due_date ascending):
 *
 * 1. Root tasks are ordered by their EFFECTIVE due date (the earliest due date
 *    among the parent task itself AND all of its nested sub-tasks).
 * 2. Sub-tasks are placed IMMEDIATELY under their parent task.
 * 3. Multiple sub-tasks under the same parent are sorted among themselves by due_date.
 */
export function sortTasksWithHierarchy<
  T extends {
    id: string;
    parent_task_id?: string | null;
    due_date?: string | null;
    position?: number;
    created_at?: string;
    title?: string;
  }
>(tasks: T[]): T[] {
  if (!tasks || tasks.length <= 1) return tasks;

  const taskMap = new Map<string, T>();
  tasks.forEach((t) => taskMap.set(t.id, t));

  const childrenMap = new Map<string, T[]>();
  const rootTasks: T[] = [];

  tasks.forEach((task) => {
    if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
      const parentId = task.parent_task_id;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(task);
    } else {
      rootTasks.push(task);
    }
  });

  // Calculate minimum timestamp of a task and all its descendants recursively
  const getFamilyMinTimestamp = (task: T): number => {
    let minTime = getTaskTimestamp(task.due_date);
    const children = childrenMap.get(task.id);
    if (children) {
      children.forEach((child) => {
        const childMin = getFamilyMinTimestamp(child);
        if (childMin < minTime) {
          minTime = childMin;
        }
      });
    }
    return minTime;
  };

  // Compare root tasks by family minimum timestamp
  const compareRootTasks = (a: T, b: T) => {
    const minA = getFamilyMinTimestamp(a);
    const minB = getFamilyMinTimestamp(b);
    if (minA !== minB) return minA - minB;
    return compareTasksByDueDate(a, b);
  };

  // Sort root tasks by family minimum timestamp
  rootTasks.sort(compareRootTasks);

  // Sort children under each parent by due_date
  childrenMap.forEach((children) => {
    children.sort(compareTasksByDueDate);
  });

  // Build final array placing children directly under their parent
  const result: T[] = [];
  const visited = new Set<string>();

  const addWithChildren = (task: T) => {
    if (visited.has(task.id)) return;
    visited.add(task.id);
    result.push(task);

    const children = childrenMap.get(task.id);
    if (children) {
      children.forEach((child) => addWithChildren(child));
    }
  };

  rootTasks.forEach((root) => addWithChildren(root));

  // Add any remaining orphan tasks defensively
  tasks.forEach((t) => {
    if (!visited.has(t.id)) {
      result.push(t);
    }
  });

  return result;
}
