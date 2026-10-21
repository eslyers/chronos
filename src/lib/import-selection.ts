// ─────────────────────────────────────────────────────────────
// CHRONOS — Importação de planilha: edição inline, seleção e contadores
// Regras puras usadas pelo ImportDialog. O backend importa toda linha que
// não está em erro (válida ou com aviso); por isso "importável" aqui é
// status efetivo !== "error", e o que vai para o servidor é exatamente o
// conjunto de linhas marcadas.
// ─────────────────────────────────────────────────────────────
import type { Task } from "@/lib/context/DataContext";
import type { ImportPreview, ImportRow, ImportRowStatus } from "@/lib/excel-parser";

/** Campos editáveis na prévia (datas em "YYYY-MM-DD"). */
export type ImportRowEdits = Partial<{
  title: string;
  assignee_id: string;
  start_date: string;
  due_date: string;
  level: number;
}>;

export type EffectiveRow = {
  title: string;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  level: number | null;
};

export type StatusCounts = Record<ImportRowStatus, number>;

const EMPTY_TITLE_ERROR = "Título vazio";

/** Mistura as edições do usuário com os campos parseados da linha. */
export function getEffective(
  parsed: Partial<Task>,
  origLevel: number | undefined,
  edits: ImportRowEdits | undefined
): EffectiveRow {
  return {
    title: edits?.title ?? parsed.title ?? "",
    assignee_id: edits?.assignee_id ?? parsed.assignee_id ?? null,
    start_date: edits?.start_date ?? parsed.start_date ?? null,
    due_date: edits?.due_date ?? parsed.due_date ?? null,
    level: edits?.level ?? origLevel ?? null,
  };
}

/** Recalcula status/erros/avisos da linha depois das edições. */
export function getEffectiveStatus(
  orig: ImportRow,
  edits: ImportRowEdits | undefined
): { status: ImportRowStatus; errors: string[]; warnings: string[] } {
  const eff = getEffective(orig.parsed, orig.level, edits);
  const errors = [...orig.errors];
  const warnings = [...orig.warnings];
  const titleEmpty = !eff.title || eff.title.trim() === "";
  if (!titleEmpty) {
    const i = errors.findIndex((e) => e === EMPTY_TITLE_ERROR);
    if (i !== -1) errors.splice(i, 1);
  } else if (!errors.includes(EMPTY_TITLE_ERROR)) {
    errors.push(EMPTY_TITLE_ERROR);
  }
  let status: ImportRowStatus = "valid";
  if (errors.length > 0) status = "error";
  else if (warnings.length > 0) status = "warning";
  return { status, errors, warnings };
}

/** Contadores válidas / com aviso / com erro considerando as edições. */
export function countByStatus(rows: ImportRow[], edits: Record<number, ImportRowEdits>): StatusCounts {
  const counts: StatusCounts = { valid: 0, warning: 0, error: 0 };
  for (const row of rows) counts[getEffectiveStatus(row, edits[row.index]).status]++;
  return counts;
}

/** Seleção inicial: toda linha que o servidor importaria (sem erro). */
export function defaultSelection(rows: ImportRow[]): Set<number> {
  return new Set(rows.filter((r) => r.status !== "error").map((r) => r.index));
}

/** Linhas marcadas que serão de fato importadas (sem erro após edições). */
export function countImportableSelected(
  rows: ImportRow[],
  edits: Record<number, ImportRowEdits>,
  selected: Set<number>
): number {
  return rows.reduce(
    (acc, row) =>
      acc + (selected.has(row.index) && getEffectiveStatus(row, edits[row.index]).status !== "error" ? 1 : 0),
    0
  );
}

/**
 * O arquivo original só pode ir para o servidor quando ele produz exatamente
 * a mesma importação: sem edições e com a seleção igual à padrão (o servidor
 * já descarta as linhas em erro). Caso contrário envia um CSV só com as
 * linhas marcadas.
 */
export function canUploadOriginalFile(
  rows: ImportRow[],
  edits: Record<number, ImportRowEdits>,
  selected: Set<number>
): boolean {
  if (Object.keys(edits).length > 0) return false;
  const expected = defaultSelection(rows);
  if (expected.size !== selected.size) return false;
  for (const idx of expected) if (!selected.has(idx)) return false;
  return true;
}

export function csvEscape(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** CSV com as edições aplicadas, contendo apenas as linhas marcadas. */
export function buildEditedCsv(
  preview: ImportPreview,
  edits: Record<number, ImportRowEdits>,
  selected: Set<number>
): string {
  const fileHeaders = preview.columns;
  const lines: string[] = [fileHeaders.map(csvEscape).join(",")];
  for (const row of preview.rows) {
    if (!selected.has(row.index)) continue;
    const eff = getEffective(row.parsed, row.level, edits[row.index]);
    const values = fileHeaders.map((h) => {
      const fieldName = preview.mapping[h];
      if (fieldName === "title") return eff.title;
      if (fieldName === "assignee_id") return eff.assignee_id ?? row.raw[h] ?? "";
      if (fieldName === "start_date") return eff.start_date ?? row.raw[h] ?? "";
      if (fieldName === "due_date") return eff.due_date ?? row.raw[h] ?? "";
      if (fieldName === "level") return eff.level !== null && eff.level !== undefined ? String(eff.level) : row.raw[h] ?? "";
      const v = row.raw[h];
      if (v === null || v === undefined) return "";
      return String(v);
    });
    lines.push(values.map(csvEscape).join(","));
  }
  return lines.join("\n");
}
