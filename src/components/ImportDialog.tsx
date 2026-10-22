"use client";

import * as React from "react";
import { FileSpreadsheet, AlertTriangle, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ImportPreview } from "@/lib/excel-parser";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { buildEditedCsv, canUploadOriginalFile, getEffectiveStatus } from "@/lib/import-selection";
import { useImportPreviewState } from "@/components/import-dialog/useImportPreviewState";
import { UploadDropzone } from "@/components/import-dialog/UploadDropzone";
import { PreviewStats } from "@/components/import-dialog/PreviewStats";
import { PreviewMapping } from "@/components/import-dialog/PreviewMapping";
import { PreviewSelectionBar } from "@/components/import-dialog/PreviewSelectionBar";
import { PreviewTable, PreviewPagination } from "@/components/import-dialog/PreviewTable";
import { ImportingIndicator, ImportResult } from "@/components/import-dialog/ImportResult";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  workspaceId: string;
  onImported?: (result: { created: number; skipped: number }) => void;
}

export function ImportDialog({ open, onOpenChange, projectId, workspaceId, onImported }: ImportDialogProps) {
  const {
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
  } = useImportPreviewState(open);
  const { phase, file, preview, error, loading, result, editedRows, selectedRows, statusFilter } = state;

  function handleFile(f: File | undefined | null) {
    if (!f) return;
    resetFileState();
    const ext = f.name.toLowerCase().split(".").pop();
    if (!["xlsx", "xls", "ods", "csv"].includes(ext || "")) {
      dispatch({ type: "patch", patch: { error: `Formato .${ext} não suportado. Use .xlsx, .xls, .ods ou .csv` } });
      return;
    }
    dispatch({ type: "patch", patch: { file: f } });
    doPreview(f);
  }

  async function doPreview(f: File) {
    dispatch({ type: "patch", patch: { loading: true, error: null } });
    try {
      const form = new FormData();
      form.append("file", f);
      form.append("project_id", projectId);
      form.append("workspace_id", workspaceId);
      form.append("dry_run", "true");

      const res = await fetch("/api/tasks/import", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao processar arquivo");

      // Seleção inicial: as linhas importáveis (sem erro)
      dispatch({ type: "previewLoaded", preview: data.preview as ImportPreview });
    } catch (err) {
      dispatch({ type: "patch", patch: { error: err instanceof Error ? err.message : "Erro desconhecido" } });
    } finally {
      dispatch({ type: "patch", patch: { loading: false } });
    }
  }

  async function doImport() {
    if (!file || !preview) return;
    dispatch({ type: "patch", patch: { loading: true, error: null, phase: "importing" } });
    try {
      const form = new FormData();
      // Importa exatamente as linhas marcadas: o arquivo original só serve quando
      // equivale à seleção (sem edições, seleção padrão); senão vai um CSV filtrado
      if (canUploadOriginalFile(preview.rows, editedRows, selectedRows)) {
        form.append("file", file);
      } else {
        const csv = buildEditedCsv(preview, editedRows, selectedRows);
        const csvFile = new File([csv], "tarefas-editadas.csv", { type: "text/csv" });
        form.append("file", csvFile);
      }
      form.append("project_id", projectId);
      form.append("workspace_id", workspaceId);
      form.append("dry_run", "false");

      const res = await fetch("/api/tasks/import", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao importar");

      dispatch({
        type: "importDone",
        result: {
          created: data.summary.created,
          skipped: data.summary.skipped,
          failed: data.summary.failed,
          wbsLinked: data.summary.wbsLinked ?? 0,
        },
      });
      onImported?.({ created: data.summary.created, skipped: data.summary.skipped });
    } catch (err) {
      dispatch({
        type: "patch",
        patch: { error: err instanceof Error ? err.message : "Erro desconhecido", phase: "preview" },
      });
    } finally {
      dispatch({ type: "patch", patch: { loading: false } });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Não fecha no meio da importação
        if (!next && phase === "importing") return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        hideCloseButton
        aria-describedby={undefined}
        overlayClassName="bg-black/60"
        className="flex flex-col gap-0 p-0 w-[calc(100%-2rem)] max-w-3xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-xl sm:rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-500" />
            <DialogTitle className="text-lg font-semibold tracking-normal">Importar planilha de tarefas</DialogTitle>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={phase === "importing"}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Phase: Upload */}
          {phase === "upload" && (
            <UploadDropzone
              dragOver={state.dragOver}
              loading={loading}
              inputRef={inputRef}
              onDragOverChange={(dragOver) => dispatch({ type: "patch", patch: { dragOver } })}
              onFile={handleFile}
            />
          )}

          {/* Phase: Preview */}
          {phase === "preview" && preview && (
            <>
              <PreviewStats
                totalRows={preview.totalRows}
                counts={statusCounts}
                statusFilter={statusFilter}
                onFilterChange={(filter) => dispatch({ type: "setStatusFilter", filter, resetPage: true })}
              />

              <PreviewMapping preview={preview} />

              <PreviewSelectionBar
                totalRows={preview.totalRows}
                validCount={statusCounts.valid}
                statusFilter={statusFilter}
                onSelectAll={() =>
                  dispatch({ type: "setSelection", selection: new Set(preview.rows.map((r) => r.index)) })
                }
                onSelectValid={() =>
                  dispatch({
                    type: "setSelection",
                    selection: new Set(
                      preview.rows
                        .filter((r) => getEffectiveStatus(r, editedRows[r.index]).status === "valid")
                        .map((r) => r.index)
                    ),
                  })
                }
                onClearFilter={() => dispatch({ type: "setStatusFilter", filter: "all", resetPage: false })}
              />

              <PreviewTable
                rows={pageRows}
                hasWBS={preview.hasWBS}
                edits={editedRows}
                expandedErrors={state.expandedErrors}
                selectedRows={selectedRows}
                sortKey={state.sortKey}
                sortDir={state.sortDir}
                isAllOnPageSelected={isAllOnPageSelected}
                onSort={(key) => dispatch({ type: "cycleSort", key })}
                onToggleAllOnPage={toggleAllOnPage}
                onToggleExpand={(index) => dispatch({ type: "toggleExpand", index })}
                onToggleSelect={(index) => dispatch({ type: "toggleRow", index })}
                onUpdate={(index, patch) => dispatch({ type: "updateRow", index, patch })}
              >
                {pagination.totalRows > 0 && (
                  <PreviewPagination
                    pagination={pagination}
                    pageSize={state.pageSize}
                    onPageSizeChange={(pageSize) => dispatch({ type: "patch", patch: { pageSize } })}
                    onPrev={() => dispatch({ type: "prevPage" })}
                    onNext={() => dispatch({ type: "nextPage", totalPages: pagination.totalPages })}
                  />
                )}
              </PreviewTable>
            </>
          )}

          {/* Phase: Importing */}
          {phase === "importing" && <ImportingIndicator count={importableCount} />}

          {/* Phase: Done */}
          {phase === "done" && result && <ImportResult result={result} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-zinc-50 dark:bg-zinc-900/50">
          {phase === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  // Volta ao upload limpando prévia, edições, seleção e filtros do arquivo anterior
                  resetFileState();
                  dispatch({ type: "patch", patch: { phase: "upload" } });
                }}
              >
                ← Trocar arquivo
              </Button>
              <Button
                onClick={doImport}
                disabled={loading || importableCount === 0}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Download className="h-4 w-4 mr-2" />
                Importar{" "}
                {importableCount}{" "}
                selecionadas
                {hasEdits && " (editadas)"}
                {!selectionIsDefault && " (filtradas)"}
              </Button>
            </>
          )}
          {phase === "done" && (
            <Button onClick={() => onOpenChange(false)} className="bg-blue-500 hover:bg-blue-600">
              Fechar
            </Button>
          )}
          {phase === "upload" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
