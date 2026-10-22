import { resolveDropTarget, wipWarningFor } from "@/lib/kanban-dnd";

describe("resolveDropTarget", () => {
  it("soltar na coluna vai para o fim da etapa", () => {
    expect(resolveDropTarget({ type: "stage", stageId: "s1" })).toEqual({ targetStageId: "s1", targetTaskId: undefined });
  });

  it("soltar sobre um card usa a etapa dele e insere antes dele", () => {
    expect(resolveDropTarget({ type: "task", stageId: "s2", taskId: "t9" })).toEqual({
      targetStageId: "s2",
      targetTaskId: "t9",
    });
  });

  it("sem dados de soltura não há destino", () => {
    expect(resolveDropTarget(undefined)).toBeNull();
  });
});

describe("wipWarningFor", () => {
  const stage = { name: "Em andamento", wip_limit: 2 };
  const tasksIn = (n: number) => Array.from({ length: n }, () => ({ stage_id: "s2" }));

  it("avisa quando a etapa destino já está no limite", () => {
    expect(wipWarningFor({ stage_id: "s1" }, stage, "s2", tasksIn(2))).toBe(
      '⚠️ Atenção: O estágio "Em andamento" ultrapassará o limite WIP de 2 tarefas (3/2).'
    );
  });

  it("não avisa abaixo do limite", () => {
    expect(wipWarningFor({ stage_id: "s1" }, stage, "s2", tasksIn(1))).toBeNull();
  });

  it("não avisa ao reordenar dentro da mesma etapa", () => {
    expect(wipWarningFor({ stage_id: "s2" }, stage, "s2", tasksIn(5))).toBeNull();
  });

  it("ignora etapas sem limite (nulo, zero ou ausente)", () => {
    expect(wipWarningFor({ stage_id: "s1" }, { name: "X", wip_limit: null }, "s2", tasksIn(9))).toBeNull();
    expect(wipWarningFor({ stage_id: "s1" }, { name: "X", wip_limit: 0 }, "s2", tasksIn(9))).toBeNull();
    expect(wipWarningFor({ stage_id: "s1" }, undefined, "s2", tasksIn(9))).toBeNull();
  });
});
