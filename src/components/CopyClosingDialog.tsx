"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Copy, X, Loader2, CheckSquare, Square, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/context/DataContext";

interface CopyClosingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMonth: number;
  currentYear: number;
  tasks: Task[];
  onCopyTasks: (params: {
    sourceMonth: number;
    sourceYear: number;
    targetMonth: number;
    targetYear: number;
    selectedTaskIds: string[];
    resetStatus: boolean;
    keepAssignees: boolean;
  }) => Promise<void>;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function CopyClosingDialog({
  open,
  onOpenChange,
  currentMonth,
  currentYear,
  tasks,
  onCopyTasks,
}: CopyClosingDialogProps) {
  // Mês de origem padrão: mês anterior ao selecionado
  const defaultSourceMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const defaultSourceYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const [sourceMonth, setSourceMonth] = useState(defaultSourceMonth);
  const [sourceYear, setSourceYear] = useState(defaultSourceYear);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [resetStatus, setResetStatus] = useState(true);
  const [keepAssignees, setKeepAssignees] = useState(true);
  const [loading, setLoading] = useState(false);

  // Filtra tarefas do mês de origem selecionado
  const availableSourceTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.due_date && !t.start_date) return true;
      const refDate = new Date((t.due_date || t.start_date) + "T00:00:00");
      return refDate.getMonth() + 1 === sourceMonth && refDate.getFullYear() === sourceYear;
    });
  }, [tasks, sourceMonth, sourceYear]);

  // Ao alterar o mês de origem, pré-seleciona todas as tarefas disponíveis
  useEffect(() => {
    setSelectedTaskIds(new Set(availableSourceTasks.map((t) => t.id)));
  }, [availableSourceTasks]);

  if (!open) return null;

  const allSelected = availableSourceTasks.length > 0 && selectedTaskIds.size === availableSourceTasks.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(availableSourceTasks.map((t) => t.id)));
    }
  };

  const toggleTask = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedTaskIds.size === 0) return;
    setLoading(true);
    try {
      await onCopyTasks({
        sourceMonth,
        sourceYear,
        targetMonth: currentMonth,
        targetYear: currentYear,
        selectedTaskIds: Array.from(selectedTaskIds),
        resetStatus,
        keepAssignees,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("[CopyClosing] Error copying closing tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-transparent border-b border-border p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Copiar Fechamento Mensal</h2>
              <p className="text-xs text-muted-foreground">
                Reaproveite e recalcule as rotinas do mês anterior para o novo ciclo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Seletor Origem -> Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/70 items-center">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground block">
                Mês Origem (Copiar De):
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={sourceMonth}
                  onChange={(e) => setSourceMonth(Number(e.target.value))}
                  className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={sourceYear}
                  onChange={(e) => setSourceYear(Number(e.target.value))}
                  className="w-20 h-9 rounded-lg border border-input bg-background px-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 sm:pl-2">
              <label className="text-xs font-bold text-muted-foreground block flex items-center gap-1">
                <ArrowRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                Mês Destino (Replicar Para):
              </label>
              <div className="h-9 px-3 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-between">
                <span>{MONTH_NAMES[currentMonth - 1]} / {currentYear}</span>
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Opções de Cópia */}
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={resetStatus}
                onChange={(e) => setResetStatus(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Resetar progresso e status para &quot;A Fazer&quot;</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={keepAssignees}
                onChange={(e) => setKeepAssignees(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Manter os mesmos responsáveis atribuídos</span>
            </label>
          </div>

          {/* Lista de Atividades Selecionáveis */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-muted-foreground">
                Selecione as Atividades a Copiar ({selectedTaskIds.size} de {availableSourceTasks.length}):
              </span>
              {availableSourceTasks.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-bold text-blue-500 hover:underline"
                >
                  {allSelected ? "Desmarcar Todas" : "Selecionar Todas"}
                </button>
              )}
            </div>

            <div className="border border-border/80 rounded-xl max-h-56 overflow-y-auto divide-y divide-border/40 bg-card">
              {availableSourceTasks.length === 0 ? (
                <div className="p-8 text-center space-y-1">
                  <p className="text-xs font-bold text-muted-foreground">Nenhuma tarefa encontrada em {MONTH_NAMES[sourceMonth - 1]}/{sourceYear}.</p>
                  <p className="text-[11px] text-muted-foreground">Altere o mês de origem no topo para buscar outras rotinas.</p>
                </div>
              ) : (
                availableSourceTasks.map((task) => {
                  const isChecked = selectedTaskIds.has(task.id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 transition-colors ${isChecked ? "bg-blue-500/5" : "opacity-60"}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-foreground truncate">
                          {task.title}
                        </span>
                      </div>

                      {task.assignee_name && (
                        <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded text-muted-foreground shrink-0">
                          👤 {task.assignee_name}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={loading || selectedTaskIds.size === 0}
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 px-4 rounded-xl shadow-md shadow-blue-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Copiando e Recalculando...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar {selectedTaskIds.size} Tarefas para {MONTH_NAMES[currentMonth - 1]}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
