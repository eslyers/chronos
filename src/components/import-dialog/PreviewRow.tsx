"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import type { ImportRow } from "@/lib/excel-parser";
import { DatePicker } from "@/components/ui/date-picker";
import { getEffective, getEffectiveStatus, type ImportRowEdits } from "@/lib/import-selection";

interface PreviewRowProps {
  row: ImportRow;
  hasWBS: boolean;
  edits: Record<number, ImportRowEdits>;
  expand: boolean;
  selected: boolean;
  onToggleExpand: (idx: number) => void;
  onToggleSelect: (idx: number) => void;
  onUpdate: (idx: number, patch: ImportRowEdits) => void;
}

// Linha editável da prévia + detalhe expansível de erros/avisos
export function PreviewRow({
  row,
  hasWBS,
  edits,
  expand,
  selected,
  onToggleExpand,
  onToggleSelect,
  onUpdate,
}: PreviewRowProps) {
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
