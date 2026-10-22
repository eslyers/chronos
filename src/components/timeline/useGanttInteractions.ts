"use client";

import { useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import type { Task as GanttTask } from "gantt-task-react";
import type { Task } from "@/lib/context/DataContext";
import type { useGlobalToast } from "@/components/ui/toast-notification";
import { ganttDateChangeToPatch, parseGanttId } from "@/lib/gantt-tasks";

export function toggleInSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

interface UseGanttInteractionsInput {
  ganttTasks: GanttTask[];
  tasks: Task[];
  readOnly: boolean;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  addToast: ReturnType<typeof useGlobalToast>["addToast"];
  setCollapsedProjects: Dispatch<SetStateAction<Set<string>>>;
  setCollapsedTasks: Dispatch<SetStateAction<Set<string>>>;
  /** Abre a edição da tarefa (deve ter identidade estável). */
  onEditTask: (task: Task) => void;
}

// Cliques, expansão de linhas e drag/resize de barras do Gantt da timeline
export function useGanttInteractions({
  ganttTasks,
  tasks,
  readOnly,
  updateTask,
  addToast,
  setCollapsedProjects,
  setCollapsedTasks,
  onEditTask,
}: UseGanttInteractionsInput) {
  const ganttTaskById = useMemo(() => new Map(ganttTasks.map((t) => [t.id, t])), [ganttTasks]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const parentTaskIds = useMemo(
    () => new Set(tasks.map((t) => t.parent_task_id).filter((id): id is string => !!id)),
    [tasks]
  );

  const toggleRow = useCallback(
    (ganttTask: GanttTask) => {
      const ref = parseGanttId(ganttTask.id);
      if (!ref) return;
      if (ref.kind === "project") setCollapsedProjects((prev) => toggleInSet(prev, ref.id));
      else setCollapsedTasks((prev) => toggleInSet(prev, ref.id));
    },
    [setCollapsedProjects, setCollapsedTasks]
  );

  const openTask = useCallback(
    (ganttId: string) => {
      const ref = parseGanttId(ganttId);
      if (ref?.kind !== "task") return;
      const found = taskById.get(ref.id);
      if (found) onEditTask(found);
    },
    [taskById, onEditTask]
  );

  // Projeto e tarefa-pai: expande/recolhe. Tarefa folha: abre a edição
  const openTaskOrToggle = useCallback(
    (ganttId: string) => {
      const ref = parseGanttId(ganttId);
      if (!ref) return;
      if (ref.kind === "project" || parentTaskIds.has(ref.id)) {
        const row = ganttTaskById.get(ganttId);
        if (row) toggleRow(row);
        return;
      }
      openTask(ganttId);
    },
    [parentTaskIds, ganttTaskById, toggleRow, openTask]
  );

  // A lib dispara onClick no mouseup que encerra um drag: esse clique é ignorado
  const suppressBarClickUntil = useRef(0);

  // Drag/resize de barra → grava start_date/due_date. Retornar false faz a lib desfazer o movimento
  const handleDateChange = useCallback(
    async (changed: GanttTask): Promise<boolean> => {
      suppressBarClickUntil.current = Date.now() + 500;
      const ref = parseGanttId(changed.id);
      const original = ganttTaskById.get(changed.id);
      if (readOnly || ref?.kind !== "task" || !original) return false;

      const patch = ganttDateChangeToPatch(original, changed);
      if (!patch) {
        addToast({
          variant: "error",
          title: "Datas inválidas",
          description: "O prazo não pode ficar antes da data de início.",
        });
        return false;
      }
      if (Object.keys(patch).length === 0) return false;

      try {
        await updateTask(ref.id, patch);
        return true;
      } catch {
        // DataContext já exibiu o toast de erro
        return false;
      }
    },
    [ganttTaskById, readOnly, updateTask, addToast]
  );

  const handleBarClick = useCallback(
    (ganttTask: GanttTask) => {
      if (Date.now() < suppressBarClickUntil.current) return;
      openTaskOrToggle(ganttTask.id);
    },
    [openTaskOrToggle]
  );

  return { toggleRow, openTask, openTaskOrToggle, handleDateChange, handleBarClick };
}
