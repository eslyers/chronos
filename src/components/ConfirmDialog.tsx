"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogOverlay,
  AlertDialogPortal,
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
      {/* z-[110]: a confirmação pode abrir sobre um Dialog (z-[100]) e precisa ficar acima dele */}
      <AlertDialogPortal>
        <AlertDialogOverlay className="z-[110]" />
        <AlertDialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[110] grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
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
        </AlertDialogPrimitive.Content>
      </AlertDialogPortal>
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