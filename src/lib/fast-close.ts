// ─────────────────────────────────────────────────────────────
// CHRONOS — Regras puras do cockpit Fast Close (fechamento contábil):
// escopo de projetos, configuração da régua salva no navegador e
// agrupamento das tarefas por dia útil. Sem React e sem I/O.
// ─────────────────────────────────────────────────────────────
import type { Project, Task } from "@/lib/context/DataContext";
import { parseDateOnly } from "@/lib/date-only";
import { getWorkdayOffsetFromDate } from "@/lib/business-days";

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const CLOSING_KEYWORDS = [
  "fechamento", "fast close", "contábil", "contabil", "controladoria",
  "demonstrativo", "fp&a", "fpa", "financeiro", "orçamento", "orcamento", "dre", "balancete"
];

/** Projeto do escopo de Fechamento / Controladoria (pelo nome ou descrição). */
export function isClosingProject(project: Pick<Project, "name" | "description">): boolean {
  const nameLower = project.name.toLowerCase();
  const descLower = (project.description || "").toLowerCase();
  return CLOSING_KEYWORDS.some((kw) => nameLower.includes(kw) || descLower.includes(kw));
}

// ── Configuração da régua (D0 / offsets) no localStorage ──

export type FastCloseConfig = {
  useD0: boolean;
  customOffsets: number[] | undefined;
  offsetRange: string;
};

export const FASTCLOSE_GLOBAL_CONFIG_KEY = "fastclose_config_global";

export function fastCloseConfigKey(projectId: string): string {
  return `fastclose_config_${projectId}`;
}

/**
 * Lê a configuração salva, devolvendo só os campos com o tipo esperado.
 * Lança se o conteúdo não for JSON válido (ou for `null`): o chamador trata.
 */
export function parseFastCloseConfig(raw: string): Partial<FastCloseConfig> {
  const parsed = JSON.parse(raw);
  const config: Partial<FastCloseConfig> = {};
  if (typeof parsed.useD0 === "boolean") config.useD0 = parsed.useD0;
  if (Array.isArray(parsed.customOffsets)) config.customOffsets = parsed.customOffsets;
  if (typeof parsed.offsetRange === "string") config.offsetRange = parsed.offsetRange;
  return config;
}

export function serializeFastCloseConfig(config: FastCloseConfig): string {
  return JSON.stringify({
    useD0: config.useD0,
    customOffsets: config.customOffsets,
    offsetRange: config.offsetRange,
  });
}

// ── Agrupamento por dia útil ──

/**
 * Agrupa as tarefas do mês/ano por offset de dia útil (data = prazo ou início).
 * Tarefas fora da régua visível vão para a primeira/última coluna; tarefas de
 * outros meses ou sem data ficam de fora.
 */
export function groupTasksByOffset<T extends Pick<Task, "due_date" | "start_date">>(
  tasks: T[],
  workdayOffsets: number[],
  year: number,
  month: number,
  useD0: boolean
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  workdayOffsets.forEach((offset) => map.set(offset, []));

  tasks.forEach((t) => {
    const tDate = parseDateOnly(t.due_date || t.start_date);
    if (!tDate) return;

    if (tDate.getMonth() + 1 === month && tDate.getFullYear() === year) {
      const offset = getWorkdayOffsetFromDate(tDate, year, month, useD0);
      if (map.has(offset)) {
        map.get(offset)!.push(t);
      } else {
        const minOffset = workdayOffsets[0];
        const maxOffset = workdayOffsets[workdayOffsets.length - 1];
        if (offset < minOffset && map.has(minOffset)) {
          map.get(minOffset)!.push(t);
        } else if (offset > maxOffset && map.has(maxOffset)) {
          map.get(maxOffset)!.push(t);
        }
      }
    }
  });

  return map;
}
