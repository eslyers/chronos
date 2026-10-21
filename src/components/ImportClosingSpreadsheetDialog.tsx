"use client";

import React, { useState } from "react";
import { Upload, X, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addBusinessDays, getClosingD0Date } from "@/lib/business-days";
import type { ImportPreview } from "@/lib/excel-parser";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatDateOnly, toDateOnly } from "@/lib/date-only";
import { priorityLabel } from "@/lib/priority";

interface ImportClosingSpreadsheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  projectName?: string;
  selectedMonth: number;
  selectedYear: number;
  onImportSuccess: (tasksToCreate: {
    title: string;
    description?: string;
    due_date?: string;
    priority: "low" | "medium" | "high" | "critical";
    project_id?: string;
  }[]) => Promise<void>;
}

export function ImportClosingSpreadsheetDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  selectedMonth,
  selectedYear,
  onImportSuccess,
}: ImportClosingSpreadsheetDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  // Mesmo critério do servidor: linhas sem erro (válidas ou com aviso) são importadas
  const importableCount = parseResult ? parseResult.rows.filter((r) => r.status !== "error").length : 0;

  // Fechar limpa o arquivo e a prévia (reabrir começa do zero)
  const handleOpenChange = (next: boolean) => {
    if (!next && importing) return;
    if (!next) {
      setFile(null);
      setParseResult(null);
      setError("");
    }
    onOpenChange(next);
  };

  if (!open) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("project_id", projectId || "dummy-project");
      formData.append("workspace_id", "dummy-workspace");
      formData.append("dry_run", "true");

      const res = await fetch("/api/tasks/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao processar planilha no servidor.");
      }

      setParseResult(data.preview);
    } catch (err: unknown) {
      console.error("[ImportClosing] Parser error:", err);
      const msg = err instanceof Error ? err.message : "Erro ao processar planilha.";
      setError(msg);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.rows.length === 0) return;
    setImporting(true);

    const d0Date = getClosingD0Date(selectedYear, selectedMonth);

    try {
      const validRows = parseResult.rows.filter((r) => r.status !== "error");
      const tasksToCreate = validRows.map((row) => {
        const title = (row.parsed.title || String(row.raw[parseResult.columns[0]] || "Rotina sem título")).trim();
        const description = row.parsed.description || undefined;

        let isoDueDate: string | undefined = undefined;

        // Tenta identificar se o título/linha contém indicação de dia útil ex: "[D-3]" ou "D-2"
        const offsetMatch = title.match(/\[?D([+-]?\d+)\]?/i);
        if (offsetMatch) {
          const offset = parseInt(offsetMatch[1], 10);
          const targetDate = addBusinessDays(d0Date, offset);
          isoDueDate = formatDateOnly(targetDate);
        } else if (row.parsed.due_date) {
          isoDueDate = toDateOnly(row.parsed.due_date) ?? undefined;
        } else {
          // Padrão: D0
          isoDueDate = formatDateOnly(d0Date);
        }

        return {
          title,
          description,
          due_date: isoDueDate,
          priority: (row.parsed.priority as "low" | "medium" | "high" | "critical") || "medium",
          project_id: projectId,
        };
      });

      await onImportSuccess(tasksToCreate);
      handleOpenChange(false);
    } catch (err: unknown) {
      console.error("[ImportClosing] Import error:", err);
      const msg = err instanceof Error ? err.message : "Erro ao salvar tarefas importadas.";
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideCloseButton
        overlayClassName="bg-black/65"
        className="flex flex-col gap-0 p-0 w-[calc(100%-2rem)] max-w-xl max-h-[85vh] bg-card border-border rounded-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600/10 via-emerald-500/5 to-transparent border-b border-border p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold leading-normal tracking-normal text-foreground">Importar Cronograma de Fechamento</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Suporta planilhas .ODS, .XLSX e .CSV com reconhecimento automático de dias úteis (D-x a D+x)
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {projectName && (
            <div className="p-3 rounded-xl bg-muted/30 border border-border/80 text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Projeto de Destino:</span>
              <span className="font-bold text-emerald-500">{projectName}</span>
            </div>
          )}

          {/* Area de Drop do Arquivo */}
          {!file && (
            <label className="border-2 border-dashed border-border/80 hover:border-emerald-500/60 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-muted/20 hover:bg-emerald-500/5 transition-all text-center group">
              <Upload className="h-8 w-8 text-muted-foreground group-hover:text-emerald-500 transition-colors mb-2" />
              <span className="text-sm font-bold text-foreground">Clique ou arraste a planilha aqui</span>
              <span className="text-xs text-muted-foreground mt-1">
                Arquivos aceitos: Cronograma Orçamento.ODS, XLSX, CSV
              </span>
              <input
                type="file"
                accept=".ods,.xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Arquivo da planilha de fechamento"
              />
            </label>
          )}

          {parsing && (
            <div className="p-8 text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-muted-foreground">Lendo e estruturando linhas da planilha...</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {parseResult && !parsing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{importableCount} rotinas importáveis encontradas em {file?.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); setParseResult(null); setError(""); }}
                  className="text-[11px] underline hover:opacity-80"
                >
                  Trocar Arquivo
                </button>
              </div>

              <div className="border border-border rounded-xl max-h-56 overflow-y-auto divide-y divide-border/40 bg-card">
                {parseResult.rows.map((row) => (
                  <div key={row.index} className="p-2.5 text-xs flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground truncate">
                      {row.parsed.title || String(row.raw[parseResult.columns[0]] || "Rotina sem título")}
                    </span>
                    <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground shrink-0">
                      {priorityLabel(row.parsed.priority)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)} disabled={importing}>
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={!parseResult || importing || importableCount === 0}
            onClick={handleConfirmImport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 px-4 rounded-xl shadow-md shadow-emerald-500/20"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando Tarefas...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Importar {importableCount} Tarefas
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
