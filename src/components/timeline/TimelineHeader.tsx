"use client";

import { Calendar, Upload, Printer, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DependencyManager } from "@/components/DependencyManager";
import { TaskHierarchy } from "@/components/TaskHierarchy";

interface TimelineHeaderProps {
  selectedProjectId: string;
  onPrint: () => void;
  onExportExcel: () => void;
  onImport: () => void;
}

// Banner da página com as ações de exportar/imprimir/importar
export function TimelineHeader({ selectedProjectId, onPrint, onExportExcel, onImport }: TimelineHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs font-semibold">
              CRONOGRAMA & TIMELINE
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
            <Calendar className="h-7 w-7 text-blue-500" />
            Cronograma & Timeline Visual
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Acompanhe a dependência temporal de cada entregável, interaja via drag-and-drop e garanta previsibilidade operacional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="h-10 px-4 text-xs font-bold border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 gap-2"
          >
            <Printer className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportExcel}
            className="h-10 px-4 text-xs font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
          {selectedProjectId !== "all" && (
            <>
              <TaskHierarchy projectId={selectedProjectId} />
              <DependencyManager projectId={selectedProjectId} />
              <Button
                variant="outline"
                size="sm"
                onClick={onImport}
                className="h-10 px-4 text-xs font-semibold border-border hover:bg-muted gap-2"
              >
                <Upload className="h-4 w-4 text-blue-500" />
                Importar Planilha
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Placeholder de carregamento (também usado como fallback do Suspense)
export function TimelineLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-96 space-y-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 animate-pulse">
        <Calendar className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-muted-foreground animate-pulse">
        Carregando motor visual de cronograma...
      </p>
    </div>
  );
}
