"use client";

import * as React from "react";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ImportPreview, ImportRow } from "@/lib/excel-parser";

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
    if (!file) return;
    setLoading(true);
    setError(null);
    setPhase("importing");
    try {
      const form = new FormData();
      form.append("file", file);
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
                <StatBox label="Válidas" value={preview.validRows} color="green" />
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
                      <th className="px-2 py-2 text-left w-10">#</th>
                      <th className="px-2 py-2 text-left">Status</th>
                      <th className="px-2 py-2 text-left">Título</th>
                      <th className="px-2 py-2 text-left">Responsável</th>
                      <th className="px-2 py-2 text-left">Prazo</th>
                      {preview.hasWBS && <th className="px-2 py-2 text-left">Nível</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 50).map((row) => (
                      <PreviewRow key={row.index} row={row} hasWBS={preview.hasWBS} />
                    ))}
                  </tbody>
                </table>
                {preview.rows.length > 50 && (
                  <p className="text-xs text-center text-muted-foreground py-2 bg-zinc-50 dark:bg-zinc-900">
                    Mostrando 50 de {preview.rows.length} linhas
                  </p>
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
                disabled={loading || (preview?.validRows || 0) === 0}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Download className="h-4 w-4 mr-2" />
                Importar {preview?.validRows || 0} tarefas
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

function PreviewRow({ row, hasWBS }: { row: ImportRow; hasWBS: boolean }) {
  const icon =
    row.status === "valid" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
    row.status === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
    <X className="h-4 w-4 text-red-500" />;

  const dueDate = row.parsed.due_date || "—";

  return (
    <tr className="border-t hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
      <td className="px-2 py-2 text-xs text-muted-foreground">{row.index}</td>
      <td className="px-2 py-2">{icon}</td>
      <td className="px-2 py-2 font-medium truncate max-w-xs">
        {row.parsed.title || <span className="text-red-500 italic">sem título</span>}
        {row.warnings.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-normal mt-0.5">
            ⚠ {row.warnings[0]}
          </p>
        )}
        {row.errors.length > 0 && (
          <p className="text-xs text-red-600 dark:text-red-400 font-normal mt-0.5">
            ✗ {row.errors[0]}
          </p>
        )}
      </td>
      <td className="px-2 py-2 text-muted-foreground text-xs">{row.parsed.assignee_id || "—"}</td>
      <td className="px-2 py-2 text-muted-foreground text-xs">{dueDate}</td>
      {hasWBS && (
        <td className="px-2 py-2 text-muted-foreground text-xs">
          {row.level ? (
            <Badge variant="outline" className="text-xs">
              {row.level}
            </Badge>
          ) : "—"}
        </td>
      )}
    </tr>
  );
}
