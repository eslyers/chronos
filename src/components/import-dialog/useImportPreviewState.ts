"use client";

import * as React from "react";
import type { ImportRow } from "@/lib/excel-parser";
import { countByStatus, countImportableSelected } from "@/lib/import-selection";
import {
  INITIAL_IMPORT_PREVIEW_STATE,
  filterAndSortRows,
  importPreviewReducer,
  isDefaultSelection,
  paginate,
} from "./import-preview-state";

/**
 * Estado do ImportDialog + derivações da prévia (filtro, ordenação, página,
 * contadores). Faz o reset completo ao fechar, após a animação de saída.
 */
export function useImportPreviewState(open: boolean) {
  const [state, dispatch] = React.useReducer(importPreviewReducer, INITIAL_IMPORT_PREVIEW_STATE);
  const { preview, editedRows, selectedRows, statusFilter, sortKey, sortDir, pageSize, currentPage } = state;

  // Reset pra página 0 quando muda pageSize ou chega novo preview
  React.useEffect(() => {
    dispatch({ type: "patch", patch: { currentPage: 0 } });
  }, [pageSize, preview]);

  const pagination = paginate(preview?.rows.length ?? 0, pageSize, currentPage);
  const { safePage } = pagination;

  const sortedRows = React.useMemo(() => {
    if (!preview) return [] as ImportRow[];
    return filterAndSortRows(preview.rows, editedRows, statusFilter, sortKey, sortDir);
  }, [preview, sortKey, sortDir, editedRows, statusFilter]);

  const pageRows = sortedRows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  // Contadores e total a importar sempre refletem as edições e a seleção atuais
  const statusCounts = React.useMemo(
    () => (preview ? countByStatus(preview.rows, editedRows) : { valid: 0, warning: 0, error: 0 }),
    [preview, editedRows]
  );
  const importableCount = React.useMemo(
    () => (preview ? countImportableSelected(preview.rows, editedRows, selectedRows) : 0),
    [preview, editedRows, selectedRows]
  );
  const hasEdits = Object.keys(editedRows).length > 0;
  const selectionIsDefault = React.useMemo(
    () => (preview ? isDefaultSelection(preview.rows, selectedRows) : true),
    [preview, selectedRows]
  );

  // Toggle-all da página depende de pageRows
  const isAllOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedRows.has(r.index));
  const toggleAllOnPage = () => {
    dispatch({ type: "setRowsSelected", indices: pageRows.map((r) => r.index), selected: !isAllOnPageSelected });
  };

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Limpa todo o estado ligado ao arquivo atual (prévia, edições, seleção, filtros)
  const resetFileState = React.useCallback(() => {
    dispatch({ type: "resetFile" });
    // Permite escolher o mesmo arquivo de novo (onChange não dispara com valor igual)
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  // Reset ao fechar (após a animação de saída); cancelado se reabrir ou desmontar
  const resetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    if (!open) {
      resetTimerRef.current = setTimeout(() => {
        resetTimerRef.current = null;
        dispatch({ type: "patch", patch: { phase: "upload" } });
        resetFileState();
      }, 200);
    }
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, [open, resetFileState]);

  return {
    state,
    dispatch,
    inputRef,
    resetFileState,
    pagination,
    pageRows,
    statusCounts,
    importableCount,
    hasEdits,
    selectionIsDefault,
    isAllOnPageSelected,
    toggleAllOnPage,
  };
}
