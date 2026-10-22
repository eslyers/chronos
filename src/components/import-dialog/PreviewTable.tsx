"use client";

import * as React from "react";
import type { ImportRow } from "@/lib/excel-parser";
import type { ImportRowEdits } from "@/lib/import-selection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PreviewRow } from "./PreviewRow";
import { PAGE_SIZE_OPTIONS, type PageSize, type Pagination, type SortDir, type SortKey } from "./import-preview-state";

type SortableKey = Exclude<SortKey, null>;

interface PreviewTableProps {
  rows: ImportRow[];
  hasWBS: boolean;
  edits: Record<number, ImportRowEdits>;
  expandedErrors: Set<number>;
  selectedRows: Set<number>;
  sortKey: SortKey;
  sortDir: SortDir;
  isAllOnPageSelected: boolean;
  onSort: (key: SortableKey) => void;
  onToggleAllOnPage: () => void;
  onToggleExpand: (idx: number) => void;
  onToggleSelect: (idx: number) => void;
  onUpdate: (idx: number, patch: ImportRowEdits) => void;
  // Rodapé (paginação) dentro da moldura da tabela
  children?: React.ReactNode;
}

// Tabela da prévia com cabeçalhos ordenáveis e checkbox de página
export function PreviewTable({
  rows,
  hasWBS,
  edits,
  expandedErrors,
  selectedRows,
  sortKey,
  sortDir,
  isAllOnPageSelected,
  onSort,
  onToggleAllOnPage,
  onToggleExpand,
  onToggleSelect,
  onUpdate,
  children,
}: PreviewTableProps) {
  const sortProps = { activeKey: sortKey, dir: sortDir, onSort };
  return (
    <div className="rounded-lg border max-h-72 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0">
          <tr>
            <th className="px-2 py-2 text-left w-8">
              <input
                type="checkbox"
                checked={isAllOnPageSelected}
                onChange={onToggleAllOnPage}
                className="h-4 w-4 rounded border-zinc-300 text-blue-500 focus:ring-blue-500 cursor-pointer"
                aria-label="Selecionar todas as linhas desta página"
              />
            </th>
            <SortableHeader sortKey="index" label="#" spaced={false} className="px-2 py-2 text-left w-10" {...sortProps} />
            <SortableHeader sortKey="status" label="Status" {...sortProps} />
            <SortableHeader sortKey="title" label="Título" {...sortProps} />
            <SortableHeader sortKey="assignee_id" label="Responsável" {...sortProps} />
            <SortableHeader sortKey="due_date" label="Prazo" {...sortProps} />
            {hasWBS && <SortableHeader sortKey="level" label="Nível" {...sortProps} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <PreviewRow
              key={row.index}
              row={row}
              hasWBS={hasWBS}
              edits={edits}
              expand={expandedErrors.has(row.index)}
              selected={selectedRows.has(row.index)}
              onToggleExpand={onToggleExpand}
              onToggleSelect={onToggleSelect}
              onUpdate={onUpdate}
            />
          ))}
        </tbody>
      </table>

      {children}
    </div>
  );
}

function SortableHeader({
  sortKey,
  label,
  spaced = true,
  className = "px-2 py-2 text-left",
  activeKey,
  dir,
  onSort,
}: {
  sortKey: SortableKey;
  label: string;
  spaced?: boolean;
  className?: string;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortableKey) => void;
}) {
  return (
    <th className={className}>
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 hover:text-blue-500 transition-colors">
        {label}
        {spaced && " "}
        {activeKey === sortKey && <span>{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

interface PreviewPaginationProps {
  pagination: Pagination;
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
  onPrev: () => void;
  onNext: () => void;
}

// Rodapé: intervalo exibido, linhas por página e navegação
export function PreviewPagination({ pagination, pageSize, onPageSizeChange, onPrev, onNext }: PreviewPaginationProps) {
  const { totalRows, totalPages, safePage, pageStart, pageEnd } = pagination;
  return (
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
            onValueChange={(val) => onPageSizeChange(Number(val) as PageSize)}
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
          onClick={onPrev}
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
          onClick={onNext}
          disabled={safePage >= totalPages - 1}
          className="px-2 py-1 rounded border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Próxima →
        </button>
      </div>
    </div>
  );
}
