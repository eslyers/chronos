"use client";

import { useState } from "react";
import {
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useData, type Task } from "@/lib/context/DataContext";
import { planStageReorder, reopenPatchForStageChange, type StageReorderPlan } from "@/lib/board-moves";
import { resolveDropTarget, wipWarningFor, type KanbanDropData } from "@/lib/kanban-dnd";

/**
 * Drag-and-drop do Board Kanban: sensores, início/fim do arraste, aviso de
 * WIP e o fluxo pendente de "mover para concluída" (CompleteTaskDialog).
 */
export function useKanbanDnd(projectTasks: Task[], selectedProjectId: string | null) {
  const { projects, stages, moveTask, updateTask, refresh } = useData();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [wipWarning, setWipWarning] = useState<string | null>(null);
  // Movimento para etapa de conclusão aguardando o CompleteTaskDialog:
  // o card só sai da coluna de origem depois da confirmação.
  const [completingTask, setCompletingTask] = useState<{
    task: Task;
    targetStageId: string;
    targetStageName: string;
    plan: StageReorderPlan;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setWipWarning(null);
    const task = projectTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  // Aviso de WIP só quando o movimento entre etapas é de fato gravado
  const warnIfWipExceeded = (task: Task, targetStageId: string) => {
    const targetStage = stages.find((s) => s.id === targetStageId);
    const warning = wipWarningFor(task, targetStage, targetStageId, projectTasks);
    if (warning) setWipWarning(warning);
  };

  /**
   * Grava o movimento: o card movido numa única escrita (etapa + posição +
   * status) e os vizinhos que mudaram de posição em paralelo. Em caso de
   * falha o DataContext já mostrou o toast; recarregamos o estado para não
   * deixar posições pela metade e repassamos o erro.
   */
  const commitMove = async (
    task: Task,
    targetStageId: string,
    plan: StageReorderPlan,
    statusPatch?: Partial<Task> | null
  ) => {
    warnIfWipExceeded(task, targetStageId);
    const writes: Promise<void>[] = plan.updates.map((u) => updateTask(u.id, { position: u.position }));
    if (statusPatch) {
      writes.push(updateTask(task.id, { stage_id: targetStageId, position: plan.movedPosition, ...statusPatch }));
    } else if (plan.movedChanged) {
      // moveTask marca como concluída quando a etapa destino é is_done
      writes.push(moveTask(task.id, targetStageId, plan.movedPosition));
    }
    try {
      await Promise.all(writes);
    } catch (err) {
      console.error("[Kanban] move error:", err);
      await refresh().catch(() => {});
      throw err;
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const target = resolveDropTarget(over.data.current as KanbanDropData);
    if (!target) return;
    const { targetStageId, targetTaskId } = target;

    const movedTask = projectTasks.find((t) => t.id === taskId);
    if (!movedTask) return;

    const plan = planStageReorder(projectTasks, movedTask, targetStageId, targetTaskId);
    if (!plan.movedChanged && plan.updates.length === 0) return;

    const sourceStage = stages.find((s) => s.id === movedTask.stage_id);
    const targetStage = stages.find((s) => s.id === targetStageId);

    // Entrando numa coluna concluída: pede as horas reais antes de mover
    if (movedTask.stage_id !== targetStageId && targetStage?.is_done) {
      const currentProject = projects.find((p) => p.id === selectedProjectId);
      const shouldTrackTime = currentProject ? currentProject.track_time !== false : true;
      if (shouldTrackTime && !movedTask.actual_hours) {
        setCompletingTask({ task: movedTask, targetStageId, targetStageName: targetStage.name, plan });
        return;
      }
    }

    try {
      await commitMove(
        movedTask,
        targetStageId,
        plan,
        reopenPatchForStageChange(movedTask, !!sourceStage?.is_done, !!targetStage?.is_done)
      );
    } catch {
      // Toast já exibido pelo DataContext e estado recarregado em commitMove
    }
  };

  // Props do CompleteTaskDialog para o movimento pendente
  const completeDialogProps = {
    open: !!completingTask,
    onOpenChange: (open: boolean) => {
      if (!open) setCompletingTask(null);
    },
    task: completingTask?.task ?? null,
    targetStageName: completingTask?.targetStageName,
    onConfirm: async (actualHours: number | null) => {
      if (!completingTask) return;
      // Só agora o card entra na coluna concluída. Cancelar o diálogo
      // apenas limpa o estado: o card nunca saiu da coluna de origem.
      // Se a gravação falhar, o erro sobe e o diálogo continua aberto.
      await commitMove(completingTask.task, completingTask.targetStageId, completingTask.plan, {
        status: "done",
        progress: 100,
        ...(actualHours !== null ? { actual_hours: actualHours } : {}),
      });
      setCompletingTask(null);
    },
  };

  return {
    sensors,
    activeTask,
    wipWarning,
    dismissWipWarning: () => setWipWarning(null),
    handleDragStart,
    handleDragEnd,
    handleDragCancel: () => setActiveTask(null),
    completeDialogProps,
  };
}
