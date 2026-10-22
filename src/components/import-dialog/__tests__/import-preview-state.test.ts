import type { ImportPreview, ImportRow } from "@/lib/excel-parser";
import {
  INITIAL_IMPORT_PREVIEW_STATE,
  filterAndSortRows,
  importPreviewReducer,
  isDefaultSelection,
  paginate,
  type ImportPreviewState,
} from "@/components/import-dialog/import-preview-state";

function row(index: number, status: ImportRow["status"], title: string, extra: Partial<ImportRow> = {}): ImportRow {
  return {
    index,
    raw: { Tarefa: title },
    parsed: { title },
    warnings: status === "warning" ? ["Data não reconhecida"] : [],
    errors: status === "error" ? ["Título vazio"] : [],
    status,
    ...extra,
  };
}

const rows = [row(1, "valid", "Beta"), row(2, "error", ""), row(3, "warning", "alfa"), row(4, "valid", "Gama")];

const preview: ImportPreview = {
  filename: "x.xlsx",
  totalRows: rows.length,
  validRows: 2,
  warningRows: 1,
  errorRows: 1,
  columns: ["Tarefa"],
  mapping: { Tarefa: "title" },
  rows,
  hasWBS: false,
};

const reduce = (state: ImportPreviewState, ...actions: Parameters<typeof importPreviewReducer>[1][]) =>
  actions.reduce(importPreviewReducer, state);

describe("importPreviewReducer", () => {
  it("patch com o mesmo valor devolve o mesmo estado", () => {
    const s = INITIAL_IMPORT_PREVIEW_STATE;
    expect(importPreviewReducer(s, { type: "patch", patch: { currentPage: 0 } })).toBe(s);
    expect(importPreviewReducer(s, { type: "patch", patch: { currentPage: 2 } }).currentPage).toBe(2);
  });

  it("previewLoaded seleciona as linhas sem erro e vai para a prévia", () => {
    const s = importPreviewReducer(INITIAL_IMPORT_PREVIEW_STATE, { type: "previewLoaded", preview });
    expect(s.phase).toBe("preview");
    expect(s.preview).toBe(preview);
    expect([...s.selectedRows].sort()).toEqual([1, 3, 4]);
  });

  it("resetFile limpa o arquivo mas preserva fase, loading e tamanho de página", () => {
    const dirty: ImportPreviewState = {
      ...INITIAL_IMPORT_PREVIEW_STATE,
      phase: "preview",
      loading: true,
      pageSize: 100,
      preview,
      error: "x",
      dragOver: true,
      currentPage: 3,
      statusFilter: "error",
      sortKey: "title",
      sortDir: "desc",
      editedRows: { 1: { title: "a" } },
      selectedRows: new Set([1]),
      expandedErrors: new Set([2]),
      result: { created: 1, skipped: 0, failed: 0, wbsLinked: 0 },
    };
    const s = importPreviewReducer(dirty, { type: "resetFile" });
    expect(s).toMatchObject({
      phase: "preview",
      loading: true,
      pageSize: 100,
      file: null,
      preview: null,
      error: null,
      result: null,
      dragOver: false,
      currentPage: 0,
      statusFilter: "all",
      sortKey: null,
      sortDir: "asc",
      editedRows: {},
    });
    expect(s.selectedRows.size).toBe(0);
    expect(s.expandedErrors.size).toBe(0);
  });

  it("edição inline acumula campos por linha", () => {
    const s = reduce(
      INITIAL_IMPORT_PREVIEW_STATE,
      { type: "updateRow", index: 2, patch: { title: "Novo" } },
      { type: "updateRow", index: 2, patch: { due_date: "2026-10-21" } }
    );
    expect(s.editedRows).toEqual({ 2: { title: "Novo", due_date: "2026-10-21" } });
  });

  it("toggles de seleção e de expansão", () => {
    let s = reduce(INITIAL_IMPORT_PREVIEW_STATE, { type: "toggleRow", index: 1 }, { type: "toggleExpand", index: 2 });
    expect(s.selectedRows.has(1)).toBe(true);
    expect(s.expandedErrors.has(2)).toBe(true);
    s = reduce(s, { type: "toggleRow", index: 1 }, { type: "toggleExpand", index: 2 });
    expect(s.selectedRows.size).toBe(0);
    expect(s.expandedErrors.size).toBe(0);

    s = reduce(s, { type: "setRowsSelected", indices: [1, 2, 3], selected: true });
    expect([...s.selectedRows]).toEqual([1, 2, 3]);
    s = reduce(s, { type: "setRowsSelected", indices: [2, 3], selected: false });
    expect([...s.selectedRows]).toEqual([1]);
  });

  it("ordenação cicla asc → desc → nenhuma e volta à página 0", () => {
    let s: ImportPreviewState = { ...INITIAL_IMPORT_PREVIEW_STATE, currentPage: 2 };
    s = importPreviewReducer(s, { type: "cycleSort", key: "title" });
    expect(s).toMatchObject({ sortKey: "title", sortDir: "asc", currentPage: 0 });
    s = importPreviewReducer(s, { type: "cycleSort", key: "title" });
    expect(s).toMatchObject({ sortKey: "title", sortDir: "desc" });
    s = importPreviewReducer(s, { type: "cycleSort", key: "title" });
    expect(s).toMatchObject({ sortKey: null, sortDir: "asc" });
    s = reduce(s, { type: "cycleSort", key: "title" }, { type: "cycleSort", key: "status" });
    expect(s).toMatchObject({ sortKey: "status", sortDir: "asc" });
  });

  it("filtro por status reseta a página só quando pedido", () => {
    const s: ImportPreviewState = { ...INITIAL_IMPORT_PREVIEW_STATE, currentPage: 2 };
    expect(importPreviewReducer(s, { type: "setStatusFilter", filter: "valid", resetPage: true })).toMatchObject({
      statusFilter: "valid",
      currentPage: 0,
    });
    expect(importPreviewReducer(s, { type: "setStatusFilter", filter: "all", resetPage: false }).currentPage).toBe(2);
  });

  it("navegação de página respeita os limites", () => {
    const s = reduce(INITIAL_IMPORT_PREVIEW_STATE, { type: "prevPage" });
    expect(s.currentPage).toBe(0);
    const n = reduce(s, { type: "nextPage", totalPages: 2 }, { type: "nextPage", totalPages: 2 });
    expect(n.currentPage).toBe(1);
  });
});

describe("filterAndSortRows", () => {
  it("sem ordenação mantém a ordem do arquivo", () => {
    expect(filterAndSortRows(rows, {}, "all", null, "asc")).toBe(rows);
  });

  it("filtra pelo status efetivo (considerando edições)", () => {
    expect(filterAndSortRows(rows, {}, "error", null, "asc").map((r) => r.index)).toEqual([2]);
    // Título preenchido tira a linha 2 do erro
    expect(filterAndSortRows(rows, { 2: { title: "Ok" } }, "error", null, "asc")).toEqual([]);
  });

  it("ordena por título (pt-BR, sem caixa) e por status", () => {
    expect(filterAndSortRows(rows, {}, "all", "title", "asc").map((r) => r.index)).toEqual([2, 3, 1, 4]);
    expect(filterAndSortRows(rows, {}, "all", "title", "desc").map((r) => r.index)).toEqual([4, 1, 3, 2]);
    expect(filterAndSortRows(rows, {}, "all", "status", "asc").map((r) => r.index)).toEqual([1, 4, 3, 2]);
  });

  it("nível vazio vai para o fim", () => {
    const wbs = [row(1, "valid", "a", { level: 2 }), row(2, "valid", "b"), row(3, "valid", "c", { level: 1 })];
    expect(filterAndSortRows(wbs, {}, "all", "level", "asc").map((r) => r.index)).toEqual([3, 1, 2]);
  });
});

describe("isDefaultSelection / paginate", () => {
  it("compara com a seleção padrão (linhas sem erro)", () => {
    expect(isDefaultSelection(rows, new Set([1, 3, 4]))).toBe(true);
    expect(isDefaultSelection(rows, new Set([1, 3]))).toBe(false);
    expect(isDefaultSelection(rows, new Set([1, 2, 4]))).toBe(false);
  });

  it("limita a página e calcula o intervalo exibido", () => {
    expect(paginate(120, 50, 0)).toEqual({ totalRows: 120, totalPages: 3, safePage: 0, pageStart: 1, pageEnd: 50 });
    expect(paginate(120, 50, 7)).toEqual({ totalRows: 120, totalPages: 3, safePage: 2, pageStart: 101, pageEnd: 120 });
    expect(paginate(0, 25, 0)).toEqual({ totalRows: 0, totalPages: 1, safePage: 0, pageStart: 1, pageEnd: 0 });
  });
});
