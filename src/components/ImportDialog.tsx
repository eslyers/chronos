"use client";

import * as React from "react";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ImportPreview, ImportRow, ImportRowStatus } from "@/lib/excel-parser";
import type { Task } from "@/lib/context/DataContext";

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
  type Editable = Partial<{
    title: string;
    assignee_id: string;
    start_date: string; // ISO yyyy-mm-dd
    due_date: string;
    level: number;
  }>;
  const [editedRows, setEditedRows] = React.useState<Record<number, Editable>>({});
  const updateRow = (idx: number, patch: Editable) => {
    setEditedRows((prev) => ({ ...prev, [idx]: { ...prev[idx], ...patch } }));
  };

  // === FEATURE 3: paginação do preview ===
  const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
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

  // === FEATURE 4: ordenação ao clicar nos cabeçalhos ===
  type SortKey = "index" | "status" | "title" | "assignee_id" | "due_date" | "level" | null;
  type SortDir = "asc" | "desc";
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
    if (sortKey === null) return preview.rows;
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
    return [...preview.rows].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "pt-BR", { numeric: true, sensitivity: "base" }) * dir;
    });
  }, [preview, sortKey, sortDir, editedRows]);

  const pageRows = sortedRows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset ao fechar
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPhase("upload");
        setFile(null);
        setPreview(null);
        setError(null);
        setResult(null);
      }, 200);
    }
  }, [open]);

  function handleFile(f: File | undefined | null) {
    if (!f) return;
    setError(null);
    setResult(null);
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

      setPreview(data.preview);
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
      // Se tiver edições inline, gera CSV novo com as edições aplicadas
      const hasEdits = Object.keys(editedRows).length > 0;
      if (hasEdits) {
        const csv = buildEditedCsv(preview, editedRows);
        const csvFile = new File([csv], "tarefas-editadas.csv", { type: "text/csv" });
        form.append("file", csvFile);
      } else {
        form.append("file", file);
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Importar planilha de tarefas</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
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
                dragOver ? "border-orange-500 bg-orange-500/5" : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {loading ? (
                <div className="space-y-3">
                  <Loader2 className="h-10 w-10 mx-auto animate-spin text-orange-500" />
                  <p className="text-sm text-muted-foreground">Processando arquivo...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto mb-3 text-zinc-400" />
                  <p className="text-base font-medium mb-1">Arraste sua planilha aqui</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    ou{" "}
                    <button onClick={() => inputRef.current?.click()} className="text-orange-500 hover:underline font-medium">
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
                <StatBox label="Total" value={preview.totalRows} color="default" />
                <StatBox
                  label="Válidas"
                  value={
                    Object.keys(editedRows).length === 0
                      ? preview.validRows
                      : preview.rows.reduce(
                          (acc, row) =>
                            acc + (getEffectiveStatus(row, editedRows[row.index]).status === "valid" ? 1 : 0),
                          0
                        )
                  }
                  color="green"
                />
                <StatBox label="Com avisos" value={preview.warningRows} color="amber" />
                <StatBox label="Com erro" value={preview.errorRows} color="red" />
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
                {preview.sheetName && (
                  <p className="text-xs text-muted-foreground mt-2">📑 Aba: <code>{preview.sheetName}</code></p>
                )}
              </div>

              <div className="rounded-lg border max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left w-10">
                        <button type="button" onClick={() => cycleSort("index")} className="inline-flex items-center gap-1 hover:text-orange-500 transition-colors">
                          #{sortKey === "index" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        </button>
                      </th>
                      <th className="px-2 py-2 text-left">
                        <button type="button" onClick={() => cycleSort("status")} className="inline-flex items-center gap-1 hover:text-orange-500 transition-colors">
                          Status {sortKey === "status" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        </button>
                      </th>
                      <th className="px-2 py-2 text-left">
                        <button type="button" onClick={() => cycleSort("title")} className="inline-flex items-center gap-1 hover:text-orange-500 transition-colors">
                          Título {sortKey === "title" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        </button>
                      </th>
                      <th className="px-2 py-2 text-left">
                        <button type="button" onClick={() => cycleSort("assignee_id")} className="inline-flex items-center gap-1 hover:text-orange-500 transition-colors">
                          Responsável {sortKey === "assignee_id" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        </button>
                      </th>
                      <th className="px-2 py-2 text-left">
                        <button type="button" onClick={() => cycleSort("due_date")} className="inline-flex items-center gap-1 hover:text-orange-500 transition-colors">
                          Prazo {sortKey === "due_date" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        </button>
                      </th>
                      {preview.hasWBS && (
                        <th className="px-2 py-2 text-left">
                          <button type="button" onClick={() => cycleSort("level")} className="inline-flex items-center gap-1 hover:text-orange-500 transition-colors">
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
                        onToggleExpand={toggleExpand}
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
                      <label className="flex items-center gap-1">
                        Por página:
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
                          className="bg-transparent border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          {PAGE_SIZE_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </label>
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
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-orange-500" />
              <p className="text-base font-medium">Importando {preview?.validRows || 0} tarefas...</p>
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
              <Button variant="outline" onClick={() => setPhase("upload")}>
                ← Trocar arquivo
              </Button>
              <Button
                onClick={doImport}
                disabled={
                  loading ||
                  (preview?.rows.reduce(
                    (acc, row) =>
                      acc + (getEffectiveStatus(row, editedRows[row.index]).status === "valid" ? 1 : 0),
                    0
                  ) || 0) === 0
                }
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Download className="h-4 w-4 mr-2" />
                Importar{" "}
                {preview?.rows.reduce(
                  (acc, row) =>
                    acc + (getEffectiveStatus(row, editedRows[row.index]).status === "valid" ? 1 : 0),
                  0
                ) || 0}{" "}
                tarefas
                {Object.keys(editedRows).length > 0 && " (editadas)"}
              </Button>
            </>
          )}
          {phase === "done" && (
            <Button onClick={() => onOpenChange(false)} className="bg-orange-500 hover:bg-orange-600">
              Fechar
            </Button>
          )}
          {phase === "upload" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: "default" | "green" | "amber" | "red" }) {
  const colors = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
    green: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
    red: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300",
  };
  return (
    <div className={`rounded-lg p-3 ${colors[color]}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// === Helpers pés FEATURE 2 (edição inline) ===

// Mistura edições do usuário com a row original
type Editable = Partial<{
  title: string;
  assignee_id: string;
  start_date: string;
  due_date: string;
  level: number;
}>;

// Recebe o `parsed` direto (não o ImportRow inteiro) — são os campos Task-like.
function getEffective(
  parsed: Partial<Task>,
  origLevel: number | undefined,
  edits: Editable | undefined,
): {
  title: string;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  level: number | null;
} {
  return {
    title: edits?.title ?? parsed.title ?? "",
    assignee_id: edits?.assignee_id ?? parsed.assignee_id ?? null,
    start_date: edits?.start_date ?? parsed.start_date ?? null,
    due_date: edits?.due_date ?? parsed.due_date ?? null,
    level: edits?.level ?? origLevel ?? null,
  };
}

// Recalcula status da row após edição
function getEffectiveStatus(orig: ImportRow, edits: Editable | undefined): { status: ImportRowStatus; errors: string[]; warnings: string[] } {
  const eff = getEffective(orig.parsed, orig.level, edits);
  const errors = [...orig.errors];
  const warnings = [...orig.warnings];
  const titleEmpty = !eff.title || eff.title.trim() === "";
  if (!titleEmpty) {
    const i = errors.findIndex((e) => e === "Título vazio");
    if (i !== -1) errors.splice(i, 1);
  } else if (!errors.includes("Título vazio")) {
    errors.push("Título vazio");
  }
  let status: ImportRowStatus = "valid";
  if (errors.length > 0) status = "error";
  else if (warnings.length > 0) status = "warning";
  return { status, errors, warnings };
}

// Gera CSV novo com edições aplicadas (pra mandar pro backend se houver edits)
function buildEditedCsv(preview: ImportPreview, edits: Record<number, Editable>): string {
  // Detecta quais colunas do arquivo original têm header útil (texto)
  const fileHeaders = preview.columns;
  const lines: string[] = [fileHeaders.map(csvEscape).join(",")];
  for (const row of preview.rows) {
    const edit = edits[row.index];
    const eff = getEffective(row.parsed, row.level, edit);
    const values = fileHeaders.map((h) => {
      // Detecta qual coluna qual através do mapping
      const fieldName = preview.mapping[h];
      if (fieldName === "title") return eff.title;
      if (fieldName === "assignee_id") return eff.assignee_id ?? row.raw[h] ?? "";
      if (fieldName === "start_date") return eff.start_date ?? row.raw[h] ?? "";
      if (fieldName === "due_date") return eff.due_date ?? row.raw[h] ?? "";
      if (fieldName === "level") return eff.level !== null && eff.level !== undefined ? String(eff.level) : row.raw[h] ?? "";
      // outras colunas: mantém valor original
      const v = row.raw[h];
      if (v === null || v === undefined) return "";
      return String(v);
    });
    lines.push(values.map(csvEscape).join(","));
  }
  return lines.join("\n");
}

function csvEscape(v: string | number | null): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function PreviewRow({
  row,
  hasWBS,
  edits,
  expand,
  onToggleExpand,
  onUpdate,
}: {
  row: ImportRow;
  hasWBS: boolean;
  edits: Record<number, Editable>;
  expand: boolean;
  onToggleExpand: (idx: number) => void;
  onUpdate: (idx: number, patch: Editable) => void;
}) {
  const edit = edits[row.index];
  const eff = getEffective(row.parsed, row.level, edit);
  const effStatus = getEffectiveStatus(row, edit);
  const effectiveStatus = effStatus.status;
  const effectiveErrors = effStatus.errors;
  const effectiveWarnings = effStatus.warnings;

  const icon =
    effectiveStatus === "valid" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
    effectiveStatus === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
    <X className="h-4 w-4 text-red-500" />;

  const hasIssues = effectiveStatus !== "valid";
  const dueDate = eff.due_date || "";

  return (
    <>
      <tr
        className={`border-t hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${hasIssues ? "cursor-pointer" : ""} ${expand ? "bg-zinc-50 dark:bg-zinc-900/50" : ""}`}
        onClick={() => hasIssues && onToggleExpand(row.index)}
      >
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
            onChange={(e) => onUpdate(row.index, { title: e.target.value })}
            className={`w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded px-1 py-0.5 text-sm ${!eff.title.trim() ? "italic text-red-500 placeholder-red-300" : "font-medium"}`}
          />
        </td>
        <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={eff.assignee_id ?? ""}
            placeholder="—"
            onChange={(e) => onUpdate(row.index, { assignee_id: e.target.value || "" })}
            className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded px-1 py-0.5 text-xs text-muted-foreground"
          />
        </td>
        <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => onUpdate(row.index, { due_date: e.target.value })}
            className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded px-1 py-0.5 text-xs text-muted-foreground"
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
              onChange={(e) => onUpdate(row.index, { level: e.target.value ? Number(e.target.value) : 0 })}
              className="w-14 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded px-1 py-0.5 text-xs text-muted-foreground"
            />
          </td>
        )}
      </tr>

      {expand && hasIssues && (
        <tr className="bg-red-50/40 dark:bg-red-950/20">
          <td colSpan={hasWBS ? 6 : 5} className="px-4 py-3 text-xs space-y-2">
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
                <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">⚠ Avisos (não bloqueiam import):</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-300">
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
