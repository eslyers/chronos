"use client";

import { X, KanbanSquare, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { DialogTitle } from "@/components/ui/dialog";

interface TaskDialogHeaderProps {
  isEdit: boolean;
  onClose: () => void;
}

export function TaskDialogHeader({ isEdit, onClose }: TaskDialogHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-transparent border-b border-border p-6 shrink-0 relative">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 shadow-sm shrink-0">
          <KanbanSquare className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">
              {isEdit ? "Edição de Entregável" : "Novo Entregável"}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold leading-tight tracking-normal mt-0.5">
            {isEdit ? "Editar Tarefa" : "Criar Nova Tarefa"}
          </DialogTitle>
        </div>
      </div>
    </div>
  );
}

interface TaskDialogFooterProps {
  isEdit: boolean;
  loading: boolean;
  canSubmit: boolean;
  onCancel: () => void;
}

// Ações do formulário: Cancelar / Salvar (submit do <form>)
export function TaskDialogFooter({ isEdit, loading, canSubmit, onCancel }: TaskDialogFooterProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-3 border-t border-border">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="h-11 px-5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : isEdit ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Salvar Alterações
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Criar Tarefa
          </>
        )}
      </button>
    </div>
  );
}
