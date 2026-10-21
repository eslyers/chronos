// ─────────────────────────────────────────────────────────────
// CHRONOS — Regras puras de movimentação de cards nos quadros
// (Kanban, detalhe do projeto e Fast Close). Sem React e sem I/O,
// para serem testadas isoladamente.
// ─────────────────────────────────────────────────────────────
import type { Task } from "@/lib/context/DataContext";
import { isTaskDone } from "@/lib/task-status";

type Positioned = Pick<Task, "id" | "position" | "stage_id">;

export type StageReorderPlan = {
  /** Posição final do card movido na etapa destino. */
  movedPosition: number;
  /** O card mudou de etapa ou de posição? */
  movedChanged: boolean;
  /** Demais cards da etapa destino cuja posição realmente mudou. */
  updates: Array<{ id: string; position: number }>;
};

/**
 * Calcula a nova ordem da etapa destino ao soltar `moved` antes de
 * `targetTaskId` (ou no fim, se ausente). Só lista os cards cuja posição
 * mudou, para não disparar escritas desnecessárias.
 */
export function planStageReorder(
  stageTasks: Positioned[],
  moved: Positioned,
  targetStageId: string,
  targetTaskId?: string
): StageReorderPlan {
  const others = stageTasks
    .filter((t) => t.stage_id === targetStageId && t.id !== moved.id)
    .sort((a, b) => a.position - b.position);

  let targetIndex = others.length;
  if (targetTaskId && targetTaskId !== moved.id) {
    const idx = others.findIndex((t) => t.id === targetTaskId);
    if (idx !== -1) targetIndex = idx;
  }

  const ordered = [...others];
  ordered.splice(targetIndex, 0, moved);

  const updates: Array<{ id: string; position: number }> = [];
  ordered.forEach((t, i) => {
    if (t.id !== moved.id && t.position !== i) updates.push({ id: t.id, position: i });
  });

  return {
    movedPosition: targetIndex,
    movedChanged: moved.stage_id !== targetStageId || moved.position !== targetIndex,
    updates,
  };
}

/**
 * Status ao tirar um card de uma etapa de conclusão (is_done) para outra
 * que não é de conclusão. A tarefa é reaberta como "in_progress"; como
 * progresso 100 implica "done" (regra do updateTask/isTaskDone), um
 * progresso de 100% volta para 0 — não guardamos o progresso anterior e
 * reabrir significa que o trabalho precisa ser refeito/revisado. Progresso
 * parcial (< 100) é mantido. Retorna null quando nada precisa mudar.
 */
export function reopenPatchForStageChange(
  task: Pick<Task, "status" | "progress">,
  fromDoneStage: boolean,
  toDoneStage: boolean
): Pick<Task, "status" | "progress"> | null {
  if (!fromDoneStage || toDoneStage || !isTaskDone(task)) return null;
  return {
    status: "in_progress",
    progress: task.progress >= 100 ? 0 : task.progress,
  };
}

/**
 * Executa `fn` para cada item com no máximo `limit` chamadas simultâneas
 * (evita centenas de requisições paralelas numa importação grande) e
 * devolve os resultados na ordem original, como Promise.allSettled.
 */
export async function mapSettled<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i], i) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker);
  await Promise.all(workers);
  return results;
}

/** Quantos resultados falharam. */
export function countRejected(results: PromiseSettledResult<unknown>[]): number {
  return results.filter((r) => r.status === "rejected").length;
}
