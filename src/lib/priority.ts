// ─────────────────────────────────────────────────────────────
// CHRONOS — Prioridade de tarefas: rótulos e cores (fonte única)
// Cores conforme DESIGN.md: critical #ef4444, high #f97316,
// medium #3b82f6, low #64748b. As classes Tailwind ficam escritas por
// extenso para o JIT encontrá-las.
// ─────────────────────────────────────────────────────────────
import type { Task } from "@/lib/context/DataContext";

export type Priority = Task["priority"];

export const PRIORITY_ORDER: Priority[] = ["critical", "high", "medium", "low"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

/** Cor sólida (gráficos, barras do Gantt, exportações). */
export const PRIORITY_HEX: Record<Priority, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#64748b",
};

/** Badge: fundo translúcido + texto + borda, com variante dark. */
export const PRIORITY_BADGE_CLASS: Record<Priority, string> = {
  critical: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300",
  high: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300",
  medium: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
  low: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300",
};

/** Marcador (bolinha/barra lateral). */
export const PRIORITY_DOT_CLASS: Record<Priority, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-blue-500",
  low: "bg-slate-500",
};

export function priorityLabel(priority: string | null | undefined): string {
  return PRIORITY_LABEL[(priority ?? "medium") as Priority] ?? PRIORITY_LABEL.medium;
}
