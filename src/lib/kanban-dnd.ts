// ─────────────────────────────────────────────────────────────
// CHRONOS — Regras puras do drag-and-drop do Board Kanban: destino
// da soltura e aviso de limite WIP. Sem React e sem I/O.
// ─────────────────────────────────────────────────────────────
import type { Stage, Task } from "@/lib/context/DataContext";

/** `data` das áreas de soltura: a coluna (etapa) ou um card dentro dela. */
export type KanbanDropData =
  | { type: "stage"; stageId: string }
  | { type: "task"; stageId: string; taskId: string }
  | undefined;

/** Etapa destino e, se soltou sobre um card, o card antes do qual inserir. */
export function resolveDropTarget(
  overData: KanbanDropData
): { targetStageId: string; targetTaskId?: string } | null {
  const targetStageId =
    overData?.type === "task"
      ? overData.stageId
      : overData?.type === "stage"
        ? overData.stageId
        : null;

  if (!targetStageId) return null;

  const targetTaskId = overData?.type === "task" ? overData.taskId : undefined;
  return { targetStageId, targetTaskId };
}

/**
 * Mensagem de aviso quando o card entra numa etapa que já está no limite WIP
 * (ou acima). Movimentos dentro da mesma etapa não avisam.
 */
export function wipWarningFor(
  task: Pick<Task, "stage_id">,
  targetStage: Pick<Stage, "name" | "wip_limit"> | undefined,
  targetStageId: string,
  projectTasks: Pick<Task, "stage_id">[]
): string | null {
  if (task.stage_id === targetStageId) return null;
  if (!targetStage?.wip_limit || targetStage.wip_limit <= 0) return null;
  const currentTasksInTarget = projectTasks.filter((t) => t.stage_id === targetStageId).length;
  if (currentTasksInTarget >= targetStage.wip_limit) {
    return `⚠️ Atenção: O estágio "${targetStage.name}" ultrapassará o limite WIP de ${targetStage.wip_limit} tarefas (${currentTasksInTarget + 1}/${targetStage.wip_limit}).`;
  }
  return null;
}
