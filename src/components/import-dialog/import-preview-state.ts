// ─────────────────────────────────────────────────────────────
// CHRONOS — Estado do ImportDialog (fases, prévia, edição, seleção,
// filtro, ordenação e paginação). Reducer e derivações puras; as regras
// de edição/seleção/contadores vêm de lib/import-selection.
// ─────────────────────────────────────────────────────────────
import type { ImportPreview, ImportRow } from "@/lib/excel-parser";
import { defaultSelection, getEffective, getEffectiveStatus, type ImportRowEdits } from "@/lib/import-selection";

export type Phase = "upload" | "preview" | "importing" | "done";

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export type SortKey = "index" | "status" | "title" | "assignee_id" | "due_date" | "level" | null;
export type SortDir = "asc" | "desc";
export type StatusFilter = "all" | "valid" | "warning" | "error";

export type ImportResultSummary = { created: number; skipped: number; failed: number; wbsLinked: number };

export interface ImportPreviewState {
  phase: Phase;
  file: File | null;
  preview: ImportPreview | null;
  error: string | null;
  loading: boolean;
  result: ImportResultSummary | null;
  dragOver: boolean;
  // Erros expandidos por linha
  expandedErrors: Set<number>;
  // Edição inline
  editedRows: Record<number, ImportRowEdits>;
  // Paginação da prévia
  pageSize: PageSize;
  currentPage: number;
  // Seleção por linha: o que vai para o servidor é exatamente o que está marcado
  selectedRows: Set<number>;
  // Filtro por status (cards clicáveis)
  statusFilter: StatusFilter;
  // Ordenação ao clicar nos cabeçalhos
  sortKey: SortKey;
  sortDir: SortDir;
}

/** Campos escalares que podem ser atribuídos diretamente. */
type ScalarPatch = Partial<
  Pick<ImportPreviewState, "phase" | "file" | "error" | "loading" | "dragOver" | "pageSize" | "currentPage">
>;

export type ImportPreviewAction =
  | { type: "patch"; patch: ScalarPatch }
  // Limpa todo o estado ligado ao arquivo atual (prévia, edições, seleção, filtros)
  | { type: "resetFile" }
  | { type: "previewLoaded"; preview: ImportPreview }
  | { type: "importDone"; result: ImportResultSummary }
  | { type: "toggleExpand"; index: number }
  | { type: "updateRow"; index: number; patch: ImportRowEdits }
  | { type: "toggleRow"; index: number }
  | { type: "setSelection"; selection: Set<number> }
  | { type: "setRowsSelected"; indices: number[]; selected: boolean }
  | { type: "setStatusFilter"; filter: StatusFilter; resetPage: boolean }
  | { type: "cycleSort"; key: Exclude<SortKey, null> }
  | { type: "prevPage" }
  | { type: "nextPage"; totalPages: number };

export const INITIAL_IMPORT_PREVIEW_STATE: ImportPreviewState = {
  phase: "upload",
  file: null,
  preview: null,
  error: null,
  loading: false,
  result: null,
  dragOver: false,
  expandedErrors: new Set(),
  editedRows: {},
  pageSize: 50,
  currentPage: 0,
  selectedRows: new Set(),
  statusFilter: "all",
  sortKey: null,
  sortDir: "asc",
};

function toggleInSet(set: Set<number>, index: number): Set<number> {
  const next = new Set(set);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  return next;
}

export function importPreviewReducer(state: ImportPreviewState, action: ImportPreviewAction): ImportPreviewState {
  switch (action.type) {
    case "patch": {
      // Igual ao useState: atribuir o mesmo valor não gera novo estado
      const keys = Object.keys(action.patch) as Array<keyof ScalarPatch>;
      if (keys.every((k) => Object.is(state[k], action.patch[k]))) return state;
      return { ...state, ...action.patch };
    }
    case "resetFile":
      return {
        ...state,
        file: null,
        preview: null,
        editedRows: {},
        expandedErrors: new Set(),
        selectedRows: new Set(),
        statusFilter: "all",
        sortKey: null,
        sortDir: "asc",
        currentPage: 0,
        error: null,
        result: null,
        dragOver: false,
      };
    case "previewLoaded":
      return {
        ...state,
        preview: action.preview,
        selectedRows: defaultSelection(action.preview.rows),
        phase: "preview",
      };
    case "importDone":
      return { ...state, result: action.result, phase: "done" };
    case "toggleExpand":
      return { ...state, expandedErrors: toggleInSet(state.expandedErrors, action.index) };
    case "updateRow":
      return {
        ...state,
        editedRows: { ...state.editedRows, [action.index]: { ...state.editedRows[action.index], ...action.patch } },
      };
    case "toggleRow":
      return { ...state, selectedRows: toggleInSet(state.selectedRows, action.index) };
    case "setSelection":
      return { ...state, selectedRows: action.selection };
    case "setRowsSelected": {
      const next = new Set(state.selectedRows);
      for (const idx of action.indices) {
        if (action.selected) next.add(idx);
        else next.delete(idx);
      }
      return { ...state, selectedRows: next };
    }
    case "setStatusFilter":
      return {
        ...state,
        statusFilter: action.filter,
        currentPage: action.resetPage ? 0 : state.currentPage,
      };
    case "cycleSort": {
      // Ciclo: asc → desc → sem ordenação
      let { sortKey, sortDir } = state;
      if (sortKey !== action.key) {
        sortKey = action.key;
        sortDir = "asc";
      } else if (sortDir === "asc") {
        sortDir = "desc";
      } else {
        sortKey = null;
        sortDir = "asc";
      }
      return { ...state, sortKey, sortDir, currentPage: 0 };
    }
    case "prevPage":
      return { ...state, currentPage: Math.max(0, state.currentPage - 1) };
    case "nextPage":
      return { ...state, currentPage: Math.min(action.totalPages - 1, state.currentPage + 1) };
  }
}

/** Aplica o filtro por status efetivo e a ordenação escolhida (sem ordenação = ordem do arquivo). */
export function filterAndSortRows(
  rows: ImportRow[],
  edits: Record<number, ImportRowEdits>,
  statusFilter: StatusFilter,
  sortKey: SortKey,
  sortDir: SortDir
): ImportRow[] {
  let list = rows;
  if (statusFilter !== "all") {
    list = list.filter((r) => getEffectiveStatus(r, edits[r.index]).status === statusFilter);
  }
  if (sortKey === null) return list;
  const key = sortKey;
  const dir = sortDir === "asc" ? 1 : -1;
  function valueOf(row: ImportRow): string | number {
    const eff = getEffective(row.parsed, row.level, edits[row.index]);
    if (key === "status") {
      const s = getEffectiveStatus(row, edits[row.index]).status;
      const weight = s === "valid" ? 0 : s === "warning" ? 1 : 2;
      return weight;
    }
    if (key === "index") return row.index;
    if (key === "level") return eff.level ?? 99;
    if (key === "title") return eff.title.toLowerCase();
    if (key === "assignee_id") return (eff.assignee_id ?? "").toLowerCase();
    if (key === "due_date") return eff.due_date ?? "";
    return "";
  }
  return [...list].sort((a, b) => {
    const va = valueOf(a);
    const vb = valueOf(b);
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb), "pt-BR", { numeric: true, sensitivity: "base" }) * dir;
  });
}

/** Seleção atual igual à padrão (todas as linhas sem erro)? */
export function isDefaultSelection(rows: ImportRow[], selected: Set<number>): boolean {
  const expected = defaultSelection(rows);
  return expected.size === selected.size && [...expected].every((idx) => selected.has(idx));
}

export type Pagination = {
  totalRows: number;
  totalPages: number;
  safePage: number;
  pageStart: number; // 1-based
  pageEnd: number;
};

/** Página efetiva (limitada ao total) e intervalo exibido. */
export function paginate(totalRows: number, pageSize: number, currentPage: number): Pagination {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(currentPage, totalPages - 1);
  return {
    totalRows,
    totalPages,
    safePage,
    pageStart: safePage * pageSize + 1,
    pageEnd: Math.min((safePage + 1) * pageSize, totalRows),
  };
}
