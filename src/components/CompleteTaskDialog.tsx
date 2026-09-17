"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Clock,
  X,
  Loader2,
} from "lucide-react";
import { Task } from "@/lib/context/DataContext";
import { parseDurationToHours, formatHoursToHHMM, formatHoursBadge } from "@/lib/duration";

interface CompleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  targetStageName?: string;
  onConfirm: (actualHours: number | null) => Promise<void> | void;
}

export function CompleteTaskDialog({
  open,
  onOpenChange,
  task,
  targetStageName,
  onConfirm,
}: CompleteTaskDialogProps) {
  const [actualHours, setActualHours] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevOpenRef = useRef(false);
  const prevTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !task) {
      prevOpenRef.current = false;
      prevTaskIdRef.current = null;
      setActualHours("");
      return;
    }

    const isNewlyOpened = !prevOpenRef.current;
    const isDifferentTask = task.id !== prevTaskIdRef.current;

    if (!isNewlyOpened && !isDifferentTask) {
      return;
    }

    prevOpenRef.current = true;
    prevTaskIdRef.current = task.id;

    setActualHours(task.actual_hours != null ? formatHoursToHHMM(task.actual_hours) : "");
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 100);
  }, [open, task]);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Travar scroll do body
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open || !task) return null;

  const estimatedHours = task.estimated_hours != null ? task.estimated_hours : null;
  const parsedAct = parseDurationToHours(actualHours);
  const validActual = parsedAct !== null && !isNaN(parsedAct) ? parsedAct : null;

  async function handleSave(withHours: boolean) {
    setLoading(true);
    try {
      await onConfirm(withHours ? validActual : null);
      onOpenChange(false);
    } catch (err) {
      console.error("[CompleteTaskDialog] save error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="presentation"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-task-dialog-title"
        tabIndex={-1}
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600/15 via-emerald-500/10 to-transparent border-b border-border p-5 relative">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-xs shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {targetStageName ? `Etapa: ${targetStageName}` : "Conclusão de Tarefa"}
              </span>
              <h2 id="complete-task-dialog-title" className="text-lg font-bold leading-tight mt-0.5 text-foreground">
                Registrar Horas Reais
              </h2>
            </div>
          </div>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-5">
          {/* Card Resumo da Tarefa */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tarefa Finalizada:
            </p>
            <h3 className="text-sm font-bold text-foreground line-clamp-2">
              {task.title}
            </h3>
            {estimatedHours != null && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                <span>Horas Estimadas: <strong>{formatHoursToHHMM(estimatedHours)}</strong></span>
              </div>
            )}
          </div>

          {/* Campo de Horas Reais */}
          <div className="space-y-2">
            <label
              htmlFor="actual-hours-input"
              className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                Horas Reais Gastas (Execução)
              </span>
              {estimatedHours != null && !actualHours && (
                <button
                  type="button"
                  onClick={() => setActualHours(formatHoursToHHMM(estimatedHours))}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Usar estimada ({formatHoursBadge(estimatedHours)})
                </button>
              )}
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                id="actual-hours-input"
                type="text"
                autoComplete="off"
                placeholder={estimatedHours ? `ex: ${formatHoursToHHMM(estimatedHours)}` : "ex: 36h:25m ou 08:00"}
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value.replace(/[^0-9:hmHM.,\s]/g, ""))}
                onBlur={() => {
                  if (actualHours.trim()) {
                    const parsed = parseDurationToHours(actualHours);
                    if (parsed !== null) {
                      setActualHours(formatHoursToHHMM(parsed));
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave(true);
                  }
                }}
                className="flex h-11 w-full rounded-xl border border-emerald-500/50 bg-background text-foreground dark:text-zinc-100 pl-3.5 pr-16 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 font-mono font-bold transition-all shadow-xs"
              />
              <span className="absolute right-3 top-3 text-[11px] text-muted-foreground font-mono font-semibold pointer-events-none select-none">
                HH:MM
              </span>
            </div>

            {/* Comparativo em tempo real */}
            {(() => {
              if (estimatedHours != null && validActual !== null && validActual > 0) {
                const diff = validActual - estimatedHours;
                const pct = Math.round(((validActual - estimatedHours) / estimatedHours) * 100);
                const diffFormatted = formatHoursBadge(Math.abs(diff));
                if (diff === 0) {
                  return (
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      ✓ Feito exatamente no prazo previsto ({formatHoursBadge(estimatedHours)}).
                    </p>
                  );
                } else if (diff < 0) {
                  return (
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      🚀 Economia de {diffFormatted} ({Math.abs(pct)}% mais rápido que o previsto).
                    </p>
                  );
                } else {
                  return (
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      ⏱️ Excedeu em +{diffFormatted} (+{pct}% do tempo estimado).
                    </p>
                  );
                }
              }
              return null;
            })()}

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              💡 Você pode informar números decimais como 2.5 ou 2,5 horas. O progresso será ajustado para 100%.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 p-4 border-t border-border bg-muted/20">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-10 px-4 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={loading}
            className="h-10 px-4 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
          >
            Concluir sem Horas
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={loading}
            className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Salvar Horas e Concluir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
