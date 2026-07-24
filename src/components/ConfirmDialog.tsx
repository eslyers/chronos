"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
}

/**
 * Wrapper shadcn/ui para confirmações de ação destrutiva.
 * Substitui o `window.confirm()` nativo (que é feio e inconsistente entre browsers).
 *
 * Uso:
 *   const [open, setOpen] = React.useState(false);
 *   <ConfirmDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="Excluir tarefa?"
 *     description="Esta ação não pode ser desfeita."
 *     variant="destructive"
 *     confirmText="Excluir"
 *     onConfirm={() => deleteTask(id)}
 *   />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false);

  async function handleConfirm() {
    try {
      setLoading(true);
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      // Erro fica na UI do componente pai — não fecha o modal
      console.error("[ConfirmDialog] onConfirm failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            className={
              variant === "destructive"
                ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                : undefined
            }
          >
            {loading ? "Aguarde..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook utilitário pra abrir o ConfirmDialog de qualquer lugar.
 * Retorna: { confirm, dialog }
 *   - confirm({ title, description, variant, onConfirm }) → abre o modal
 *   - dialog → renderiza no JSX
 */
export function useConfirmDialog() {
  const [state, setState] = React.useState<
    | {
        title: string;
        description?: string;
        confirmText?: string;
        cancelText?: string;
        variant?: "default" | "destructive";
        onConfirm: () => void | Promise<void>;
      }
    | null
  >(null);

  const confirm = React.useCallback((opts: {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
    onConfirm: () => void | Promise<void>;
  }) => setState(opts), []);

  const dialog = state ? (
    <ConfirmDialog
      open={!!state}
      onOpenChange={(o) => !o && setState(null)}
      title={state.title}
      description={state.description}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      variant={state.variant}
      onConfirm={state.onConfirm}
    />
  ) : null;

  return { confirm, dialog };
}