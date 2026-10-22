import { planStageReorder, reopenPatchForStageChange, mapSettled, countRejected } from "@/lib/board-moves";

const t = (id: string, stage_id: string, position: number) => ({ id, stage_id, position });

describe("planStageReorder", () => {
  const stage = [t("a", "s1", 0), t("b", "s1", 1), t("c", "s1", 2)];

  it("move para o fim de outra etapa sem tocar nos vizinhos", () => {
    const plan = planStageReorder(stage, t("x", "s2", 0), "s1");
    expect(plan).toEqual({ movedPosition: 3, movedChanged: true, updates: [] });
  });

  it("insere antes da tarefa alvo e só atualiza quem mudou de posição", () => {
    const plan = planStageReorder(stage, t("x", "s2", 5), "s1", "b");
    expect(plan.movedPosition).toBe(1);
    expect(plan.updates).toEqual([
      { id: "b", position: 2 },
      { id: "c", position: 3 },
    ]);
  });

  it("reordena dentro da mesma etapa", () => {
    const plan = planStageReorder(stage, stage[2], "s1", "a");
    expect(plan.movedPosition).toBe(0);
    expect(plan.movedChanged).toBe(true);
    expect(plan.updates).toEqual([
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ]);
  });

  it("soltar no mesmo lugar não gera escritas", () => {
    const plan = planStageReorder(stage, stage[2], "s1");
    expect(plan).toEqual({ movedPosition: 2, movedChanged: false, updates: [] });
  });

  it("ignora tarefas de outras etapas e alvo inexistente", () => {
    const plan = planStageReorder([...stage, t("z", "s9", 0)], t("x", "s2", 0), "s1", "nao-existe");
    expect(plan.movedPosition).toBe(3);
    expect(plan.updates).toEqual([]);
  });
});

describe("reopenPatchForStageChange", () => {
  it("reabre tarefa concluída ao sair da etapa de conclusão", () => {
    expect(reopenPatchForStageChange({ status: "done", progress: 100 }, true, false)).toEqual({
      status: "in_progress",
      progress: 0,
    });
  });

  it("mantém progresso parcial (< 100)", () => {
    expect(reopenPatchForStageChange({ status: "done", progress: 60 }, true, false)).toEqual({
      status: "in_progress",
      progress: 60,
    });
  });

  it("não altera quando não sai de etapa concluída, quando vai para outra concluída ou se não estava concluída", () => {
    expect(reopenPatchForStageChange({ status: "done", progress: 100 }, false, false)).toBeNull();
    expect(reopenPatchForStageChange({ status: "done", progress: 100 }, true, true)).toBeNull();
    expect(reopenPatchForStageChange({ status: "todo", progress: 0 }, true, false)).toBeNull();
  });
});

describe("mapSettled", () => {
  it("respeita o limite de concorrência e preserva a ordem", async () => {
    let running = 0;
    let peak = 0;
    const results = await mapSettled([1, 2, 3, 4, 5], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      if (n === 3) throw new Error("falhou");
      return n * 10;
    });
    expect(peak).toBeLessThanOrEqual(2);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "fulfilled", "rejected", "fulfilled", "fulfilled"]);
    expect(results[4]).toEqual({ status: "fulfilled", value: 50 });
    expect(countRejected(results)).toBe(1);
  });

  it("lista vazia resolve sem chamadas", async () => {
    const fn = jest.fn();
    await expect(mapSettled([], 3, fn)).resolves.toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });
});
