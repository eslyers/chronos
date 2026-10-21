// ─────────────────────────────────────────────────────────────
// CHRONOS — Hierarquia de tarefas (WBS via parent_task_id)
// ─────────────────────────────────────────────────────────────

type HierarchyNode = { id: string; parent_task_id: string | null };

/**
 * Ordena as tarefas em largura (BFS): todo pai vem antes dos filhos, em
 * qualquer profundidade. Tarefas cujo pai não está na lista contam como
 * raiz. A ordem original é mantida dentro de cada nível; nós presos em
 * ciclos vão para o fim.
 */
export function orderTasksParentsFirst<T extends HierarchyNode>(tasks: T[]): T[] {
  const ids = new Set(tasks.map((t) => t.id));
  const children = new Map<string, T[]>();
  const roots: T[] = [];
  for (const t of tasks) {
    if (t.parent_task_id && ids.has(t.parent_task_id) && t.parent_task_id !== t.id) {
      const list = children.get(t.parent_task_id) ?? [];
      list.push(t);
      children.set(t.parent_task_id, list);
    } else {
      roots.push(t);
    }
  }

  const ordered: T[] = [];
  const seen = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const t = queue.shift()!;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    ordered.push(t);
    queue.push(...(children.get(t.id) ?? []));
  }
  for (const t of tasks) if (!seen.has(t.id)) ordered.push(t);
  return ordered;
}

/** Ids da tarefa e de todos os seus descendentes. */
export function collectDescendantIds(rootId: string, tasks: HierarchyNode[]): Set<string> {
  const children = new Map<string, string[]>();
  for (const t of tasks) {
    if (!t.parent_task_id) continue;
    const list = children.get(t.parent_task_id) ?? [];
    list.push(t.id);
    children.set(t.parent_task_id, list);
  }
  const result = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length > 0) {
    for (const child of children.get(stack.pop()!) ?? []) {
      if (!result.has(child)) {
        result.add(child);
        stack.push(child);
      }
    }
  }
  return result;
}
