"use client";

import { useCallback, useEffect, useReducer, useRef, type RefObject } from "react";
import type { Stage, Task } from "@/lib/context/DataContext";
import { EMPTY_TASK_FORM, buildInitialTaskForm, taskFormReducer, type TaskFormState } from "./task-form";

interface UseTaskFormOptions {
  open: boolean;
  task?: Task | null;
  defaultStageId?: string | null;
  defaultDueDate?: string | null;
  stages: Stage[];
  titleInputRef: RefObject<HTMLInputElement | null>;
}

/** Estado do formulário do TaskDialog, inicializado só na abertura real ou ao trocar de tarefa. */
export function useTaskForm({ open, task, defaultStageId, defaultDueDate, stages, titleInputRef }: UseTaskFormOptions) {
  const [form, dispatch] = useReducer(taskFormReducer, EMPTY_TASK_FORM);

  // Rastreadores para inicializar o form apenas na abertura real (impede reset ao digitar)
  const prevOpenRef = useRef(false);
  const prevTaskIdRef = useRef<string | null>(null);

  // Sincronizar campos do formulário (apenas na abertura real ou ao trocar de tarefa)
  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      prevTaskIdRef.current = null;
      return;
    }

    const currentTaskId = task?.id ?? "new";
    const isNewlyOpened = !prevOpenRef.current;
    const isDifferentTask = currentTaskId !== prevTaskIdRef.current;

    // Se já estava aberto e é a mesma tarefa, NÃO reseta os campos enquanto o usuário digita
    if (!isNewlyOpened && !isDifferentTask) {
      return;
    }

    prevOpenRef.current = true;
    prevTaskIdRef.current = currentTaskId;

    dispatch({ type: "reset", state: buildInitialTaskForm(task, { defaultStageId, defaultDueDate, stages }) });

    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  }, [open, task, defaultStageId, defaultDueDate, stages, titleInputRef]);

  // Etapas carregadas depois da abertura: nova tarefa assume a primeira etapa real
  useEffect(() => {
    if (!open || task || form.stageId || stages.length === 0) return;
    dispatch({ type: "patch", patch: { stageId: stages[0].id } });
  }, [open, task, form.stageId, stages]);

  const setField = useCallback(<K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => {
    dispatch({ type: "patch", patch: { [key]: value } as Partial<TaskFormState> });
  }, []);

  return { form, dispatch, setField };
}
