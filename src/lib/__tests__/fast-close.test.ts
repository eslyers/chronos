import {
  FASTCLOSE_GLOBAL_CONFIG_KEY,
  fastCloseConfigKey,
  groupTasksByOffset,
  isClosingProject,
  parseFastCloseConfig,
  serializeFastCloseConfig,
} from "@/lib/fast-close";
import { DEFAULT_ROUTINES, getDefaultRoutines } from "@/lib/fast-close-routines";
import { getCalculatedWorkdayDate } from "@/lib/business-days";
import { formatDateOnly } from "@/lib/date-only";

describe("configuração da régua", () => {
  it("usa chaves por projeto e global", () => {
    expect(fastCloseConfigKey("p1")).toBe("fastclose_config_p1");
    expect(fastCloseConfigKey("all")).toBe("fastclose_config_all");
    expect(FASTCLOSE_GLOBAL_CONFIG_KEY).toBe("fastclose_config_global");
  });

  it("lê os campos com tipo correto", () => {
    const raw = JSON.stringify({ useD0: false, customOffsets: [-2, 0, 3], offsetRange: "D-3_D+3" });
    expect(parseFastCloseConfig(raw)).toEqual({ useD0: false, customOffsets: [-2, 0, 3], offsetRange: "D-3_D+3" });
  });

  it("ignora campos ausentes ou com tipo inválido", () => {
    const raw = JSON.stringify({ useD0: "sim", customOffsets: "1,2", offsetRange: 5 });
    expect(parseFastCloseConfig(raw)).toEqual({});
    expect(parseFastCloseConfig(JSON.stringify({ useD0: true }))).toEqual({ useD0: true });
  });

  it("lança para JSON inválido ou nulo (o hook trata com try/catch)", () => {
    expect(() => parseFastCloseConfig("{quebrado")).toThrow();
    expect(() => parseFastCloseConfig("null")).toThrow();
  });

  it("serializa e relê a configuração inteira", () => {
    const payload = serializeFastCloseConfig({ useD0: true, customOffsets: [-1, 1], offsetRange: "D-5_D+5" });
    expect(JSON.parse(payload)).toEqual({ useD0: true, customOffsets: [-1, 1], offsetRange: "D-5_D+5" });
    expect(parseFastCloseConfig(payload)).toEqual({ useD0: true, customOffsets: [-1, 1], offsetRange: "D-5_D+5" });
  });

  it("omite customOffsets indefinido no JSON", () => {
    const payload = serializeFastCloseConfig({ useD0: false, customOffsets: undefined, offsetRange: "D-2_D+4" });
    expect(parseFastCloseConfig(payload)).toEqual({ useD0: false, offsetRange: "D-2_D+4" });
  });
});

describe("isClosingProject", () => {
  it("reconhece palavras-chave no nome ou na descrição, sem diferenciar maiúsculas", () => {
    expect(isClosingProject({ name: "Fechamento Contábil 10/2026", description: null })).toBe(true);
    expect(isClosingProject({ name: "Projeto X", description: "Rotinas da CONTROLADORIA" })).toBe(true);
    expect(isClosingProject({ name: "Site institucional", description: "Marketing" })).toBe(false);
  });
});

describe("groupTasksByOffset", () => {
  const YEAR = 2026;
  const MONTH = 10;
  const dateAt = (offset: number, useD0 = true) => formatDateOnly(getCalculatedWorkdayDate(YEAR, MONTH, offset, useD0));
  const task = (id: string, due_date: string | null, start_date: string | null = null) => ({ id, due_date, start_date });

  it("cria uma coluna vazia para cada offset", () => {
    const map = groupTasksByOffset([], [-1, 0, 1], YEAR, MONTH, true);
    expect(Array.from(map.keys())).toEqual([-1, 0, 1]);
    expect(Array.from(map.values())).toEqual([[], [], []]);
  });

  it("agrupa pelo prazo, com fallback para a data de início", () => {
    const tasks = [task("d0", dateAt(0)), task("dm1", null, dateAt(-1)), task("dm2", dateAt(-2))];
    const map = groupTasksByOffset(tasks, [-2, -1, 0], YEAR, MONTH, true);
    expect(map.get(-2)!.map((t) => t.id)).toEqual(["dm2"]);
    expect(map.get(-1)!.map((t) => t.id)).toEqual(["dm1"]);
    expect(map.get(0)!.map((t) => t.id)).toEqual(["d0"]);
  });

  it("encaixa offsets fora da régua na primeira ou última coluna", () => {
    const tasks = [task("cedo", dateAt(-5)), task("tarde", dateAt(0))];
    const map = groupTasksByOffset(tasks, [-3, -2], YEAR, MONTH, true);
    expect(map.get(-3)!.map((t) => t.id)).toEqual(["cedo"]);
    expect(map.get(-2)!.map((t) => t.id)).toEqual(["tarde"]);
  });

  it("ignora tarefas sem data ou de outro mês/ano", () => {
    const tasks = [task("sem-data", null), task("outro-mes", "2026-09-15"), task("outro-ano", "2025-10-15")];
    const map = groupTasksByOffset(tasks, [-5, 0, 5], YEAR, MONTH, true);
    expect(Array.from(map.values()).flat()).toEqual([]);
  });

  it("sem D0, o último dia útil do mês vira D-1", () => {
    const lastBusinessDay = dateAt(0, true);
    const map = groupTasksByOffset([task("fim", lastBusinessDay)], [-2, -1, 1], YEAR, MONTH, false);
    expect(map.get(-1)!.map((t) => t.id)).toEqual(["fim"]);
  });
});

describe("rotinas padrão", () => {
  it("com D0 inclui a trava em D0; sem D0 não há offset 0", () => {
    expect(getDefaultRoutines(true)).toBe(DEFAULT_ROUTINES.withD0);
    expect(getDefaultRoutines(false)).toBe(DEFAULT_ROUTINES.withoutD0);
    expect(DEFAULT_ROUTINES.withD0.some((r) => r.offset === 0)).toBe(true);
    expect(DEFAULT_ROUTINES.withoutD0.some((r) => r.offset === 0)).toBe(false);
    expect(DEFAULT_ROUTINES.withD0).toHaveLength(11);
    expect(DEFAULT_ROUTINES.withoutD0).toHaveLength(10);
  });
});
