"use client";

import { BarChart3, CheckCircle2 } from "lucide-react";

interface ProgressFieldProps {
  progress: number;
  onChange: (progress: number) => void;
  trackTime: boolean;
}

// Slider de progresso com atalhos Concluir (100%) / Reabrir (90%)
export function ProgressField({ progress, onChange, trackTime }: ProgressFieldProps) {
  return (
    <div className="space-y-2.5 p-3.5 rounded-xl border border-border/70 bg-muted/20">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
          Progresso da Tarefa
        </span>
        <div className="flex items-center gap-2">
          {progress < 100 ? (
            <button
              type="button"
              onClick={() => onChange(100)}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-emerald-500/20 shadow-xs cursor-pointer"
              title="Marcar tarefa como 100% concluída"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Concluir (100%)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onChange(90)}
              className="text-[11px] font-bold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-lg transition-colors border border-border/60 cursor-pointer"
              title="Reabrir tarefa em andamento"
            >
              Reabrir Tarefa
            </button>
          )}
          <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">
            {progress}%
          </span>
        </div>
      </div>

      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            progress === 100
              ? "bg-emerald-500"
              : progress > 50
              ? "bg-blue-500"
              : "bg-blue-400"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <input
        id="task-progress-slider"
        name="task-progress-slider"
        aria-label="Progresso da tarefa em porcentagem"
        type="range"
        min="0"
        max="100"
        step="5"
        value={progress}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      {progress === 100 && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {trackTime ? "Concluída — informe abaixo as horas reais gastas" : "Tarefa Concluída"}
        </p>
      )}
    </div>
  );
}
