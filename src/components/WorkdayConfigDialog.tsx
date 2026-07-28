"use client";

import React, { useState, useEffect } from "react";
import { Settings2, X, Plus, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkdayConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  useD0: boolean;
  workdayOffsets: number[];
  onSaveConfig: (useD0: boolean, offsets: number[]) => void;
}

export function WorkdayConfigDialog({
  open,
  onOpenChange,
  useD0,
  workdayOffsets,
  onSaveConfig,
}: WorkdayConfigDialogProps) {
  const [currentUseD0, setCurrentUseD0] = useState(useD0);
  const [offsets, setOffsets] = useState<number[]>(workdayOffsets);
  const [newOffsetInput, setNewOffsetInput] = useState("");

  // Atualiza estados locais quando o modal abre
  useEffect(() => {
    if (open) {
      setCurrentUseD0(useD0);
      setOffsets(workdayOffsets);
    }
  }, [open, useD0, workdayOffsets]);

  if (!open) return null;

  const handleAddOffset = () => {
    const parsed = parseInt(newOffsetInput, 10);
    if (isNaN(parsed)) return;
    if (!offsets.includes(parsed)) {
      const next = [...offsets, parsed].sort((a, b) => a - b);
      setOffsets(next);
    }
    setNewOffsetInput("");
  };

  const handleRemoveOffset = (offsetToRemove: number) => {
    setOffsets(offsets.filter((o) => o !== offsetToRemove));
  };

  const handleResetDefault = () => {
    setOffsets([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
    setCurrentUseD0(true);
  };

  const handleSave = () => {
    const finalOffsets = offsets.length > 0 ? offsets : [0];
    onSaveConfig(currentUseD0, finalOffsets);
    onOpenChange(false);
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
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/10 via-purple-500/5 to-transparent border-b border-border p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Configurar Régua de Dias Úteis</h2>
              <p className="text-xs text-muted-foreground">
                Personalize o marcador D0 e os dias positivos/negativos exibidos na matriz
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
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Switch Usar D0 */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground block">Utilizar marcador D0 (Dia de Corte ERP)?</span>
              <span className="text-[11px] text-muted-foreground block">
                Se desativado, o último dia útil do mês vira D-1 e não há coluna D0.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentUseD0(!currentUseD0)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                currentUseD0 ? "bg-blue-600" : "bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  currentUseD0 ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Adicionar Novo Dia D */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground block">
              Adicionar Dia D Personalizado (Positivo ou Negativo):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Ex: -10, -7, 7, 10, 15"
                value={newOffsetInput}
                onChange={(e) => setNewOffsetInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddOffset(); }}
                className="flex-1 h-9 rounded-lg border border-input bg-card text-foreground dark:bg-zinc-900 dark:text-zinc-100 px-3 text-xs font-semibold focus:ring-2 focus:ring-purple-500"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddOffset}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 h-9 rounded-lg px-3"
              >
                <Plus className="h-4 w-4" />
                Adicionar Dia
              </Button>
            </div>
          </div>

          {/* Lista de Colunas de Dias Ativos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">
                Dias Úteis Exibidos ({offsets.length}):
              </span>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-[11px] font-bold text-purple-500 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Restaurar Padrão (D-5 a D+5)
              </button>
            </div>

            <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border/80 bg-card max-h-44 overflow-y-auto">
              {offsets.map((off) => {
                const label = off === 0 ? "D0" : off > 0 ? `D+${off}` : `D${off}`;
                return (
                  <div
                    key={off}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs font-mono font-bold text-foreground border border-border"
                  >
                    <span>{label}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOffset(off)}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                      title="Remover dia"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 px-4 rounded-xl shadow-md shadow-purple-500/20"
          >
            <Check className="h-4 w-4" />
            Salvar Régua
          </Button>
        </div>
      </div>
    </div>
  );
}
