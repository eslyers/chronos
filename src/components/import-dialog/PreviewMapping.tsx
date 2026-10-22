"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ImportPreview } from "@/lib/excel-parser";

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

// Aviso de hierarquia WBS + mapeamento coluna → campo detectado
export function PreviewMapping({ preview }: { preview: ImportPreview }) {
  return (
    <>
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
    </>
  );
}
