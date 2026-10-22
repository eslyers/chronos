"use client";

// Confirmação de exclusão de projeto: exige digitar o nome do projeto,
// porque a exclusão apaga também todas as tarefas e não pode ser desfeita.
import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DeleteProjectDialogProps {
  project: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (projectId: string) => Promise<unknown>;
}

export function DeleteProjectDialog({ project, onOpenChange, onConfirm }: DeleteProjectDialogProps) {
  const [typed, setTyped] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const inputId = React.useId();

  // Limpa o campo a cada projeto aberto
  React.useEffect(() => {
    setTyped("");
  }, [project?.id]);

  const matches = !!project && typed.trim() === project.name.trim();

  async function handleConfirm() {
    if (!project || !matches) return;
    setLoading(true);
    try {
      await onConfirm(project.id);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={!!project} onOpenChange={onOpenChange}>
      <AlertDialogPortal>
        <AlertDialogOverlay className="z-[110]" />
        <AlertDialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[110] grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            className="grid gap-4"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
              <AlertDialogDescription>
                O projeto <strong className="text-foreground">{project?.name}</strong> será excluído
                permanentemente, junto com todas as suas tarefas, etapas e dependências. Esta ação não pode ser
                desfeita. Se quiser apenas tirá-lo de circulação, use “Arquivar”.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-2">
              <label htmlFor={inputId} className="text-sm text-muted-foreground">
                Digite <strong className="text-foreground select-all">{project?.name}</strong> para confirmar:
              </label>
              <Input
                id={inputId}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                disabled={loading}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
              <Button
                type="submit"
                disabled={!matches || loading}
                className="bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-600"
              >
                {loading ? "Excluindo..." : "Excluir projeto"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogPrimitive.Content>
      </AlertDialogPortal>
    </AlertDialog>
  );
}
