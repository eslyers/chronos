"use client";

import { Badge } from "@/components/ui/badge";
import type { StatusFilter } from "./import-preview-state";

interface PreviewSelectionBarProps {
  totalRows: number;
  validCount: number;
  statusFilter: StatusFilter;
  onSelectAll: () => void;
  onSelectValid: () => void;
  onClearFilter: () => void;
}

// Barra de Ações Rápidas de Seleção e Filtro Ativo
export function PreviewSelectionBar({
  totalRows,
  validCount,
  statusFilter,
  onSelectAll,
  onSelectValid,
  onClearFilter,
}: PreviewSelectionBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSelectAll}
          className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 transition-colors"
        >
          ☑️ Selecionar Todas as {totalRows} Linhas
        </button>
        <button
          type="button"
          onClick={onSelectValid}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 transition-colors"
        >
          ✅ Selecionar Apenas Válidas ({validCount})
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
            onClick={onClearFilter}
            className="text-blue-500 hover:underline font-bold text-xs ml-1"
          >
            (Limpar filtro)
          </button>
        </div>
      )}
    </div>
  );
}
