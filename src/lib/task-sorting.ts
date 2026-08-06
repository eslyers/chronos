import type { Task } from "./types";

/**
 * Compare two tasks by due_date ascending.
 * - Tasks with valid due_date come first, ordered from earliest to latest.
 * - Tasks without due_date come after, ordered by position then created_at / title.
 */
export function compareTasksByDueDate<
  T extends {
    due_date?: string | null;
    position?: number;
    created_at?: string;
    title?: string;
  }
>(a: T, b: T): number {
  const timeA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
  const timeB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;

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
 * 1. Root tasks (tasks without parent_task_id or parent not present in list) are sorted by due_date.
 * 2. Sub-tasks (parent_task_id points to a parent in list) are placed IMMEDIATELY under their parent.
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

  // Sort root tasks by due_date
  rootTasks.sort(compareTasksByDueDate);

  // Sort children for each parent by due_date
  childrenMap.forEach((children) => {
    children.sort(compareTasksByDueDate);
  });

  // Build ordered list placing children directly under their parent
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

  // Add any remaining tasks (defensive for circular parent references)
  tasks.forEach((t) => {
    if (!visited.has(t.id)) {
      result.push(t);
    }
  });

  return result;
}
