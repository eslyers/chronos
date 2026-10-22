"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import type { ImportResultSummary } from "./import-preview-state";

// Fase de importação em andamento
export function ImportingIndicator({ count }: { count: number }) {
  return (
    <div className="text-center py-12 space-y-3">
      <Loader2 className="h-10 w-10 mx-auto animate-spin text-blue-500" />
      <p className="text-base font-medium">Importando {count} tarefas...</p>
      <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
    </div>
  );
}

// Fase concluída: resumo do que o servidor criou/ignorou
export function ImportResult({ result }: { result: ImportResultSummary }) {
  return (
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
  );
}
