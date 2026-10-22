"use client";

import * as React from "react";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ImportPreview, ImportRow } from "@/lib/excel-parser";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  buildEditedCsv,
  canUploadOriginalFile,
  countByStatus,
  countImportableSelected,
  defaultSelection,
  getEffective,
  getEffectiveStatus,
  type ImportRowEdits,
} from "@/lib/import-selection";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  workspaceId: string;
  onImported?: (result: { created: number; skipped: number }) => void;
}

type Phase = "upload" | "preview" | "importing" | "done";

const FIELD_LABEL: Record<string, string> = {
  title: "Título",
  description: "Descrição",
  assignee_id: "Responsável",
  start_date: "Início",
  due_date: "Término",
  priority: "Prioridade",
  status: "Status",
  project: "Projeto",
  category: "Categoria",
  level: "Nível",
  progress: "Progresso",
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

type SortKey = "index" | "status" | "title" | "assignee_id" | "due_date" | "level" | null;
type SortDir = "asc" | "desc";

export function ImportDialog({ open, onOpenChange, projectId, workspaceId, onImported }: ImportDialogProps) {
  const [phase, setPhase] = React.useState<Phase>("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ created: number; skipped: number; failed: number; wbsLinked: number } | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  // === FEATURE 1: erros expandidos ===
  const [expandedErrors, setExpandedErrors] = React.useState<Set<number>>(new Set());
  const toggleExpand = (idx: number) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // === FEATURE 2: edição inline ===
  const [editedRows, setEditedRows] = React.useState<Record<number, ImportRowEdits>>({});
  const updateRow = (idx: number, patch: ImportRowEdits) => {
    setEditedRows((prev) => ({ ...prev, [idx]: { ...prev[idx], ...patch } }));
  };

  // === FEATURE 3: paginação do preview ===
  const [pageSize, setPageSize] = React.useState<(typeof PAGE_SIZE_OPTIONS)[number]>(50);
  const [currentPage, setCurrentPage] = React.useState(0);
  // Reset pra página 0 quando muda pageSize ou chega novo preview
  React.useEffect(() => {
    setCurrentPage(0);
  }, [pageSize, preview]);
  const totalRows = preview?.rows.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageStart = safePage * pageSize + 1; // 1-based
  const pageEnd = Math.min((safePage + 1) * pageSize, totalRows);

  // === FEATURE 5: seleção por linha (checkbox) ===
  // Inicializada no carregamento da prévia com as linhas importáveis (sem erro);
  // o que vai para o servidor é exatamente o que está marcado.
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set());
  const toggleRow = (idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // === FILTER POR STATUS (cards clicáveis) ===
  const [statusFilter, setStatusFilter] = React.useState<"all" | "valid" | "warning" | "error">("all");

  // === FEATURE 4: ordenação ao clicar nos cabeçalhos ===
  const [sortKey, setSortKey] = React.useState<SortKey>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const cycleSort = (key: Exclude<SortKey, null>) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir("asc"); }
    setCurrentPage(0);
  };
  const sortedRows = React.useMemo(() => {
    if (!preview) return [] as ImportRow[];
    let list = preview.rows;
    if (statusFilter !== "all") {
      list = list.filter((r) => getEffectiveStatus(r, editedRows[r.index]).status === statusFilter);
    }
    if (sortKey === null) return list;
    const key = sortKey;
    const dir = sortDir === "asc" ? 1 : -1;
    function valueOf(row: ImportRow): string | number {
      const eff = getEffective(row.parsed, row.level, editedRows[row.index]);
      if (key === "status") {
        const s = getEffectiveStatus(row, editedRows[row.index]).status;
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
  const selectionIsDefault = React.useMemo(() => {
    if (!preview) return true;
    const expected = defaultSelection(preview.rows);
    return expected.size === selectedRows.size && [...expected].every((idx) => selectedRows.has(idx));
  }, [preview, selectedRows]);

  // Toggle-all da página depende de pageRows (declarado acima)
  const isAllOnPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selectedRows.has(r.index));
  const toggleAllOnPage = () => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (isAllOnPageSelected) {
        for (const r of pageRows) next.delete(r.index);
      } else {
        for (const r of pageRows) next.add(r.index);
      }
      return next;
    });
  };

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Limpa todo o estado ligado ao arquivo atual (prévia, edições, seleção, filtros)
  const resetFileState = React.useCallback(() => {
    setFile(null);
    setPreview(null);
    setEditedRows({});
    setExpandedErrors(new Set());
    setSelectedRows(new Set());
    setStatusFilter("all");
    setSortKey(null);
    setSortDir("asc");
    setCurrentPage(0);
    setError(null);
    setResult(null);
    setDragOver(false);
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
        setPhase("upload");
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

  function handleFile(f: File | undefined | null) {
    if (!f) return;
    resetFileState();
    const ext = f.name.toLowerCase().split(".").pop();
    if (!["xlsx", "xls", "ods", "csv"].includes(ext || "")) {
      setError(`Formato .${ext} não suportado. Use .xlsx, .xls, .ods ou .csv`);
      return;
    }
    setFile(f);
    doPreview(f);
  }

  async function doPreview(f: File) {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", f);
      form.append("project_id", projectId);
      form.append("workspace_id", workspaceId);
      form.append("dry_run", "true");

      const res = await fetch("/api/tasks/import", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao processar arquivo");

      const nextPreview = data.preview as ImportPreview;
      setPreview(nextPreview);
      setSelectedRows(defaultSelection(nextPreview.rows));
      setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function doImport() {
    if (!file || !preview) return;
    setLoading(true);
    setError(null);
    setPhase("importing");
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

      setResult({
        created: data.summary.created,
        skipped: data.summary.skipped,
        failed: data.summary.failed,
        wbsLinked: data.summary.wbsLinked ?? 0,
      });
      setPhase("done");
      onImported?.({ created: data.summary.created, skipped: data.summary.skipped });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setPhase("preview");
    } finally {
      setLoading(false);
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
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragOver ? "border-blue-500 bg-blue-500/5" : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {loading ? (
                <div className="space-y-3">
                  <Loader2 className="h-10 w-10 mx-auto animate-spin text-blue-500" />
                  <p className="text-sm text-muted-foreground">Processando arquivo...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto mb-3 text-zinc-400" />
                  <p className="text-base font-medium mb-1">Arraste sua planilha aqui</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    ou{" "}
                    <button type="button" onClick={() => inputRef.current?.click()} className="text-blue-500 hover:underline font-medium">
                      escolha um arquivo
                    </button>
                    {" "}(.xlsx, .xls, .ods, .csv)
                  </p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls,.ods,.csv"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    className="hidden"
                    aria-label="Arquivo da planilha"
                  />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>📋 Colunas reconhecidas automaticamente:</p>
                    <p>
                      <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">ETAPAS</code>,{" "}
                      <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">RESPONSÁVEL</code>,{" "}
                      <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">Data ÍNICIO</code>,{" "}
                      <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">Data FIM</code>,{" "}
                      <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">STATUS</code>,{" "}
                      <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">PRIORIDADE</code>
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Phase: Preview */}
          {phase === "preview" && preview && (
            <>
              <div className="grid grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => { setStatusFilter("all"); setCurrentPage(0); }}
                  className={`text-left transition-all rounded-xl focus:outline-none ${statusFilter === "all" ? "ring-2 ring-blue-500 shadow-md scale-[1.02]" : "opacity-85 hover:opacity-100 cursor-pointer"}`}
                  title="Filtrar por todas as linhas"
                >
                  <StatBox label="Total" value={preview.totalRows} color="default" />
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter("valid"); setCurrentPage(0); }}
                  className={`text-left transition-all rounded-xl focus:outline-none ${statusFilter === "valid" ? "ring-2 ring-emerald-500 shadow-md scale-[1.02]" : "opacity-85 hover:opacity-100 cursor-pointer"}`}
                  title="Filtrar por linhas válidas"
                >
                  <StatBox
                    label="Válidas"
                    value={statusCounts.valid}
                    color="green"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter("warning"); setCurrentPage(0); }}
                  className={`text-left transition-all rounded-xl focus:outline-none ${statusFilter === "warning" ? "ring-2 ring-amber-500 shadow-md scale-[1.02]" : "opacity-85 hover:opacity-100 cursor-pointer"}`}
                  title="Filtrar por linhas com avisos"
                >
                  <StatBox label="Com avisos" value={statusCounts.warning} color="yellow" />
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter("error"); setCurrentPage(0); }}
                  className={`text-left transition-all rounded-xl focus:outline-none ${statusFilter === "error" ? "ring-2 ring-rose-500 shadow-md scale-[1.02]" : "opacity-85 hover:opacity-100 cursor-pointer"}`}
                  title="Filtrar por linhas com erro (clique para inspecionar)"
                >
                  <StatBox label="Com erro" value={statusCounts.error} color="red" />
                </button>
              </div>

              {preview.hasWBS && (
                <Alert>
                  <AlertTitle className="flex items-center gap-2">
                    <span>🏗️</span>
                    <span>Hierarquia WBS detectada</span>
                  </AlertTitle>
                  <AlertDescription>
                    Coluna <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">Nível</code> encontrada.
                    Tasks de nível &gt; 1 serão vinculadas como sub-tasks do nível anterior mais próximo.
                  </AlertDescription>
                </Alert>
              )}

              <div className="rounded-lg border p-3 bg-zinc-50 dark:bg-zinc-900/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">📊 Mapeamento detectado</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(preview.mapping).map(([col, field]) => (
                    <Badge key={col} variant="secondary" className="text-xs">
                      <span className="font-normal opacity-70">{col}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium">{FIELD_LABEL[field] || field}</span>
                    </Badge>
                  ))}
                  {Object.values(preview.mapping).filter((v) => v !== "ignore").length === 0 && (
                    <span className="text-xs text-red-500">⚠️ Nenhuma coluna reconhecida!</span>
                  )}
                </div>
              </div>

              {/* Barra de Ações Rápidas de Seleção e Filtro Ativo */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRows(new Set(preview.rows.map((r) => r.index)))}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 transition-colors"
                  >
                    ☑️ Selecionar Todas as {preview.totalRows} Linhas
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRows(
                        new Set(
                          preview.rows
                            .filter((r) => getEffectiveStatus(r, editedRows[r.index]).status === "valid")
                            .map((r) => r.index)
                        )
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 transition-colors"
                  >
                    ✅ Selecionar Apenas Válidas ({statusCounts.valid})
                  </button>
                </div>

                {statusFilter !== "all" && (
                  <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <span>Filtro ativo:</span>
                    <Badge variant="outline" className="text-xs uppercase font-bold">
                      {statusFilter === "valid" ? "Válidas" : statusFilter === "warning" ? "Com Avisos" : "Com Erro"}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("all")}
                      className="text-blue-500 hover:underline font-bold text-xs ml-1"
                    >
                      (Limpar filtro)
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-lg border max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left w-8">
                        <input
                          type="checkbox"
                          checked={isAllOnPageSelected}
                          onChange={toggleAllOnPage}
                          className="h-4 w-4 rounded border-zinc-300 text-blue-500 focus:ring-blue-500 cursor-pointer"
                          aria-label="Selecionar todas as linhas desta página"
                        />
                      </th>
                      <th className="px-2 py-2 text-left w-10">
                        <button type="button" onClick={() => cycleSort("index")} className="inline-flex items-center gap-1 hover:text-blue-500 transition-colors">
                          #{sortKey === "index" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        </button>
                      </th>
                      <th className="px-2 py-2 text-left">
                        <button type="button" onClick={() => cycleSort("status")} className="inline-flex items-center gap-1 hover:text-blue-500 transition-colors">
                          Status {sortKey === "status" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        </button>
                      </th>
                      <th className="px-2 py-2 text-left">
                        <button type="button" onClick={() => cycleSort("title")} className="inline-flex items-center gap-1 hover:text-blue-500 transition-colors">
                          Título {sortKey === "title" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        </button>
                      </th>
                      <th className="px-2 py-2 text-left">
                        <button type="button" onClick={() => cycleSort("assignee_id")} className="inline-flex items-center gap-1 hover:text-blue-500 transition-colors">
                          Responsável {sortKey === "assignee_id" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        </button>
                      </th>
                      <th className="px-2 py-2 text-left">
                        <button type="button" onClick={() => cycleSort("due_date")} className="inline-flex items-center gap-1 hover:text-blue-500 transition-colors">
                          Prazo {sortKey === "due_date" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        </button>
                      </th>
                      {preview.hasWBS && (
                        <th className="px-2 py-2 text-left">
                          <button type="button" onClick={() => cycleSort("level")} className="inline-flex items-center gap-1 hover:text-blue-500 transition-colors">
                            Nível {sortKey === "level" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                          </button>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row) => (
                      <PreviewRow
                        key={row.index}
                        row={row}
                        hasWBS={preview.hasWBS}
                        edits={editedRows}
                        expand={expandedErrors.has(row.index)}
                        selected={selectedRows.has(row.index)}
                        onToggleExpand={toggleExpand}
                        onToggleSelect={toggleRow}
                        onUpdate={updateRow}
                      />
                    ))}
                  </tbody>
                </table>

                {totalRows > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-t text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span>
                        Mostrando <strong className="text-foreground">{pageStart}–{pageEnd}</strong> de <strong className="text-foreground">{totalRows}</strong> linhas
                      </span>
                      <span className="opacity-50">•</span>
                      <div className="flex items-center gap-1.5">
                        <span>Por página:</span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(val) => setPageSize(Number(val) as (typeof PAGE_SIZE_OPTIONS)[number])}
                        >
                          <SelectTrigger className="h-7 w-[68px] px-2 py-0 text-xs bg-transparent border-border/80 shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((s) => (
                              <SelectItem key={s} value={String(s)}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                        disabled={safePage === 0}
                        className="px-2 py-1 rounded border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ← Anterior
                      </button>
                      <span className="px-2">
                        Página <strong className="text-foreground">{safePage + 1}</strong> de {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={safePage >= totalPages - 1}
                        className="px-2 py-1 rounded border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Próxima →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Phase: Importing */}
          {phase === "importing" && (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-blue-500" />
              <p className="text-base font-medium">Importando {importableCount} tarefas...</p>
              <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
            </div>
          )}

          {/* Phase: Done */}
          {phase === "done" && result && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
              <div>
                <p className="text-lg font-semibold">Importação concluída!</p>
                <p className="text-sm text-muted-foreground">
                  {result.created} tarefas criadas · {result.skipped} ignoradas · {result.failed} com falha
                {result.wbsLinked > 0 && ` · ${result.wbsLinked} vinculadas como sub-tasks`}
                </p>
              </div>
            </div>
          )}
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
                  setPhase("upload");
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

function StatBox({ label, value, color }: { label: string; value: number; color: "default" | "green" | "yellow" | "red" }) {
  const colors = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
    green: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    yellow: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300",
    red: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300",
  };
  return (
    <div className={`rounded-lg p-3 ${colors[color]}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}


function PreviewRow({
  row,
  hasWBS,
  edits,
  expand,
  selected,
  onToggleExpand,
  onToggleSelect,
  onUpdate,
}: {
  row: ImportRow;
  hasWBS: boolean;
  edits: Record<number, ImportRowEdits>;
  expand: boolean;
  selected: boolean;
  onToggleExpand: (idx: number) => void;
  onToggleSelect: (idx: number) => void;
  onUpdate: (idx: number, patch: ImportRowEdits) => void;
}) {
  const edit = edits[row.index];
  const eff = getEffective(row.parsed, row.level, edit);
  const effStatus = getEffectiveStatus(row, edit);
  const effectiveStatus = effStatus.status;
  const effectiveErrors = effStatus.errors;
  const effectiveWarnings = effStatus.warnings;

  const icon =
    effectiveStatus === "valid" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
    effectiveStatus === "warning" ? <AlertTriangle className="h-4 w-4 text-blue-500" /> :
    <X className="h-4 w-4 text-red-500" />;

  const hasIssues = effectiveStatus !== "valid";
  const dueDate = eff.due_date || "";

  return (
    <>
      <tr
        className={`border-t hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${hasIssues ? "cursor-pointer" : ""} ${expand ? "bg-zinc-50 dark:bg-zinc-900/50" : ""} ${!selected ? "opacity-40" : ""}`}
        onClick={() => hasIssues && onToggleExpand(row.index)}
      >
        <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(row.index)}
            className="h-4 w-4 rounded border-zinc-300 text-blue-500 focus:ring-blue-500 cursor-pointer"
            aria-label={`Selecionar linha ${row.index}`}
          />
        </td>
        <td className="px-2 py-2 text-xs text-muted-foreground">
          {row.index}
          {hasIssues && (
            <span className="ml-1 text-[10px] text-red-500">{expand ? "▼" : "▶"}</span>
          )}
        </td>
        <td className="px-2 py-2">{icon}</td>
        <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={eff.title}
            placeholder="(sem título)"
            aria-label={`Título da linha ${row.index}`}
            onChange={(e) => onUpdate(row.index, { title: e.target.value })}
            className={`w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 text-sm ${!eff.title.trim() ? "italic text-red-500 placeholder-red-300" : "font-medium"}`}
          />
        </td>
        <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={eff.assignee_id ?? ""}
            placeholder="—"
            aria-label={`Responsável da linha ${row.index}`}
            onChange={(e) => onUpdate(row.index, { assignee_id: e.target.value || "" })}
            className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 text-xs text-muted-foreground"
          />
        </td>
        <td className="px-2 py-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
          <DatePicker
            value={dueDate}
            onChange={(val) => onUpdate(row.index, { due_date: val })}
            placeholder="Prazo"
            className="h-8 text-xs border-0 bg-transparent hover:bg-muted/40"
          />
        </td>
        {hasWBS && (
          <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              min={1}
              max={9}
              value={eff.level ?? ""}
              placeholder="—"
              aria-label={`Nível da linha ${row.index}`}
              onChange={(e) => onUpdate(row.index, { level: e.target.value ? Number(e.target.value) : 0 })}
              className="w-14 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 text-xs text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </td>
        )}
      </tr>

      {expand && hasIssues && (
        <tr className="bg-red-50/40 dark:bg-red-950/20">
          <td colSpan={hasWBS ? 7 : 6} className="px-4 py-3 text-xs space-y-2">
            {effectiveErrors.length > 0 && (
              <div>
                <p className="font-semibold text-red-600 dark:text-red-400 mb-1">❌ Erros (corrigem o status):</p>
                <ul className="list-disc list-inside space-y-0.5 text-red-700 dark:text-red-300">
                  {effectiveErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {effectiveWarnings.length > 0 && (
              <div>
                <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">⚠ Avisos (não bloqueiam import):</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700 dark:text-blue-300">
                  {effectiveWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
