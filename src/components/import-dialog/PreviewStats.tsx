"use client";

import type { StatusCounts } from "@/lib/import-selection";
import type { StatusFilter } from "./import-preview-state";

type StatColor = "default" | "green" | "yellow" | "red";

interface PreviewStatsProps {
  totalRows: number;
  counts: StatusCounts;
  statusFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
}

// Cards de contadores; clicar filtra a tabela pelo status
export function PreviewStats({ totalRows, counts, statusFilter, onFilterChange }: PreviewStatsProps) {
  const cards: Array<{ filter: StatusFilter; label: string; value: number; color: StatColor; ring: string; title: string }> = [
    { filter: "all", label: "Total", value: totalRows, color: "default", ring: "ring-blue-500", title: "Filtrar por todas as linhas" },
    { filter: "valid", label: "Válidas", value: counts.valid, color: "green", ring: "ring-emerald-500", title: "Filtrar por linhas válidas" },
    { filter: "warning", label: "Com avisos", value: counts.warning, color: "yellow", ring: "ring-amber-500", title: "Filtrar por linhas com avisos" },
    { filter: "error", label: "Com erro", value: counts.error, color: "red", ring: "ring-rose-500", title: "Filtrar por linhas com erro (clique para inspecionar)" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map((c) => (
        <button
          key={c.filter}
          type="button"
          onClick={() => onFilterChange(c.filter)}
          className={`text-left transition-all rounded-xl focus:outline-none ${statusFilter === c.filter ? `ring-2 ${c.ring} shadow-md scale-[1.02]` : "opacity-85 hover:opacity-100 cursor-pointer"}`}
          title={c.title}
        >
          <StatBox label={c.label} value={c.value} color={c.color} />
        </button>
      ))}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: StatColor }) {
  const colors = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
    green: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    yellow: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300",
    red: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300",
  };
  return (
    <div className={`rounded-lg p-3 ${colors[color]}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
