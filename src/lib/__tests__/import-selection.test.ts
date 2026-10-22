import {
  buildEditedCsv,
  canUploadOriginalFile,
  countByStatus,
  countImportableSelected,
  csvEscape,
  defaultSelection,
  getEffectiveStatus,
} from "@/lib/import-selection";
import type { ImportPreview, ImportRow } from "@/lib/excel-parser";

function row(index: number, status: ImportRow["status"], title: string, extra: Partial<ImportRow> = {}): ImportRow {
  return {
    index,
    raw: { Tarefa: title, Prazo: "2026-10-21" },
    parsed: { title },
    warnings: status === "warning" ? ["Data não reconhecida"] : [],
    errors: status === "error" ? ["Título vazio"] : [],
    status,
    ...extra,
  };
}

const rows: ImportRow[] = [row(1, "valid", "A"), row(2, "warning", "B"), row(3, "error", "")];

const preview: ImportPreview = {
  filename: "x.csv",
  totalRows: 3,
  validRows: 1,
  warningRows: 1,
  errorRows: 1,
  columns: ["Tarefa", "Prazo"],
  mapping: { Tarefa: "title", Prazo: "due_date" },
  rows,
  hasWBS: false,
};

describe("import-selection", () => {
  it("seleção padrão = linhas que o servidor importaria (válidas + avisos)", () => {
    expect([...defaultSelection(rows)].sort()).toEqual([1, 2]);
  });

  it("contadores recalculados após corrigir o título de uma linha em erro", () => {
    expect(countByStatus(rows, {})).toEqual({ valid: 1, warning: 1, error: 1 });
    const edits = { 3: { title: "Corrigida" } };
    expect(getEffectiveStatus(rows[2], edits[3]).status).toBe("valid");
    expect(countByStatus(rows, edits)).toEqual({ valid: 2, warning: 1, error: 0 });
  });

  it("apagar o título transforma a linha em erro", () => {
    expect(countByStatus(rows, { 1: { title: "  " } })).toEqual({ valid: 0, warning: 1, error: 2 });
  });

  it("conta só as marcadas que não estão em erro", () => {
    expect(countImportableSelected(rows, {}, new Set([1, 2, 3]))).toBe(2);
    expect(countImportableSelected(rows, { 3: { title: "ok" } }, new Set([3]))).toBe(1);
  });

  it("arquivo original só quando equivale à seleção (sem edições, seleção padrão)", () => {
    expect(canUploadOriginalFile(rows, {}, defaultSelection(rows))).toBe(true);
    expect(canUploadOriginalFile(rows, {}, new Set([1]))).toBe(false);
    expect(canUploadOriginalFile(rows, { 1: { title: "X" } }, defaultSelection(rows))).toBe(false);
  });

  it("CSV contém exatamente as linhas marcadas, com edições aplicadas", () => {
    const csv = buildEditedCsv(preview, { 2: { title: "B, editada", due_date: "2026-11-05" } }, new Set([2]));
    expect(csv.split("\n")).toEqual(["Tarefa,Prazo", '"B, editada",2026-11-05']);
  });

  it("csvEscape escapa vírgula, aspas e quebra de linha", () => {
    expect(csvEscape('a "b"')).toBe('"a ""b"""');
    expect(csvEscape("x\ny")).toBe('"x\ny"');
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(3)).toBe("3");
  });
});
