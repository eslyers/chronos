"use client";

import { CheckCircle2 } from "lucide-react";
import { DurationInput } from "./DurationInput";
import { computeHoursVariance } from "./duration-input";

interface ActualHoursPanelProps {
  estimatedHours: string;
  actualHours: string;
  onActualHoursChange: (value: string) => void;
}

// Bloco de Horas Reais Gastas (exibido na conclusão da tarefa)
export function ActualHoursPanel({ estimatedHours, actualHours, onActualHoursChange }: ActualHoursPanelProps) {
  return (
    <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <label
          htmlFor="task-actual-hours"
          className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Horas Reais Gastas (Execução)
        </label>
        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
          Tarefa Concluída 🎉
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Informe a quantidade de horas que foram efetivamente trabalhadas nesta atividade para apuração real de carga e prazos.
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <DurationInput
          id="task-actual-hours"
          value={actualHours}
          onChange={onActualHoursChange}
          wrapperClassName="relative w-full sm:w-56"
          inputClassName="flex h-11 w-full rounded-xl border border-emerald-500/50 bg-background text-foreground dark:text-zinc-100 pl-3.5 pr-16 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 font-mono font-semibold transition-all shadow-xs"
        />

        {estimatedHours.trim() && !actualHours && (
          <button
            type="button"
            onClick={() => onActualHoursChange(estimatedHours)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 self-start sm:self-center cursor-pointer"
          >
            Copiar horas estimadas ({estimatedHours})
          </button>
        )}

        <HoursVarianceBadge estimatedHours={estimatedHours} actualHours={actualHours} />
      </div>
    </div>
  );
}

// Comparação horas reais × estimadas (só quando as duas são durações positivas)
export function HoursVarianceBadge({ estimatedHours, actualHours }: { estimatedHours: string; actualHours: string }) {
  const variance = computeHoursVariance(estimatedHours, actualHours);
  if (!variance) return null;
  if (variance.kind === "exact") {
    return (
      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
        ✓ Concluído exatamente no tempo estimado!
      </span>
    );
  }
  if (variance.kind === "under") {
    return (
      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
        🚀 {variance.diffFormatted} a menos que o estimado ({Math.abs(variance.pct)}% economia)
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
      ⏱️ +{variance.diffFormatted} a mais que o estimado (+{variance.pct}%)
    </span>
  );
}
